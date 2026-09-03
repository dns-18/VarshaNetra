"""
Ablation study (Section 10) — the experiment that makes the Thermo-Wind
innovation scientifically measurable.

Trains, for a set of rainfall lead times:
    Baseline 1: NWP + weather
    Baseline 2: + Satellite
    Baseline 3: + Radar
    Proposed minus Thermo-Wind (Satellite + Radar + Ground + NWP + Terrain)
    Proposed  (... + Thermo-Wind module)
and reports whether adding Thermo-Wind features improves 1h/3h/6h rainfall
prediction, heavy-rain probability, extreme-event recall (POD), and flood
prediction — exactly the comparison Section 10 asks for.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd

from varshanetra.config import load_config
from varshanetra.data.dataset import chronological_split
from varshanetra.evaluation.metrics import regression_metrics, classification_metrics
from varshanetra.training.baseline import (build_stage_definitions, prepare_features,
                                            RainfallBaselineModel, FloodBaselineModel)


def run_rainfall_ablation(df: pd.DataFrame, lead_hours_list: List[int] | None = None,
                            cfg: Dict | None = None) -> pd.DataFrame:
    cfg = cfg or load_config()
    lead_hours_list = lead_hours_list or [1, 3, 6]
    splits = chronological_split(df, cfg)
    train, val, test, holdout = splits['train'], splits['validation'], splits['test'], splits['extreme_event_holdout']

    stages = build_stage_definitions()
    rows = []
    for stage in stages:
        cols = prepare_features(df, stage.feature_cols)
        for h in lead_hours_list:
            model = RainfallBaselineModel(h, cols).fit(train)
            pred = model.predict(test)

            reg_m = regression_metrics(test[f"rainfall_mm_t+{h}h"].values, pred["rain_mm"])
            cls_m = classification_metrics(
                test[f"heavy_rain_prob_t+{h}h"].values, pred["heavy_rain_prob"]
            )
            rows.append({
                "stage": stage.name, "lead_hours": h, "n_features": len(cols),
                **{f"rain_{k}": v for k, v in reg_m.items()},
                **{f"heavy_{k}": v for k, v in cls_m.items()},
            })
            print(f"[ablation] {stage.name:32s} +{h:>2}h  "
                  f"MAE={reg_m['mae']:.3f}  RMSE={reg_m['rmse']:.3f}  "
                  f"HeavyRain POD={cls_m['pod']:.3f}  CSI={cls_m['csi']:.3f}")
    return pd.DataFrame(rows)


def run_flood_ablation(df: pd.DataFrame, lead_hours_list: List[int] | None = None,
                        cfg: Dict | None = None) -> pd.DataFrame:
    cfg = cfg or load_config()
    lead_hours_list = lead_hours_list or [6, 24]
    splits = chronological_split(df, cfg)
    train, val, test, holdout = splits['train'], splits['validation'], splits['test'], splits['extreme_event_holdout']

    stages = build_stage_definitions()
    rows = []
    for stage in stages:
        cols = prepare_features(df, stage.feature_cols)
        for h in lead_hours_list:
            model = FloodBaselineModel(h, cols).fit(train)
            pred = model.predict(test)

            cls_m = classification_metrics(test[f"flood_occurred_t+{h}h"].values, pred["flood_prob"])
            rows.append({
                "stage": stage.name, "lead_hours": h,
                **{f"flood_{k}": v for k, v in cls_m.items()},
            })
            print(f"[flood ablation] {stage.name:32s} +{h:>2}h  "
                  f"POD={cls_m['pod']:.3f}  FAR={cls_m['far']:.3f}  CSI={cls_m['csi']:.3f}")
    return pd.DataFrame(rows)


def summarize_thermo_wind_effect(rain_ablation_df: pd.DataFrame) -> pd.DataFrame:
    """Direct 'without vs. with Thermo-Wind' comparison, holding everything
    else (Satellite+Radar+Ground+NWP+Terrain) fixed."""
    a = rain_ablation_df[rain_ablation_df.stage == "Proposed_minus_ThermoWind"].set_index("lead_hours")
    b = rain_ablation_df[rain_ablation_df.stage == "Proposed_+Terrain+ThermoWind"].set_index("lead_hours")
    common = a.index.intersection(b.index)
    delta = pd.DataFrame({
        "lead_hours": common,
        "mae_without_tw": a.loc[common, "rain_mae"].values,
        "mae_with_tw": b.loc[common, "rain_mae"].values,
        "mae_improvement_pct": (
            (a.loc[common, "rain_mae"].values - b.loc[common, "rain_mae"].values)
            / a.loc[common, "rain_mae"].values * 100
        ),
        "pod_without_tw": a.loc[common, "heavy_pod"].values,
        "pod_with_tw": b.loc[common, "heavy_pod"].values,
        "csi_without_tw": a.loc[common, "heavy_csi"].values,
        "csi_with_tw": b.loc[common, "heavy_csi"].values,
    })
    return delta


if __name__ == "__main__":
    from varshanetra.data.synthetic_data import load_table
    from varshanetra.features.thermo_wind import build_thermo_wind_features

    df = load_table("data_samples/raw/synthetic_varshanetra.parquet")
    from varshanetra.config import load_config as _load_config
    df = build_thermo_wind_features(df, _load_config())

    rain_results = run_rainfall_ablation(df)
    delta = summarize_thermo_wind_effect(rain_results)
    print("\n=== Thermo-Wind module effect on rainfall prediction ===")
    print(delta.to_string(index=False))

    rain_results.to_csv("outputs/ablation_rainfall_results.csv", index=False)
    delta.to_csv("outputs/ablation_thermo_wind_effect.csv", index=False)
