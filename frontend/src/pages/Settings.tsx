import React from 'react'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <Settings className="w-16 h-16 text-status-info" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary max-w-2xl">
          User preferences, notifications, API configuration, and system settings.
          Will include language selection, alert thresholds, and data layer preferences.
        </p>
      </div>
    </div>
  )
}
