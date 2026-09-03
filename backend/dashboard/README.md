# VarshaNetra Dashboard — Integration Structure

This is the piece the original build spec asked for under "dashboard
integration structure" and Section 15's *"the dashboard should be able to
show: Why did VarshaNetra issue this warning?"* — a minimal, working
reference dashboard plus the data contract any real frontend (React, Vue,
a BI tool, whatever the ops team standardizes on) would build against.

## What's here

- `index.html` — a self-contained, dependency-free HTML/CSS/JS dashboard.
  No build step, no external CDN calls (so it runs the same online or
  air-gapped). Open it directly in a browser, or serve it:
  ```bash
  cd dashboard && python3 -m http.server 8080
  ```
- `schema.md` (below) — the exact JSON contract it consumes.

It has two data sources, selectable in the UI:
1. **Live API** — calls `POST {api_base}/predict/full` on the FastAPI
   service in `src/varshanetra/inference/api.py`. This is the real
   integration path once the API is deployed.
2. **Static sample** — loads `../outputs/sample_prediction.json`, the
   actual output `run_mvp.py` produced. Useful for demoing the UI without
   a running model server, and for frontend developers to build against a
   real payload shape without needing the ML stack running locally.

## Data contract

The dashboard renders exactly the Section 16 output schema, one card per
record:

```json
{
  "location": "IND_10.90_68.00",
  "forecast_time": "2023-06-13 23:00:00",
  "rainfall_mm": 65.78,
  "rainfall_category": "Heavy",
  "heavy_rain_probability": 0.42,
  "flood_probability": 0.18,
  "inundation_depth_m": 0.87,
  "confidence": 0.83,
  "uncertainty": 0.17,
  "thermo_wind_signal": 0.31,
  "warning_level": "YELLOW",
  "top_contributing_features": [
    "cold_cloud_fraction increased the prediction (contribution=0.42)",
    "wind_convergence increased the prediction (contribution=0.31)"
  ]
}
```

The API wraps this in `{"predictions": [ ...one or more of the above... ]}`
(see `POST /predict/full` in `inference/api.py`).

### Rendering rules the dashboard follows

- **Warning badge color**: GREEN/YELLOW/ORANGE/RED map directly to the
  `warning_level` field — the dashboard never recomputes a warning level
  client-side; it only displays what the warning engine
  (`warning/engine.py`) decided, so there is exactly one place a threshold
  can be changed.
- **"Why this warning?" panel**: renders `top_contributing_features`
  verbatim, in order — the dashboard does not re-rank or filter this list,
  since doing so would create a second, UI-side notion of feature
  importance that could silently drift from what `explainability/explain.py`
  actually computed.
- **Confidence/uncertainty**: shown as a simple bar; `uncertainty` is
  `1 - confidence` by construction in the current sklearn-baseline pipeline
  (see `inference/pipeline.py::_confidence`), and will instead reflect real
  MC-dropout ensemble spread once the deep model
  (`models/varshanetra_model.py::predict_with_uncertainty`) is serving
  instead of the baseline — the dashboard doesn't need to change either way
  since both populate the same two fields.

## Extending this into a production dashboard

This reference implementation is intentionally minimal (no auth, no
routing, no map view) so it stays inspectable in one file. A production
build would likely:
- Replace the fetch-on-load with a websocket/polling subscription for
  live warning updates.
- Add a map view (grid cells are already lat/lon-addressable via the
  `location` field's underlying grid_id — see `data/schema.py`).
- Add the historical-event overlay described in Section 10's ablation
  (so operators can see how the model performed on past named events).
None of that changes the data contract above — only how it's consumed.
