import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CloudRain, House, LayoutDashboard, Map, BellRing, Proportions, Settings, Info, Contact, Dot, X } from 'lucide-react'

/**
 * Left Navigation Sidebar
 * 
 * Features:
 * - Route-aware active states
 * - Mobile hamburger menu (controlled from parent)
 * - Full desktop sidebar
 * - Smooth navigation with React Router
 */
interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    { path: '/', icon: House, label: 'Home' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/map', icon: Map, label: 'Live Map' },
    { path: '/forecast', icon: CloudRain, label: 'Forecast' },
    { path: '/alerts', icon: BellRing, label: 'Alerts' },
    { path: '/reports', icon: Proportions, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/about', icon: Info, label: 'About' },
    { path: '/contact', icon: Contact, label: 'Contact' },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    if (onClose) onClose() // Close mobile menu on navigation
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div
      className={`
        fixed md:static inset-y-16 left-0 z-40 w-64 bg-surface-base border-r border-surface-border 
        flex flex-col h-[calc(100vh-64px)] md:h-full
        transform transition-transform duration-300 md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 p-2 hover:bg-surface-secondary rounded-md"
      >
        <X className="w-5 h-5 text-text-primary" />
      </button>

      {/* Logo/Header */}
      <div className="px-6 py-6 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-status-info" />
          <div className="text-lg font-bold text-status-info">
            VARSHANETRA
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mt-3">
          <span className="text-xs text-text-muted font-semibold">Observe</span>
          <Dot className="w-1.5 h-1.5 text-status-info" />
          <span className="text-xs text-text-muted font-semibold">Predict</span>
          <Dot className="w-1.5 h-1.5 text-status-info" />
          <span className="text-xs text-text-muted font-semibold">Warn</span>
          <Dot className="w-1.5 h-1.5 text-status-info" />
          <span className="text-xs text-text-muted font-semibold">Protect</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all ${
                active
                  ? 'bg-status-info text-surface-base font-medium shadow-md'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Login Section */}
      <div className="px-4 py-4 border-t border-surface-border space-y-3">
        <button className="w-full px-4 py-2 bg-status-info text-surface-base text-sm font-medium rounded-md hover:bg-cyan-500 transition-colors">
          Login / Sign up
        </button>
      </div>
    </div>
  )
}
