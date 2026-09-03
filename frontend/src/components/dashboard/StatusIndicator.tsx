import React from 'react'
import { CheckCircle2, AlertCircle, MapPin } from 'lucide-react'

/**
 * Status Indicator Component
 * 
 * Shows region status with location context and live monitoring indicator
 */
interface StatusIndicatorProps {
  region: string
  district?: string
  status: 'online' | 'warning' | 'offline'
  message: string
  sensors?: number
  riskLevel?: string
}

export default function StatusIndicator({
  region,
  district = 'NER District',
  status,
  message,
  sensors = 5,
  riskLevel = 'Moderate',
}: StatusIndicatorProps) {
  const statusConfig = {
    online: {
      bg: 'bg-status-success/10',
      border: 'border-status-success',
      icon: CheckCircle2,
      iconColor: 'text-status-success',
      dotColor: 'bg-status-success',
      label: '● Online',
    },
    warning: {
      bg: 'bg-status-warning/10',
      border: 'border-status-warning',
      icon: AlertCircle,
      iconColor: 'text-status-warning',
      dotColor: 'bg-status-warning',
      label: '⚠ Monitoring',
    },
    offline: {
      bg: 'bg-status-error/10',
      border: 'border-status-error',
      icon: AlertCircle,
      iconColor: 'text-status-error',
      dotColor: 'bg-status-error',
      label: '✕ Offline',
    },
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className={`rounded-lg border-2 p-4 ${config.bg} ${config.border} transition-all hover:shadow-md`}>
      {/* Header with Region Name and Status Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className={`text-base font-bold ${config.iconColor}`}>{region}</div>
          <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
            <MapPin className="w-3 h-3" />
            {district}
          </div>
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded whitespace-nowrap ${config.dotColor} text-white`}>
          {config.label}
        </div>
      </div>

      {/* Status Icon and Message */}
      <div className="flex items-start gap-2 mb-3 pb-3 border-b border-white/10">
        <div className="relative flex-shrink-0">
          <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
          {status === 'online' && (
            <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
          )}
        </div>
        <div className="text-xs text-text-secondary leading-relaxed flex-1">{message}</div>
      </div>

      {/* Region Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-text-muted mb-1">Active Sensors</div>
          <div className="font-semibold text-text-primary">{sensors} stations</div>
        </div>
        <div>
          <div className="text-text-muted mb-1">Current Risk</div>
          <div
            className={`font-semibold ${
              riskLevel === 'Critical'
                ? 'text-status-error'
                : riskLevel === 'High'
                ? 'text-status-warning'
                : 'text-status-success'
            }`}
          >
            {riskLevel}
          </div>
        </div>
      </div>
    </div>
  )
}
