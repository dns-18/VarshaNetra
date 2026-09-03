# VarshaNetra

**AI/ML Heavy Rainfall Early-Warning & Inundation Prediction System** — a
Python ML backend (FastAPI + the Thermo-Wind rainfall/flood model) and a
React dashboard, wired together.

```
.
├── backend/    Python ML system — models, training, ablation study, FastAPI service
│   └── README.md    full technical documentation of the ML system
├── frontend/   React + Vite + TypeScript dashboard
│   └── INTEGRATION.md    exactly what's real vs. simulated in the UI
└── docker-compose.yml    optional one-command way to run both (see below)
```

## Run it — two terminals, no Docker

**1. Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate      # optional but recommended
pip install -r requirements.txt
PYTHONPATH=src uvicorn varshanetra.inference.api:app --reload --port 8000
```
Check it's up: `curl http://localhost:8000/health`

**2. Frontend**
```bash
cd frontend
cp .env.example .env.local        # defaults to http://localhost:8000
npm install
npm run dev
```
Open the printed local URL, go to `/dashboard`. A green "Live Model" badge
means the two are talking; a red "Backend offline" badge means step 1 isn't
running or `.env.local`'s URL doesn't match.

## Run it — Docker Compose (alternative)

```bash
docker compose up --build
```
Backend on `http://localhost:8000`, frontend on `http://localhost:5173`.

**Honesty note:** the `Dockerfile`s and `docker-compose.yml` in this repo
were written carefully but **not build-tested** in the environment they were
authored in (no Docker daemon available there). Test `docker compose up
--build` yourself before relying on it — if something's off, it's most
likely a base-image version or a missing system dependency for one of the
Python geospatial packages (rasterio/wradlib), not the application code
itself, which is the part that was actually run and verified (see
`backend/README.md` for exactly what was and wasn't executed).

## What's real vs. simulated

Short version: **the trained model is real**, its predictions come from
actual gradient-boosted checkpoints validated against a physically-consistent
synthetic dataset (see `backend/README.md`). The **live sensor feed is not
real yet** — `/demo/predict` simulates "current conditions" for a named
region so the UI has something to call before real satellite/radar/gauge
ingestion exists. Every prediction response says so explicitly via
`demo_mode`/`data_source_notice`, and the UI surfaces that banner rather than
hiding it. Full detail in `frontend/INTEGRATION.md`.

## Deploying (pointers, not a walkthrough)

- **Backend**: any host that runs a long-lived Python process works —
  Render, Railway, Fly.io, a plain VM. Start command is the `uvicorn` line
  above; set `VARSHANETRA_ALLOWED_ORIGINS` to your deployed frontend's origin
  instead of leaving CORS open to `*`.
- **Frontend**: Vercel/Netlify/Cloudflare Pages — it's a standard Vite
  build (`npm run build` → serve `dist/`). Set `VITE_API_BASE_URL` to your
  deployed backend's URL as a build-time env var.
- Neither of these was actually deployed or tested against a live host from
  this environment (no internet access here) — the app config supports it,
  but you're the first one to actually try it.

## License / status

Research/demo-stage project. See `backend/README.md` section "What's
actually running vs. what's specified" for a precise, section-by-section
account of what's been executed and verified vs. written-but-untested.
