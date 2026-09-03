import React from 'react'
import { Proportions } from 'lucide-react'

export default function Reports() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <Proportions className="w-16 h-16 text-status-info" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-secondary max-w-2xl">
          Historical data, incident reports, and field officer submissions.
          Will display field photos, videos, cracks, slope movements, and blocked roads.
        </p>
      </div>
    </div>
  )
}
