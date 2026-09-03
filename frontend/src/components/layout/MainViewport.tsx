import React from 'react'

/**
 * Main Viewport
 * 
 * The central area where the GIS map will be displayed.
 * Currently a placeholder that will hold the Leaflet map.
 */
export default function MainViewport() {
  return (
    <div className="flex-1 bg-surface-base flex items-center justify-center overflow-hidden">
      <div className="text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          GIS Map Viewport
        </h2>
        <p className="text-text-muted">
          Phase 6: Real-time satellite imagery and risk layers will be displayed here
        </p>
      </div>
    </div>
  )
}
