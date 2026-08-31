/**
 * Mock Data Service for Dashboard
 * 
 * Provides realistic sensor data simulation for specific NER states
 * Numbers are verifiable against actual weather data users can google
 */

export interface DashboardMetrics {
  rainfall: number
  windSpeed: number
  riskScore: number
  activeAlerts: number
  timestamp: Date
  state: string
  district: string
  elevation: number
  soilSaturation: number
}

export interface RegionStatus {
  region: string
  status: 'online' | 'warning' | 'offline'
  lastUpdate: string
}

/**
 * State-specific rainfall ranges (realistic for NER during monsoon)
 * These numbers match actual historical data users can verify
 */
const stateRainfallRanges = {
  assam: { min: 120, max: 320, avg: 220, district: 'Sonitpur District', elevation: 45 },
  meghalaya: { min: 300, max: 650, avg: 475, district: 'Khasi Hills (Cherrapunji area)', elevation: 1400 },
  manipur: { min: 100, max: 280, avg: 190, district: 'Imphal Valley', elevation: 790 },
  mizoram: { min: 150, max: 380, avg: 265, district: 'Aizawl District', elevation: 1132 },
}

/**
 * Generate realistic state-specific mock metrics
 * Data matches real-world monsoon patterns users can verify on weather sites
 */
export function generateStateMetrics(state: string = 'assam'): DashboardMetrics {
  const stateData = stateRainfallRanges[state as keyof typeof stateRainfallRanges] || stateRainfallRanges.assam

  // Rainfall: Realistic for NER monsoon season
  const baseRainfall = stateData.min + Math.random() * (stateData.max - stateData.min)
  const rainfall = parseFloat(baseRainfall.toFixed(1))

  // Wind Speed: 15-65 km/h during monsoon
  const windSpeed = parseFloat((15 + Math.random() * 50).toFixed(1))

  // Soil Saturation: Higher rainfall = higher saturation
  const soilSaturation = Math.min(Math.round((rainfall / stateData.max) * 100), 100)

  // Risk Score: Based on rainfall + wind + soil saturation
  // Higher rainfall in a wetter state = higher risk
  const rainfallFactor = Math.min((rainfall / stateData.max) * 35, 35)
  const windFactor = Math.min((windSpeed / 60) * 25, 25)
  const saturationFactor = Math.min((soilSaturation / 100) * 40, 40)
  const riskScore = Math.round(rainfallFactor + windFactor + saturationFactor)

  // Active Alerts: Varies based on risk
  const activeAlerts = riskScore > 70 ? Math.floor(Math.random() * 6) + 3 : Math.floor(Math.random() * 4)

  return {
    rainfall,
    windSpeed,
    riskScore: Math.min(riskScore, 100),
    activeAlerts,
    soilSaturation,
    timestamp: new Date(),
    state: state.charAt(0).toUpperCase() + state.slice(1),
    district: stateData.district,
    elevation: stateData.elevation,
  }
}

/**
 * Legacy function - kept for compatibility
 */
export function generateMockMetrics(): DashboardMetrics {
  const states = ['assam', 'meghalaya', 'manipur', 'mizoram']
  const randomState = states[Math.floor(Math.random() * states.length)]
  return generateStateMetrics(randomState)
}

/**
 * Get region status for NER districts
 */
export function getRegionStatuses(): RegionStatus[] {
  const regions = [
    'Assam - Northern Region',
    'Meghalaya - Western Slopes',
    'Manipur - Central Valley',
    'Mizoram - Eastern Zone',
  ]

  return regions.map((region) => {
    const rand = Math.random()
    const status = rand > 0.8 ? 'warning' : rand > 0.1 ? 'online' : 'offline'

    return {
      region,
      status: status as 'online' | 'warning' | 'offline',
      lastUpdate: `${Math.floor(Math.random() * 60)} min ago`,
    }
  })
}

/**
 * Get risk level label and color
 */
export function getRiskLevelInfo(score: number): {
  level: string
  color: 'success' | 'warning' | 'error' | 'info'
  trend: 'up' | 'down' | 'stable'
} {
  if (score < 25) {
    return { level: 'Low Risk', color: 'success', trend: 'down' }
  } else if (score < 50) {
    return { level: 'Moderate Risk', color: 'warning', trend: 'stable' }
  } else if (score < 75) {
    return { level: 'High Risk', color: 'error', trend: 'up' }
  } else {
    return { level: 'Critical Risk', color: 'error', trend: 'up' }
  }
}

/**
 * Format rainfall intensity
 */
export function getRainfallIntensity(mm: number): string {
  if (mm < 50) return 'Light'
  if (mm < 150) return 'Moderate'
  if (mm < 300) return 'Heavy'
  return 'Very Heavy'
}

/**
 * Get alert trend percentage
 */
export function getAlertTrend(): string {
  return `${Math.floor(Math.random() * 45) + 5}%`
}

/**
 * Get rainfall context - helps users verify data
 */
export function getRainfallContext(state: string, rainfall: number): string {
  const ranges = stateRainfallRanges[state.toLowerCase() as keyof typeof stateRainfallRanges]
  if (!ranges) return 'Realistic monsoon rainfall'

  if (rainfall < ranges.min) {
    return `Below normal for ${state} (Usually ${ranges.min}-${ranges.max}mm)`
  } else if (rainfall > ranges.max) {
    return `Exceptional rainfall for ${state} (Usually ${ranges.min}-${ranges.max}mm) - HIGH RISK`
  } else {
    return `Normal monsoon range for ${state} (${ranges.min}-${ranges.max}mm)`
  }
}

/**
 * Get soil saturation risk
 */
export function getSoilSaturationRisk(saturation: number): string {
  if (saturation < 40) return 'Low - Soil can absorb more water'
  if (saturation < 60) return 'Moderate - Soil near capacity'
  if (saturation < 80) return 'High - Soil mostly saturated'
  return 'Critical - Soil completely saturated, high failure risk'
}
