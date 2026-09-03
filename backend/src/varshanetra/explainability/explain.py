"""
Explainability (Section 15).

Tabular features (meteorology, NWP, thermo-wind, static terrain) -> SHAP.
Spatial/thermal imagery (satellite/radar branches)                -> Grad-CAM
                                                                       / attention maps.

Both entry points degrade gracefully (return an approximate, clearly-labeled
fallback) if the optional `shap` / `torch` dependencies aren't installed, so
the rest of the system (warning engine, API) can still run in minimal
environments — but the production path uses the real libraries.

Section 15 also asks the dashboard to be able to answer "why did VarshaNetra
issue this warning?" — `top_contributing_features` implements exactly that,
and is deliberately kept separate from `warning/engine.py::explain_warning`,
which only *formats* whatever this module attributes; it never invents
evidence on its own.
"""
from __future__ import annotations

from typing import Dict, List, Sequence

import numpy as np


def shap_top_features(model, X: np.ndarray, feature_names: Sequence[str],
                       background: np.ndarray | None = None, top_k: int = 5,
                       sample_index: int = 0) -> List[str]:
    """SHAP-based feature attribution for a tree/sklearn-style model
    (`model.predict` must exist). Falls back to a permutation-importance-like
    proxy if `shap` is not installed, so this function is always callable.
    """
    try:
        import shap  # noqa: F401
        background = background if background is not None else X[: min(50, len(X))]
        explainer = shap.Explainer(model.predict, background)
        shap_values = explainer(X[sample_index: sample_index + 1])
        contributions = shap_values.values[0]
    except ImportError:
        contributions = _fallback_local_sensitivity(model, X, sample_index)

    order = np.argsort(-np.abs(contributions))[:top_k]
    lines = []
    for idx in order:
        direction = "increased" if contributions[idx] > 0 else "decreased"
        lines.append(f"{feature_names[idx]} {direction} the prediction "
                      f"(contribution={contributions[idx]:.3f})")
    return lines


def _fallback_local_sensitivity(model, X: np.ndarray, sample_index: int,
                                 eps: float = 0.5) -> np.ndarray:
    """Finite-difference local sensitivity, used only when `shap` isn't
    installed. Uses a fraction-of-a-standard-deviation step (rather than a
    tiny epsilon) so tree-based models — whose predictions are locally flat
    between split points — still show a signal. Clearly an approximation,
    not a substitute for real SHAP values in production."""
    x0 = X[sample_index: sample_index + 1].copy()
    base = model.predict(x0)[0]
    contributions = np.zeros(X.shape[1])
    for j in range(X.shape[1]):
        x_perturbed = x0.copy()
        step = eps * (np.std(X[:, j]) + 1e-6)
        x_perturbed[0, j] += step
        pred = model.predict(x_perturbed)[0]
        contributions[j] = pred - base
    return contributions


def gate_weight_attribution(gate_weights: Dict[str, float]) -> List[str]:
    """Turns the fusion layer's learned per-branch gate weights (see
    models/fusion.py CrossAttentionGatingFusion) into a plain-language
    evidence line — this is a real, model-internal attribution, not a proxy,
    since the gate weights ARE what the network used to combine branches."""
    ordered = sorted(gate_weights.items(), key=lambda kv: -kv[1])
    return [f"{name} branch contributed {weight*100:.0f}% of the fused representation"
            for name, weight in ordered]


def grad_cam(model, input_tensor, target_layer_name: str, class_idx: int | None = None):
    """Grad-CAM for the satellite/radar ConvLSTM branches (Section 15,
    spatial/thermal imagery explainability). Requires torch; raises a clear
    error rather than silently no-op'ing if torch isn't available, since
    there is no safe tabular fallback for a spatial saliency map."""
    try:
        import torch
    except ImportError as e:
        raise ImportError(
            "grad_cam() requires PyTorch. Install torch (see requirements.txt) "
            "to generate spatial saliency maps for the satellite/radar branches."
        ) from e

    activations = {}
    gradients = {}

    def fwd_hook(module, inp, out):
        activations["value"] = out

    def bwd_hook(module, grad_in, grad_out):
        gradients["value"] = grad_out[0]

    target_layer = dict(model.named_modules())[target_layer_name]
    h1 = target_layer.register_forward_hook(fwd_hook)
    h2 = target_layer.register_full_backward_hook(bwd_hook)

    model.zero_grad()
    output = model(input_tensor)
    score = output[:, class_idx] if class_idx is not None else output.sum()
    score.backward()

    h1.remove()
    h2.remove()

    weights = gradients["value"].mean(dim=(2, 3), keepdim=True)  # (B,C,1,1)
    cam = torch.relu((weights * activations["value"]).sum(dim=1))  # (B,H,W)
    cam = cam / (cam.amax(dim=(1, 2), keepdim=True) + 1e-8)
    return cam.detach().cpu().numpy()
