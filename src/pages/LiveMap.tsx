import React, { useState } from 'react'
import { MapContainer, TileLayer, Circle, Popup, Marker, useMap } from 'react-leaflet'
import { MapPin, AlertTriangle, CloudRain } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const riskZones = [
  {
    name: 'Assam Plains',
    position: [26.1445, 91.7362],
    risk: 'Moderate',
    rainfall: '214 mm',
    fillColor: '#f59e0b',
    color: '#fbbf24',
    radius: 22000,
  },
  {
    name: 'Meghalaya Hills',
    position: [25.467, 91.3662],
    risk: 'High',
    rainfall: '438 mm',
    fillColor: '#ef4444',
    color: '#f87171',
    radius: 28000,
  },
  {
    name: 'Imphal Valley',
    position: [24.817, 93.9368],
    risk: 'Moderate',
    rainfall: '191 mm',
    fillColor: '#f59e0b',
    color: '#fbbf24',
    radius: 24000,
  },
  {
    name: 'Mizoram Ridge',
    position: [23.1645, 92.9376],
    risk: 'Low',
    rainfall: '168 mm',
    fillColor: '#10b981',
    color: '#34d399',
    radius: 20000,
  },
] as const

const riskLegend = [
  { label: 'High Risk', color: '#ef4444' },
  { label: 'Moderate Risk', color: '#f59e0b' },
  { label: 'Low Risk', color: '#10b981' },
]

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapFocus({ position }: { position: [number, number] }) {
  const map = useMap()

  React.useEffect(() => {
    map.flyTo(position, 8, { duration: 1.2 })
  }, [map, position])

  return null
}

export default function LiveMap() {
  const [selectedRegion, setSelectedRegion] = useState<string>('All')
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.8, 92.6])

  const visibleZones =
    selectedRegion === 'All'
      ? riskZones
      : riskZones.filter((zone) => zone.name === selectedRegion)

  const handleZoneSelect = (zoneName: string) => {
    setSelectedRegion(zoneName)
    const zone = riskZones.find((item) => item.name === zoneName)
    if (zone) {
      setMapCenter(zone.position)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-base">
      <div className="border-b border-surface-border bg-surface-secondary px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Live GIS Map</h1>
            <p className="text-sm text-text-secondary mt-1">
              Landslide risk monitoring across Assam, Meghalaya, Manipur, and Mizoram
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-status-info/30 bg-status-info/10 px-3 py-1.5 text-xs font-medium text-status-info">
            <MapPin className="w-3.5 h-3.5" />
            North-East India
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-[520px]">
          <MapContainer
            center={mapCenter}
            zoom={7}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <MapFocus position={mapCenter} />
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {visibleZones.map((zone) => (
              <React.Fragment key={zone.name}>
                <Circle
                  center={zone.position}
                  radius={zone.radius}
                  pathOptions={{
                    color: zone.color,
                    fillColor: zone.fillColor,
                    fillOpacity: 0.28,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm text-slate-800">
                      <div className="font-bold mb-1">{zone.name}</div>
                      <div className="mb-1">Risk: {zone.risk}</div>
                      <div className="mb-1">Rainfall: {zone.rainfall}</div>
                      <div>Monitoring: 24 active sensors</div>
                    </div>
                  </Popup>
                </Circle>

                <Marker position={zone.position} icon={icon}>
                  <Popup>
                    <div className="text-sm text-slate-800">
                      <div className="font-bold mb-1">{zone.name}</div>
                      <div className="mb-1">Risk: {zone.risk}</div>
                      <div className="mb-1">Rainfall: {zone.rainfall}</div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        <aside className="w-full max-w-sm border-l border-surface-border bg-surface-base p-5">
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-2">Region Filter</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedRegion('All')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedRegion === 'All'
                      ? 'bg-status-info text-slate-950 border-status-info'
                      : 'border-surface-border bg-surface-secondary text-text-secondary'
                  }`}
                >
                  All
                </button>
                {riskZones.map((zone) => (
                  <button
                    key={zone.name}
                    onClick={() => handleZoneSelect(zone.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      selectedRegion === zone.name
                        ? 'bg-status-info text-slate-950 border-status-info'
                        : 'border-surface-border bg-surface-secondary text-text-secondary'
                    }`}
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text-primary mb-2">Risk Overview</h2>
              <div className="space-y-3">
                {riskZones.map((zone) => (
                  <button
                    key={zone.name}
                    onClick={() => handleZoneSelect(zone.name)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedRegion === zone.name
                        ? 'border-status-info bg-status-info/10'
                        : 'border-surface-border bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: zone.fillColor }}
                        />
                        <span className="text-sm font-semibold text-text-primary">{zone.name}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface-base text-text-secondary">
                        {zone.risk}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                      <CloudRain className="w-3.5 h-3.5" />
                      {zone.rainfall}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-3">Legend</h3>
              <div className="space-y-2">
                {riskLegend.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-sm text-text-secondary">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-3">
              <div className="flex items-center gap-2 text-status-warning font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Active watch
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Rainfall accumulation and steep slopes are trending upward in Meghalaya and Assam.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
