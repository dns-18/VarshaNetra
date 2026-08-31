import React from 'react'
import { Map } from 'lucide-react'

export default function LiveMap() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <Map className="w-16 h-16 text-status-info" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Live GIS Map</h1>
        <p className="text-text-secondary max-w-2xl">
          Interactive satellite imagery with risk overlays, heatmaps, and geospatial data.
          Will integrate Leaflet with real-time rainfall and landslide risk visualization.
        </p>
      </div>
    </div>
  )
}
