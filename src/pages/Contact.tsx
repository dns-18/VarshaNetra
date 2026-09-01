import React, { FormEvent, useState } from 'react'
import { CheckCircle2, Contact, Mail, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true) }
  return (
    <div className="min-h-full overflow-auto bg-gradient-to-br from-surface-base via-surface-secondary to-surface-base p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-xl border border-surface-border bg-surface-secondary p-6"><Contact className="text-status-info" size={30} /><h1 className="mt-5 text-3xl font-bold text-text-primary">Contact us</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Send feedback, report a data issue, or ask about VARSHANETRA.</p><div className="mt-8 space-y-4 text-sm text-text-secondary"><div className="flex gap-3"><Mail className="text-status-info" size={18} />support@varshanetra.local</div><div className="flex gap-3"><MessageSquare className="text-status-info" size={18} />Response dashboard available during active monitoring.</div></div></section><form onSubmit={submit} className="rounded-xl border border-surface-border bg-surface-secondary p-6"><h2 className="text-xl font-semibold text-text-primary">Send a message</h2><div className="mt-5 space-y-4"><input required className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-status-info" placeholder="Your name" /><input required type="email" className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-status-info" placeholder="Email address" /><textarea required rows={5} className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-status-info" placeholder="How can we help?" /></div>{sent && <p className="mt-4 flex items-center gap-2 text-sm text-status-success"><CheckCircle2 size={17} /> Message sent successfully.</p>}<button className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Send message</button></form></div>
    </div>
  )
}
