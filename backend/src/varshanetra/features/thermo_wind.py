"""
THERMO-WIND RAINFALL PREDICTION MODULE
=======================================

Feature engineering that fuses satellite thermal (IR/cloud-top) fields with
wind-speed/direction fields to characterize evolving convective systems,
per Section 3 of the build spec.

All functions operate on a long-format DataFrame indexed by (grid_id,
timestamp) with neighbor relationships supplied explicitly (`neighbor_map`),
since "spatial" statistics (cold-cloud fraction, thermal gradient, connected
cold-cloud regions) require knowing which cells are adjacent. `neighbor_map`
is a dict[grid_id -> list[grid_id]] built once from lat/lon (see
`build_neighbor_map`).

IMPORTANT: every "rate of change" / "movement" feature here is computed using
only the current and *past* timestamps for a given grid cell — never a future
one — so this module never introduces temporal leakage on its own. Callers
are still responsible for windowing features into the model using only
observations available strictly before the target forecast time (Section 9,
data-leakage prevention).

The interaction features (Section 3, "explicit interaction features") are
NOT presented as causal atmospheric physics — they are candidate predictors
whose value is established only through the ablation study (Section 10),
per the spec's explicit instruction not to assume causality.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd
from scipy.spatial import cKDTree


# --------------------------------------------------------------------------
# Neighbor graph construction (needed for spatial thermal/wind statistics)
# --------------------------------------------------------------------------
def build_neighbor_map(static_df: pd.DataFrame, k: int = 5) -> Dict[str, List[str]]:
    """static_df must have one row per grid_id with lat/lon columns."""
    static_df = static_df.drop_duplicates("grid_id").reset_index(drop=True)
    coords = static_df[["lat", "lon"]].to_numpy()
    tree = cKDTree(coords)
    k = min(k, len(static_df))
    _, idx = tree.query(coords, k=k)
    idx = np.atleast_2d(idx)
    grid_ids = static_df["grid_id"].to_numpy()
    return {grid_ids[i]: grid_ids[row].tolist() for i, row in enumerate(idx)}


# --------------------------------------------------------------------------
# Thermal features (per cell, temporal)
# --------------------------------------------------------------------------
def thermal_temporal_features(df: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    """Adds items 1, 3, 4, 8, 9, 10 from the "From satellite thermal imagery"
    list: mean/std BT (rolling), thermal gradient, cooling/warming rate,
    anomaly vs. local baseline. Operates causally (past-only rolling windows)
    grouped by grid_id, sorted by timestamp."""
    df = df.sort_values(["grid_id", "timestamp"]).copy()
    g = df.groupby("grid_id", group_keys=False)

    df["ir1_bt_mean_3h"] = g["ir1_brightness_temp"].transform(
        lambda s: s.rolling(3, min_periods=1).mean())
    df["ir1_bt_std_3h"] = g["ir1_brightness_temp"].transform(
        lambda s: s.rolling(3, min_periods=1).std().fillna(0))
    df["ir1_bt_min_6h"] = g["ir1_brightness_temp"].transform(
        lambda s: s.rolling(6, min_periods=1).min())

    # thermal gradient: change in brightness temp between consecutive obs
    df["thermal_gradient"] = g["ir1_brightness_temp"].transform(
        lambda s: s.diff().fillna(0))

    # cooling / warming rate = negative / positive part of the gradient, per hour
    df["cloud_top_cooling_rate"] = (-df["thermal_gradient"]).clip(lower=0)
    df["cloud_top_warming_rate"] = df["thermal_gradient"].clip(lower=0)

    # local baseline = per-cell, per-hour-of-day historical mean (causal:
    # computed with an expanding window strictly on past rows only)
    df["hour_of_day"] = pd.to_datetime(df["timestamp"]).dt.hour
    df["_ir1_baseline"] = (
        df.groupby(["grid_id", "hour_of_day"])["ir1_brightness_temp"]
        .transform(lambda s: s.shift(1).expanding(min_periods=1).mean())
    )
    df["_ir1_baseline"] = df["_ir1_baseline"].fillna(df["ir1_brightness_temp"])
    df["thermal_anomaly"] = df["ir1_brightness_temp"] - df["_ir1_baseline"]
    df = df.drop(columns=["_ir1_baseline", "hour_of_day"])

    return df


# --------------------------------------------------------------------------
# Thermal features (spatial, per timestamp)
# --------------------------------------------------------------------------
def thermal_spatial_features(df: pd.DataFrame, neighbor_map: Dict[str, List[str]],
                              cfg: dict) -> pd.DataFrame:
    """Adds items 5, 6, 7, 11 (and supports 12 via the caller passing two
    consecutive timestamps): spatial thermal variance, cold-cloud fraction,
    area below threshold, connected cold-cloud regions (approximated as the
    fraction of a cell's immediate neighborhood also below threshold — a
    lightweight proxy for connected-component size that avoids needing a
    full raster + labeling pass for the tabular/grid-cell MVP)."""
    df = df.copy()
    threshold = cfg["thermo_wind"]["cold_cloud_threshold_k"]
    extra_thresholds = cfg["thermo_wind"]["extra_thresholds_k"]

    bt_by_time = df.pivot_table(index="timestamp", columns="grid_id",
                                 values="ir1_brightness_temp")

    spatial_var = pd.Series(index=df.index, dtype=float)
    cold_frac = pd.Series(index=df.index, dtype=float)
    neighbor_cold_frac = pd.Series(index=df.index, dtype=float)
    area_below = {th: pd.Series(index=df.index, dtype=float) for th in extra_thresholds}

    for grid_id, sub in df.groupby("grid_id"):
        neighbors = [n for n in neighbor_map.get(grid_id, [grid_id]) if n in bt_by_time.columns]
        neighbor_bt = bt_by_time.loc[sub["timestamp"], neighbors]
        spatial_var.loc[sub.index] = neighbor_bt.var(axis=1).fillna(0).values
        below_thresh = (neighbor_bt < threshold)
        neighbor_cold_frac.loc[sub.index] = below_thresh.mean(axis=1).fillna(0).values
        cold_frac.loc[sub.index] = (
            bt_by_time.loc[sub["timestamp"], grid_id] < threshold
        ).astype(float).values if grid_id in bt_by_time.columns else 0.0
        for th in extra_thresholds:
            area_below[th].loc[sub.index] = (neighbor_bt < th).mean(axis=1).fillna(0).values

    df["spatial_thermal_variance"] = spatial_var
    df["cold_cloud_fraction"] = cold_frac
    df["connected_cold_cloud_fraction"] = neighbor_cold_frac  # proxy for item 11
    for th in extra_thresholds:
        df[f"area_below_{int(th)}k_frac"] = area_below[th]

    return df


def cloud_motion_features(df: pd.DataFrame) -> pd.DataFrame:
    """Item 12: movement/evolution of cold-cloud regions between consecutive
    frames, approximated from the satellite Cloud Motion Vectors (cmv_u,
    cmv_v) plus the temporal change in cold-cloud fraction already computed."""
    df = df.sort_values(["grid_id", "timestamp"]).copy()
    df["cmv_speed"] = np.sqrt(df["cmv_u"] ** 2 + df["cmv_v"] ** 2)
    df["cmv_direction_deg"] = (np.degrees(np.arctan2(df["cmv_v"], df["cmv_u"])) + 360) % 360
    g = df.groupby("grid_id", group_keys=False)
    if "cold_cloud_fraction" in df.columns:
        df["cold_cloud_fraction_change"] = g["cold_cloud_fraction"].transform(
            lambda s: s.diff().fillna(0))
    return df


# --------------------------------------------------------------------------
# Wind features
# --------------------------------------------------------------------------
def wind_features(df: pd.DataFrame, neighbor_map: Dict[str, List[str]]) -> pd.DataFrame:
    """Items 1-11 from the "From wind data" list."""
    df = df.sort_values(["grid_id", "timestamp"]).copy()

    rad = np.radians(df["wind_dir_deg"])
    df["u_wind"] = -df["wind_speed_ms"] * np.sin(rad)
    df["v_wind"] = -df["wind_speed_ms"] * np.cos(rad)

    speed_by_time = df.pivot_table(index="timestamp", columns="grid_id", values="wind_speed_ms")
    u_by_time = df.pivot_table(index="timestamp", columns="grid_id", values="u_wind")
    v_by_time = df.pivot_table(index="timestamp", columns="grid_id", values="v_wind")

    grad = pd.Series(index=df.index, dtype=float)
    convergence = pd.Series(index=df.index, dtype=float)

    # crude finite-difference divergence using each cell's neighbor set as a
    # local stencil: divergence = mean(neighbor outward - center) — negative
    # values indicate convergence (moisture inflow).
    for grid_id, sub in df.groupby("grid_id"):
        neighbors = [n for n in neighbor_map.get(grid_id, [grid_id])
                     if n != grid_id and n in speed_by_time.columns]
        if not neighbors:
            grad.loc[sub.index] = 0.0
            convergence.loc[sub.index] = 0.0
            continue
        center_speed = speed_by_time.loc[sub["timestamp"], grid_id].values
        neighbor_speed_mean = speed_by_time.loc[sub["timestamp"], neighbors].mean(axis=1).values
        grad.loc[sub.index] = neighbor_speed_mean - center_speed

        center_u = u_by_time.loc[sub["timestamp"], grid_id].values
        center_v = v_by_time.loc[sub["timestamp"], grid_id].values
        neighbor_u_mean = u_by_time.loc[sub["timestamp"], neighbors].mean(axis=1).values
        neighbor_v_mean = v_by_time.loc[sub["timestamp"], neighbors].mean(axis=1).values
        # negative divergence proxy => convergence; sign-flip so higher = more convergence
        divergence_proxy = (neighbor_u_mean - center_u) + (neighbor_v_mean - center_v)
        convergence.loc[sub.index] = -divergence_proxy

    df["wind_speed_gradient"] = grad
    df["wind_convergence"] = convergence

    g = df.groupby("grid_id", group_keys=False)
    df["wind_dir_change"] = g["wind_dir_deg"].transform(
        lambda s: (s.diff().fillna(0) + 180) % 360 - 180)   # signed, wrapped
    df["wind_speed_change"] = g["wind_speed_ms"].transform(lambda s: s.diff().fillna(0))

    # moisture-transport proxy: wind speed weighted by relative humidity
    if "relative_humidity_pct" in df.columns:
        df["moisture_transport_proxy"] = df["wind_speed_ms"] * (df["relative_humidity_pct"] / 100.0)

    # wind shear across levels, where surface + 925 hPa wind both exist
    if {"u_wind_925hpa", "v_wind_925hpa"}.issubset(df.columns):
        du = df["u_wind_925hpa"] - df["u_wind"]
        dv = df["v_wind_925hpa"] - df["v_wind"]
        df["wind_shear_surface_925"] = np.sqrt(du ** 2 + dv ** 2)

    return df


# --------------------------------------------------------------------------
# Explicit thermal x wind interaction features
# --------------------------------------------------------------------------
def thermo_wind_interactions(df: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    """Section 3 "Create explicit interaction features". These are candidate
    predictors, not asserted physical mechanisms — see module docstring."""
    df = df.copy()
    enabled = set(cfg["thermo_wind"]["enabled_interactions"])

    if "cooling_rate_x_wind_speed" in enabled and {"cloud_top_cooling_rate", "wind_speed_ms"}.issubset(df.columns):
        df["cooling_rate_x_wind_speed"] = df["cloud_top_cooling_rate"] * df["wind_speed_ms"]

    if "cooling_rate_x_convergence" in enabled and {"cloud_top_cooling_rate", "wind_convergence"}.issubset(df.columns):
        df["cooling_rate_x_convergence"] = df["cloud_top_cooling_rate"] * df["wind_convergence"]

    if "cold_cloud_fraction_x_convergence" in enabled and {"cold_cloud_fraction", "wind_convergence"}.issubset(df.columns):
        df["cold_cloud_fraction_x_convergence"] = df["cold_cloud_fraction"] * df["wind_convergence"]

    if "cloud_top_temp_x_wind_speed" in enabled and {"cloud_top_temp", "wind_speed_ms"}.issubset(df.columns):
        df["cloud_top_temp_x_wind_speed"] = df["cloud_top_temp"] * df["wind_speed_ms"]

    if "thermal_gradient_x_wind_dir" in enabled and {"thermal_gradient", "wind_dir_deg"}.issubset(df.columns):
        df["thermal_gradient_x_wind_dir"] = df["thermal_gradient"] * np.cos(np.radians(df["wind_dir_deg"]))

    if "thermal_anomaly_x_convergence" in enabled and {"thermal_anomaly", "wind_convergence"}.issubset(df.columns):
        df["thermal_anomaly_x_convergence"] = df["thermal_anomaly"] * df["wind_convergence"]

    if "cloud_motion_dir_x_wind_dir" in enabled and {"cmv_direction_deg", "wind_dir_deg"}.issubset(df.columns):
        df["cloud_motion_dir_x_wind_dir"] = np.cos(
            np.radians(df["cmv_direction_deg"] - df["wind_dir_deg"]))

    return df


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------
THERMO_WIND_FEATURE_COLUMNS = [
    "ir1_bt_mean_3h", "ir1_bt_std_3h", "ir1_bt_min_6h", "thermal_gradient",
    "cloud_top_cooling_rate", "cloud_top_warming_rate", "thermal_anomaly",
    "spatial_thermal_variance", "cold_cloud_fraction", "connected_cold_cloud_fraction",
    "cmv_speed", "cmv_direction_deg", "cold_cloud_fraction_change",
    "u_wind", "v_wind", "wind_speed_gradient", "wind_convergence",
    "wind_dir_change", "wind_speed_change", "moisture_transport_proxy",
    "wind_shear_surface_925",
    "cooling_rate_x_wind_speed", "cooling_rate_x_convergence",
    "cold_cloud_fraction_x_convergence", "cloud_top_temp_x_wind_speed",
    "thermal_gradient_x_wind_dir", "thermal_anomaly_x_convergence",
    "cloud_motion_dir_x_wind_dir",
]


def build_thermo_wind_features(df: pd.DataFrame, cfg: dict,
                                neighbor_map: Dict[str, List[str]] | None = None) -> pd.DataFrame:
    """Runs the full Thermo-Wind pipeline and returns the input df with all
    engineered columns appended (see THERMO_WIND_FEATURE_COLUMNS)."""
    if neighbor_map is None:
        static_cols = ["grid_id", "lat", "lon"]
        neighbor_map = build_neighbor_map(df[static_cols])

    df = thermal_temporal_features(df, cfg)
    df = thermal_spatial_features(df, neighbor_map, cfg)
    df = cloud_motion_features(df)
    df = wind_features(df, neighbor_map)
    df = thermo_wind_interactions(df, cfg)
    return df
