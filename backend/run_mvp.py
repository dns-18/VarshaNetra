"""
run_mvp.py — End-to-end VarshaNetra MVP (Section 17).

Builds and evaluates the system progressively, exactly as the spec asks:
    1. Weather + NWP baseline
    2. + Satellite
    3. + Radar
    4-6. + Thermographic / wind-pattern / thermo-wind interaction features
    7. + Flood module
    (8-10: uncertainty / explainability / real-time deployment are wired
     into the InferencePipeline + API and demonstrated on the trained
     stage-7 models at the end of this script.)

Usage:
    PYTHONPATH=src python3 run_mvp.py
"""
from __future__ import annotations

import copy
import json
import time
from pathlib import Path

import pandas as pd

from varshanetra.config import load_config, resolve_path
from varshanetra.data.synthetic_data import generate_synthetic_dataset
from varshanetra.features.thermo_wind import build_thermo_wind_features
from varshanetra.data.dataset import chronological_split
from varshanetra.training.baseline import (build_stage_definitions, prepare_features,
                                            RainfallBaselineModel, FloodBaselineModel)
from varshanetra.training.ablation import run_rainfall_ablation, run_flood_ablation, summarize_thermo_wind_effect
from varshanetra.evaluation.metrics import regression_metrics, classification_metrics
from varshanetra.warning.engine import calibrate_thresholds
from varshanetra.inference.pipeline import InferencePipeline
from varshanetra.explainability.explain import shap_top_features


def get_mvp_config():
    """The full config.yaml targets a 2015-2025 operational deployment. For
    the MVP smoke-run we generate a much smaller synthetic window and
    monkeypatch the chronological split to match it, so `run_mvp.py` runs in
    seconds instead of requiring the full multi-year dataset. Swap back to
    the unmodified config.yaml once real multi-year data is available."""
    cfg = copy.deepcopy(load_config())
    cfg["splits"]["train"] = ["2023-06-01", "2023-06-20"]
    cfg["splits"]["validation"] = ["2023-06-21", "2023-06-24"]
    cfg["splits"]["test"] = ["2023-06-25", "2023-06-30"]
    cfg["splits"]["extreme_event_holdout"]["events"] = []
    return cfg


def section(title: str):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


def main():
    t_start = time.time()
    cfg = get_mvp_config()
    outputs_dir = resolve_path(cfg["paths"]["outputs_dir"])
    outputs_dir.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------------- #
    section("STAGE 0 — Generate / load dataset (synthetic stand-in; see "
            "data/synthetic_data.py docstring for why, and how to replace it "
            "with real INSAT/IMD/NCMRWF ingestion)")
    df = generate_synthetic_dataset(
        n_lat=6, n_lon=5, n_hours=24 * 30, start="2023-06-01", save_path="data_samples/raw/mvp_dataset.parquet",
    )
    print(f"Raw dataset: {df.shape[0]} rows x {df.shape[1]} cols "
          f"({df['grid_id'].nunique()} grid cells x {df['timestamp'].nunique()} timesteps)")

    section("STAGE 1-6 — Feature engineering: base features + Thermo-Wind module")
    df = build_thermo_wind_features(df, cfg)
    print(f"After Thermo-Wind feature engineering: {df.shape[1]} columns")

    splits = chronological_split(df, cfg)
    train, val, test = splits["train"], splits["validation"], splits["test"]
    print(f"Chronological split -> train={len(train)}  val={len(val)}  test={len(test)}")

    # ---------------------------------------------------------------- #
    section("STAGE 1-6 (progressive) — Baseline1..Proposed rainfall ablation")
    rain_ablation = run_rainfall_ablation(df, lead_hours_list=[1, 3, 6], cfg=cfg)
    rain_ablation.to_csv(outputs_dir / "ablation_rainfall_results.csv", index=False)
    tw_effect = summarize_thermo_wind_effect(rain_ablation)
    tw_effect.to_csv(outputs_dir / "ablation_thermo_wind_effect.csv", index=False)
    print("\nThermo-Wind module effect on rainfall prediction (MAE / heavy-rain POD & CSI):")
    print(tw_effect.to_string(index=False))

    # ---------------------------------------------------------------- #
    section("STAGE 7 — Flood / inundation module ablation")
    flood_ablation = run_flood_ablation(df, lead_hours_list=[6, 24], cfg=cfg)
    flood_ablation.to_csv(outputs_dir / "ablation_flood_results.csv", index=False)

    # ---------------------------------------------------------------- #
    section("Train final PROPOSED-stage models for every configured lead time "
            "(these are what the inference pipeline / API serve)")
    stages = build_stage_definitions()
    proposed_cols = prepare_features(df, stages[-1].feature_cols)
    print(f"Proposed model feature count: {len(proposed_cols)}")

    pipeline = InferencePipeline(cfg, model_dir=cfg["paths"]["checkpoint_dir"])
    rain_metrics_rows = []
    for h in cfg["time"]["rainfall_lead_hours"]:
        if f"rainfall_mm_t+{h}h" not in df.columns:
            continue
        model = RainfallBaselineModel(h, proposed_cols).fit(train)
        pipeline.save_model(model, f"rainfall_model_{h}h.pkl")
        pred = model.predict(test)
        reg_m = regression_metrics(test[f"rainfall_mm_t+{h}h"].values, pred["rain_mm"])
        cls_m = classification_metrics(test[f"heavy_rain_prob_t+{h}h"].values, pred["heavy_rain_prob"])
        rain_metrics_rows.append({"lead_hours": h, **{f"rain_{k}": v for k, v in reg_m.items()},
                                   **{f"heavy_{k}": v for k, v in cls_m.items()}})
        print(f"  rainfall +{h:>2}h  MAE={reg_m['mae']:.3f}  RMSE={reg_m['rmse']:.3f}  "
              f"heavy-rain POD={cls_m['pod']:.3f}  CSI={cls_m['csi']:.3f}")
    pd.DataFrame(rain_metrics_rows).to_csv(outputs_dir / "final_rainfall_metrics.csv", index=False)

    flood_metrics_rows = []
    flood_val_probs, flood_val_true = None, None
    for h in cfg["time"]["flood_lead_hours"]:
        if f"flood_occurred_t+{h}h" not in df.columns:
            continue
        model = FloodBaselineModel(h, proposed_cols).fit(train)
        pipeline.save_model(model, f"flood_model_{h}h.pkl")
        pred = model.predict(test)
        cls_m = classification_metrics(test[f"flood_occurred_t+{h}h"].values, pred["flood_prob"])
        flood_metrics_rows.append({"lead_hours": h, **{f"flood_{k}": v for k, v in cls_m.items()}})
        print(f"  flood    +{h:>2}h  POD={cls_m['pod']:.3f}  FAR={cls_m['far']:.3f}  CSI={cls_m['csi']:.3f}")
        if h == cfg["time"]["flood_lead_hours"][0]:
            val_pred = model.predict(val)
            flood_val_probs = val_pred["flood_prob"]
            flood_val_true = val[f"flood_occurred_t+{h}h"].values
    pd.DataFrame(flood_metrics_rows).to_csv(outputs_dir / "final_flood_metrics.csv", index=False)

    # ---------------------------------------------------------------- #
    section("STAGE 8 — Warning-level calibration (validation-set PR operating points)")
    if flood_val_true is not None:
        thresholds = calibrate_thresholds(flood_val_true, flood_val_probs)
        print(f"Calibrated thresholds: {thresholds.as_dict()}")
        with open(outputs_dir / "calibrated_warning_thresholds.json", "w") as f:
            json.dump(thresholds.as_dict(), f, indent=2)
        pipeline.set_thresholds(thresholds)

    # ---------------------------------------------------------------- #
    section("STAGE 9 — Explainability sample (SHAP-style top contributing features)")
    pipeline.load_models()
    sample_grid = test["grid_id"].iloc[0]
    sample_input = test[test["grid_id"] == sample_grid].sort_values("timestamp").tail(5)
    input_cols = ["grid_id", "timestamp", "lat", "lon"] + [
        c for c in proposed_cols if c in df.columns and not c.startswith(("ir1_bt_mean", "ir1_bt_std"))
    ]
    # feed already-engineered rows straight through (predict() re-derives
    # thermo-wind features, which is idempotent on already-derived columns
    # for this demo since we pass the full engineered frame)
    sample_outputs = pipeline.predict(
        sample_input, rain_lead_hours=cfg["time"]["rainfall_lead_hours"][1],
        flood_lead_hours=cfg["time"]["flood_lead_hours"][0], with_explanation=True,
    )

    section("STAGE 10 — Sample real-time prediction output (Section 16 schema)")
    print(json.dumps(sample_outputs[-1], indent=2, default=str))
    with open(outputs_dir / "sample_prediction.json", "w") as f:
        json.dump(sample_outputs, f, indent=2, default=str)

    section("Deployment note")
    print(
        "Trained baseline checkpoints are in "
        f"'{cfg['paths']['checkpoint_dir']}/'. Serve them with:\n"
        "    uvicorn varshanetra.inference.api:app --reload\n"
        "(requires `pip install fastapi uvicorn pydantic`).\n"
        "The full multimodal deep architecture (models/varshanetra_model.py) "
        "is implemented and ready to train once torch + real satellite/radar "
        "raster tiles are available — see README.md 'Scaling beyond the MVP'."
    )

    print(f"\nTotal run_mvp.py time: {time.time() - t_start:.1f}s")


if __name__ == "__main__":
    main()
