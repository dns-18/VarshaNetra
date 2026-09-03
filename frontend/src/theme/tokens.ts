/**
 * VARSHANETRA Design System
 * Design tokens for the Terrain Intelligence Command Center
 */

export const COLORS = {
  // Command center backgrounds
  backgrounds: {
    base: '#0f1419',      // Deepest background
    secondary: '#1a1f2e', // Secondary surfaces
    elevated: '#252d3d',  // Cards/panels
    border: '#2d3142',    // Borders
  },

  // Text colors
  text: {
    primary: '#e5e7eb',    // High contrast text
    secondary: '#9ca3af',  // Supporting information
    muted: '#6b7280',      // Tertiary/subtle text
    inverse: '#0f1419',    // For use on light backgrounds
  },

  // Risk states - semantic colors for disaster management
  risk: {
    low: '#10b981',      // Green - safe zone
    moderate: '#f59e0b', // Amber - caution/monitor
    high: '#ef4444',     // Orange-red - warning/alert
    critical: '#dc2626', // Red - emergency/danger
  },

  // System status colors
  status: {
    success: '#10b981',   // Green
    warning: '#f59e0b',   // Amber
    error: '#ef4444',     // Red
    info: '#06b6d4',      // Cyan - operational
  },
} as const

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    mono: 'ui-monospace, Consolas, monospace',
  },
  
  sizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  
  lineHeight: {
    tight: 1.3,
    normal: 1.5,
    relaxed: 1.6,
  },
  
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

export const SPACING = {
  0: '0',
  2: '2px',
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  24: '24px',
  32: '32px',
  48: '48px',
  64: '64px',
} as const

export const SHADOWS = {
  sm: 'rgba(0, 0, 0, 0.1) 0 1px 2px 0',
  base: 'rgba(0, 0, 0, 0.1) 0 1px 3px 0, rgba(0, 0, 0, 0.06) 0 1px 2px 0',
  md: 'rgba(0, 0, 0, 0.1) 0 4px 6px -1px, rgba(0, 0, 0, 0.1) 0 2px 4px -1px',
  lg: 'rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.05) 0 4px 6px -2px',
  xl: 'rgba(0, 0, 0, 0.1) 0 20px 25px -5px, rgba(0, 0, 0, 0.04) 0 10px 10px -5px',
  // Operational glow states
  'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
  'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
  'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
} as const

export const BORDER_RADIUS = {
  none: '0',
  sm: '0.25rem',
  base: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const

/**
 * Risk level types
 * Used throughout the application for consistent state management
 */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export const RISK_LEVELS: Record<RiskLevel, { color: string; label: string }> = {
  low: {
    color: COLORS.risk.low,
    label: 'LOW',
  },
  moderate: {
    color: COLORS.risk.moderate,
    label: 'MODERATE',
  },
  high: {
    color: COLORS.risk.high,
    label: 'HIGH',
  },
  critical: {
    color: COLORS.risk.critical,
    label: 'CRITICAL',
  },
} as const

/**
 * Get color for a given risk level
 */
export const getRiskColor = (level: RiskLevel): string => {
  return RISK_LEVELS[level].color
}

/**
 * Get label for a given risk level
 */
export const getRiskLabel = (level: RiskLevel): string => {
  return RISK_LEVELS[level].label
}

/**
 * Accessibility: Ensure color + text for risk communication
 */
export const getRiskIndicator = (level: RiskLevel): { color: string; label: string } => {
  return RISK_LEVELS[level]
}
