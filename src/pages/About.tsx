import React from 'react'
import { BrainCircuit, Eye, Info, ShieldCheck } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-full overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8"><Info className="mb-4 text-status-info" size={30} /><h1 className="text-3xl font-bold text-text-primary">About VARSHANETRA</h1><p className="mt-2 max-w-2xl text-text-secondary">Terrain intelligence for rainfall awareness, early warning, and safer decisions in vulnerable regions.</p></header>
        <div className="grid gap-5 md:grid-cols-3">{[{ icon: Eye, title: 'Observe', text: 'Bring weather, terrain, and monitoring signals into one live view.' }, { icon: BrainCircuit, title: 'Predict', text: 'Turn changing conditions into clear, location-focused risk signals.' }, { icon: ShieldCheck, title: 'Warn & Protect', text: 'Support timely alerts and practical response for communities at risk.' }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-surface-border bg-surface-secondary p-5"><Icon className="mb-4 text-status-info" size={24} /><h2 className="font-semibold text-text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{text}</p></article>)}</div>
      </div>
    </div>
  )
}
