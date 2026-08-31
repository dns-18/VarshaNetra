import React from 'react'

/**
 * Right Panel
 * 
 * Displays:
 * - Layer toggles (Satellite, Raster, Rainfall, Inundation, Boundaries)
 * - Legend/color scales
 * - Data controls (placeholder)
 */
export default function RightPanel() {
  const [layers, setLayers] = React.useState({
    satellite: true,
    raster: true,
    rainfall: true,
    inundation: false,
    boundaries: false,
  })

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }))
  }

  return (
    <div className="w-80 bg-surface-base border-l border-surface-border flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-border">
        <h3 className="text-lg font-semibold text-text-primary">
          Layers
        </h3>
      </div>

      {/* Layer Toggles */}
      <div className="flex-1 px-6 py-4 space-y-3 overflow-y-auto">
        {[
          { key: 'satellite' as const, label: 'Satellite Imagery' },
          { key: 'raster' as const, label: 'Raster Reflectivity' },
          { key: 'rainfall' as const, label: 'Rainfall Intensity' },
          { key: 'inundation' as const, label: 'Inundation Risk' },
          { key: 'boundaries' as const, label: 'District Boundaries' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
              className="w-4 h-4 rounded border-surface-border bg-surface-secondary checked:bg-status-info cursor-pointer"
            />
            <span className="text-sm text-text-secondary">{label}</span>
          </label>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-surface-border">
        <h4 className="text-sm font-semibold text-text-primary mb-3">
          Rainfall Intensity
        </h4>
        <div className="space-y-2">
          {[
            { label: 'Very Heavy', color: '#dc2626' },
            { label: 'Heavy', color: '#ef4444' },
            { label: 'Moderate', color: '#f59e0b' },
            { label: 'Light', color: '#fbbf24' },
            { label: 'Very Light', color: '#6366f1' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
