"""
inference/demo.py — single-location "current conditions" demo mode.

WHY THIS EXISTS
-----------------
`InferencePipeline.predict()` (Section 13) expects real, already-sourced
sensor/satellite/radar/NWP feature values per grid cell. A frontend that
doesn't have that ingestion built yet (e.g. a UI still on placeholder/mock
data) has no way to call it directly — it would need to invent ~40 raw
feature values itself, which is worse than the mock data it started with,
not better.

This module is the honest middle ground: it generates a short, physically
-consistent synthetic time history (data/synthetic_data.py — the SAME
generator the ablation study and run_mvp.py were validated against) for one
named region, engineers it through the real Thermo-Wind pipeline, and runs
it through the REAL trained model. The prediction is real; only the input
"sensor readings" are simulated, and every response says so explicitly via
`demo_mode: true` and `data_source: "synthetic"` — never silently.

Replace `_current_conditions_for_region` with a real ingestion call (a
weather-API fetch, a database read, an MQTT sensor feed — whatever the
production data source ends up being) once one exists; nothing else in this
module or its caller (inference/api.py::/demo/predict) needs to change,
since the contract is just "return a short causal history DataFrame in the
data/schema.py column format".
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import pandas as pd

from varshanetra.config import load_config
from varshanetra.data.synthetic_data import generate_synthetic_dataset
from varshanetra.inference.pipeline import InferencePipeline

# Approximate centers for North-East India states, matching the names used
# by the reference UI's region selector. Extend this table (or replace it
# with a geocoding lookup) to support other regions/states.
NER_REGIONS: Dict[str, Dict[str, float]] = {
    "assam":     {"lat": 26.20, "lon": 92.90, "elevation_m": 45},
    "meghalaya": {"lat": 25.50, "lon": 91.40, "elevation_m": 1400},
    "manipur":   {"lat": 24.80, "lon": 93.90, "elevation_m": 790},
    "mizoram":   {"lat": 23.70, "lon": 92.70, "elevation_m": 1132},
}


def _current_conditions_for_region(
    lat: float, lon: float, history_hours: int = 30, seed: Optional[int] = None,
) -> pd.DataFrame:
    """Generates a short synthetic history (data source, see module
    docstring) for a small grid centered on (lat, lon), ending "now" (UTC).
    Returns the full grid — the caller picks the center cell's latest row.

    `seed` defaults to a value derived from (lat, lon, current hour) rather
    than a fixed constant, so different regions show different simulated
    conditions (matching what a UI region-selector needs) while still being
    stable within the same hour (so refreshing the page doesn't reroll the
    weather from scratch, same as real conditions wouldn't)."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(hours=history_hours)
    if seed is None:
        import hashlib
        hour_bucket = now.strftime("%Y%m%d%H")
        key = f"{round(lat, 2)}_{round(lon, 2)}_{hour_bucket}".encode()
        # hashlib (not the built-in hash()) so this is stable across process
        # restarts / multiple API workers — Python's hash() is randomized
        # per-process by default (PYTHONHASHSEED) and would make different
        # workers disagree on "this hour's" simulated weather for the same
        # region, which looks like a bug from the UI's point of view.
        seed = int(hashlib.sha256(key).hexdigest(), 16) % (2**31)
    df = generate_synthetic_dataset(
        n_lat=3, n_lon=3, n_hours=history_hours,
        start=start.strftime("%Y-%m-%d %H:%M"),
        center=(lat, lon), span_deg=0.3, seed=seed, save_path=None,
    )
    return df


def _center_cell_id(df: pd.DataFrame) -> str:
    """The 3x3 grid's middle cell is the (lat, lon) actually requested."""
    lats = sorted(df["lat"].unique())
    lons = sorted(df["lon"].unique())
    center_lat, center_lon = lats[len(lats) // 2], lons[len(lons) // 2]
    match = df[(df["lat"] == center_lat) & (df["lon"] == center_lon)]
    return match["grid_id"].iloc[0]


def predict_for_region(
    pipeline: InferencePipeline,
    region: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    rain_lead_hours: int = 3,
    flood_lead_hours: int = 6,
) -> dict:
    """Resolves a region name (or explicit lat/lon) to coordinates, builds a
    synthetic-but-consistent current-conditions window, and returns a single
    prediction record (Section 16 schema) plus demo-mode metadata and a
    `current_conditions` snapshot of the (synthetic) sensor readings that
    fed the model — useful for a UI that wants to show "rainfall so far" /
    "wind speed" alongside the forecast, same as it would with real sensors.
    """
    if region is not None:
        key = region.strip().lower()
        if key not in NER_REGIONS:
            raise ValueError(f"Unknown region '{region}'. Known regions: {sorted(NER_REGIONS)}")
        lat, lon = NER_REGIONS[key]["lat"], NER_REGIONS[key]["lon"]
        region_label = region.strip().title()
    elif lat is not None and lon is not None:
        region_label = f"{lat:.2f}, {lon:.2f}"
    else:
        raise ValueError("Provide either `region` or both `lat` and `lon`.")

    history_df = _current_conditions_for_region(lat, lon)
    center_id = _center_cell_id(history_df)
    center_history = history_df[history_df["grid_id"] == center_id].sort_values("timestamp")
    latest_raw = center_history.iloc[-1]

    predictions = pipeline.predict(
        history_df, rain_lead_hours=rain_lead_hours, flood_lead_hours=flood_lead_hours,
        with_explanation=True,
    )
    # pipeline.predict returns one row per (grid_id, timestamp) in the input;
    # take the center cell's most recent prediction.
    center_predictions = [
        p for p in predictions
        if p["location"] == center_id and p["forecast_time"] == str(latest_raw["timestamp"])
    ]
    result = center_predictions[-1] if center_predictions else predictions[-1]

    result = dict(result)
    result["region"] = region_label
    result["demo_mode"] = True
    result["data_source"] = "synthetic"
    result["data_source_notice"] = (
        "This prediction was produced by the real trained VarshaNetra model, "
        "but the 'current conditions' it was given as input are SIMULATED "
        "(no live satellite/radar/gauge feed is connected yet) — see "
        "inference/demo.py for how to swap in real ingestion."
    )
    result["current_conditions"] = {
        "rainfall_last_hour_mm": round(float(latest_raw["gauge_rainfall_mm"]), 2),
        "wind_speed_ms": round(float(latest_raw["wind_speed_ms"]), 2),
        "wind_dir_deg": round(float(latest_raw["wind_dir_deg"]), 1),
        "temperature_c": round(float(latest_raw["temperature_c"]), 1),
        "relative_humidity_pct": round(float(latest_raw["relative_humidity_pct"]), 1),
        "soil_moisture_pct": round(float(latest_raw["soil_moisture_pct"]), 1),
        "river_stage_m": round(float(latest_raw["river_stage_m"]), 2),
    }
    return result
