import React, { useState, useEffect, useCallback } from 'react'
import { Cloud, Wind, AlertTriangle, RefreshCw, Zap, Info, Droplet, Mountain, WifiOff } from 'lucide-react'
import MetricCard from '@components/dashboard/MetricCard'
import StatusIndicator from '@components/dashboard/StatusIndicator'
import {
  fetchDemoPrediction,
  VarshaNetraPrediction,
  VarshaNetraApiError,
  WarningLevel,
} from '@services/varshanetraApi'
import { generateStateMetrics, getRegionStatuses, RegionStatus } from '@services/mockData'

/**
 * Dashboard Page
 *
 * Calls the real VarshaNetra model backend (POST /demo/predict) for the
 * selected NER state. The model and its prediction are real; the "current
 * conditions" the backend feeds it are simulated until real sensor
 * ingestion is wired up — see services/varshanetraApi.ts and the backend's
 * inference/demo.py for exactly what that means. This is surfaced to the
 * user via the banner below rather than hidden.
 *
 * If the backend is unreachable at all (not running, wrong URL, etc.), the
 * dashboard falls back to the old client-side mock generator so the UI
 * still demos something instead of showing a blank error page — clearly
 * labeled as offline/preview data when that happens.
 */

const RISK_LEVEL_BY_WARNING: Record<
  WarningLevel,
  { label: string; color: 'success' | 'warning' | 'error'; baseScore: number }
> = {
  GREEN: { label: 'Low Risk', color: 'success', baseScore: 10 },
  YELLOW: { label: 'Moderate Risk', color: 'warning', baseScore: 40 },
  ORANGE: { label: 'High Risk', color: 'error', baseScore: 65 },
  RED: { label: 'Critical Risk', color: 'error', baseScore: 88 },
}

/** Warning level gives the coarse risk band; blending in the model's own
 * probabilities spreads scores out within that band instead of every GREEN
 * prediction showing the same flat number. */
function riskScoreFromPrediction(p: VarshaNetraPrediction): number {
  const { baseScore } = RISK_LEVEL_BY_WARNING[p.warning_level]
  const maxProb = Math.max(p.heavy_rain_probability, p.flood_probability)
  return Math.min(100, Math.round(baseScore + maxProb * 20))
}

export default function Dashboard() {
  const [selectedState, setSelectedState] = useState<string>('assam')
  const [prediction, setPrediction] = useState<VarshaNetraPrediction | null>(null)
  const [regions, setRegions] = useState<RegionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [offline, setOffline] = useState(false)
  const [offlineReason, setOfflineReason] = useState<string>('')

  const states = [
    { id: 'assam', name: 'Assam', flag: '🟢' },
    { id: 'meghalaya', name: 'Meghalaya', flag: '🟠' },
    { id: 'manipur', name: 'Manipur', flag: '🔵' },
    { id: 'mizoram', name: 'Mizoram', flag: '🟡' },
  ]

  const load = useCallback(async (state: string) => {
    try {
      const result = await fetchDemoPrediction(state, 3, 6)
      setPrediction(result)
      setOffline(false)
      setOfflineReason('')
    } catch (err) {
      // Backend unreachable — fall back to the old client-side mock so the
      // UI still shows something, clearly labeled as offline/preview data.
      const message = err instanceof VarshaNetraApiError ? err.message : String(err)
      setOfflineReason(message)
      setOffline(true)
      const mock = generateStateMetrics(state)
      setPrediction({
        location: mock.district,
        forecast_time: mock.timestamp.toISOString(),
        rainfall_mm: mock.rainfall,
        rainfall_category: mock.rainfall > 150 ? 'Heavy' : mock.rainfall > 50 ? 'Moderate' : 'Light',
        heavy_rain_probability: mock.riskScore / 100,
        flood_probability: mock.riskScore / 150,
        inundation_depth_m: 0,
        confidence: 0.5,
        uncertainty: 0.5,
        thermo_wind_signal: 0,
        warning_level:
          mock.riskScore > 70 ? 'RED' : mock.riskScore > 50 ? 'ORANGE' : mock.riskScore > 25 ? 'YELLOW' : 'GREEN',
        top_contributing_features: [],
        region: mock.state,
        demo_mode: true,
        data_source: 'synthetic',
        data_source_notice:
          'Backend unreachable — showing offline preview data (client-side mock, not a model prediction).',
        current_conditions: {
          rainfall_last_hour_mm: mock.rainfall / 24,
          wind_speed_ms: mock.windSpeed / 3.6,
          wind_dir_deg: 0,
          temperature_c: 28,
          relative_humidity_pct: 70,
          soil_moisture_pct: mock.soilSaturation,
          river_stage_m: 0,
        },
      })
    }
    setLastUpdate(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    load(selectedState)
    setRegions(getRegionStatuses())
  }, [selectedState, load])

  // Poll for fresh predictions periodically. 60s (not 5s like the old mock)
  // because /demo/predict does real feature engineering + model inference
  // per call, not a client-side random number.
  useEffect(() => {
    const interval = setInterval(() => load(selectedState), 60_000)
    return () => clearInterval(interval)
  }, [selectedState, load])

  if (loading || !prediction) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-status-info animate-spin mx-auto mb-2" />
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const riskInfo = RISK_LEVEL_BY_WARNING[prediction.warning_level]
  const riskScore = riskScoreFromPrediction(prediction)
  const conditions = prediction.current_conditions
  const stateMeta = states.find((s) => s.id === selectedState)!
  const windSpeedKmh = conditions ? conditions.wind_speed_ms * 3.6 : 0

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-6">
      {/* HEADER SECTION */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2">Terrain Intelligence Dashboard</h1>
            <p className="text-text-secondary text-lg">
              Rainfall & inundation early-warning across North-East Region (NER) of India
            </p>
          </div>
          {offline ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-status-error/10 border border-status-error rounded-lg">
              <WifiOff className="w-4 h-4 text-status-error" />
              <span className="text-sm font-semibold text-status-error">Backend offline — preview data</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-status-info/10 border border-status-info rounded-lg">
              <Zap className="w-4 h-4 text-status-info animate-pulse" />
              <span className="text-sm font-semibold text-status-info">Live Model</span>
            </div>
          )}
        </div>

        {/* Data-source notice — always shown, never hidden, since the
            backend's "current conditions" are simulated until real sensor
            ingestion exists (see services/varshanetraApi.ts docstring). */}
        <div
          className={`border rounded-lg p-4 mt-4 ${
            offline ? 'bg-status-error/5 border-status-error' : 'bg-surface-base border-surface-border'
          }`}
        >
          <div className="flex gap-3">
            <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${offline ? 'text-status-error' : 'text-status-info'}`} />
            <div className="text-sm text-text-secondary">
              <strong className="text-text-primary">
                {offline
                  ? 'Offline preview — not connected to the model.'
                  : 'Prediction from the trained VarshaNetra model.'}
              </strong>{' '}
              {offline ? offlineReason : prediction.data_source_notice}
            </div>
          </div>
        </div>
      </div>

      {/* STATE SELECTOR */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-text-secondary uppercase mb-3">Select Monitoring Region</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {states.map((state) => (
            <button
              key={state.id}
              onClick={() => setSelectedState(state.id)}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                selectedState === state.id
                  ? 'bg-status-info/20 border-status-info text-text-primary'
                  : 'bg-surface-base border-surface-border text-text-secondary hover:border-status-info'
              }`}
            >
              <div className="text-2xl mb-1">{state.flag}</div>
              <div className="font-bold">{state.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* GEOGRAPHIC CONTEXT */}
      <div className="mb-6 bg-surface-base border border-surface-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Mountain className="w-5 h-5 text-status-info flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-text-primary mb-1">
              📍 {prediction.region ?? stateMeta.name} — grid cell {prediction.location}
            </div>
            <div className="text-xs text-text-secondary space-y-1">
              <div>🕐 Forecast for: {prediction.forecast_time}</div>
              {conditions && <div>💧 River stage: {conditions.river_stage_m.toFixed(2)} m</div>}
              <div>🎯 Model confidence: {Math.round(prediction.confidence * 100)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP METRICS GRID */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Current Conditions in {prediction.region ?? stateMeta.name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Cloud}
            label="Rainfall (forecast)"
            value={prediction.rainfall_mm}
            unit="mm"
            color="info"
            description={`${prediction.rainfall_category} rainfall predicted for ${prediction.forecast_time}`}
            source={`Model: VarshaNetra | Grid cell: ${prediction.location}`}
            lastUpdated={lastUpdate}
          />

          <MetricCard
            icon={Wind}
            label="Wind Speed"
            value={windSpeedKmh.toFixed(1)}
            unit="km/h"
            color="warning"
            trend={windSpeedKmh > 40 ? 'up' : 'stable'}
            description="Current wind speed feeding the Thermo-Wind convergence signal"
            source={`${offline ? 'Offline preview' : 'Simulated current conditions'} | ${prediction.region ?? stateMeta.name}`}
            lastUpdated={lastUpdate}
          />

          <MetricCard
            icon={AlertTriangle}
            label={riskInfo.label}
            value={riskScore}
            unit="/100"
            color={riskInfo.color}
            description={`Warning level: ${prediction.warning_level} — heavy-rain probability ${Math.round(
              prediction.heavy_rain_probability * 100
            )}%, flood probability ${Math.round(prediction.flood_probability * 100)}%`}
            source={`VarshaNetra AI Engine | ${prediction.region ?? stateMeta.name}`}
            lastUpdated={lastUpdate}
          />

          <MetricCard
            icon={Droplet}
            label="Soil Saturation"
            value={conditions ? conditions.soil_moisture_pct.toFixed(0) : '—'}
            unit="%"
            color={
              conditions && conditions.soil_moisture_pct > 80
                ? 'error'
                : conditions && conditions.soil_moisture_pct > 60
                  ? 'warning'
                  : 'success'
            }
            description="Soil moisture — higher values mean less capacity to absorb further rainfall"
            source={`${offline ? 'Offline preview' : 'Simulated current conditions'} | ${prediction.region ?? stateMeta.name}`}
            lastUpdated={lastUpdate}
          />
        </div>
      </div>

      {/* WHY THIS WARNING — real explainability from the model, replacing
          the old "google it yourself" verification guide */}
      <div className="mb-8 bg-surface-base border-2 border-status-info rounded-lg p-4">
        <h3 className="font-bold text-status-info mb-3 flex items-center gap-2">🔍 Why this warning?</h3>
        {prediction.top_contributing_features.length > 0 ? (
          <ul className="text-xs text-text-secondary space-y-2 list-disc list-inside">
            {prediction.top_contributing_features.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-secondary">
            {offline
              ? 'Feature attribution requires a live connection to the model backend.'
              : 'No individual feature stood out for this prediction.'}
          </p>
        )}
      </div>

      {/* Region Status Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-4">All Monitored Regions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regions.map((region, idx) => {
            const regionDetails = [
              { district: 'Sonitpur, Lakhimpur', sensors: 8, risk: 'Moderate' },
              { district: 'Khasi Hills, Jaintia Hills', sensors: 6, risk: 'High' },
              { district: 'Imphal Valley, Thoubal', sensors: 5, risk: 'Moderate' },
              { district: 'Aizawl, Kolasib', sensors: 7, risk: 'Low' },
            ][idx]

            return (
              <StatusIndicator
                key={region.region}
                region={region.region}
                district={regionDetails.district}
                status={region.status}
                message={`${regionDetails.sensors} active sensor stations | Last update: ${region.lastUpdate}`}
                sensors={regionDetails.sensors}
                riskLevel={regionDetails.risk}
              />
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-surface-base/50 border border-surface-border rounded-lg p-4 text-xs text-text-muted">
        <strong className="text-text-primary block mb-2">📌 Important Notes:</strong>
        <div>
          ✓ Predictions refresh every 60 seconds from the VarshaNetra model backend
          <br />
          ✓ "Current conditions" are simulated until real satellite/radar/gauge ingestion is connected — see
          data_source_notice above
          <br />✓ Choose different states to see how the model responds across NER
          <br />✓ Next: wire inference/demo.py's `_current_conditions_for_region` to a real weather/sensor feed
        </div>
      </div>
    </div>
  )
}
