import { FormEvent, useState } from 'react'
import { CloudRain, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Mode = 'login' | 'signup'

export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password.trim() || (mode === 'signup' && !name.trim())) {
      setMessage('Please complete every required field.')
      return
    }
    const stored = JSON.parse(localStorage.getItem('varshanetra-user') || 'null')
    if (mode === 'signup') {
      localStorage.setItem('varshanetra-user', JSON.stringify({ name: name.trim(), email: email.trim(), password }))
      localStorage.setItem('varshanetra-session', JSON.stringify({ name: name.trim(), email: email.trim() }))
      navigate('/')
      return
    }
    if (!stored || stored.email !== email.trim() || stored.password !== password) {
      setMessage('Incorrect email or password. Create an account first if you are new.')
      return
    }
    localStorage.setItem('varshanetra-session', JSON.stringify({ name: stored.name, email: stored.email }))
    navigate('/')
  }

  return <main className="min-h-screen bg-[#061019] px-4 py-10 text-white"><div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0a1725] shadow-2xl md:grid-cols-2"><section className="hidden bg-gradient-to-br from-[#0d3155] via-[#08243f] to-[#061019] p-10 md:block"><CloudRain className="h-12 w-12 text-blue-300" /><h1 className="mt-10 text-4xl font-bold">VARSHANETRA</h1><p className="mt-3 text-lg text-blue-100">Observe · Predict · Warn · Protect</p><p className="mt-8 max-w-sm text-sm leading-6 text-slate-300">A terrain intelligence workspace for rainfall monitoring, early warnings, and landslide-risk awareness.</p></section><section className="p-7 sm:p-10"><div className="mb-8"><h2 className="text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="mt-2 text-sm text-slate-300">{mode === 'login' ? 'Sign in to continue to the command center.' : 'Start using VARSHANETRA in a few seconds.'}</p></div><form onSubmit={submit} className="space-y-4">{mode === 'signup' && <label className="block text-sm font-medium text-slate-200">Full name<div className="relative mt-1"><UserRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-[#061019] py-2.5 pl-10 pr-3 text-white outline-none focus:border-blue-400" placeholder="Your name" /></div></label>}<label className="block text-sm font-medium text-slate-200">Email address<div className="relative mt-1"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-[#061019] py-2.5 pl-10 pr-3 text-white outline-none focus:border-blue-400" placeholder="you@example.com" /></div></label><label className="block text-sm font-medium text-slate-200">Password<div className="relative mt-1"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-[#061019] py-2.5 pl-10 pr-10 text-white outline-none focus:border-blue-400" placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{message && <p className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">{message}</p>}<button className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-500">{mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="mt-6 w-full text-sm text-blue-300 hover:text-blue-200">{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button><button onClick={() => navigate('/')} className="mt-4 w-full text-sm text-slate-400 hover:text-white">Return to Home</button></section></div></main>
}
