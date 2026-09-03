import React from 'react'

export default function FieldOfficer() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <div className="text-6xl">📱</div>
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Field Officer Mode</h1>
        <p className="text-text-secondary max-w-2xl">
          Mobile-first interface for field officers to report incidents in real-time.
          Will support photo uploads, GPS tagging, offline mode, and sync when online.
        </p>
      </div>
    </div>
  )
}
