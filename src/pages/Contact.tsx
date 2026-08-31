import React from 'react'
import { Contact } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <Contact className="w-16 h-16 text-status-info" />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Contact</h1>
        <p className="text-text-secondary max-w-2xl">
          Contact information for support and inquiries.
          Submit feedback, report issues, or connect with the development team.
        </p>
      </div>
    </div>
  )
}
