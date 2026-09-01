import React, { useState } from 'react'
import { Settings, Bell, Shield, Palette, Save } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    smsAlerts: false,
    theme: 'dark',
    riskThreshold: 70,
    updateFrequency: 30,
  })

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary">Manage preferences and system configuration</p>
        </div>

        {/* NOTIFICATION SETTINGS */}
        <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Notifications</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })} className="w-5 h-5 rounded" />
              <div>
                <p className="text-text-primary font-medium">Push Notifications</p>
                <p className="text-text-secondary text-sm">Receive real-time alerts on your device</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.emailAlerts} onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })} className="w-5 h-5 rounded" />
              <div>
                <p className="text-text-primary font-medium">Email Alerts</p>
                <p className="text-text-secondary text-sm">Get email notifications for critical incidents</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.smsAlerts} onChange={(e) => setSettings({ ...settings, smsAlerts: e.target.checked })} className="w-5 h-5 rounded" />
              <div>
                <p className="text-text-primary font-medium">SMS Alerts</p>
                <p className="text-text-secondary text-sm">Receive SMS for emergency alerts</p>
              </div>
            </label>
          </div>
        </div>

        {/* ALERT SETTINGS */}
        <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Alert Thresholds</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-text-primary font-medium mb-2">Risk Score Threshold</label>
              <input type="range" min="30" max="90" value={settings.riskThreshold} onChange={(e) => setSettings({ ...settings, riskThreshold: parseInt(e.target.value) })} className="w-full" />
              <p className="text-text-secondary text-sm mt-1">Alert when risk exceeds {settings.riskThreshold}%</p>
            </div>
            <div>
              <label className="block text-text-primary font-medium mb-2">Update Frequency</label>
              <select value={settings.updateFrequency} onChange={(e) => setSettings({ ...settings, updateFrequency: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-surface-tertiary border border-surface-tertiary rounded-lg text-text-primary">
                <option value="15">Every 15 seconds</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every minute</option>
                <option value="300">Every 5 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* THEME SETTINGS */}
        <div className="bg-surface-secondary border border-surface-tertiary rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Display</h2>
          </div>
          <div>
            <label className="block text-text-primary font-medium mb-2">Theme</label>
            <div className="flex gap-4">
              {['dark', 'light'].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" value={t} checked={settings.theme === t} onChange={(e) => setSettings({ ...settings, theme: e.target.value })} className="w-4 h-4" />
                  <span className="text-text-primary capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold">
          <Save className="w-5 h-5" /> Save Settings
        </button>
      </div>
    </div>
  )
}
