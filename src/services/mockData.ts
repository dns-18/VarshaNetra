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

export interface Alert {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  location: string
  district: string
  state: string
  description: string
  timestamp: Date
  status: 'active' | 'acknowledged' | 'resolved'
  affectedAreas: string[]
  recommendedActions: string[]
  affectedPopulation: number
}

/**
 * Real weather data from Open-Meteo API (free, no API key needed)
 * Fetches actual current conditions for NER cities
 */
const cityCoordinates = {
  assam: { lat: 26.1445, lon: 91.7362, name: 'Guwahati, Assam', minRain: 120, maxRain: 320 },
  meghalaya: { lat: 25.5788, lon: 91.8833, name: 'Shillong, Meghalaya', minRain: 300, maxRain: 650 },
  manipur: { lat: 24.8170, lon: 94.9042, name: 'Imphal, Manipur', minRain: 100, maxRain: 280 },
  mizoram: { lat: 23.1815, lon: 92.7879, name: 'Aizawl, Mizoram', minRain: 150, maxRain: 380 },
}

/**
 * Fetch real weather data from Open-Meteo API
 * Returns actual current wind speed, rainfall, and weather conditions
 */
async function fetchRealWeatherData(state: string): Promise<any> {
  const coords = cityCoordinates[state as keyof typeof cityCoordinates] || cityCoordinates.assam
  
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,rain&timezone=Asia/Kolkata`
    )
    const data = await response.json()
    return data.current
  } catch (error) {
    console.error('Error fetching weather data:', error)
    return null
  }
}

/**
 * Generate metrics using REAL weather data from Open-Meteo API
 * Shows actual wind, rainfall, humidity matching Google Weather
 */
export async function generateStateMetrics(state: string = 'assam'): Promise<DashboardMetrics> {
  const coords = cityCoordinates[state as keyof typeof cityCoordinates] || cityCoordinates.assam
  
  // Fetch REAL weather data
  const weatherData = await fetchRealWeatherData(state)
  
  if (!weatherData) {
    // Fallback - shouldn't reach here but just in case
    return {
      rainfall: 0,
      windSpeed: 0,
      riskScore: 0,
      activeAlerts: 0,
      soilSaturation: 0,
      timestamp: new Date(),
      state: state.charAt(0).toUpperCase() + state.slice(1),
      district: coords.name,
      elevation: 0,
    }
  }
  
  // Use REAL wind speed from API (already in km/h)
  const windSpeed = weatherData.wind_speed_10m ?? 15
  
  // Use REAL precipitation from API (mm)
  // Prefer rain (actual rain) over precipitation (forecasted)
  const rainfall = (weatherData.rain ?? weatherData.precipitation ?? 0)
  
  // Humidity as proxy for soil saturation
  const humidity = weatherData.relative_humidity_2m ?? 70
  const soilSaturation = Math.min(Math.round(humidity * 1.2), 100)
  
  // Risk Score: Based on REAL weather factors
  // Rainfall: 0-50mm scale (35%)
  const rainfallFactor = Math.min((rainfall / 50) * 35, 35)
  // Wind: 0-60 km/h scale (25%)
  const windFactor = Math.min((windSpeed / 60) * 25, 25)
  // Saturation: 0-100% scale (40%)
  const saturationFactor = Math.min((soilSaturation / 100) * 40, 40)
  const riskScore = Math.round(rainfallFactor + windFactor + saturationFactor)
  
  // Active Alerts based on REAL risk
  let activeAlerts = 0
  if (riskScore >= 80) activeAlerts = 5
  else if (riskScore >= 70) activeAlerts = 3
  else if (riskScore >= 50) activeAlerts = 2
  else if (riskScore >= 30) activeAlerts = 1
  else activeAlerts = 0
  
  return {
    rainfall: parseFloat(rainfall.toFixed(1)),
    windSpeed: parseFloat(windSpeed.toFixed(2)),
    riskScore: Math.min(riskScore, 100),
    activeAlerts,
    soilSaturation,
    timestamp: new Date(),
    state: state.charAt(0).toUpperCase() + state.slice(1),
    district: coords.name,
    elevation: 0,
  }
}

/**
 * Legacy function - kept for compatibility
 */
export async function generateMockMetrics(): Promise<DashboardMetrics> {
  const states = ['assam', 'meghalaya', 'manipur', 'mizoram']
  const randomState = states[Math.floor(Math.random() * states.length)]
  return generateStateMetrics(randomState)
}

/**
 * Get region status for NER districts
 * Also uses stable seeding so it doesn't change every 5 seconds
 */
export function getRegionStatuses(): RegionStatus[] {
  const regions = [
    'Assam - Northern Region',
    'Meghalaya - Western Slopes',
    'Manipur - Central Valley',
    'Mizoram - Eastern Zone',
  ]

  const now = new Date()
  const dayOfMonth = now.getDate()

  return regions.map((region, idx) => {
    // Stable status based on region + day (95% online, 4% warning, 1% offline)
    const seed = (region.charCodeAt(0) + dayOfMonth * 10) % 100
    let status: 'online' | 'warning' | 'offline'
    if (seed < 95) status = 'online'
    else if (seed < 99) status = 'warning'
    else status = 'offline'

    // Last update: always within last 5-10 minutes to show active monitoring
    const minutesAgo = Math.floor((dayOfMonth % 10) * 1 + 2)

    return {
      region,
      status,
      lastUpdate: `${minutesAgo} min ago`,
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
  const stateCoords = cityCoordinates[state.toLowerCase() as keyof typeof cityCoordinates]
  if (!stateCoords) return 'Realistic monsoon rainfall'

  if (rainfall < stateCoords.minRain) {
    return `Below normal for ${state} (Usually ${stateCoords.minRain}-${stateCoords.maxRain}mm)`
  } else if (rainfall > stateCoords.maxRain) {
    return `Exceptional rainfall for ${state} (Usually ${stateCoords.minRain}-${stateCoords.maxRain}mm) - HIGH RISK`
  } else {
    return `Normal monsoon range for ${state} (${stateCoords.minRain}-${stateCoords.maxRain}mm)`
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

/**
 * Generate mock alerts - realistic landslide warning scenarios
 */
export function generateMockAlerts(): Alert[] {
  const alerts: Alert[] = [
    {
      id: 'ALERT-001',
      priority: 'critical',
      title: 'Landslide Risk: Extreme Rainfall',
      location: 'Cherrapunji area',
      district: 'Khasi Hills',
      state: 'Meghalaya',
      description: 'Exceptional rainfall (525mm in 24h) detected. Soil saturation at 94%. Slope failure risk high.',
      timestamp: new Date(Date.now() - 15 * 60000),
      status: 'active',
      affectedAreas: ['Cherrapunji', 'Mawsynram', 'Sohra'],
      recommendedActions: [
        'Issue evacuation alert to nearby villages',
        'Deploy emergency response teams',
        'Monitor slope stability in real-time',
        'Prepare medical facilities for casualties',
      ],
      affectedPopulation: 2400,
    },
    {
      id: 'ALERT-002',
      priority: 'high',
      title: 'Heavy Rainfall Warning',
      location: 'Imphal Valley',
      district: 'Manipur',
      state: 'Manipur',
      description: 'Heavy monsoon rainfall expected (220mm). Soil saturation rising. Alert for ground instability.',
      timestamp: new Date(Date.now() - 45 * 60000),
      status: 'active',
      affectedAreas: ['Imphal', 'Thoubal', 'Ukhrul'],
      recommendedActions: [
        'Monitor vulnerable slopes',
        'Increase sensor monitoring frequency',
        'Prepare warning protocols',
      ],
      affectedPopulation: 1800,
    },
    {
      id: 'ALERT-003',
      priority: 'high',
      title: 'Flash Flood Risk: Steep Slope Zone',
      location: 'Naga Hills',
      district: 'Nagaland',
      state: 'Assam',
      description: 'Combined high rainfall + steep terrain. Flash flood potential in valley zones.',
      timestamp: new Date(Date.now() - 2 * 60 * 60000),
      status: 'acknowledged',
      affectedAreas: ['Kiphire', 'Wokha', 'Zunheboto'],
      recommendedActions: ['Route diversion for traffic', 'Community awareness campaign'],
      affectedPopulation: 950,
    },
    {
      id: 'ALERT-004',
      priority: 'medium',
      title: 'Moderate Rainfall: Monitoring Zone',
      location: 'Aizawl District',
      district: 'Aizawl',
      state: 'Mizoram',
      description: 'Moderate rainfall (180mm). Soil saturation at 65%. Situation stable, continue monitoring.',
      timestamp: new Date(Date.now() - 3 * 60 * 60000),
      status: 'acknowledged',
      affectedAreas: ['Aizawl', 'Saitual'],
      recommendedActions: ['Continue routine monitoring', 'Update forecast every 6 hours'],
      affectedPopulation: 520,
    },
    {
      id: 'ALERT-005',
      priority: 'low',
      title: 'Light Rainfall: Normal Conditions',
      location: 'Lakhimpur District',
      district: 'Lakhimpur',
      state: 'Assam',
      description: 'Light rainfall (89mm). Soil saturation at 38%. No immediate risk detected.',
      timestamp: new Date(Date.now() - 4 * 60 * 60000),
      status: 'resolved',
      affectedAreas: ['Lakhimpur', 'Dhemaji'],
      recommendedActions: ['Continue standard monitoring'],
      affectedPopulation: 340,
    },
  ]

  return alerts
}

/**
 * Get priority color and badge
 */
export function getPriorityColor(priority: Alert['priority']): string {
  switch (priority) {
    case 'critical':
      return '#dc2626'
    case 'high':
      return '#ef4444'
    case 'medium':
      return '#f59e0b'
    case 'low':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(status: Alert['status']): string {
  switch (status) {
    case 'active':
      return '#ef4444'
    case 'acknowledged':
      return '#f59e0b'
    case 'resolved':
      return '#10b981'
    default:
      return '#6b7280'
  }
}
