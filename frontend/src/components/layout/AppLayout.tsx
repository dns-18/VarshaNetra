import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import RightPanel from './RightPanel'

/**
 * Main Application Layout
 * 
 * Structure:
 * ┌─────────────────────────────────────────┐
 * │ TopBar (Search, Time, Live status)      │
 * ├──────────┬──────────────────┬───────────┤
 * │          │                  │           │
 * │ Sidebar  │  Page Content    │ RightPanel│
 * │ (Nav)    │  (via Outlet)    │ (Layers)  │
 * │          │                  │           │
 * └──────────┴──────────────────┴───────────┘
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-surface-base">
      {/* Top Bar with Mobile Menu Button */}
      <div className="flex items-center relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden absolute left-4 z-50 p-2 hover:bg-surface-secondary rounded-md"
        >
          <Menu className="w-5 h-5 text-text-primary" />
        </button>
        <div className="flex-1">
          <TopBar />
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Center Viewport - Page Content */}
        <div className="flex-1 bg-surface-base overflow-auto">
          <Outlet />
        </div>

        {/* Right Panel (Hidden on mobile) */}
        <div className="hidden lg:block">
          <RightPanel />
        </div>
      </div>
    </div>
  )
}
