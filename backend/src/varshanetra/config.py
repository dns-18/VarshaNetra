"""
Central configuration loader.

Every module reads settings through `load_config()` so the whole system is
driven by a single YAML file (config/config.yaml) rather than scattered
constants. This keeps thresholds, feature lists, and hyperparameters
inspectable and diffable.
"""
from __future__ import annotations

import functools
import os
from pathlib import Path
from typing import Any, Dict

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = REPO_ROOT / "config" / "config.yaml"


@functools.lru_cache(maxsize=8)
def load_config(path: str | Path = DEFAULT_CONFIG_PATH) -> Dict[str, Any]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(path, "r") as f:
        cfg = yaml.safe_load(f)
    return cfg


def resolve_path(relative_path: str) -> Path:
    """Resolve a path from config['paths'] relative to the repo root."""
    p = Path(relative_path)
    if p.is_absolute():
        return p
    return REPO_ROOT / p


def get_device(cfg: Dict[str, Any] | None = None) -> str:
    """Return 'cuda' if available and requested, else 'cpu'. Import torch lazily
    so modules that don't need torch (e.g. the synthetic data generator) don't
    require it to be installed."""
    cfg = cfg or load_config()
    requested = cfg.get("project", {}).get("device", "cpu")
    if requested == "cpu":
        return "cpu"
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"
