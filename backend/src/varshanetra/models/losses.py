"""
Multi-task losses (Section 5) + class-imbalance handling (Section 6).

L_total = lambda1 * L_rain_reg + lambda2 * L_rain_cls + lambda3 * L_flood_cls
        + lambda4 * L_depth + lambda5 * L_seg
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """Multi-class focal loss for imbalanced rainfall-category classification
    and binary focal loss for heavy-rain / flood classification."""

    def __init__(self, gamma: float = 2.0, class_weights: torch.Tensor | None = None,
                 binary: bool = False):
        super().__init__()
        self.gamma = gamma
        self.class_weights = class_weights
        self.binary = binary

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        if self.binary:
            bce = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")
            p = torch.sigmoid(logits)
            p_t = p * targets + (1 - p) * (1 - targets)
            loss = ((1 - p_t) ** self.gamma) * bce
            return loss.mean()

        ce = F.cross_entropy(logits, targets, weight=self.class_weights, reduction="none")
        p_t = torch.exp(-ce)
        loss = ((1 - p_t) ** self.gamma) * ce
        return loss.mean()


class DiceLoss(nn.Module):
    """Dice loss for spatial flood-extent segmentation, typically combined
    with BCE (Section 5)."""

    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        probs = probs.reshape(probs.size(0), -1)
        targets = targets.reshape(targets.size(0), -1)
        intersection = (probs * targets).sum(dim=1)
        union = probs.sum(dim=1) + targets.sum(dim=1)
        dice = (2 * intersection + self.smooth) / (union + self.smooth)
        return 1 - dice.mean()


class DiceBCELoss(nn.Module):
    def __init__(self, bce_weight: float = 0.5):
        super().__init__()
        self.dice = DiceLoss()
        self.bce_weight = bce_weight

    def forward(self, logits, targets):
        bce = F.binary_cross_entropy_with_logits(logits, targets)
        dice = self.dice(logits, targets)
        return self.bce_weight * bce + (1 - self.bce_weight) * dice


class VarshaNetraMultiTaskLoss(nn.Module):
    """Combines all five task losses with configurable lambda weights, and
    supports the class-imbalance strategies from Section 6 (focal loss +
    class weighting; event-aware sampling/balanced batches are handled at
    the DataLoader/sampler level, see training/train.py's WeightedRandomSampler).

    Also trains the standalone "heavy_rain_probability" output that Section 1
    lists as a required Model A output (distinct from the multi-class
    rain_class head) — weighted by loss_weights.get("heavy_rain_probability", 0.5)
    so existing configs without that key still work."""

    def __init__(self, loss_weights: dict, focal_gamma: float = 2.0,
                 rain_class_weights: torch.Tensor | None = None):
        super().__init__()
        self.lw = loss_weights
        self.huber = nn.SmoothL1Loss()
        self.rain_cls_loss = FocalLoss(gamma=focal_gamma, class_weights=rain_class_weights, binary=False)
        self.flood_cls_loss = FocalLoss(gamma=focal_gamma, binary=True)
        self.heavy_prob_loss = FocalLoss(gamma=focal_gamma, binary=True)
        self.seg_loss = DiceBCELoss()

    def forward(self, preds: dict, targets: dict) -> dict:
        """`preds`/`targets` are dicts with keys:
        rain_mm, rain_class_logits, flood_prob_logits, depth_m, seg_logits
        (targets carries the ground-truth analogs, with *_valid masks where a
        task's label may be missing for a given sample)."""
        losses = {}

        losses["rain_reg"] = self.huber(preds["rain_mm"], targets["rain_mm"])
        losses["rain_cls"] = self.rain_cls_loss(preds["rain_class_logits"], targets["rain_class"])
        losses["flood_cls"] = self.flood_cls_loss(
            preds["flood_prob_logits"].squeeze(-1), targets["flood_occurred"]
        )
        losses["depth"] = self.huber(preds["depth_m"], targets["depth_m"])

        if "heavy_rain_prob_logits" in preds and "heavy_rain_prob" in targets:
            losses["heavy_prob"] = self.heavy_prob_loss(
                preds["heavy_rain_prob_logits"], targets["heavy_rain_prob"]
            )
        else:
            losses["heavy_prob"] = torch.tensor(0.0, device=preds["rain_mm"].device)

        if "seg_logits" in preds and "seg_target" in targets:
            losses["seg"] = self.seg_loss(preds["seg_logits"], targets["seg_target"])
        else:
            losses["seg"] = torch.tensor(0.0, device=preds["rain_mm"].device)

        total = (
            self.lw["rain_regression"] * losses["rain_reg"]
            + self.lw["rain_classification"] * losses["rain_cls"]
            + self.lw["flood_classification"] * losses["flood_cls"]
            + self.lw["inundation_depth"] * losses["depth"]
            + self.lw["flood_segmentation"] * losses["seg"]
            + self.lw.get("heavy_rain_probability", 0.5) * losses["heavy_prob"]
        )
        losses["total"] = total
        return losses
