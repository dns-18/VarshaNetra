import React from 'react'

/**
 * Top System Status Bar
 * 
 * Displays:
 * - Search location input
 * - Current timestamp
 * - Live indicator
 * - System status
 */
export default function TopBar() {
  const currentTime = new Date().toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <div className="h-16 bg-surface-secondary border-b border-surface-border flex items-center justify-between px-6 gap-4">
      {/* Left: Search */}
      <div className="flex-1 max-w-sm">
        <input
          type="text"
          placeholder="Search location..."
          className="w-full px-4 py-2 bg-surface-base border border-surface-border rounded-md text-text-primary placeholder-text-muted focus-visible:outline-2 focus-visible:outline-status-info focus-visible:outline-offset-2 transition text-sm"
        />
      </div>

      {/* Right: Time & Status */}
      <div className="flex items-center gap-6">
        <div className="text-sm text-text-muted font-mono">
          {currentTime}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
          <span className="text-xs font-medium text-status-success">Live</span>
        </div>
      </div>
    </div>
  )
}
