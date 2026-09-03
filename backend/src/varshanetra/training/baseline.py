"""
Baseline / ablation models (Section 10).

The full VarshaNetra architecture (models/varshanetra_model.py) needs
PyTorch + GPU and real satellite/radar imagery. This module implements the
same four configurations the spec's ablation study calls for —
    Baseline 1: NWP + conventional weather observations
    Baseline 2: Satellite + weather + NWP
    Baseline 3: Satellite + Radar + weather + NWP
    Proposed  : Satellite + Radar + Ground + NWP + Terrain + Thermo-Wind
— using gradient-boosted trees (sklearn) on flattened, lagged tabular
features. This is deliberately a *weaker* model class than the deep
multimodal network; the point of running it here is to prove out the data
pipeline, the leakage-safe split, and — most importantly — whether the
Thermo-Wind features carry independent signal at all, on real (or in this
MVP, synthetic-but-structurally-faithful) data, before spending GPU budget
training the full architecture. This mirrors Section 17's mandate to build
progressively and compare performance at every stage.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder

# HistGradientBoosting (histogram-binned GBM) rather than plain
# GradientBoosting*: numerically equivalent modeling family, but 1-2 orders
# of magnitude faster to fit at this dataset scale, which matters because
# the ablation study (Section 10) trains many (stage x lead-time x task)
# model combinations.
GradientBoostingRegressor = HistGradientBoostingRegressor
GradientBoostingClassifier = HistGradientBoostingClassifier

from varshanetra.data.dataset import chronological_split
from varshanetra.data.schema import (SATELLITE_FIELDS, RADAR_FIELDS,
                                      GROUND_FIELDS, NWP_FIELDS, STATIC_FIELDS)
from varshanetra.features.thermo_wind import THERMO_WIND_FEATURE_COLUMNS as THERMO_WIND_ALL

LAG_HOURS = [1, 3, 6]


@dataclass
class AblationStage:
    name: str
    feature_cols: List[str]


def build_stage_definitions(include_thermo_wind_split: bool = True) -> List[AblationStage]:
    ground_no_wind = [c for c in GROUND_FIELDS]
    static_numeric = [c for c in STATIC_FIELDS if c not in ("lulc_class", "soil_type")]

    baseline1 = NWP_FIELDS + ground_no_wind
    baseline2 = baseline1 + SATELLITE_FIELDS
    baseline3 = baseline2 + RADAR_FIELDS
    proposed = baseline3 + static_numeric + THERMO_WIND_ALL

    stages = [
        AblationStage("Baseline1_NWP_Weather", baseline1),
        AblationStage("Baseline2_+Satellite", baseline2),
        AblationStage("Baseline3_+Radar", baseline3),
        AblationStage("Proposed_+Terrain+ThermoWind", proposed),
    ]
    if include_thermo_wind_split:
        without_tw = baseline3 + static_numeric
        stages.insert(3, AblationStage("Proposed_minus_ThermoWind", without_tw))
    return stages


def prepare_features(df: pd.DataFrame, feature_cols: List[str]) -> List[str]:
    """Adds causal lag features for the requested columns and returns the
    final expanded column list actually present in `df`."""
    present = [c for c in feature_cols if c in df.columns]
    return present


class RainfallBaselineModel:
    """Gradient-boosted trees for rainfall regression + heavy-rain
    classification at a single lead time."""

    def __init__(self, lead_hours: int, feature_cols: List[str]):
        self.lead_hours = lead_hours
        self.feature_cols = feature_cols
        self.regressor = GradientBoostingRegressor(
            max_iter=150, max_depth=3, learning_rate=0.08, random_state=42
        )
        self.classifier = GradientBoostingClassifier(
            max_iter=150, max_depth=3, learning_rate=0.08, random_state=42
        )
        self.label_encoder = LabelEncoder()

    def fit(self, train_df: pd.DataFrame):
        X = train_df[self.feature_cols].fillna(0).to_numpy()
        y_reg = train_df[f"rainfall_mm_t+{self.lead_hours}h"].fillna(0).to_numpy()
        y_cls = train_df[f"heavy_rain_prob_t+{self.lead_hours}h"].fillna(0).to_numpy()
        self.regressor.fit(X, y_reg)
        if len(np.unique(y_cls)) > 1:
            self.classifier.fit(X, y_cls)
        else:
            self.classifier = None
        return self

    def predict(self, df: pd.DataFrame) -> Dict[str, np.ndarray]:
        X = df[self.feature_cols].fillna(0).to_numpy()
        rain_mm = np.clip(self.regressor.predict(X), 0, None)
        if self.classifier is not None:
            heavy_prob = self.classifier.predict_proba(X)[:, 1]
        else:
            heavy_prob = np.zeros(len(X))
        return {"rain_mm": rain_mm, "heavy_rain_prob": heavy_prob}


class FloodBaselineModel:
    def __init__(self, lead_hours: int, feature_cols: List[str]):
        self.lead_hours = lead_hours
        self.feature_cols = feature_cols
        self.classifier = GradientBoostingClassifier(
            max_iter=150, max_depth=3, learning_rate=0.08, random_state=42
        )
        self.depth_regressor = GradientBoostingRegressor(
            max_iter=150, max_depth=3, learning_rate=0.08, random_state=42
        )

    def fit(self, train_df: pd.DataFrame):
        X = train_df[self.feature_cols].fillna(0).to_numpy()
        y_cls = train_df[f"flood_occurred_t+{self.lead_hours}h"].fillna(0).to_numpy()
        y_depth = train_df[f"inundation_depth_m_t+{self.lead_hours}h"].fillna(0).to_numpy()
        if len(np.unique(y_cls)) > 1:
            self.classifier.fit(X, y_cls)
        else:
            self.classifier = None
        self.depth_regressor.fit(X, y_depth)
        return self

    def predict(self, df: pd.DataFrame) -> Dict[str, np.ndarray]:
        X = df[self.feature_cols].fillna(0).to_numpy()
        flood_prob = (self.classifier.predict_proba(X)[:, 1]
                      if self.classifier is not None else np.zeros(len(X)))
        depth = np.clip(self.depth_regressor.predict(X), 0, None)
        return {"flood_prob": flood_prob, "depth_m": depth}
