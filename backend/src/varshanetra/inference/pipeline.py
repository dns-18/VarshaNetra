"""
Real-time inference pipeline (Section 13):

  Data ingestion -> QC -> spatial/temporal alignment -> Thermo-Wind features
  -> encoders -> fusion -> rainfall prediction -> flood prediction
  -> uncertainty estimation -> warning generation -> dashboard/API

This module implements the pipeline using the sklearn baseline models
trained by `training/baseline.py` (the artifact this MVP can actually train
and serve without GPU/torch). The interface is written so swapping in the
full `VarshaNetraModel` (models/varshanetra_model.py) — once trained on real
multimodal data — only requires implementing `_predict_deep()` below; the
QC/feature/warning stages are shared.
"""
from __future__ import annotations

import pickle
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from varshanetra.config import load_config, resolve_path
from varshanetra.features.thermo_wind import build_thermo_wind_features, build_neighbor_map
from varshanetra.warning.engine import WarningThresholds, classify_warning
from varshanetra.explainability.explain import shap_top_features


class QualityControl:
    """Section 13 "Quality control" stage. Flags/clips obviously invalid
    sensor readings so a single bad pixel/gauge doesn't corrupt a
    prediction. Deliberately simple range checks for the MVP — production
    QC (radar clutter/ground-echo masking, cloud-contamination flags) is a
    documented extension point, see dataset design doc Section 6."""

    RANGE_CHECKS = {
        "ir1_brightness_temp": (150, 320),
        "reflectivity_dbz": (-10, 75),
        "wind_speed_ms": (0, 80),
        "relative_humidity_pct": (0, 100),
        "gauge_rainfall_mm": (0, 500),
    }

    @classmethod
    def apply(cls, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        flags = pd.Series(False, index=df.index)
        for col, (lo, hi) in cls.RANGE_CHECKS.items():
            if col in df.columns:
                bad = (df[col] < lo) | (df[col] > hi)
                flags |= bad
                df.loc[bad, col] = np.nan
        df["_qc_flagged"] = flags
        # simple causal gap-fill: forward-fill within each grid cell only
        fill_cols = [c for c in cls.RANGE_CHECKS if c in df.columns]
        df[fill_cols] = df.groupby("grid_id")[fill_cols].ffill()
        return df


class InferencePipeline:
    def __init__(self, cfg: Optional[dict] = None, model_dir: str = "checkpoints"):
        self.cfg = cfg or load_config()
        self.model_dir = resolve_path(model_dir)
        self.rainfall_models: Dict[int, object] = {}
        self.flood_models: Dict[int, object] = {}
        self.thresholds = WarningThresholds(**self.cfg["warning_engine"]["default_thresholds"])
        self._neighbor_map = None

    # -------------------- model loading / saving --------------------
    def load_models(self):
        for h in self.cfg["time"]["rainfall_lead_hours"]:
            path = self.model_dir / f"rainfall_model_{h}h.pkl"
            if path.exists():
                with open(path, "rb") as f:
                    self.rainfall_models[h] = pickle.load(f)
        for h in self.cfg["time"]["flood_lead_hours"]:
            path = self.model_dir / f"flood_model_{h}h.pkl"
            if path.exists():
                with open(path, "rb") as f:
                    self.flood_models[h] = pickle.load(f)
        return self

    def save_model(self, model, name: str):
        self.model_dir.mkdir(parents=True, exist_ok=True)
        with open(self.model_dir / name, "wb") as f:
            pickle.dump(model, f)

    def set_thresholds(self, thresholds: WarningThresholds):
        self.thresholds = thresholds

    # -------------------- pipeline stages --------------------
    def ingest_and_qc(self, raw_records: pd.DataFrame) -> pd.DataFrame:
        return QualityControl.apply(raw_records)

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        if self._neighbor_map is None:
            self._neighbor_map = build_neighbor_map(df[["grid_id", "lat", "lon"]])
        return build_thermo_wind_features(df, self.cfg, neighbor_map=self._neighbor_map)

    def predict(self, df: pd.DataFrame, rain_lead_hours: int, flood_lead_hours: int,
                with_explanation: bool = True) -> List[dict]:
        """Runs the full ingestion->QC->features->prediction->warning chain
        and returns one output record per row, matching Section 16's output
        schema."""
        df = self.ingest_and_qc(df)
        df = self.engineer_features(df)

        rain_model = self.rainfall_models.get(rain_lead_hours)
        flood_model = self.flood_models.get(flood_lead_hours)
        if rain_model is None or flood_model is None:
            raise RuntimeError(
                f"No trained model for rain_lead={rain_lead_hours}h / "
                f"flood_lead={flood_lead_hours}h. Call load_models() after training, "
                f"or run training/baseline.py to produce checkpoints."
            )

        rain_pred = rain_model.predict(df)
        flood_pred = flood_model.predict(df)

        rain_categories = self.cfg["rainfall_categories"]

        outputs = []
        for i in range(len(df)):
            rain_mm = float(rain_pred["rain_mm"][i])
            heavy_prob = float(rain_pred["heavy_rain_prob"][i])
            flood_prob = float(flood_pred["flood_prob"][i])
            depth_m = float(flood_pred["depth_m"][i])

            category = _categorize_single(rain_mm, rain_categories)
            warning_level = classify_warning(max(heavy_prob, flood_prob), self.thresholds)

            explanation = []
            if with_explanation:
                try:
                    explanation = shap_top_features(
                        rain_model.regressor, df[rain_model.feature_cols].fillna(0).to_numpy(),
                        rain_model.feature_cols, sample_index=i, top_k=5,
                    )
                except Exception:
                    explanation = []

            outputs.append({
                "location": df.iloc[i]["grid_id"],
                "forecast_time": str(df.iloc[i]["timestamp"]),
                "rainfall_mm": round(rain_mm, 2),
                "rainfall_category": category,
                "heavy_rain_probability": round(heavy_prob, 3),
                "flood_probability": round(flood_prob, 3),
                "inundation_depth_m": round(depth_m, 3),
                "confidence": round(1.0 - abs(heavy_prob - 0.5) * 0, 3) if False else round(_confidence(heavy_prob, flood_prob), 3),
                "uncertainty": round(_uncertainty_proxy(heavy_prob, flood_prob), 3),
                "thermo_wind_signal": round(float(df.iloc[i].get("cooling_rate_x_convergence", 0.0)), 3),
                "warning_level": warning_level,
                "top_contributing_features": explanation,
            })
        return outputs


def _categorize_single(mm: float, categories) -> str:
    for cat in categories:
        if cat["min"] <= mm < cat["max"]:
            return cat["name"]
    return categories[-1]["name"]


def _confidence(heavy_prob: float, flood_prob: float) -> float:
    """A simple, monotonic confidence proxy: predictions near 0 or 1 are
    treated as higher-confidence than predictions near the decision
    boundary. Replaced by ensemble/MC-dropout agreement once the deep model
    (Section 12) is in the loop — see models/varshanetra_model.py
    `predict_with_uncertainty`."""
    p = max(heavy_prob, flood_prob)
    return 1.0 - 2.0 * min(p, 1 - p)


def _uncertainty_proxy(heavy_prob: float, flood_prob: float) -> float:
    return 1.0 - _confidence(heavy_prob, flood_prob)
