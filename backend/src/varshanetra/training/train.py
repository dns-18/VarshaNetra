"""
training/train.py — trains the full VarshaNetra deep model (Section 4/5/6/12).

IMPORTANT — READ BEFORE RUNNING
--------------------------------
This module requires `torch`, which is NOT installed in the sandbox this
repo was built in (no internet access to install it either). It has been
**syntax-checked only** (`python -m py_compile`), not executed end-to-end.
`training/baseline.py` + `training/ablation.py` are the modules that were
actually run and verified against real (synthetic) data — see
outputs/*.csv and README.md for those results.

Once torch is available, sanity-check this file the same way baseline.py
was checked: run it on a small synthetic slice first (few hundred windows,
1-2 epochs) and confirm loss decreases before trusting a full run.

What this does
---------------
Builds per-branch causal windows (satellite / radar / meteorology / nwp /
static) for a set of rainfall lead times, trains VarshaNetraModel jointly
across those lead times (the fusion layer's lead-time embedding lets one
model specialize per horizon), using the Section 5 multi-task loss and the
Section 6 imbalance handling (focal loss + event-aware sample weighting),
with early stopping on validation total loss, and checkpoints the best
model with torch.save.
"""
from __future__ import annotations

import copy
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd

from varshanetra.config import load_config, resolve_path, get_device
from varshanetra.data.dataset import chronological_split, build_causal_windows, event_aware_sample_weights
from varshanetra.data.schema import (SATELLITE_FIELDS, RADAR_FIELDS, GROUND_FIELDS,
                                      NWP_FIELDS, STATIC_FIELDS)
from varshanetra.features.thermo_wind import build_thermo_wind_features


# --------------------------------------------------------------------------
# Static categorical encoding (lulc_class / soil_type -> integer codes)
# --------------------------------------------------------------------------
def _encode_static_categoricals(df: pd.DataFrame, train_df: pd.DataFrame) -> pd.DataFrame:
    """Fits category->code mappings on the TRAIN split only (Section 9), then
    applies them everywhere, so the static branch's declared `in_features`
    (config.yaml model.encoders.static.in_features = 7, i.e. all of
    STATIC_FIELDS) stays numeric without leaking category vocabulary from
    val/test."""
    df = df.copy()
    for col in ("lulc_class", "soil_type"):
        categories = sorted(train_df[col].dropna().unique().tolist())
        mapping = {c: i for i, c in enumerate(categories)}
        df[col] = df[col].map(mapping).fillna(-1).astype(float)
    return df


# --------------------------------------------------------------------------
# Windowed multi-branch array construction
# --------------------------------------------------------------------------
def build_branch_arrays(
    df: pd.DataFrame,
    cfg: dict,
    lead_hours: int,
    window_steps: int,
) -> Dict[str, np.ndarray] | None:
    """Builds (satellite_seq, radar_seq, meteorology_seq, nwp_seq, static_feat)
    plus label arrays for ONE lead time, all row-aligned (same underlying
    grid_id/timestamp per sample across every branch — enforced by passing
    identical label_cols to every build_causal_windows call, so rows are
    dropped identically for every branch)."""
    label_cols = [
        f"rainfall_mm_t+{lead_hours}h", f"rainfall_category_t+{lead_hours}h",
        f"heavy_rain_prob_t+{lead_hours}h",
    ]
    flood_lead = _nearest_flood_lead(cfg, lead_hours)
    if flood_lead is not None:
        label_cols += [f"flood_occurred_t+{flood_lead}h", f"inundation_depth_m_t+{flood_lead}h"]

    if any(c not in df.columns for c in label_cols):
        return None

    branches = {
        "satellite_seq": SATELLITE_FIELDS,
        "radar_seq": RADAR_FIELDS,
        "meteorology_seq": GROUND_FIELDS,
        "nwp_seq": NWP_FIELDS,
    }

    out: Dict[str, np.ndarray] = {}
    meta_ref = None
    for branch_name, cols in branches.items():
        cols_present = [c for c in cols if c in df.columns]
        X, y, meta = build_causal_windows(df, cols_present, window_steps, label_cols)
        if len(X) == 0:
            return None
        if meta_ref is None:
            meta_ref = meta
        elif not meta.equals(meta_ref):
            raise RuntimeError(
                f"Branch '{branch_name}' produced a different sample set than "
                "other branches — this would misalign X/y across modalities. "
                "This should not happen since all branches share label_cols; "
                "check for branch-specific NaNs in the input columns."
            )
        out[branch_name] = X

    # static branch: single most-recent-row feature vector, but windowed with
    # the SAME window_steps as the sequence branches (then we take only the
    # last step) so the sample set — i.e. which (grid_id, timestamp) rows
    # survive the window_steps-1 warm-up period — matches exactly across
    # every branch. Windowing with window_steps=1 here would start one
    # branch's samples earlier than the others and silently misalign X/y.
    static_cols = [c for c in STATIC_FIELDS if c in df.columns]
    static_X, _, static_meta = build_causal_windows(df, static_cols, window_steps, label_cols)
    if not static_meta.equals(meta_ref):
        raise RuntimeError("Static branch sample set misaligned with sequence branches.")
    out["static_feat"] = static_X[:, -1, :]   # (N, T, F) -> (N, F), most recent step

    # labels
    _, y, _ = build_causal_windows(df, [SATELLITE_FIELDS[0]], window_steps, label_cols)
    out["rain_mm"] = y[:, 0].astype(float)
    out["heavy_rain_prob"] = y[:, 2].astype(float)
    if flood_lead is not None:
        out["flood_occurred"] = y[:, 3].astype(float)
        out["depth_m"] = y[:, 4].astype(float)
    else:
        out["flood_occurred"] = np.zeros(len(y))
        out["depth_m"] = np.zeros(len(y))

    # category is a string column — pull it straight from meta-aligned rows
    # rather than the (object-dtype) y array, for clarity.
    df_sorted = df.sort_values(["grid_id", "timestamp"]).reset_index(drop=True)
    cat_lookup = df_sorted.set_index(["grid_id", "timestamp"])[f"rainfall_category_t+{lead_hours}h"]
    out["rain_category_str"] = meta_ref.set_index(["grid_id", "timestamp"]).index.map(cat_lookup).to_numpy()

    out["meta"] = meta_ref
    out["lead_hours"] = lead_hours
    return out


def _nearest_flood_lead(cfg: dict, rain_lead_hours: int):
    flood_leads = cfg["time"]["flood_lead_hours"]
    if rain_lead_hours in flood_leads:
        return rain_lead_hours
    candidates = [h for h in flood_leads if h >= rain_lead_hours]
    return min(candidates) if candidates else max(flood_leads)


def encode_rain_categories(category_strs: np.ndarray, cfg: dict) -> np.ndarray:
    names = [c["name"] for c in cfg["rainfall_categories"]]
    lookup = {name: i for i, name in enumerate(names)}
    return np.array([lookup.get(c, 0) for c in category_strs], dtype=np.int64)


# --------------------------------------------------------------------------
# Training loop (torch-dependent — imported lazily so the rest of this
# module's helper functions remain importable/testable without torch)
# --------------------------------------------------------------------------
def train_deep_model(
    df: pd.DataFrame,
    cfg: dict | None = None,
    lead_hours_list: List[int] | None = None,
    window_steps: int = 5,
    epochs: int | None = None,
):
    import torch
    from torch.utils.data import Dataset, DataLoader

    from varshanetra.models.varshanetra_model import VarshaNetraModel
    from varshanetra.models.losses import VarshaNetraMultiTaskLoss

    cfg = cfg or load_config()
    lead_hours_list = lead_hours_list or cfg["time"]["rainfall_lead_hours"]
    epochs = epochs or cfg["training"]["epochs"]
    device = get_device(cfg)

    splits = chronological_split(df, cfg)
    train_df = _encode_static_categoricals(splits["train"], splits["train"])
    val_df = _encode_static_categoricals(splits["validation"], splits["train"])

    lead_to_idx = {h: i for i, h in enumerate(cfg["time"]["rainfall_lead_hours"])}

    def build_all_leads(split_df):
        arrays_per_lead = []
        for h in lead_hours_list:
            arr = build_branch_arrays(split_df, cfg, h, window_steps)
            if arr is None:
                print(f"[train_deep_model] skipping lead={h}h — insufficient data in this split")
                continue
            arr["lead_idx"] = np.full(len(arr["rain_mm"]), lead_to_idx[h], dtype=np.int64)
            arr["rain_class"] = encode_rain_categories(arr["rain_category_str"], cfg)
            arrays_per_lead.append(arr)
        return arrays_per_lead

    train_arrays = build_all_leads(train_df)
    val_arrays = build_all_leads(val_df)
    if not train_arrays:
        raise RuntimeError("No trainable windows were built — check window_steps vs. available "
                            "history length, and that label columns exist for lead_hours_list.")

    class WindowDataset(Dataset):
        def __init__(self, arrays_per_lead):
            self.samples = []
            for arr in arrays_per_lead:
                n = len(arr["rain_mm"])
                for i in range(n):
                    self.samples.append((arr, i))

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            arr, i = self.samples[idx]
            return {
                "satellite_seq": torch.tensor(arr["satellite_seq"][i], dtype=torch.float32),
                "radar_seq": torch.tensor(arr["radar_seq"][i], dtype=torch.float32),
                "meteorology_seq": torch.tensor(arr["meteorology_seq"][i], dtype=torch.float32),
                "nwp_seq": torch.tensor(arr["nwp_seq"][i], dtype=torch.float32),
                "static_feat": torch.tensor(arr["static_feat"][i], dtype=torch.float32),
                "lead_idx": torch.tensor(arr["lead_idx"][i], dtype=torch.long),
                "rain_mm": torch.tensor(arr["rain_mm"][i], dtype=torch.float32),
                "rain_class": torch.tensor(arr["rain_class"][i], dtype=torch.long),
                "heavy_rain_prob": torch.tensor(arr["heavy_rain_prob"][i], dtype=torch.float32),
                "flood_occurred": torch.tensor(arr["flood_occurred"][i], dtype=torch.float32),
                "depth_m": torch.tensor(arr["depth_m"][i], dtype=torch.float32),
            }

    train_ds = WindowDataset(train_arrays)
    val_ds = WindowDataset(val_arrays) if val_arrays else None

    # Section 6: event-aware sample weighting via a WeightedRandomSampler on
    # the binary heavy-rain flag, so minibatches are effectively rebalanced.
    all_heavy = np.concatenate([np.asarray(a["heavy_rain_prob"]) for a in train_arrays])
    weights = event_aware_sample_weights(
        all_heavy, cfg["class_imbalance"]["min_positive_fraction_per_batch"]
    )
    sampler = torch.utils.data.WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)

    batch_size = cfg["training"]["batch_size"]
    train_loader = DataLoader(train_ds, batch_size=batch_size, sampler=sampler)
    val_loader = DataLoader(val_ds, batch_size=batch_size) if val_ds and len(val_ds) else None

    model = VarshaNetraModel(
        cfg["model"], n_rain_categories=len(cfg["rainfall_categories"]),
        n_lead_times=len(cfg["time"]["rainfall_lead_hours"]),
    ).to(device)

    criterion = VarshaNetraMultiTaskLoss(
        cfg["loss_weights"], focal_gamma=cfg["class_imbalance"]["focal_gamma"],
    )
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=cfg["training"]["learning_rate"],
        weight_decay=cfg["training"]["weight_decay"],
    )

    best_val_loss = float("inf")
    patience = cfg["training"]["early_stopping_patience"]
    epochs_without_improvement = 0
    ckpt_dir = resolve_path(cfg["paths"]["checkpoint_dir"])
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    best_path = ckpt_dir / "varshanetra_deep_best.pt"

    for epoch in range(epochs):
        model.train()
        train_loss_sum, n_batches = 0.0, 0
        for batch in train_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            preds = model(batch, batch["lead_idx"])
            targets = {
                "rain_mm": batch["rain_mm"], "rain_class": batch["rain_class"],
                "heavy_rain_prob": batch["heavy_rain_prob"],
                "flood_occurred": batch["flood_occurred"], "depth_m": batch["depth_m"],
            }
            losses = criterion(preds, targets)
            optimizer.zero_grad()
            losses["total"].backward()
            optimizer.step()
            train_loss_sum += losses["total"].item()
            n_batches += 1
        train_loss = train_loss_sum / max(n_batches, 1)

        val_loss = train_loss
        if val_loader is not None:
            model.eval()
            val_loss_sum, n_val_batches = 0.0, 0
            with torch.no_grad():
                for batch in val_loader:
                    batch = {k: v.to(device) for k, v in batch.items()}
                    preds = model(batch, batch["lead_idx"])
                    targets = {
                        "rain_mm": batch["rain_mm"], "rain_class": batch["rain_class"],
                        "heavy_rain_prob": batch["heavy_rain_prob"],
                        "flood_occurred": batch["flood_occurred"], "depth_m": batch["depth_m"],
                    }
                    losses = criterion(preds, targets)
                    val_loss_sum += losses["total"].item()
                    n_val_batches += 1
            val_loss = val_loss_sum / max(n_val_batches, 1)

        print(f"[epoch {epoch+1}/{epochs}] train_loss={train_loss:.4f}  val_loss={val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            epochs_without_improvement = 0
            torch.save({"model_state_dict": model.state_dict(), "cfg": cfg,
                        "epoch": epoch, "val_loss": val_loss}, best_path)
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= patience:
                print(f"Early stopping at epoch {epoch+1} (no improvement for {patience} epochs).")
                break

    print(f"Best checkpoint saved to {best_path} (val_loss={best_val_loss:.4f})")
    return model, best_path


if __name__ == "__main__":
    from varshanetra.data.synthetic_data import generate_synthetic_dataset

    cfg = load_config()
    df = generate_synthetic_dataset(n_lat=6, n_lon=5, n_hours=24 * 30, start="2023-06-01", save_path=None)
    df = build_thermo_wind_features(df, cfg)
    train_deep_model(df, cfg, lead_hours_list=[1, 3, 6], epochs=5)
