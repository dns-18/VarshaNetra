import React from 'react'
import { CloudRain } from 'lucide-react'

export default function Forecast() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <CloudRain className="w-16 h-16 text-status-info" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Forecast</h1>
        <p className="text-text-secondary max-w-2xl">
          AI-powered predictions for weather, rainfall patterns, and landslide risk forecasts.
          Will display hourly, daily, and weekly predictions with confidence scores.
        </p>
      </div>
    </div>
  )
}
