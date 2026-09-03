import React from 'react'
import { Info } from 'lucide-react'

export default function About() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <Info className="w-16 h-16 text-status-info" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">About VARSHANETRA</h1>
        <p className="text-text-secondary max-w-2xl">
          Information about the project, team, and the Smart India Hackathon initiative.
          Predictive AI for Risk, Vulnerability Assessment & Terrain Monitoring.
        </p>
      </div>
    </div>
  )
}
