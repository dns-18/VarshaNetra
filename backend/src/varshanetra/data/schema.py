"""
Canonical record schema.

Mirrors the sample record in the dataset design document (satellite / radar /
observational / nwp / static / labels). This module is the single source of
truth for column names so preprocessing, feature engineering, and modeling
code never disagree about what a field is called.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

SATELLITE_FIELDS = [
    "ir1_brightness_temp", "ir2_brightness_temp", "wv_brightness_temp",
    "cloud_top_temp", "cloud_top_height_km", "olr", "cmv_u", "cmv_v",
    "insat_qpe_mm", "imerg_precip_mm",
]

RADAR_FIELDS = [
    "reflectivity_dbz", "radial_velocity_ms", "spectral_width",
    "echo_top_height_km", "vil_kg_m2", "radar_rainfall_rate_mmhr",
]

GROUND_FIELDS = [
    "gauge_rainfall_mm", "temperature_c", "relative_humidity_pct",
    "wind_speed_ms", "wind_dir_deg", "pressure_hpa", "soil_moisture_pct",
    "river_stage_m",
]

NWP_FIELDS = [
    "precip_forecast_mm", "temperature_c_nwp", "rh_pct_nwp",
    "u_wind_925hpa", "v_wind_925hpa", "cape_j_kg", "cin_j_kg",
    "vertical_velocity", "geopotential_500hpa",
]

STATIC_FIELDS = [
    "elevation_m", "slope_deg", "lulc_class", "soil_type",
    "distance_to_river_m", "drainage_density", "historical_flood_freq",
]

IDENTIFIER_FIELDS = ["grid_id", "timestamp", "lat", "lon"]

ALL_DYNAMIC_FIELDS = SATELLITE_FIELDS + RADAR_FIELDS + GROUND_FIELDS + NWP_FIELDS


def rainfall_label_columns(lead_hours: List[int]) -> List[str]:
    cols = []
    for h in lead_hours:
        cols += [f"rainfall_mm_t+{h}h", f"rainfall_category_t+{h}h",
                 f"heavy_rain_prob_t+{h}h"]
    return cols


def flood_label_columns(lead_hours: List[int]) -> List[str]:
    cols = []
    for h in lead_hours:
        cols += [f"flood_occurred_t+{h}h", f"inundation_depth_m_t+{h}h",
                  f"flood_extent_flag_t+{h}h"]
    return cols


@dataclass
class FeatureGroups:
    """Convenience container so downstream code can address a whole modality
    at once, e.g. `df[groups.satellite]`."""
    satellite: List[str] = field(default_factory=lambda: list(SATELLITE_FIELDS))
    radar: List[str] = field(default_factory=lambda: list(RADAR_FIELDS))
    ground: List[str] = field(default_factory=lambda: list(GROUND_FIELDS))
    nwp: List[str] = field(default_factory=lambda: list(NWP_FIELDS))
    static: List[str] = field(default_factory=lambda: list(STATIC_FIELDS))
