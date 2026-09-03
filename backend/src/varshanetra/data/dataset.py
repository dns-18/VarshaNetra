"""
Chronological splitting + causal temporal windowing.

Implements Section 9 (data-leakage prevention) and Section 7 (temporal
modeling) of the build spec:
  * strict chronological train/val/test split (never random row split)
  * an explicit extreme-event holdout carved out of train AND val AND test
  * causal windows: window for a prediction at time T only uses rows with
    timestamp <= T for that grid cell
  * scalers are fit on the training split only
"""
from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


def chronological_split(df: pd.DataFrame, cfg: dict) -> Dict[str, pd.DataFrame]:
    """Split by absolute timestamp per config['splits'], then additionally
    remove named extreme events from train/val (Section 9) so they form a
    clean holdout regardless of which calendar split they'd otherwise land
    in."""
    ts = pd.to_datetime(df["timestamp"])
    splits_cfg = cfg["splits"]

    def in_range(series, lo, hi):
        return (series >= pd.Timestamp(lo)) & (series <= pd.Timestamp(hi))

    train_mask = in_range(ts, *splits_cfg["train"])
    val_mask = in_range(ts, *splits_cfg["validation"])
    test_mask = in_range(ts, *splits_cfg["test"])

    event_mask = pd.Series(False, index=df.index)
    for ev in splits_cfg["extreme_event_holdout"]["events"]:
        event_mask |= in_range(ts, ev["start"], ev["end"])

    train_mask &= ~event_mask
    val_mask &= ~event_mask

    return {
        "train": df[train_mask].reset_index(drop=True),
        "validation": df[val_mask].reset_index(drop=True),
        "test": df[test_mask].reset_index(drop=True),
        "extreme_event_holdout": df[event_mask].reset_index(drop=True),
    }


def fit_scaler(train_df: pd.DataFrame, feature_cols: List[str]) -> StandardScaler:
    """Fit ONLY on the training split, per Section 9: "Fit normalization /
    scaling only on the training dataset."""
    scaler = StandardScaler()
    scaler.fit(train_df[feature_cols].fillna(0).values)
    return scaler


def apply_scaler(df: pd.DataFrame, feature_cols: List[str], scaler: StandardScaler) -> np.ndarray:
    return scaler.transform(df[feature_cols].fillna(0).values)


def build_causal_windows(
    df: pd.DataFrame,
    feature_cols: List[str],
    window_steps: int,
    label_cols: List[str],
    grid_col: str = "grid_id",
    time_col: str = "timestamp",
) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    """Build fixed-length causal (past-only) sequences per grid cell.

    Returns:
        X: array of shape (n_samples, window_steps, n_features)
        y: array of shape (n_samples, n_labels)
        meta: DataFrame of (grid_id, timestamp) for each sample, in the same
              order as X/y, for traceability during evaluation/inference.
    """
    df = df.sort_values([grid_col, time_col]).reset_index(drop=True)
    X_list, y_list, meta_rows = [], [], []

    for grid_id, sub in df.groupby(grid_col):
        sub = sub.reset_index(drop=True)
        feats = sub[feature_cols].fillna(0).values
        labels = sub[label_cols]
        n = len(sub)
        for i in range(window_steps - 1, n):
            # window is strictly [i-window_steps+1, i] — the "current" step i
            # is the latest OBSERVATION; the labels at row i are FUTURE
            # quantities already offset by the label-generation step, so no
            # information from t > i (observation time) ever enters X.
            window = feats[i - window_steps + 1: i + 1]
            label_row = labels.iloc[i]
            if label_row.isna().any():
                continue
            X_list.append(window)
            # Keep native per-column dtypes (object array) rather than
            # force-casting everything to float: label_cols may include a
            # non-numeric column (e.g. a rainfall category string) alongside
            # numeric ones. Callers that only need numeric labels can safely
            # `.astype(float)` the columns they select.
            y_list.append(label_row.values)
            meta_rows.append({grid_col: grid_id, time_col: sub.loc[i, time_col]})

    X = np.stack(X_list) if X_list else np.empty((0, window_steps, len(feature_cols)))
    y = np.stack(y_list) if y_list else np.empty((0, len(label_cols)))
    meta = pd.DataFrame(meta_rows)
    return X, y, meta


def event_aware_sample_weights(y_binary: np.ndarray, min_positive_fraction: float = 0.25) -> np.ndarray:
    """Per-sample weights so minibatches are effectively rebalanced toward
    rare positive (extreme-event) samples, per Section 6 (class-imbalance
    handling: event-aware sampling / balanced minibatches) without literally
    duplicating rows."""
    y_binary = np.asarray(y_binary).astype(int)
    n_pos = max(y_binary.sum(), 1)
    n_neg = max(len(y_binary) - n_pos, 1)
    target_pos_weight = min_positive_fraction / (n_pos / len(y_binary))
    target_neg_weight = (1 - min_positive_fraction) / (n_neg / len(y_binary))
    weights = np.where(y_binary == 1, target_pos_weight, target_neg_weight)
    return weights / weights.mean()
