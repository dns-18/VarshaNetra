import React, { useState } from 'react'
import { BellRing, AlertTriangle, CheckCircle2, AlertCircle, MapPin, Users, Clock, Filter } from 'lucide-react'
import { generateMockAlerts, getPriorityColor, getStatusColor, Alert } from '@services/mockData'

type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'
type StatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved'

export default function Alerts() {
  const [alerts] = useState<Alert[]>(generateMockAlerts())
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(alerts[0])
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAlerts = alerts.filter((alert) => {
    const matchesPriority = priorityFilter === 'all' || alert.priority === priorityFilter
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
    const matchesSearch =
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.state.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesPriority && matchesStatus && matchesSearch
  })

  const activeCount = alerts.filter((a) => a.status === 'active').length
  const criticalCount = alerts.filter((a) => a.priority === 'critical').length

  const priorityBadges = [
    { label: 'Critical', value: 'critical', color: '#dc2626' },
    { label: 'High', value: 'high', color: '#ef4444' },
    { label: 'Medium', value: 'medium', color: '#f59e0b' },
    { label: 'Low', value: 'low', color: '#10b981' },
  ] as const

  const statusBadges = [
    { label: 'Active', value: 'active', color: '#ef4444' },
    { label: 'Acknowledged', value: 'acknowledged', color: '#f59e0b' },
    { label: 'Resolved', value: 'resolved', color: '#10b981' },
  ] as const

  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Header */}
      <div className="border-b border-surface-border bg-surface-secondary px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Alerts & Warnings</h1>
            <p className="text-sm text-text-secondary mt-1">
              Real-time early warning system with incident timeline and recommended actions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-risk-critical/30 bg-risk-critical/10 px-3 py-1.5 text-xs font-medium text-risk-critical">
                <AlertTriangle className="w-3.5 h-3.5" />
                {criticalCount} Critical
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-status-warning/30 bg-status-warning/10 px-3 py-1.5 text-xs font-medium text-status-warning">
              <BellRing className="w-3.5 h-3.5" />
              {activeCount} Active
            </div>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search alerts by location, state, title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-surface-base border border-surface-border rounded-lg text-sm text-text-primary placeholder-text-muted focus-visible:outline-2 focus-visible:outline-status-info"
        />
      </div>

      {/* Filters */}
      <div className="border-b border-surface-border bg-surface-secondary px-6 py-3 space-y-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            <Filter className="w-3.5 h-3.5" />
            Priority
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPriorityFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                priorityFilter === 'all'
                  ? 'bg-status-info text-slate-950 border-status-info'
                  : 'border-surface-border bg-surface-base text-text-secondary'
              }`}
            >
              All
            </button>
            {priorityBadges.map((badge) => (
              <button
                key={badge.value}
                onClick={() => setPriorityFilter(badge.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  priorityFilter === badge.value
                    ? 'border-opacity-100 text-white'
                    : 'border-surface-border bg-surface-base text-text-secondary'
                }`}
                style={{
                  backgroundColor:
                    priorityFilter === badge.value ? `${badge.color}30` : 'transparent',
                  borderColor: badge.color,
                  color: priorityFilter === badge.value ? badge.color : undefined,
                }}
              >
                {badge.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Status
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                statusFilter === 'all'
                  ? 'bg-status-info text-slate-950 border-status-info'
                  : 'border-surface-border bg-surface-base text-text-secondary'
              }`}
            >
              All
            </button>
            {statusBadges.map((badge) => (
              <button
                key={badge.value}
                onClick={() => setStatusFilter(badge.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  statusFilter === badge.value
                    ? 'border-opacity-100 text-white'
                    : 'border-surface-border bg-surface-base text-text-secondary'
                }`}
                style={{
                  backgroundColor:
                    statusFilter === badge.value ? `${badge.color}30` : 'transparent',
                  borderColor: badge.color,
                  color: statusFilter === badge.value ? badge.color : undefined,
                }}
              >
                {badge.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Alerts List */}
        <div className="flex-1 border-r border-surface-border overflow-y-auto">
          <div className="p-4 space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No alerts matching filters</p>
                </div>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`w-full text-left rounded-lg border-2 p-3 transition ${
                    selectedAlert?.id === alert.id
                      ? 'border-status-info bg-status-info/10'
                      : 'border-surface-border bg-surface-secondary hover:border-surface-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getPriorityColor(alert.priority) }}
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-text-primary">{alert.title}</h3>
                        <p className="text-xs text-text-secondary mt-1">
                          {alert.district}, {alert.state}
                        </p>
                      </div>
                    </div>
                    <div
                      className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `${getStatusColor(alert.status)}30`,
                        color: getStatusColor(alert.status),
                      }}
                    >
                      {alert.status.toUpperCase()}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {alert.affectedPopulation.toLocaleString()} people
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round((Date.now() - alert.timestamp.getTime()) / 60000)}m ago
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Alert Details Panel */}
        {selectedAlert && (
          <aside className="w-full max-w-lg border-l border-surface-border bg-surface-base p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getPriorityColor(selectedAlert.priority) }}
                  />
                  <h2 className="text-xl font-bold text-text-primary">{selectedAlert.title}</h2>
                </div>
                <div
                  className="text-xs font-bold px-3 py-1.5 rounded-full inline-block"
                  style={{
                    backgroundColor: `${getStatusColor(selectedAlert.status)}30`,
                    color: getStatusColor(selectedAlert.status),
                  }}
                >
                  {selectedAlert.status.charAt(0).toUpperCase() + selectedAlert.status.slice(1)}
                </div>
              </div>

              {/* Location & Time */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Location
                  </div>
                  <p className="text-sm text-text-primary">
                    {selectedAlert.location}, {selectedAlert.district}, {selectedAlert.state}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Timestamp
                  </div>
                  <p className="text-sm text-text-primary">
                    {selectedAlert.timestamp.toLocaleString()}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                    <Users className="w-3.5 h-3.5" />
                    Affected Population
                  </div>
                  <p className="text-sm text-text-primary">
                    {selectedAlert.affectedPopulation.toLocaleString()} people
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Description</h4>
                <p className="text-sm text-text-secondary">{selectedAlert.description}</p>
              </div>

              {/* Affected Areas */}
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Affected Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAlert.affectedAreas.map((area) => (
                    <span
                      key={area}
                      className="text-xs px-3 py-1.5 rounded-full bg-surface-secondary border border-surface-border text-text-secondary"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Recommended Actions</h4>
                <ul className="space-y-2">
                  {selectedAlert.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
