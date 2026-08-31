import React from 'react'
import { BellRing } from 'lucide-react'

export default function Alerts() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <BellRing className="w-16 h-16 text-risk-critical" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Alerts & Warnings</h1>
        <p className="text-text-secondary max-w-2xl">
          Real-time early warning system with incident timeline, affected areas, and recommended actions.
          Will show critical alerts, affected roads, villages, and response priorities.
        </p>
      </div>
    </div>
  )
}
