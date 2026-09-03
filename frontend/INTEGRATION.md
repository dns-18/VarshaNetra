# Integrating this UI with the VarshaNetra ML backend

This documents exactly what was changed to connect this React/Vite dashboard
to the real VarshaNetra model (the Python repo with `src/varshanetra/`,
`run_mvp.py`, `checkpoints/`, etc.), and what's still mock/out of scope.

## What changed

| File | Change |
|---|---|
| `src/services/varshanetraApi.ts` | **New.** Typed client for the FastAPI backend (`/demo/predict`, `/demo/regions`, `/predict/full`, `/health`). |
| `src/pages/Dashboard.tsx` | **Rewritten.** Now calls `fetchDemoPrediction()` instead of `mockData.generateStateMetrics()`. Falls back to the old mock generator (clearly labeled "offline preview") if the backend is unreachable. |
| `src/pages/Dashboard.original.tsx.bak` | The pre-integration version, kept for reference/diffing. Not imported anywhere — safe to delete. |
| `.env.example` | **New.** `VITE_API_BASE_URL`. Copy to `.env.local`. |
| `src/services/mockData.ts` | **Unchanged.** Still used for (a) the offline fallback and (b) the "All Monitored Regions" sensor-status grid — see "What's still mock" below. |

Backend-side, to support this:
- `src/varshanetra/inference/demo.py` (new) — generates a physically-consistent
  synthetic "current conditions" reading for a named NER region, then runs it
  through the **real trained model**. See that file's docstring for exactly
  what's real (the model, the prediction) vs. simulated (the sensor inputs).
- `src/varshanetra/inference/api.py` — added `GET /demo/regions` and
  `POST /demo/predict`, plus CORS middleware (required for any browser UI on
  a different origin to call the API at all).
- `src/varshanetra/data/synthetic_data.py` — `generate_synthetic_dataset()`
  now accepts an optional `center=(lat, lon)` so the demo endpoint can
  generate conditions for an arbitrary place (North-East India), not just the
  training bbox's default corner.

## Running both sides together

**Terminal 1 — backend:**
```bash
cd varshanetra   # the ML repo
pip install -r requirements.txt   # or at minimum: fastapi uvicorn pydantic + the MVP deps
PYTHONPATH=src uvicorn varshanetra.inference.api:app --reload --port 8000
```

**Terminal 2 — frontend:**
```bash
cd VarshaNetra-main   # this repo
cp .env.example .env.local   # defaults to http://localhost:8000, edit if needed
npm install
npm run dev
```

Open the Vite dev server URL, go to `/dashboard`. You should see a "Live
Model" badge and real predictions from the trained baseline checkpoints. If
the backend isn't running, you'll see a red "Backend offline — preview data"
badge instead of a crash — that's the fallback working as intended, not a
bug.

## What's real vs. simulated right now — read this before demoing

- **The model and its prediction ARE real** — same trained gradient-boosted
  checkpoints validated in the ML repo's `run_mvp.py` run, same feature
  engineering (Thermo-Wind module included), same warning-level calibration.
- **The "current conditions" (rainfall so far, wind speed, soil moisture)
  fed into that model are SIMULATED.** There is no live satellite/radar/gauge
  feed connected yet — see `inference/demo.py`'s docstring. The UI surfaces
  this via the banner under the page title; don't remove that banner without
  replacing the underlying data source, or the UI will misrepresent
  simulated numbers as live sensor readings.
- **"All Monitored Regions" (the sensor-status cards at the bottom of the
  dashboard) is still 100% mock** (`mockData.ts::getRegionStatuses()`) —
  there's no backend concept of "8 active sensor stations" since there are
  no real sensors yet. Wiring this up for real means deciding what a
  "region status" endpoint should return, which is a product decision, not
  just a plumbing one — flagged here rather than silently left as-is.
- **`/forecast`, `/alerts`, `/map`, `/reports`, `/field-officer` pages are
  still placeholders**, unchanged by this integration. `/alerts` in
  particular is the natural next target — it should list `warning_level !=
  GREEN` predictions across regions, which `/demo/predict` already supports
  per-region (call it once per region in `NER_REGIONS` and filter).

## Next integration steps, in order of value

1. **`/alerts` page** — loop `fetchDemoPrediction()` over all 4 regions
   (or call `/demo/regions` to get the list), show any `warning_level !=
   'GREEN'` as an alert card. Everything needed for this already exists on
   the backend.
2. **Real sensor ingestion** — replace `inference/demo.py`'s
   `_current_conditions_for_region()` with an actual weather-API/sensor-feed
   call, matching `data/schema.py`'s column names. Nothing on the frontend
   needs to change when you do this — same response shape.
3. **`/map` page** — `/predict/full` accepts arbitrary `lat`/`lon` per
   record, so a Leaflet integration can request a grid of points across NER
   and color them by `warning_level`.
4. **Replace the sklearn baseline with the deep model** — also
   transparent to the frontend; see the ML repo's `training/train.py`.
