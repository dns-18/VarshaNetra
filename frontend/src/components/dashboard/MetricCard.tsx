import React, { useState, useEffect } from 'react'
import { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'

/**
 * Metric Card Component
 * 
 * Displays a single metric with icon, value, unit, and trend
 * Shows real-time updates with timestamp and data source
 */
interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  unit: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  color?: 'info' | 'warning' | 'error' | 'success'
  description?: string
  source?: string
  lastUpdated?: Date
}

export default function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  trend = 'stable',
  trendValue = '0%',
  color = 'info',
  description,
  source = 'Live Sensor Data',
  lastUpdated = new Date(),
}: MetricCardProps) {
  const [timeAgo, setTimeAgo] = useState('just now')
  const [isNew, setIsNew] = useState(true)

  // Update "time ago" text every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)

      if (diff < 5) {
        setTimeAgo('just now')
        setIsNew(true)
      } else if (diff < 60) {
        setTimeAgo(`${diff}s ago`)
      } else {
        setTimeAgo(`${Math.floor(diff / 60)}m ago`)
        setIsNew(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastUpdated])

  const colorMap = {
    info: 'bg-status-info/10 border-status-info text-status-info',
    warning: 'bg-status-warning/10 border-status-warning text-status-warning',
    error: 'bg-status-error/10 border-status-error text-status-error',
    success: 'bg-status-success/10 border-status-success text-status-success',
  }

  const trendIconColor = {
    up: 'text-status-error',
    down: 'text-status-success',
    stable: 'text-text-muted',
  }

  const trendSymbol = {
    up: '↑',
    down: '↓',
    stable: '→',
  }

  return (
    <div
      className={`rounded-lg border-2 p-6 backdrop-blur-sm transition-all hover:shadow-lg ${
        isNew ? 'ring-2 ring-opacity-50 ring-offset-2 ring-offset-surface-base' : ''
      } ${colorMap[color]}`}
      style={isNew ? { animation: 'pulse 0.5s ease-out' } : {}}
    >
      {/* Header with Icon and Trend */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-black/20`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== 'stable' && (
          <div className={`text-sm font-bold ${trendIconColor[trend]}`}>
            {trendSymbol[trend]} {trendValue}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-sm text-text-secondary font-medium mb-2">{label}</div>

      {/* Value and Unit - Large and Visible */}
      <div className="flex items-baseline gap-2 mb-4">
        <div className="text-5xl font-bold text-text-primary" key={value}>
          {value}
        </div>
        <div className="text-sm text-text-secondary font-medium">{unit}</div>
      </div>

      {/* Description - Explain what this means */}
      {description && <div className="text-xs text-text-secondary mb-3 leading-relaxed">{description}</div>}

      {/* Real-Time Update Indicator */}
      <div
        className={`mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs ${
          isNew ? 'text-status-info font-semibold' : 'text-text-muted'
        }`}
      >
        <Clock className="w-3 h-3" />
        <div className="flex-1">
          <span className={isNew ? 'animate-pulse' : ''}>Updated: {timeAgo}</span>
        </div>
        {isNew && (
          <div className="w-2 h-2 rounded-full bg-status-info animate-pulse" title="Live data" />
        )}
      </div>

      {/* Data Source */}
      <div className="text-xs text-text-muted mt-2 opacity-70">{source}</div>
    </div>
  )
}
