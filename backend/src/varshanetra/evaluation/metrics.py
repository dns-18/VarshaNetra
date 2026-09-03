"""
Evaluation metrics (Section 11).

Rainfall regression : MAE, RMSE, R2, Bias, correlation
Rainfall classification (heavy-rain binary, and multi-class category) :
    Precision, Recall, F1, ROC-AUC, PR-AUC, CSI, POD, FAR
Flood prediction     : IoU, Dice, F1, Precision, Recall, RMSE (depth), MAE (water level)

CSI/POD/FAR are the standard categorical verification scores used in
operational meteorology (contingency-table based), reported explicitly
because Section 11 flags extreme-event recall/POD as the most important
number to track — missing an extreme event is more costly than a false alarm.
"""
from __future__ import annotations

from typing import Dict

import numpy as np
from sklearn.metrics import (mean_absolute_error, mean_squared_error, r2_score,
                              precision_score, recall_score, f1_score,
                              roc_auc_score, average_precision_score)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    mask = ~np.isnan(y_true)
    y_true, y_pred = y_true[mask], y_pred[mask]
    if len(y_true) == 0:
        return {k: float("nan") for k in ["mae", "rmse", "r2", "bias", "correlation"]}
    corr = np.corrcoef(y_true, y_pred)[0, 1] if np.std(y_pred) > 0 else float("nan")
    return {
        "mae": mean_absolute_error(y_true, y_pred),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": r2_score(y_true, y_pred) if len(np.unique(y_true)) > 1 else float("nan"),
        "bias": float(np.mean(y_pred - y_true)),
        "correlation": float(corr),
    }


def contingency_table(y_true_bin: np.ndarray, y_pred_bin: np.ndarray):
    tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
    fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
    fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))
    tn = int(np.sum((y_true_bin == 0) & (y_pred_bin == 0)))
    return tp, fp, fn, tn


def classification_metrics(y_true: np.ndarray, y_prob: np.ndarray,
                            threshold: float = 0.5) -> Dict[str, float]:
    y_true = np.asarray(y_true, float)
    y_prob = np.asarray(y_prob, float)
    y_pred = (y_prob >= threshold).astype(int)
    tp, fp, fn, tn = contingency_table(y_true.astype(int), y_pred)

    csi = tp / (tp + fp + fn) if (tp + fp + fn) > 0 else float("nan")
    pod = tp / (tp + fn) if (tp + fn) > 0 else float("nan")   # == recall
    far = fp / (tp + fp) if (tp + fp) > 0 else float("nan")   # false alarm ratio

    metrics = {
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "csi": csi, "pod": pod, "far": far,
    }
    if len(np.unique(y_true)) > 1:
        metrics["roc_auc"] = roc_auc_score(y_true, y_prob)
        metrics["pr_auc"] = average_precision_score(y_true, y_prob)
    else:
        metrics["roc_auc"] = float("nan")
        metrics["pr_auc"] = float("nan")
    return metrics


def flood_segmentation_metrics(y_true: np.ndarray, y_pred_prob: np.ndarray,
                                threshold: float = 0.5) -> Dict[str, float]:
    y_true = np.asarray(y_true, float)
    y_pred = (np.asarray(y_pred_prob, float) >= threshold).astype(int)
    tp, fp, fn, tn = contingency_table(y_true.astype(int), y_pred)

    intersection = tp
    union = tp + fp + fn
    iou = intersection / union if union > 0 else float("nan")
    dice = 2 * intersection / (2 * tp + fp + fn) if (2 * tp + fp + fn) > 0 else float("nan")

    return {
        "iou": iou, "dice": dice,
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
    }


def water_level_metrics(y_true_depth: np.ndarray, y_pred_depth: np.ndarray) -> Dict[str, float]:
    y_true_depth, y_pred_depth = np.asarray(y_true_depth, float), np.asarray(y_pred_depth, float)
    return {
        "rmse_depth": float(np.sqrt(mean_squared_error(y_true_depth, y_pred_depth))),
        "mae_depth": mean_absolute_error(y_true_depth, y_pred_depth),
    }
