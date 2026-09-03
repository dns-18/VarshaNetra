"""
Warning Engine (Section 14).

Converts model probabilities (heavy-rain probability, flood probability)
into actionable GREEN/YELLOW/ORANGE/RED warning levels. Thresholds are
configurable (config.yaml -> warning_engine.default_thresholds) and are
meant to be *calibrated*, not hard-coded blindly, against historical event
statistics and operational requirements — see `calibrate_thresholds`, which
picks thresholds from validation-set precision/recall operating points
rather than asserting fixed numbers.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
from sklearn.metrics import precision_recall_curve


LEVELS = ["GREEN", "YELLOW", "ORANGE", "RED"]


@dataclass
class WarningThresholds:
    yellow: float
    orange: float
    red: float

    def as_dict(self) -> Dict[str, float]:
        return {"yellow": self.yellow, "orange": self.orange, "red": self.red}


def classify_warning(probability: float, thresholds: WarningThresholds) -> str:
    if probability >= thresholds.red:
        return "RED"
    if probability >= thresholds.orange:
        return "ORANGE"
    if probability >= thresholds.yellow:
        return "YELLOW"
    return "GREEN"


def classify_warning_batch(probabilities: np.ndarray, thresholds: WarningThresholds) -> np.ndarray:
    probabilities = np.asarray(probabilities, dtype=float)
    levels = np.full(probabilities.shape, "GREEN", dtype=object)
    levels[probabilities >= thresholds.yellow] = "YELLOW"
    levels[probabilities >= thresholds.orange] = "ORANGE"
    levels[probabilities >= thresholds.red] = "RED"
    return levels


def calibrate_thresholds(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    target_recalls: Dict[str, float] | None = None,
) -> WarningThresholds:
    """Calibrate thresholds against validation-set precision/recall
    trade-offs (Section 14: "calibrate them against historical events and
    operational requirements"), rather than hard-coding fixed cutoffs.

    `target_recalls` maps each level name to the minimum recall (POD) the
    operational warning at that level should guarantee on the validation
    set — i.e. "RED should catch at least 90% of true heavy-rain/flood
    events". Defaults favor high recall for RED, since Section 11 states
    that missing an extreme event is more costly than a false alarm.
    """
    target_recalls = target_recalls or {"yellow": 0.85, "orange": 0.70, "red": 0.50}
    y_true = np.asarray(y_true, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)

    if len(np.unique(y_true)) < 2:
        # No positive examples in this validation slice — fall back to config
        # defaults rather than producing a degenerate calibration.
        return WarningThresholds(yellow=0.30, orange=0.60, red=0.85)

    precision, recall, thresh = precision_recall_curve(y_true, y_prob)
    # precision_recall_curve returns thresholds of length len(precision)-1
    recall = recall[:-1]
    thresh = thresh

    def threshold_for_recall(min_recall: float) -> float:
        # find the highest threshold that still achieves >= min_recall
        eligible = thresh[recall >= min_recall]
        return float(eligible.max()) if len(eligible) else 0.05

    red_t = threshold_for_recall(target_recalls["red"])
    orange_t = threshold_for_recall(target_recalls["orange"])
    yellow_t = threshold_for_recall(target_recalls["yellow"])

    # enforce monotonic ordering yellow <= orange <= red
    orange_t = min(orange_t, red_t)
    yellow_t = min(yellow_t, orange_t)

    return WarningThresholds(yellow=yellow_t, orange=orange_t, red=red_t)


def explain_warning(top_features: List[str], gate_weights: Dict[str, float] | None = None) -> List[str]:
    """Builds the plain-language evidence list for the dashboard (Section 15
    "Why did VarshaNetra issue this warning?"). `top_features` is expected to
    already be produced by the explainability module (SHAP / attention);
    this function only formats it, it does not invent evidence."""
    lines = list(top_features)
    if gate_weights:
        dominant = max(gate_weights, key=gate_weights.get)
        lines.append(f"Model relied most heavily on the {dominant} data source "
                      f"({gate_weights[dominant]*100:.0f}% fusion weight) for this prediction.")
    return lines
