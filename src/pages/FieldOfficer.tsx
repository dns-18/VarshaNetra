import React, { useState } from 'react'
import { MapPin, Upload, Send, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function FieldOfficer() {
  const [report, setReport] = useState({ location: '', observation: '', severity: 'medium', photoCount: 0 })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-1">Field Report</h1>
          <p className="text-text-secondary text-sm">Submit real-time observations and images</p>
        </div>

        {/* ACTIVE ALERTS */}
        <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-status-warning">Active Monitoring Zone</p>
              <p className="text-text-secondary text-sm mt-1">You are in Khasi Hills - High Risk Zone. Report any critical changes immediately.</p>
            </div>
          </div>
        </div>

        {/* REPORT FORM */}
        <form onSubmit={handleSubmit} className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6 space-y-4">
          {/* Location */}
          <div>
            <label className="block text-text-primary font-semibold mb-2">📍 Location</label>
            <input
              type="text"
              placeholder="e.g., Cherrapunji Main Road, Km 5"
              value={report.location}
              onChange={(e) => setReport({ ...report, location: e.target.value })}\n              className="w-full px-4 py-2 bg-surface-tertiary border border-surface-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"\n            />\n          </div>

          {/* Observation */}
          <div>
            <label className="block text-text-primary font-semibold mb-2">📝 Observation</label>
            <textarea
              rows={4}
              placeholder="Describe the current conditions: cracks, soil movement, water flow, etc."
              value={report.observation}
              onChange={(e) => setReport({ ...report, observation: e.target.value })}
              className="w-full px-4 py-2 bg-surface-tertiary border border-surface-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-text-primary font-semibold mb-2">⚠️ Severity Level</label>
            <div className="flex gap-3">
              {['low', 'medium', 'high', 'critical'].map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value={level}
                    checked={report.severity === level}
                    onChange={(e) => setReport({ ...report, severity: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-text-primary capitalize text-sm">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-text-primary font-semibold mb-2">📷 Upload Photos ({report.photoCount})</label>
            <div className="border-2 border-dashed border-surface-tertiary rounded-lg p-6 text-center hover:border-primary/50 transition cursor-pointer">
              <Upload className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-text-secondary text-sm">Click to upload or drag and drop</p>
              <input type="file" multiple accept="image/*" onChange={(e) => setReport({ ...report, photoCount: e.target.files.length })} className="hidden" />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold">
            <Send className="w-5 h-5" /> Submit Report
          </button>
        </form>

        {/* SUCCESS ALERT */}
        {submitted && (
          <div className="fixed top-4 right-4 bg-status-success/10 border border-status-success rounded-lg p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-status-success" />
            <span className="text-status-success font-semibold">Report submitted successfully!</span>
          </div>
        )}

        {/* RECENT SUBMISSIONS */}
        <div className="mt-8 bg-surface-secondary border border-surface-tertiary rounded-lg p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Field Observations</h2>
          <div className="space-y-3">
            {[
              { time: '2:45 PM', location: 'Cherrapunji Junction', note: 'Minor cracks observed', severity: 'low' },
              { time: '1:20 PM', location: 'Khasi Hills Main', note: 'Water seepage from slope', severity: 'high' },
              { time: '11:00 AM', location: 'Shillong Road', note: 'Minor soil movement', severity: 'medium' },
            ].map((obs, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-surface-tertiary last:border-0">
                <span className="text-xs text-text-secondary bg-surface-tertiary px-2 py-1 rounded">{obs.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-semibold text-sm">{obs.location}</p>
                  <p className="text-text-secondary text-sm">{obs.note}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${obs.severity === 'high' ? 'bg-status-error/20 text-status-error' : obs.severity === 'medium' ? 'bg-status-warning/20 text-status-warning' : 'bg-status-success/20 text-status-success'}`}>
                  {obs.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
