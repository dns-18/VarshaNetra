/**
 * VarshaNetra API client.
 *
 * Talks to the FastAPI service in the ML repo
 * (src/varshanetra/inference/api.py). Two integration paths are exposed:
 *
 *   - fetchDemoPrediction(region)  -> POST /demo/predict
 *     For UIs (like this one, today) that don't have real sensor/satellite
 *     ingestion wired up yet. The MODEL and its prediction are real; the
 *     "current conditions" fed into it are simulated by the backend using
 *     the same generator the model was validated against — every response
 *     says so explicitly via `demo_mode` / `data_source_notice`, so the UI
 *     can (and should) surface that to the user rather than presenting it
 *     as a live sensor reading.
 *
 *   - fetchFullPrediction(records) -> POST /predict/full
 *     The real integration path once you have actual sensor/satellite/NWP
 *     records to send — same response shape, no demo-mode fields.
 *
 * Configure the backend URL via the VITE_API_BASE_URL env var (see
 * .env.example). Defaults to http://localhost:8000 for local dev, where you
 * run:
 *     PYTHONPATH=src uvicorn varshanetra.inference.api:app --reload
 */

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

export type WarningLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'

/** Mirrors the Section 16 output schema from the ML repo's
 * inference/pipeline.py exactly, plus the extra fields /demo/predict adds. */
export interface VarshaNetraPrediction {
  location: string
  forecast_time: string
  rainfall_mm: number
  rainfall_category: string
  heavy_rain_probability: number
  flood_probability: number
  inundation_depth_m: number
  confidence: number
  uncertainty: number
  thermo_wind_signal: number
  warning_level: WarningLevel
  top_contributing_features: string[]

  // /demo/predict only:
  region?: string
  demo_mode?: boolean
  data_source?: 'synthetic' | 'live'
  data_source_notice?: string
  current_conditions?: {
    rainfall_last_hour_mm: number
    wind_speed_ms: number
    wind_dir_deg: number
    temperature_c: number
    relative_humidity_pct: number
    soil_moisture_pct: number
    river_stage_m: number
  }
}

export interface DemoRegion {
  id: string
  label: string
  lat: number
  lon: number
  elevation_m: number
}

class VarshaNetraApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'VarshaNetraApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (err) {
    throw new VarshaNetraApiError(
      `Could not reach VarshaNetra API at ${API_BASE_URL}${path}. ` +
        `Is the backend running? (PYTHONPATH=src uvicorn varshanetra.inference.api:app --reload). ` +
        `Original error: ${(err as Error).message}`
    )
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* response wasn't JSON — keep statusText */
    }
    throw new VarshaNetraApiError(`VarshaNetra API error (${res.status}): ${detail}`, res.status)
  }
  return res.json() as Promise<T>
}

/** GET /health — returns which lead-time models are actually loaded. Useful
 * for a startup check / connection-status indicator in the UI. */
export function fetchHealth(): Promise<{
  status: string
  rainfall_models_loaded: number[]
  flood_models_loaded: number[]
}> {
  return request('/health')
}

/** GET /demo/regions — the named regions the demo endpoint supports. Prefer
 * this over hard-coding a region list client-side, so adding a region only
 * requires editing the backend's inference/demo.py::NER_REGIONS. */
export function fetchDemoRegions(): Promise<{ regions: DemoRegion[] }> {
  return request('/demo/regions')
}

/** POST /demo/predict — single-location prediction for a named region
 * (e.g. "assam") using simulated current conditions. See the module
 * docstring above for what's real vs. simulated in the response. */
export function fetchDemoPrediction(
  region: string,
  rainfallLeadHours = 3,
  floodLeadHours = 6
): Promise<VarshaNetraPrediction> {
  return request('/demo/predict', {
    method: 'POST',
    body: JSON.stringify({
      region,
      rainfall_lead_hours: rainfallLeadHours,
      flood_lead_hours: floodLeadHours,
    }),
  })
}

/** A single real sensor/satellite/radar/NWP record, matching the ML repo's
 * data/schema.py column names. Use this once real ingestion exists. */
export interface GridRecord {
  grid_id: string
  timestamp: string
  lat: number
  lon: number
  features: Record<string, number | string>
}

/** POST /predict/full — the real integration path: send actual sourced
 * feature records, get back real (non-demo) predictions for each. */
export async function fetchFullPrediction(
  records: GridRecord[],
  rainfallLeadHours = 3,
  floodLeadHours = 6
): Promise<VarshaNetraPrediction[]> {
  const { predictions } = await request<{ predictions: VarshaNetraPrediction[] }>('/predict/full', {
    method: 'POST',
    body: JSON.stringify({
      records,
      rainfall_lead_hours: rainfallLeadHours,
      flood_lead_hours: floodLeadHours,
      explain: true,
    }),
  })
  return predictions
}

export { VarshaNetraApiError, API_BASE_URL }
