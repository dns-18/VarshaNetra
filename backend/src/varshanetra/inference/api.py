"""
FastAPI inference API (Section 13: "... -> Dashboard/API").

Run with:
    uvicorn varshanetra.inference.api:app --host 0.0.0.0 --port 8000

Endpoints:
    GET  /health
    POST /predict/rainfall   -> Model A output for one or more grid cells
    POST /predict/flood      -> Model B output for one or more grid cells
    POST /predict/full       -> combined Section 16 output schema, incl. warning level
    GET  /demo/regions       -> named regions the demo endpoint supports
    POST /demo/predict       -> single-location prediction using simulated
                                 "current conditions" — for UIs without real
                                 sensor ingestion wired up yet, see inference/demo.py
    GET  /config/thresholds  -> current warning-level thresholds
    POST /config/calibrate   -> recalibrate thresholds from labeled validation data
"""
from __future__ import annotations

from typing import List, Optional

import pandas as pd

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "The inference API requires fastapi + pydantic. Install with: "
        "pip install fastapi uvicorn pydantic --break-system-packages"
    ) from e

from varshanetra.config import load_config
from varshanetra.inference.pipeline import InferencePipeline
from varshanetra.inference.demo import predict_for_region, NER_REGIONS
from varshanetra.warning.engine import WarningThresholds, calibrate_thresholds


app = FastAPI(
    title="VarshaNetra Inference API",
    description="AI/ML Heavy Rainfall Early-Warning & Inundation Prediction System",
    version="0.1.0",
)

# CORS: required for ANY browser-based UI (React/Vue/plain JS) served from a
# different origin than this API (e.g. UI on :3000, API on :8000) to call
# /predict/*. Origins are configurable via VARSHANETRA_ALLOWED_ORIGINS
# (comma-separated) so this can be locked down in production instead of
# left wide open. Server-to-server integrations (mobile app backend, another
# service) aren't subject to CORS at all and don't need this.
import os
_allowed_origins = os.environ.get("VARSHANETRA_ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allowed_origins == "*" else _allowed_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

_cfg = load_config()
_pipeline = InferencePipeline(_cfg).load_models()


class GridRecord(BaseModel):
    grid_id: str
    timestamp: str
    lat: float
    lon: float
    # dynamic fields are passed through as an open dict so the API doesn't
    # need to be updated every time a new sensor field is added upstream.
    features: dict = Field(default_factory=dict)


class PredictRequest(BaseModel):
    records: List[GridRecord]
    rainfall_lead_hours: int = 3
    flood_lead_hours: int = 6
    explain: bool = True


class CalibrateRequest(BaseModel):
    y_true: List[int]
    y_prob: List[float]
    target_recalls: Optional[dict] = None


class DemoPredictRequest(BaseModel):
    region: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    rainfall_lead_hours: int = 3
    flood_lead_hours: int = 6


def _records_to_df(records: List[GridRecord]) -> pd.DataFrame:
    rows = []
    for r in records:
        row = {"grid_id": r.grid_id, "timestamp": r.timestamp, "lat": r.lat, "lon": r.lon}
        row.update(r.features)
        rows.append(row)
    return pd.DataFrame(rows)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "rainfall_models_loaded": sorted(_pipeline.rainfall_models.keys()),
        "flood_models_loaded": sorted(_pipeline.flood_models.keys()),
    }


@app.post("/predict/full")
def predict_full(req: PredictRequest):
    if not req.records:
        raise HTTPException(status_code=400, detail="records must not be empty")
    df = _records_to_df(req.records)
    try:
        outputs = _pipeline.predict(
            df, rain_lead_hours=req.rainfall_lead_hours,
            flood_lead_hours=req.flood_lead_hours, with_explanation=req.explain,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"predictions": outputs}


@app.post("/predict/rainfall")
def predict_rainfall(req: PredictRequest):
    full = predict_full(req)
    keys = ["location", "forecast_time", "rainfall_mm", "rainfall_category",
            "heavy_rain_probability", "confidence", "uncertainty", "warning_level"]
    return {"predictions": [{k: p[k] for k in keys} for p in full["predictions"]]}


@app.post("/predict/flood")
def predict_flood(req: PredictRequest):
    full = predict_full(req)
    keys = ["location", "forecast_time", "flood_probability", "inundation_depth_m",
            "confidence", "uncertainty", "warning_level"]
    return {"predictions": [{k: p[k] for k in keys} for p in full["predictions"]]}


@app.get("/config/thresholds")
def get_thresholds():
    return _pipeline.thresholds.as_dict()


@app.post("/config/calibrate")
def calibrate(req: CalibrateRequest):
    thresholds = calibrate_thresholds(req.y_true, req.y_prob, req.target_recalls)
    _pipeline.set_thresholds(thresholds)
    return thresholds.as_dict()


@app.get("/demo/regions")
def demo_regions():
    """Named regions the demo endpoint recognizes. A frontend region
    selector should populate its options from this list rather than
    hard-coding it, so adding a region only requires editing
    inference/demo.py::NER_REGIONS."""
    return {"regions": [{"id": key, "label": key.title(), **coords}
                          for key, coords in NER_REGIONS.items()]}


@app.post("/demo/predict")
def demo_predict(req: DemoPredictRequest):
    """Single-location prediction for UIs without real sensor ingestion
    wired up yet — see inference/demo.py module docstring for exactly what
    is and isn't real about this endpoint's response (short version: the
    MODEL and its prediction are real; the 'current conditions' fed into it
    are simulated, and every response says so via `demo_mode`/`data_source`)."""
    try:
        result = predict_for_region(
            _pipeline, region=req.region, lat=req.lat, lon=req.lon,
            rain_lead_hours=req.rainfall_lead_hours, flood_lead_hours=req.flood_lead_hours,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return result
