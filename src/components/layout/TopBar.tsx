// import React, { useEffect, useState } from 'react'
// import { Bell, CloudRain, Search, ShieldCheck, Signal } from 'lucide-react'

// /**
//  * Top System Status Bar
//  *
//  * Displays:
//  * - Search location input
//  * - Current timestamp
//  * - Live indicator
//  * - System health badges
//  */
// export default function TopBar() {
//   const [currentTime, setCurrentTime] = useState(() =>
//     new Date().toLocaleString('en-US', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//       timeZoneName: 'short',
//     })
//   )

//   useEffect(() => {
//     const timer = window.setInterval(() => {
//       setCurrentTime(
//         new Date().toLocaleString('en-US', {
//           day: '2-digit',
//           month: 'short',
//           year: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit',
//           second: '2-digit',
//           timeZoneName: 'short',
//         })
//       )
//     }, 1000)

//     return () => window.clearInterval(timer)
//   }, [])

//   return (
//     <header className="h-16 bg-surface-secondary border-b border-surface-border px-4 md:px-6 flex items-center justify-between gap-3">
//       {/* Left: Search */}
//       <div className="flex-1 min-w-0 max-w-xl">
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
//           <input
//             type="text"
//             placeholder="Search district, rainfall zone, alert..."
//             className="w-full pl-10 pr-4 py-2 bg-surface-base border border-surface-border rounded-md text-sm text-text-primary placeholder-text-muted focus-visible:outline-2 focus-visible:outline-status-info focus-visible:outline-offset-2 transition"
//           />
//         </div>
//       </div>

//       {/* Center: Status pills */}
//       <div className="hidden lg:flex items-center gap-2 xl:gap-3">
//         <div className="flex items-center gap-2 rounded-full border border-status-success/30 bg-status-success/10 px-3 py-1.5">
//           <Signal className="w-3.5 h-3.5 text-status-success" />
//           <span className="text-[10px] font-medium uppercase tracking-wide text-status-success">112 sensors</span>
//         </div>

//         <div className="flex items-center gap-2 rounded-full border border-status-warning/30 bg-status-warning/10 px-3 py-1.5">
//           <Bell className="w-3.5 h-3.5 text-status-warning" />
//           <span className="text-[10px] font-medium uppercase tracking-wide text-status-warning">8 alerts</span>
//         </div>

//         <div className="flex items-center gap-2 rounded-full border border-status-info/30 bg-status-info/10 px-3 py-1.5">
//           <CloudRain className="w-3.5 h-3.5 text-status-info" />
//           <span className="text-[10px] font-medium uppercase tracking-wide text-status-info">Monsoon watch</span>
//         </div>

//         <div className="flex items-center gap-2 rounded-full border border-status-info/30 bg-status-info/10 px-3 py-1.5">
//            <span className="w-1.5 h-1.5 rounded-full bg-status-info animate-pulse" />
//            <span className="text-[10px] font-semibold uppercase tracking-wide text-status-info">
//                 Frontend Preview
//             </span>
//         </div>
//       </div>
//     </header>
//   )
// }

//       {/* Right: Time + Live */}
//       <div className="flex items-center gap-3 md:gap-4 shrink-0">
//         <div className="hidden md:block text-[11px] md:text-xs text-text-muted font-mono tracking-wide">
//           {currentTime}
//         </div>

//         <div className="flex items-center gap-2 rounded-full border border-status-success/30 bg-status-success/10 px-2.5 py-1.5">
//           <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
//           <span className="text-[10px] font-semibold uppercase tracking-wide text-status-success">Live</span>
//         </div>

//         <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-base px-2 py-1 text-[10px] uppercase tracking-wide text-text-secondary">
//           <ShieldCheck className="w-3 h-3 text-status-success" />
//           System OK
//         </div>
//       </div>
//     </header>
//   )
// }

import React, { useEffect, useState } from 'react'
import { Bell, CloudRain, Search, ShieldCheck, Signal } from 'lucide-react'

/**
 * Top System Status Bar
 *
 * Displays:
 * - Search location input
 * - Current timestamp
 * - Live indicator
 * - System health badges
 */
export default function TopBar() {
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(
        new Date().toLocaleString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })
      )
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <header className="h-16 bg-surface-secondary border-b border-surface-border px-4 md:px-6 flex items-center justify-between gap-3">

      {/* Left: Search */}
      <div className="flex-1 min-w-0 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />

          <input
            type="text"
            placeholder="Search district, rainfall zone, alert..."
            className="w-full pl-10 pr-4 py-2 bg-surface-base border border-surface-border rounded-md text-sm text-text-primary placeholder-text-muted focus-visible:outline-2 focus-visible:outline-status-info focus-visible:outline-offset-2 transition"
          />
        </div>
      </div>

      {/* Center: Status pills */}
      <div className="hidden lg:flex items-center gap-2 xl:gap-3">

        {/* Sensors */}
        <div className="flex items-center gap-2 rounded-full border border-status-success/30 bg-status-success/10 px-3 py-1.5">
          <Signal className="w-3.5 h-3.5 text-status-success" />

          <span className="text-[10px] font-medium uppercase tracking-wide text-status-success">
            112 sensors
          </span>
        </div>

        {/* Alerts */}
        <div className="flex items-center gap-2 rounded-full border border-status-warning/30 bg-status-warning/10 px-3 py-1.5">
          <Bell className="w-3.5 h-3.5 text-status-warning" />

          <span className="text-[10px] font-medium uppercase tracking-wide text-status-warning">
            8 alerts
          </span>
        </div>

        {/* Monsoon */}
        <div className="flex items-center gap-2 rounded-full border border-status-info/30 bg-status-info/10 px-3 py-1.5">
          <CloudRain className="w-3.5 h-3.5 text-status-info" />

          <span className="text-[10px] font-medium uppercase tracking-wide text-status-info">
            Monsoon watch
          </span>
        </div>

        {/* Frontend Preview */}
        <div className="flex items-center gap-2 rounded-full border border-status-info/30 bg-status-info/10 px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-status-info animate-pulse" />

          <span className="text-[10px] font-semibold uppercase tracking-wide text-status-info">
            Frontend Preview
          </span>
        </div>

      </div>

      {/* Right: Time + Live */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">

        {/* Current Time */}
        <div className="hidden md:block text-[11px] md:text-xs text-text-muted font-mono tracking-wide">
          {currentTime}
        </div>

        {/* Live */}
        <div className="flex items-center gap-2 rounded-full border border-status-success/30 bg-status-success/10 px-2.5 py-1.5">
          <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />

          <span className="text-[10px] font-semibold uppercase tracking-wide text-status-success">
            Live
          </span>
        </div>

        {/* System Status */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-base px-2 py-1 text-[10px] uppercase tracking-wide text-text-secondary">
          <ShieldCheck className="w-3 h-3 text-status-success" />

          System OK
        </div>

      </div>
    </header>
  )
}