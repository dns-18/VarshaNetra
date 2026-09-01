import React, { useState } from 'react'
import { Cloud, CloudRain, Wind, AlertTriangle } from 'lucide-react'

export default function Forecast() {
  const [selectedState] = useState('assam')

  const forecast = [
    { day: 'Today', date: '2026-09-01', high: 28, low: 22, rain: 45, wind: 12, risk: 'High', icon: '🌧️', description: 'Heavy rainfall expected' },
    { day: 'Tomorrow', date: '2026-09-02', high: 27, low: 21, rain: 52, wind: 15, risk: 'High', icon: '⛈️', description: 'Thunderstorms likely' },
    { day: 'Thu', date: '2026-09-03', high: 26, low: 20, rain: 38, wind: 10, risk: 'Moderate', icon: '🌧️', description: 'Moderate rainfall' },
    { day: 'Fri', date: '2026-09-04', high: 28, low: 22, rain: 25, wind: 8, risk: 'Moderate', icon: '☁️', description: 'Partly cloudy' },
    { day: 'Sat', date: '2026-09-05', high: 29, low: 23, rain: 12, wind: 6, risk: 'Low', icon: '☀️', description: 'Mostly clear' },
    { day: 'Sun', date: '2026-09-06', high: 30, low: 24, rain: 5, wind: 5, risk: 'Low', icon: '☀️', description: 'Clear skies' },
    { day: 'Mon', date: '2026-09-07', high: 28, low: 22, rain: 15, wind: 7, risk: 'Low', icon: '☁️', description: 'Partly cloudy' },
  ]

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High':
        return 'bg-status-error/10 text-status-error border-status-error/30'
      case 'Moderate':
        return 'bg-status-warning/10 text-status-warning border-status-warning/30'
      default:
        return 'bg-status-success/10 text-status-success border-status-success/30'
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">7-Day Forecast</h1>
          <p className="text-text-secondary">Risk prediction and weather outlook for {selectedState.charAt(0).toUpperCase() + selectedState.slice(1)}</p>
        </div>

        {/* ALERT BANNER */}
        <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-status-warning mb-1">High Risk Alert</p>
            <p className="text-text-secondary text-sm">Moderate to high rainfall expected over next 48 hours. Soil saturation levels rising. Monitor slopes closely.</p>
          </div>
        </div>

        {/* FORECAST CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {forecast.map((day, i) => (
            <div key={i} className={`bg-surface-secondary border border-surface-tertiary rounded-lg p-4 ${i === 0 ? 'ring-2 ring-primary' : ''}`}>
              <div className="mb-3">
                <p className="font-semibold text-text-primary">{day.day}</p>
                <p className="text-xs text-text-secondary">{day.date}</p>
              </div>
              <div className="text-3xl mb-3">{day.icon}</div>
              <div className="text-sm text-text-secondary mb-3">{day.description}</div>
              <div className="space-y-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Temp:</span>
                  <span className="text-text-primary font-semibold">{day.high}°/{day.low}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Rain:</span>
                  <span className="text-text-primary font-semibold">{day.rain}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Wind:</span>
                  <span className="text-text-primary font-semibold">{day.wind} km/h</span>
                </div>
              </div>
              <div className={`text-center py-2 rounded border ${getRiskColor(day.risk)} font-semibold text-xs`}>
                {day.risk} Risk
              </div>
            </div>
          ))}
        </div>

        {/* DETAILED ANALYSIS */}
        <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <CloudRain className="w-5 h-5" /> Detailed Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <CloudRain className="w-4 h-4" /> Rainfall Outlook
              </h3>
              <p className="text-text-secondary text-sm">
                Heavy rainfall expected today and tomorrow (45-52mm). Moderate rainfall on Thursday. Conditions improve from Friday onwards.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Wind className="w-4 h-4" /> Wind Patterns
              </h3>
              <p className="text-text-secondary text-sm">
                Monsoon winds 12-15 km/h today and tomorrow. Wind speeds decrease gradually from Wednesday. Normal wind patterns by weekend.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-3">⚠️ Risk Summary</h3>
              <p className="text-text-secondary text-sm">
                HIGH RISK until Thursday due to rainfall and saturation. Transition to MODERATE risk Friday. Return to LOW risk by weekend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
