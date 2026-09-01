import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import { AlertTriangle, BellRing, ChevronDown, CloudRain, Contact, House, Info, LayoutDashboard, LocateFixed, LogIn, Map, Menu, Play, Proportions, Search, Settings, SlidersHorizontal, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

const navigation = [
  { path: '/', label: 'Home', icon: House }, { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Live Map', icon: Map }, { path: '/forecast', label: 'Forecast', icon: CloudRain },
  { path: '/alerts', label: 'Alerts', icon: BellRing }, { path: '/reports', label: 'Reports', icon: Proportions },
  { path: '/settings', label: 'Settings', icon: Settings }, { path: '/about', label: 'About', icon: Info }, { path: '/contact', label: 'Contact', icon: Contact },
]
const rainCells = [
  { at: [24.8, 90.9] as [number, number], color: '#ef3d25', radius: 19 }, { at: [22.7, 90.5] as [number, number], color: '#f5c518', radius: 17 },
  { at: [26.1, 88.8] as [number, number], color: '#42c65a', radius: 21 }, { at: [20.7, 85.5] as [number, number], color: '#ffbd1a', radius: 22 },
  { at: [18.6, 75.5] as [number, number], color: '#20b873', radius: 25 }, { at: [14.3, 76.7] as [number, number], color: '#f2d61d', radius: 19 },
  { at: [12.3, 77.3] as [number, number], color: '#50bdf2', radius: 15 },
]
const legend = [['Very Heavy', '#e33b21'], ['Heavy', '#f48424'], ['Moderate', '#f6d433'], ['Light', '#46c55a'], ['Very Light', '#3156d8']]
const formatIndiaTime = (date: Date) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
}).format(date).replace(',', ' |') + ' IST'
const locations: Record<string, { label: string; center: [number, number]; zoom: number }> = {
  assam: { label: 'Assam', center: [26.2, 92.9], zoom: 7 },
  guwahati: { label: 'Guwahati, Assam', center: [26.1445, 91.7362], zoom: 10 },
  meghalaya: { label: 'Meghalaya', center: [25.467, 91.3662], zoom: 8 },
  shillong: { label: 'Shillong, Meghalaya', center: [25.5788, 91.8933], zoom: 10 },
  manipur: { label: 'Manipur', center: [24.6637, 93.9063], zoom: 8 },
  imphal: { label: 'Imphal, Manipur', center: [24.817, 93.9368], zoom: 10 },
  mizoram: { label: 'Mizoram', center: [23.1645, 92.9376], zoom: 8 },
  aizawl: { label: 'Aizawl, Mizoram', center: [23.7271, 92.7176], zoom: 10 },
  odisha: { label: 'Odisha', center: [20.9517, 85.0985], zoom: 7 },
  india: { label: 'India', center: [21.5, 82], zoom: 5 },
}

function MapSearchController({ location }: { location?: { center: [number, number]; zoom: number } }) {
  const map = useMap()
  useEffect(() => {
    if (location) map.flyTo(location.center, location.zoom, { duration: 1 })
  }, [location, map])
  return null
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchedLocation, setSearchedLocation] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => formatIndiaTime(new Date()))
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(2)
  const [layers, setLayers] = useState({ satellite: true, radar: true, rainfall: true, inundation: true, boundaries: false })
  const times = ['-24h', '-12h', 'Now', '+12h', '+24h', '+36h', '+48h', '+72h']
  const activeTime = useMemo(() => times[frame], [frame])
  const foundLocation = searchedLocation ? locations[searchedLocation.trim().toLowerCase()] : undefined
  const go = (path: string) => { navigate(path); setSidebarOpen(false) }
  const submitSearch = () => setSearchedLocation(search)

  useEffect(() => {
    if (!playing) return
    const interval = window.setInterval(() => setFrame(value => (value + 1) % times.length), 1200)
    return () => window.clearInterval(interval)
  }, [playing, times.length])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(formatIndiaTime(new Date())), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return <main className="relative h-screen overflow-hidden bg-[#061019] text-slate-100">
    <MapContainer center={[21.5, 82]} zoom={5} minZoom={4} zoomControl={false} className="absolute inset-0 z-0 h-full w-full" aria-label="Live weather map of India">
      <MapSearchController location={foundLocation} />
      {layers.satellite ? <TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /> : <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
      {layers.rainfall && rainCells.map((cell, index) => <CircleMarker key={index} center={cell.at} radius={cell.radius} pathOptions={{ color: layers.radar ? cell.color : '#38bdf8', fillColor: cell.color, fillOpacity: layers.radar ? 0.56 : 0.28, opacity: 0.9, weight: layers.radar ? 2 : 1 }} />)}
      {layers.inundation && <CircleMarker center={[22.8, 91.2]} radius={29} pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.2, opacity: 0.95, weight: 2 }} />}
      {layers.boundaries && <Polygon positions={[[26.1, 89.5], [26.1, 92.5], [24.1, 93.1], [23.5, 90.0]]} pathOptions={{ color: '#e2e8f0', fill: false, weight: 1, dashArray: '4 4' }} />}
      <ZoomControl position="bottomright" />
    </MapContainer>
    <div className="pointer-events-none absolute inset-0 bg-[#00111d]/20" />

    <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-30 rounded-lg border border-white/15 bg-[#0a1725]/90 p-2 text-white md:hidden" aria-label="Open menu"><Menu size={20} /></button>
    {sidebarOpen && <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="absolute inset-0 z-30 bg-black/55 md:hidden" />}
    <aside className={`absolute inset-y-0 left-0 z-40 flex w-36 flex-col border-r border-slate-600 bg-[#06121f] px-3 py-5 shadow-2xl transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 md:hidden" aria-label="Close menu"><X size={18} /></button>
      <div className="mb-6 border-b border-white/10 px-1 pb-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/15 text-blue-400"><CloudRain size={21} /></span><span className="text-[11px] font-bold tracking-tight text-white">VARSHANETRA</span></div><p className="mt-2 text-[8px] font-medium leading-3 tracking-wide text-slate-400">OBSERVE · PREDICT<br />WARN · PROTECT</p></div>
      <nav className="space-y-1" aria-label="Primary navigation">{navigation.map(({ path, label, icon: Icon }) => <button key={path} onClick={() => go(path)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${location.pathname === path ? 'bg-[#153b66] text-white shadow-md shadow-blue-950/50' : 'text-slate-100 hover:bg-[#10243c] hover:text-white'}`}><Icon size={17} strokeWidth={2} className={location.pathname === path ? 'text-blue-300' : 'text-slate-300'} /><span>{label}</span></button>)}</nav>
      <div className="mt-auto border-t border-white/10 pt-4"><button onClick={() => go('/auth')} className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-500/60 px-3 py-2.5 text-sm text-slate-100 hover:bg-white/5"><LogIn size={15} /> Login / Sign up</button></div>
    </aside>

    <section className="absolute left-4 right-4 top-4 z-20 flex items-center gap-3 md:left-40"><div className="flex h-10 w-full max-w-xs items-center gap-2 rounded-md border border-slate-600 bg-[#071421] px-3 text-slate-200 shadow-lg"><button onClick={submitSearch} aria-label="Search location"><Search size={16} className="text-blue-300" /></button><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') submitSearch() }} placeholder="Search Assam, Guwahati..." className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-400" /><ChevronDown size={15} className="hidden sm:block" /></div><div className="ml-auto hidden items-center gap-2 rounded-md border border-slate-600 bg-[#071421] px-3 py-2.5 text-xs font-medium text-slate-100 shadow-lg sm:flex"><time dateTime={new Date().toISOString()}>{currentTime}</time><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /><span className="font-semibold text-emerald-300">Live</span></div></section>
    {searchedLocation && <div className="absolute left-4 top-16 z-30 rounded border border-slate-600 bg-[#071421] px-3 py-2 text-xs font-medium text-slate-100 shadow-lg md:left-40">{foundLocation ? `Showing ${foundLocation.label}` : `Location not found. Try Assam, Guwahati, Meghalaya, Shillong, Manipur, Imphal, Mizoram, Aizawl, Odisha, or India.`}</div>}
    <section className="absolute bottom-24 left-4 z-20 hidden w-52 rounded-lg border border-slate-600 bg-[#071421] p-4 shadow-xl md:left-40 md:block"><h2 className="text-sm font-bold text-white">Current Status</h2><p className="mt-2 text-xs leading-5 text-slate-100">High rainfall activity detected over Northeast, Coastal Odisha & Konkan.</p><button onClick={() => go('/alerts')} className="mt-3 rounded border border-blue-400 px-2.5 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-400/20">View Details</button></section>
    <section className="absolute right-4 top-16 z-20 w-56 rounded-lg border border-slate-600 bg-[#071421] p-4 shadow-xl sm:top-20"><div className="mb-3 flex items-center gap-2"><SlidersHorizontal size={15} className="text-blue-300" /><h2 className="text-sm font-bold text-white">Layers</h2></div><div className="space-y-2.5">{([['satellite', 'Satellite Imagery'], ['radar', 'Radar Reflectivity'], ['rainfall', 'Rainfall Intensity'], ['inundation', 'Inundation Risk'], ['boundaries', 'District Boundaries']] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-100"><input type="checkbox" checked={layers[key]} onChange={() => setLayers(value => ({ ...value, [key]: !value[key] }))} className="h-3.5 w-3.5 accent-blue-500" />{label}</label>)}</div><div className="mt-4 border-t border-slate-600 pt-3"><h3 className="mb-2 text-xs font-bold text-white">Rainfall Intensity</h3>{legend.map(([name, color]) => <div key={name} className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-100"><span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: color }} />{name}</div>)}</div></section>
    <div className="absolute bottom-24 right-4 z-20 hidden rounded-md border border-white/10 bg-[#071421]/90 p-2 text-blue-200 shadow-xl sm:block"><LocateFixed size={19} /></div>
    <section className="absolute bottom-3 left-3 right-3 z-20 flex h-16 items-center gap-3 rounded-lg border border-white/10 bg-[#071421]/95 px-4 shadow-2xl backdrop-blur-sm md:left-40"><button onClick={() => { setPlaying(value => !value); if (!playing) setFrame(value => Math.min(value + 1, times.length - 1)) }} className="grid h-8 w-8 place-items-center rounded-full bg-[#2463dd] text-white" aria-label={playing ? 'Pause timeline' : 'Play timeline'}>{playing ? <span className="text-xs font-bold">Ⅱ</span> : <Play size={15} fill="currentColor" />}</button><div className="relative flex flex-1 justify-between pt-5"><div className="absolute left-1 right-1 top-2 h-0.5 bg-slate-600" />{times.map((time, index) => <button key={time} onClick={() => setFrame(index)} className="relative z-10 flex flex-col items-center gap-1 text-[10px] text-slate-300"><span className={`h-2.5 w-2.5 rounded-full ${index === frame ? 'bg-blue-400 ring-4 ring-blue-500/30' : 'bg-slate-600'}`} />{index === frame && <span className="absolute -top-4 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] text-white">{activeTime === 'Now' ? 'Now' : activeTime}</span>}<span>{time}</span></button>)}</div></section>
  </main>
}
