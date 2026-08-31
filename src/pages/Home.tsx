import React from 'react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-status-info">Welcome to VARSHANETRA</h1>
        <p className="text-xl text-text-secondary max-w-2xl">
          Terrain Intelligence Command Center for Early Landslide Warning and Risk Monitoring
        </p>
        <div className="pt-8">
          <p className="text-lg text-text-muted">Observe • Predict • Warn • Protect</p>
        </div>
      </div>
    </div>
  )
}
