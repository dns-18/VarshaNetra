"""
Synthetic data generator.

VarshaNetra's real data sources (INSAT-3D/3DR, IMD DWR radar, AWS/ARG gauges,
NCMRWF NWP, DEM/LULC) require institutional access (MOSDAC / IMD / NCMRWF
registration — see dataset design doc, Section 7/8). To let the rest of the
pipeline (feature engineering, model, training, evaluation, warning engine,
API) be built and *actually run* without that access, this module synthesizes
a physically-plausible stand-in dataset with the same schema.

Design of the synthetic process (so the Thermo-Wind ablation in Section 10
of the spec has real signal to detect):
  1. A latent per-cell, per-timestep "convective intensity" field is drawn
     from a spatially-correlated AR(1) process with occasional storm bursts.
  2. Satellite cloud-top temperature is an inverse, lagged, noisy function of
     convective intensity (cooling precedes the rain peak).
  3. Wind convergence is elevated just ahead of storm bursts (moisture
     inflow), radar reflectivity peaks *at* the storm burst (radar sees
     precipitation, not pre-convective cooling) — this timing offset is what
     gives the Thermo-Wind module (which sees the cooling+convergence lead
     signal) genuine predictive value over radar/NWP-only baselines.
  4. Rainfall at each step is drawn from the intensity field; multi-horizon
     labels are forward sums/aggregates of the *true* generative process
     (this is label construction, not a leaked input feature).
  5. River stage integrates upstream rainfall with terrain-dependent decay;
     flood labels are a function of river stage, elevation and drainage.

Replace this module with real ingestion (Section 3/9 of the build spec) when
licensed data access is available — nothing downstream needs to change since
the output schema matches `schema.py` / the dataset design doc exactly.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

from varshanetra.config import load_config, resolve_path
from varshanetra.data.schema import (SATELLITE_FIELDS, RADAR_FIELDS,
                                      GROUND_FIELDS, NWP_FIELDS, STATIC_FIELDS)


def _make_grid(n_lat: int, n_lon: int, bbox, center: tuple[float, float] | None = None,
                span_deg: float = 0.3):
    """Builds an n_lat x n_lon grid.

    Default behavior (center=None) is unchanged: a small grid anchored near
    the bbox's SW corner, as used by the main dataset/ablation pipeline.

    `center=(lat, lon)` instead builds the grid centered on an arbitrary
    point spanning `span_deg` degrees — used by the single-location demo
    endpoint (inference/demo.py) to generate a plausible "current
    conditions" reading for a place that isn't in the training bbox's
    default corner (e.g. North-East India for a demo UI)."""
    if center is not None:
        center_lat, center_lon = center
        half = span_deg / 2
        lats = np.linspace(center_lat - half, center_lat + half, n_lat)
        lons = np.linspace(center_lon - half, center_lon + half, n_lon)
    else:
        min_lon, min_lat, max_lon, max_lat = bbox
        lats = np.linspace(min_lat, min_lat + (max_lat - min_lat) * 0.15, n_lat)
        lons = np.linspace(min_lon, min_lon + (max_lon - min_lon) * 0.15, n_lon)
    LAT, LON = np.meshgrid(lats, lons, indexing="ij")
    grid_lat = LAT.ravel()
    grid_lon = LON.ravel()
    grid_id = [f"IND_{la:.2f}_{lo:.2f}" for la, lo in zip(grid_lat, grid_lon)]
    return np.array(grid_id), grid_lat, grid_lon


def _static_terrain(rng, n_cells, grid_lat, grid_lon):
    """One synthetic river runs diagonally through the domain; elevation
    rises with distance from it so flood risk is spatially structured."""
    river_frac = (grid_lat - grid_lat.min()) / (grid_lat.max() - grid_lat.min() + 1e-9)
    river_lon_at_lat = grid_lon.min() + river_frac * (grid_lon.max() - grid_lon.min())
    dist_to_river_deg = np.abs(grid_lon - river_lon_at_lat)
    distance_to_river_m = dist_to_river_deg * 111_000

    elevation_m = 20 + distance_to_river_m * 0.08 + rng.normal(0, 5, n_cells)
    elevation_m = np.clip(elevation_m, 0, None)
    slope_deg = np.clip(rng.gamma(2.0, 1.0, n_cells), 0, 20)
    drainage_density = np.clip(rng.beta(2, 3, n_cells), 0.02, 1.0)
    lulc_choices = np.array(["urban", "cropland", "forest", "wetland", "barren"])
    lulc_class = rng.choice(lulc_choices, size=n_cells,
                             p=[0.25, 0.35, 0.2, 0.1, 0.1])
    soil_choices = np.array(["alluvial", "clay", "sandy", "loam"])
    soil_type = rng.choice(soil_choices, size=n_cells)
    historical_flood_freq = np.clip(
        (1 - distance_to_river_m / distance_to_river_m.max()) * rng.uniform(0.3, 1.0, n_cells),
        0, 1)

    return pd.DataFrame({
        "elevation_m": elevation_m,
        "slope_deg": slope_deg,
        "lulc_class": lulc_class,
        "soil_type": soil_type,
        "distance_to_river_m": distance_to_river_m,
        "drainage_density": drainage_density,
        "historical_flood_freq": historical_flood_freq,
    })


def generate_synthetic_dataset(
    n_lat: int = 5,
    n_lon: int = 4,
    n_hours: int = 720,
    start: str = "2023-06-01",
    freq_minutes: int = 60,
    seed: int | None = None,
    save_path: str | None = None,
    center: tuple[float, float] | None = None,
    span_deg: float = 0.3,
) -> pd.DataFrame:
    """Generate a long-format (grid_id, timestamp) table covering all
    modalities in schema.py, plus multi-horizon rainfall/flood labels.

    `center`/`span_deg`: see `_make_grid` — pass a (lat, lon) to anchor the
    grid on an arbitrary point (e.g. for inference/demo.py's single-location
    "current conditions" endpoint) instead of the default bbox corner.
    """
    cfg = load_config()
    seed = seed if seed is not None else cfg["project"]["seed"]
    rng = np.random.default_rng(seed)

    bbox = cfg["grid"]["region_bbox"]
    grid_id, grid_lat, grid_lon = _make_grid(n_lat, n_lon, bbox, center=center, span_deg=span_deg)
    n_cells = len(grid_id)
    static_df = _static_terrain(rng, n_cells, grid_lat, grid_lon)

    coords = np.stack([grid_lat, grid_lon], axis=1)
    tree = cKDTree(coords)
    _, neighbor_idx = tree.query(coords, k=min(5, n_cells))  # incl. self

    timestamps = pd.date_range(start=start, periods=n_hours, freq=f"{freq_minutes}min")

    # ---- latent spatially-correlated convective intensity, AR(1) + bursts ----
    # Two burst tiers (frequent-moderate, rare-extreme) + sub-unity persistence
    # so the field mean-reverts instead of random-walking, giving a realistic
    # rainfall distribution: mostly light/no rain with a heavy right tail.
    intensity = np.zeros((n_hours, n_cells))
    for t in range(1, n_hours):
        spatial_smooth = intensity[t - 1][neighbor_idx].mean(axis=1)
        normal_burst = (rng.random(n_cells) < 0.010) * rng.gamma(3.0, 1.0, n_cells)
        extreme_burst = (rng.random(n_cells) < 0.0012) * rng.gamma(6.0, 3.0, n_cells)
        noise = np.clip(rng.normal(0, 0.1, n_cells), 0, None)
        intensity[t] = np.clip(
            0.60 * intensity[t - 1] + 0.08 * spatial_smooth
            + normal_burst + extreme_burst + noise,
            0, None,
        )
    diurnal = 0.06 * np.sin(2 * np.pi * (np.arange(n_hours) % 24) / 24 - 1.2) + 0.05
    intensity = np.clip(intensity + diurnal[:, None], 0, None)

    # lead indicators: cooling/convergence precede the peak by ~1-2 steps,
    # radar/rain coincide with the peak.
    lead1 = np.roll(intensity, -1, axis=0)
    lead2 = np.roll(intensity, -2, axis=0)
    lead1[-1:] = intensity[-1:]
    lead2[-2:] = intensity[-2:]

    records = []
    river_stage = np.full(n_cells, 1.5)  # baseline stage in metres

    for t in range(n_hours):
        I = intensity[t]
        I_lead = 0.6 * lead1[t] + 0.4 * lead2[t]  # pre-convective signal

        # --- satellite thermal: cooler cloud tops precede the rain peak ---
        cloud_top_temp = 260 - 55 * np.tanh(I_lead) + rng.normal(0, 3, n_cells)
        ir1 = cloud_top_temp + rng.normal(0, 1.5, n_cells)
        ir2 = cloud_top_temp + rng.normal(0.5, 1.5, n_cells)
        wv_bt = cloud_top_temp + 8 + rng.normal(0, 2, n_cells)
        cloud_top_height_km = np.clip(4 + 0.05 * (260 - cloud_top_temp), 0, 18)
        olr = np.clip(320 - 1.1 * (260 - cloud_top_temp), 80, 320)
        cmv_u = rng.normal(3, 2, n_cells)
        cmv_v = rng.normal(2, 2, n_cells)
        imerg_precip = np.clip(3.4 * I + rng.normal(0, 0.3, n_cells), 0, None)
        insat_qpe = np.clip(imerg_precip * rng.uniform(0.85, 1.15, n_cells), 0, None)

        # --- radar: coincides with the actual (not lead) intensity ---
        reflectivity_dbz = np.clip(10 + 22 * np.log1p(I), 0, 65)
        radial_velocity = rng.normal(0, 5, n_cells) + 3 * np.tanh(I)
        spectral_width = np.clip(rng.normal(2, 0.8, n_cells), 0, None)
        echo_top_height_km = np.clip(3 + 0.6 * np.log1p(I) * 6, 0, 16)
        vil = np.clip(2.5 * I + rng.normal(0, 1, n_cells), 0, None)
        radar_rain_rate = np.clip(2.8 * I + rng.normal(0, 0.6, n_cells), 0, None)

        # --- ground: wind convergence rises ahead of the burst ---
        base_wind_dir = 210 + 20 * np.sin(2 * np.pi * t / (24 * 5)) + rng.normal(0, 15, n_cells)
        wind_speed = np.clip(3 + 4 * np.tanh(I_lead) + rng.normal(0, 1.2, n_cells), 0, None)
        wind_dir = np.mod(base_wind_dir, 360)
        temperature_c = 29 - 4 * np.tanh(I) + rng.normal(0, 1, n_cells)
        rh_pct = np.clip(65 + 25 * np.tanh(I_lead) + rng.normal(0, 5, n_cells), 10, 100)
        pressure_hpa = 1006 - 6 * np.tanh(I) + rng.normal(0, 1, n_cells)
        soil_moisture = np.clip(30 + 15 * np.tanh(river_stage / 4) + rng.normal(0, 3, n_cells), 5, 95)
        gauge_rainfall = np.clip(imerg_precip * rng.uniform(0.9, 1.1, n_cells), 0, None)

        river_stage = (
            0.93 * river_stage
            + 0.35 * gauge_rainfall * (1 - static_df["drainage_density"].values * 0.5)
            + 0.05 * static_df["historical_flood_freq"].values
        )

        # --- NWP: coarser, smoothed, forecast-style (imperfect vs obs) ---
        precip_forecast = np.clip(imerg_precip * rng.uniform(0.6, 1.3, n_cells)
                                    + rng.normal(0, 1.5, n_cells), 0, None)
        cape = np.clip(800 + 1800 * np.tanh(I_lead) + rng.normal(0, 200, n_cells), 0, None)
        cin = np.clip(rng.normal(60, 30, n_cells) * (1 - np.tanh(I_lead)), 0, None)
        vertical_velocity = -0.5 * np.tanh(I_lead) + rng.normal(0, 0.1, n_cells)
        geopotential_500 = 5820 + rng.normal(0, 15, n_cells)
        u925 = wind_speed * np.cos(np.radians(wind_dir)) + rng.normal(0, 1, n_cells)
        v925 = wind_speed * np.sin(np.radians(wind_dir)) + rng.normal(0, 1, n_cells)

        df_t = pd.DataFrame({
            "grid_id": grid_id, "timestamp": timestamps[t],
            "lat": grid_lat, "lon": grid_lon,
            "ir1_brightness_temp": ir1, "ir2_brightness_temp": ir2,
            "wv_brightness_temp": wv_bt, "cloud_top_temp": cloud_top_temp,
            "cloud_top_height_km": cloud_top_height_km, "olr": olr,
            "cmv_u": cmv_u, "cmv_v": cmv_v,
            "insat_qpe_mm": insat_qpe, "imerg_precip_mm": imerg_precip,
            "reflectivity_dbz": reflectivity_dbz, "radial_velocity_ms": radial_velocity,
            "spectral_width": spectral_width, "echo_top_height_km": echo_top_height_km,
            "vil_kg_m2": vil, "radar_rainfall_rate_mmhr": radar_rain_rate,
            "gauge_rainfall_mm": gauge_rainfall, "temperature_c": temperature_c,
            "relative_humidity_pct": rh_pct, "wind_speed_ms": wind_speed,
            "wind_dir_deg": wind_dir, "pressure_hpa": pressure_hpa,
            "soil_moisture_pct": soil_moisture, "river_stage_m": river_stage,
            "precip_forecast_mm": precip_forecast, "temperature_c_nwp": temperature_c + rng.normal(0, 1, n_cells),
            "rh_pct_nwp": np.clip(rh_pct + rng.normal(0, 5, n_cells), 10, 100),
            "u_wind_925hpa": u925, "v_wind_925hpa": v925,
            "cape_j_kg": cape, "cin_j_kg": cin,
            "vertical_velocity": vertical_velocity, "geopotential_500hpa": geopotential_500,
            "_true_intensity": I,        # latent, kept only for label construction below
            "_true_rainfall_mm": gauge_rainfall,
        })
        records.append(df_t)

    long_df = pd.concat(records, ignore_index=True)
    long_df = long_df.merge(
        static_df.assign(grid_id=grid_id), on="grid_id", how="left"
    )
    long_df = _add_multi_horizon_labels(long_df, cfg, n_cells, grid_id, freq_minutes)
    long_df = long_df.drop(columns=["_true_intensity"])

    if save_path:
        out = resolve_path(save_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        _save_table(long_df, out)

    return long_df


def _save_table(df: pd.DataFrame, out) -> None:
    """Parquet is the production format (Section 3 of the dataset design doc
    prefers NetCDF/Zarr for gridded stacks, Parquet for flattened rows). Fall
    back to pickle when no parquet engine (pyarrow/fastparquet) is installed,
    so the pipeline still runs end-to-end in minimal environments."""
    try:
        df.to_parquet(out, index=False)
    except ImportError:
        fallback = out.with_suffix(".pkl")
        df.to_pickle(fallback)
        print(f"[synthetic_data] pyarrow/fastparquet not installed — "
              f"saved {fallback} instead of {out}.")


def _categorize(mm: np.ndarray, categories) -> np.ndarray:
    out = np.array(["No Rain"] * len(mm), dtype=object)
    for cat in categories:
        mask = (mm >= cat["min"]) & (mm < cat["max"])
        out[mask] = cat["name"]
    return out


def _add_multi_horizon_labels(long_df, cfg, n_cells, grid_id, freq_minutes):
    wide_rain = long_df.pivot(index="timestamp", columns="grid_id", values="_true_rainfall_mm")
    wide_rain = wide_rain[grid_id]  # preserve column order
    steps_per_hour = max(1, 60 // freq_minutes)
    categories = cfg["rainfall_categories"]

    for h in cfg["time"]["rainfall_lead_hours"]:
        k = max(1, h * steps_per_hour)
        # rolling forward sum over the next k steps (label, not an input feature)
        fwd_sum = wide_rain.iloc[::-1].rolling(window=k, min_periods=1).sum().iloc[::-1]
        fwd_sum = fwd_sum.shift(-1)  # exclude current step, purely future
        long_df[f"rainfall_mm_t+{h}h"] = fwd_sum.stack().reindex(
            pd.MultiIndex.from_frame(long_df[["timestamp", "grid_id"]])
        ).values
        long_df[f"rainfall_category_t+{h}h"] = _categorize(
            long_df[f"rainfall_mm_t+{h}h"].fillna(0).values, categories
        )
        long_df[f"heavy_rain_prob_t+{h}h"] = (
            long_df[f"rainfall_mm_t+{h}h"].fillna(0) >= 64.5
        ).astype(float)

    wide_stage = long_df.pivot(index="timestamp", columns="grid_id", values="river_stage_m")[grid_id]
    danger_stage = 18.0     # ~ high percentile of the synthetic stage distribution -> flood is a rare event
    for h in cfg["time"]["flood_lead_hours"]:
        k = max(1, h * steps_per_hour)
        fwd_max_stage = wide_stage.iloc[::-1].rolling(window=k, min_periods=1).max().iloc[::-1].shift(-1)
        stage_vals = fwd_max_stage.stack().reindex(
            pd.MultiIndex.from_frame(long_df[["timestamp", "grid_id"]])
        ).values
        long_df[f"flood_occurred_t+{h}h"] = (stage_vals >= danger_stage).astype(float)
        long_df[f"inundation_depth_m_t+{h}h"] = np.clip(stage_vals - danger_stage, 0, None)
        long_df[f"flood_extent_flag_t+{h}h"] = long_df[f"flood_occurred_t+{h}h"]

    return long_df


def load_table(path) -> pd.DataFrame:
    """Load a table saved by `_save_table`, trying parquet then the pickle
    fallback."""
    path = resolve_path(path)
    if path.exists():
        try:
            return pd.read_parquet(path)
        except ImportError:
            pass
    pkl_path = path.with_suffix(".pkl")
    if pkl_path.exists():
        return pd.read_pickle(pkl_path)
    raise FileNotFoundError(f"Neither {path} nor {pkl_path} exists.")


if __name__ == "__main__":
    df = generate_synthetic_dataset(save_path="data_samples/raw/synthetic_varshanetra.parquet")
    print(df.shape)
    print(df.head())
