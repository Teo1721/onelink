'use client'

import { useEffect, useState, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Users, ShieldCheck, Calendar, TrendingUp, TrendingDown,
  RefreshCw, ChevronDown, ChevronUp, Send, Loader2,
  AlertTriangle, Info, Zap, Clock, Award,
} from 'lucide-react'

/* ── types ─────────────────────────────────────────────────── */
type Severity = 'info' | 'warning' | 'critical'

interface Alert {
  id: string
  alert_type: string
  severity: Severity
  title: string
  message: string
  trend_days: number
  data: Record<string, any>
  date: string
  resolved: boolean
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

/* ── severity config ─────────────────────────────────────────*/
const SEV = {
  info:     { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700'  },
  warning:  { icon: AlertTriangle, bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  critical: { icon: Zap,           bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',   badge: 'bg-red-100 text-red-700'    },
}

const TYPE_LABELS: Record<string, string> = {
  cert_expiry_warning:      'Certyfikaty',
  pending_leave_backlog:    'Urlopy',
  low_attendance:           'Frekwencja',
  labor_cost_spike:         'Koszty pracy',
  potential_understaffing:  'Kadrowanie',
}

/* ── TrendBadge ─────────────────────────────────────────────── */
function TrendBadge({ days }: { days: number }) {
  if (days < 2) return null
  const color = days >= 5 ? 'bg-red-100 text-red-700' : days >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
      <TrendingDown className="w-2.5 h-2.5" />
      {days} dni
    </span>
  )
}

/* ── AlertCard ──────────────────────────────────────────────── */
function AlertCard({ alert }: { alert: Alert }) {
  const [open, setOpen] = useState(false)
  const s = SEV[alert.severity]
  const Icon = s.icon

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.badge}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.badge}`}>
              {TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
            </span>
            {alert.trend_days >= 2 && <TrendBadge days={alert.trend_days} />}
          </div>
          <p className={`text-[13px] font-semibold leading-snug ${s.text}`}>{alert.title}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#E5E7EB]/60 pt-3 space-y-3">
          <p className="text-[13px] text-[#374151] leading-relaxed">{alert.message}</p>

          {/* Cert list */}
          {alert.data?.cert_list && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Certyfikaty do odnowienia</p>
              {(alert.data.cert_list as string[]).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-[#374151] bg-white/70 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5">
                  <Award className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                  {c}
                </div>
              ))}
              {alert.data.critical > 0 && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <Zap className="w-3 h-3 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-700">{alert.data.critical} certyfikat(ów) wygasa w ciągu 7 dni!</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance stats */}
          {alert.data?.shifts != null && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Zaplanowane', value: alert.data.shifts },
                { label: 'Rejestracje', value: alert.data.clock_ins },
                { label: 'Frekwencja', value: `${(alert.data.attendance_rate * 100).toFixed(0)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                  <p className="text-[16px] font-black text-[#111827]">{value}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Labor cost stats */}
          {alert.data?.labor_pct_this != null && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                <p className="text-[16px] font-black text-red-600">{(alert.data.labor_pct_this * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-[#9CA3AF]">Ten tydzień</p>
              </div>
              <div className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                <p className="text-[16px] font-black text-[#374151]">{(alert.data.labor_pct_last * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-[#9CA3AF]">Poprzedni tydzień</p>
              </div>
            </div>
          )}

          {alert.trend_days >= 3 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-700">
                Problem utrzymuje się przez <strong>{alert.trend_days} kolejnych dni</strong>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Summary strip ───────────────────────────────────────────── */
function SummaryStrip({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter(a => a.severity === 'critical').length
  const warnings  = alerts.filter(a => a.severity === 'warning').length
  const certs     = alerts.filter(a => a.alert_type === 'cert_expiry_warning').length
  const trending  = alerts.filter(a => a.trend_days >= 3).length

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {[
        { label: 'Krytyczne',  value: critical, color: 'text-red-600',   bg: 'bg-red-50',    icon: Zap },
        { label: 'Ostrzeżenia', value: warnings, color: 'text-amber-600', bg: 'bg-amber-50',  icon: AlertTriangle },
        { label: 'Certyfikaty', value: certs,    color: 'text-blue-600',  bg: 'bg-blue-50',   icon: Award },
        { label: 'Trwające 3d+', value: trending, color: 'text-purple-600', bg: 'bg-purple-50', icon: Clock },
      ].map(({ label, value, color, bg, icon: Icon }) => (
        <div key={label} className={`rounded-xl p-3 ${bg} border border-[#E5E7EB]`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className={`text-[18px] font-black ${color}`}>{value}</span>
          </div>
          <p className="text-[10px] text-[#6B7280] font-medium">{label}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Team overview ───────────────────────────────────────────── */
function TeamOverview({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [stats, setStats] = useState<{
    total: number; byLocation: { name: string; count: number }[]
  } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: locs } = await supabase.from('locations').select('id, name').eq('company_id', companyId)
      if (!locs?.length) return
      const byLocation: { name: string; count: number }[] = []
      let total = 0
      for (const loc of locs) {
        const { count } = await supabase.from('employees').select('id', { count: 'exact', head: true })
          .eq('location_id', loc.id).eq('status', 'active')
        byLocation.push({ name: loc.name, count: count ?? 0 })
        total += count ?? 0
      }
      setStats({ total, byLocation })
    }
    load()
  }, [companyId])

  if (!stats) return <div className="h-20 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-[#9CA3AF]" /></div>

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Przegląd zespołu</p>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <span className="text-[20px] font-black text-white">{stats.total}</span>
        </div>
        <div>
          <p className="text-[15px] font-bold text-[#111827]">Aktywnych pracowników</p>
          <p className="text-[12px] text-[#6B7280]">we wszystkich lokalizacjach</p>
        </div>
      </div>
      <div className="space-y-2">
        {stats.byLocation.map(({ name, count }) => (
          <div key={name}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[12px] text-[#374151]">{name}</span>
              <span className="text-[12px] font-bold text-[#111827]">{count} os.</span>
            </div>
            <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Upcoming cert expiries ──────────────────────────────────── */
function CertPanel({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [certs, setCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: locs } = await supabase.from('locations').select('id').eq('company_id', companyId)
      const locIds = locs?.map((l: any) => l.id) ?? []
      if (!locIds.length) { setLoading(false); return }

      const empIds = ((await supabase.from('employees').select('id').in('location_id', locIds).eq('status', 'active')).data ?? []).map((e: any) => e.id)
      if (!empIds.length) { setLoading(false); return }

      const in60 = new Date(); in60.setDate(in60.getDate() + 60)
      const { data } = await supabase
        .from('employee_certifications')
        .select('cert_name, expiry_date, employees(full_name)')
        .in('employee_id', empIds)
        .gte('expiry_date', new Date().toLocaleDateString('sv-SE'))
        .lte('expiry_date', in60.toLocaleDateString('sv-SE'))
        .order('expiry_date', { ascending: true })
        .limit(20)
      setCerts(data ?? [])
      setLoading(false)
    }
    load()
  }, [companyId])

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-4 h-4 animate-spin text-[#9CA3AF]" /></div>

  const now = new Date()
  const getDaysLeft = (exp: string) => Math.round((new Date(exp).getTime() - now.getTime()) / 86400000)

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Certyfikaty wygasające (60 dni)</p>
      {certs.length === 0 ? (
        <div className="text-center py-8">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-[13px] text-[#374151] font-semibold">Wszystkie certyfikaty aktualne</p>
          <p className="text-[11px] text-[#9CA3AF]">Żaden certyfikat nie wygasa w ciągu 60 dni.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {certs.map((c, i) => {
            const daysLeft = getDaysLeft(c.expiry_date)
            const urgent = daysLeft <= 7
            const soon   = daysLeft <= 30
            return (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${urgent ? 'bg-red-50 border-red-200' : soon ? 'bg-amber-50 border-amber-200' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}>
                <Award className={`w-4 h-4 shrink-0 ${urgent ? 'text-red-500' : soon ? 'text-amber-500' : 'text-[#9CA3AF]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#111827] truncate">{(c.employees as any)?.full_name}</p>
                  <p className="text-[11px] text-[#6B7280]">{c.cert_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[11px] font-bold ${urgent ? 'text-red-600' : soon ? 'text-amber-600' : 'text-[#6B7280]'}`}>
                    {daysLeft}d
                  </p>
                  <p className="text-[10px] text-[#9CA3AF]">{c.expiry_date}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Ask Marta chat ──────────────────────────────────────────── */
function AskMarta({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Cześć! Jestem Marta — Dyrektor HR AI. Pytaj o zespół, koszty pracy, frekwencję, certyfikaty lub strategię zatrudnienia.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, director: 'hr', question: q }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', content: data?.answer ?? data?.message ?? 'Brak odpowiedzi.' }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Błąd połączenia. Spróbuj ponownie.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mr-2 mt-0.5">M</div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm'
                : 'bg-[#F3F4F6] text-[#111827] rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
            <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <span className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Zapytaj Martę o zespół..."
          className="flex-1 h-10 px-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] placeholder:text-[#D1D5DB] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── TABS ───────────────────────────────────────────────────── */
const TABS = [
  { id: 'alerts',   label: 'Alerty HR',     icon: AlertTriangle },
  { id: 'team',     label: 'Zespół',         icon: Users },
  { id: 'certs',    label: 'Certyfikaty',    icon: Award },
  { id: 'ask',      label: 'Zapytaj Martę', icon: TrendingUp },
]

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export function HrDirector({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient
  companyId: string
}) {
  const [tab, setTab] = useState('alerts')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [lastRun, setLastRun] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cfo_alerts')
      .select('*')
      .eq('company_id', companyId)
      .eq('director', 'hr')
      .eq('resolved', false)
      .gte('date', new Date(Date.now() - 7 * 86400000).toLocaleDateString('sv-SE'))
      .order('date', { ascending: false })
    setAlerts((data ?? []) as Alert[])
    setLastRefresh(new Date())
    setLoading(false)
  }

  const runAnalysis = async () => {
    setRunning(true)
    try {
      await fetch('/api/ai/trigger-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director: 'hr' }),
      })
      await load()
      setLastRun(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))
    } finally { setRunning(false) }
  }

  useEffect(() => { load() }, [companyId])

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    const ds = order[a.severity] - order[b.severity]
    return ds !== 0 ? ds : (b.trend_days ?? 1) - (a.trend_days ?? 1)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-[#111827]">Dyrektor HR AI</h2>
            <p className="text-[11px] text-[#6B7280]">Marta — monitoruje zespół 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-[#9CA3AF]">
              {lastRefresh.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
              {lastRun && ` · analiza ${lastRun}`}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={running || loading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all disabled:opacity-50"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Uruchom analizę
          </button>
        </div>
      </div>

      {!loading && <SummaryStrip alerts={alerts} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#F3F4F6] p-1 rounded-xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-semibold transition-all',
              tab === id ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]',
            ].join(' ')}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-[#9CA3AF]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-[13px]">Ładowanie danych HR…</span>
        </div>
      )}

      {!loading && tab === 'alerts' && (
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak alertów HR</p>
              <p className="text-[12px] text-[#9CA3AF]">Zespół w normie. Marta monitoruje na bieżąco.</p>
            </div>
          ) : sorted.map(a => <AlertCard key={a.id} alert={a} />)}
        </div>
      )}

      {!loading && tab === 'team' && (
        <TeamOverview supabase={supabase} companyId={companyId} />
      )}

      {!loading && tab === 'certs' && (
        <CertPanel supabase={supabase} companyId={companyId} />
      )}

      {!loading && tab === 'ask' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[13px] font-black text-white">M</div>
            <div>
              <p className="text-[13px] font-bold text-[#111827]">Marta</p>
              <p className="text-[11px] text-[#9CA3AF]">Dyrektor HR AI — dostępna 24/7</p>
            </div>
          </div>
          <AskMarta supabase={supabase} companyId={companyId} />
        </div>
      )}
    </div>
  )
}
