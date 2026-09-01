import React, { useState } from 'react'
import { BarChart3, TrendingUp, Download, Calendar, Filter } from 'lucide-react'

export default function Reports() {
  const [timeRange, setTimeRange] = useState('7days')

  const metrics = [
    { title: 'Incidents', value: '42', trend: '+12%', icon: '⚠️' },
    { title: 'Avg Rainfall', value: '245mm', trend: '+8%', icon: '🌧️' },
    { title: 'Sensor Uptime', value: '99.2%', trend: 'Excellent', icon: '✅' },
    { title: 'Risk Score', value: '58%', trend: 'Moderate', icon: '📊' },
  ]

  const incidents = [
    { date: '2026-09-01', location: 'Khasi Hills', state: 'Meghalaya', severity: 'Critical', status: 'Active', people: 2400 },
    { date: '2026-08-31', location: 'Naga Hills', state: 'Assam', severity: 'High', status: 'Resolved', people: 950 },
    { date: '2026-08-30', location: 'Imphal Valley', state: 'Manipur', severity: 'Medium', status: 'Resolved', people: 1800 },
  ]

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics & Reports</h1>
          <p className="text-text-secondary">Incident trends and system performance</p>
        </div>

        <div className="flex gap-4 mb-6">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-4 py-2 bg-surface-secondary border border-surface-tertiary rounded-lg text-text-primary">
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <button className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {metrics.map((m, i) => (
            <div key={i} className="bg-surface-secondary border border-surface-tertiary rounded-lg p-4">
              <span className="text-2xl">{m.icon}</span>
              <h3 className="text-text-secondary text-sm mt-2">{m.title}</h3>
              <p className="text-2xl font-bold text-text-primary">{m.value}</p>
              <p className="text-text-secondary text-xs">{m.trend}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Risk Score Trend (7-day)
            </h2>
            <div className="h-48 flex items-end justify-around gap-2">
              {[45, 52, 58, 62, 59, 55, 61].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary rounded-t" style={{ height: `${(v / 100) * 100}%` }}></div>
                  <span className="text-xs text-text-secondary">{v}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Rainfall Trend
            </h2>
            <div className="space-y-3">
              {['Assam', 'Meghalaya', 'Manipur', 'Mizoram'].map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">{s}</span>
                    <span className="text-text-primary">{[185, 412, 156, 198][i]}mm</span>
                  </div>
                  <div className="w-full bg-surface-tertiary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${(([185, 412, 156, 198][i] / 420) * 100).toFixed(0)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-secondary border border-surface-tertiary rounded-lg overflow-hidden">
          <div className="p-6 border-b border-surface-tertiary">
            <h2 className="text-lg font-semibold text-text-primary">Recent Incidents</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-tertiary">
              <tr>
                <th className="px-6 py-3 text-left text-text-secondary font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-text-secondary font-semibold">Location</th>
                <th className="px-6 py-3 text-left text-text-secondary font-semibold">Severity</th>
                <th className="px-6 py-3 text-left text-text-secondary font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-text-secondary font-semibold">Affected</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc, i) => (
                <tr key={i} className="border-t border-surface-tertiary hover:bg-surface-tertiary/50">
                  <td className="px-6 py-4 text-text-primary">{inc.date}</td>
                  <td className="px-6 py-4 text-text-primary">{inc.location}</td>
                  <td className="px-6 py-4"><span className={`text-xs font-semibold ${inc.severity === 'Critical' ? 'text-status-error' : 'text-status-warning'}`}>{inc.severity}</span></td>
                  <td className="px-6 py-4"><span className={`text-xs font-semibold ${inc.status === 'Active' ? 'text-status-error' : 'text-status-success'}`}>{inc.status}</span></td>
                  <td className="px-6 py-4 text-text-primary font-semibold">{inc.people.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
