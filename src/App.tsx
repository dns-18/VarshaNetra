import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AppLayout from '@components/layout/AppLayout'

// Pages
import Home from '@pages/Home'
import Dashboard from '@pages/Dashboard'
import LiveMap from '@pages/LiveMap'
import Forecast from '@pages/Forecast'
import Alerts from '@pages/Alerts'
import Reports from '@pages/Reports'
import SettingsPage from '@pages/Settings'
import About from '@pages/About'
import ContactPage from '@pages/Contact'
import Auth from '@pages/Auth'

/**
 * Main App Component with Router
 * 
 * Sets up:
 * - React Router for page navigation
 * - Layout wrapper around all pages
 * - Route definitions for all views
 */
export default function App() {
  return (
    <Router>
      <Routes>
        {/* All routes share the AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Router>
  )
}
