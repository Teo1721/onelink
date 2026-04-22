'use client'

import { useEffect, useState, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  TrendingUp, TrendingDown, MapPin, Calendar, BarChart3,
  RefreshCw, ChevronDown, ChevronUp, Send, Loader2,
  AlertTriangle, Info, Zap, Star, ArrowUpRight, ArrowDownRight,
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

/* ── severity helpers ───────────────────────────────────────── */
const SEV = {
  info:     { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700'  },
  warning:  { icon: AlertTriangle, bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  critical: { icon: Zap,           bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',   badge: 'bg-red-100 text-red-700'    },
}

const TYPE_LABELS: Record<string, string> = {
  weekly_revenue_down:    'Przychody ↓ tyg.',
  weekly_revenue_up:      'Przychody ↑ tyg.',
  day_performance_gap:    'Różnica dni tyg.',
  location_underperforming: 'Lokalizacja słaba',
  revenue_decline_trend:  'Trend spadkowy',
  weekend_dependent:      'Zależność weekendu',
}

/* ── DOW chart ──────────────────────────────────────────────── */
const DAYS_PL = ['Ndz', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob']

function DowChart({ avgByDow }: { avgByDow: Record<string, number> }) {
  const entries = Object.entries(avgByDow)
    .map(([d, v]) => ({ dow: +d, label: DAYS_PL[+d], value: v }))
    .sort((a, b) => a.dow - b.dow)
  const max = Math.max(...entries.map(e => e.value), 1)
  const isWeekend = (d: number) => d === 0 || d === 6

  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-2">Średni przychód wg dnia tygodnia</p>
      <div className="flex items-end gap-1.5 h-20">
        {entries.map(({ dow, label, value }) => {
          const pct = (value / max) * 100
          return (
            <div key={dow} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 60 }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${isWeekend(dow) ? 'bg-[#6366F1]' : 'bg-[#3B82F6]'}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[9px] text-[#9CA3AF]">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#6366F1]" /><span className="text-[9px] text-[#9CA3AF]">Weekend</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#3B82F6]" /><span className="text-[9px] text-[#9CA3AF]">Dzień roboczy</span></div>
      </div>
    </div>
  )
}

/* ── Location ranking ───────────────────────────────────────── */
function LocationRanking({ locations }: { locations: { name: string; rev: number }[] }) {
  if (!locations?.length) return null
  const max = locations[0]?.rev || 1
  return (
    <div className="mt-3 space-y-2">
      {locations.map((loc, i) => (
        <div key={loc.name}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold w-4 text-center ${i === 0 ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`}>#{i + 1}</span>
              <span className="text-[12px] text-[#374151]">{loc.name}</span>
            </div>
            <span className="text-[12px] font-bold text-[#111827]">{loc.rev.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</span>
          </div>
          <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${i === 0 ? 'bg-[#F59E0B]' : i === locations.length - 1 ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'}`}
              style={{ width: `${(loc.rev / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
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
  const hasChart = !!alert.data?.avg_by_dow
  const hasLocations = !!alert.data?.all_locations
  const isPositive = alert.alert_type === 'weekly_revenue_up'

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.badge}`}>
          {isPositive
            ? <TrendingUp className="w-3.5 h-3.5" />
            : <Icon className="w-3.5 h-3.5" />
          }
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
        <div className="px-4 pb-4 border-t border-[#E5E7EB]/60 pt-3">
          <p className="text-[13px] text-[#374151] leading-relaxed mb-3">{alert.message}</p>

          {/* Key data pills */}
          <div className="flex flex-wrap gap-2 mb-2">
            {alert.data?.this_week != null && (
              <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                Ten tydzień: <strong>{Number(alert.data.this_week).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
              </span>
            )}
            {alert.data?.last_week != null && (
              <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                Poprzedni: <strong>{Number(alert.data.last_week).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
              </span>
            )}
            {alert.data?.change_pct != null && (
              <span className={`text-[11px] rounded-lg px-2 py-1 font-bold ${alert.data.change_pct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {alert.data.change_pct > 0 ? '+' : ''}{(alert.data.change_pct * 100).toFixed(1)}%
              </span>
            )}
            {alert.data?.weekend_avg != null && (
              <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                Weekend avg: <strong>{Number(alert.data.weekend_avg).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
              </span>
            )}
            {alert.data?.weekday_avg != null && (
              <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                Tydzień avg: <strong>{Number(alert.data.weekday_avg).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
              </span>
            )}
            {alert.data?.week1 != null && (
              <>
                <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                  3 tyg. temu: <strong>{Number(alert.data.week3).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
                </span>
                <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                  2 tyg. temu: <strong>{Number(alert.data.week2).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
                </span>
                <span className="text-[11px] bg-white/70 border border-[#E5E7EB] rounded-lg px-2 py-1 font-medium text-[#374151]">
                  Ten tydzień: <strong>{Number(alert.data.week1).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</strong>
                </span>
              </>
            )}
          </div>

          {/* DOW chart */}
          {hasChart && <DowChart avgByDow={alert.data.avg_by_dow} />}

          {/* Location ranking */}
          {hasLocations && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-2">Ranking lokalizacji (28d)</p>
              <LocationRanking locations={alert.data.all_locations} />
            </div>
          )}

          {/* Trend warning */}
          {alert.trend_days >= 3 && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-700">
                Ten problem utrzymuje się przez <strong>{alert.trend_days} kolejnych dni</strong>. Wymaga natychmiastowej reakcji.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Ask Zofia chat ─────────────────────────────────────────── */
function AskZofia({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Cześć! Jestem Zofia — Dyrektor Sprzedaży AI. Pytaj o przychody, trendy sprzedaży, performance lokalizacji lub strategię wzrostu.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

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
        body: JSON.stringify({ company_id: companyId, director: 'revenue', question: q }),
      })
      const data = await res.json()
      const answer = data?.answer ?? data?.message ?? 'Brak odpowiedzi.'
      setMsgs(m => [...m, { role: 'assistant', content: answer }])
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
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mr-2 mt-0.5">Z</div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] text-white rounded-br-sm'
                : 'bg-[#F3F4F6] text-[#111827] rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center mr-2 shrink-0 mt-0.5">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
            <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '300ms' }} />
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
          placeholder="Zapytaj Zofię o sprzedaż..."
          className="flex-1 h-10 px-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── Summary stats strip ────────────────────────────────────── */
function SummaryStrip({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter(a => a.severity === 'critical').length
  const warnings  = alerts.filter(a => a.severity === 'warning').length
  const positive  = alerts.filter(a => a.alert_type === 'weekly_revenue_up').length
  const trending  = alerts.filter(a => a.trend_days >= 3).length

  const stats = [
    { label: 'Krytyczne',  value: critical, color: 'text-red-600',   bg: 'bg-red-50',   icon: Zap },
    { label: 'Ostrzeżenia', value: warnings, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
    { label: 'Pozytywne',  value: positive, color: 'text-green-600', bg: 'bg-green-50', icon: TrendingUp },
    { label: 'Trwające 3d+', value: trending, color: 'text-purple-600', bg: 'bg-purple-50', icon: Calendar },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {stats.map(({ label, value, color, bg, icon: Icon }) => (
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

/* ── TABS ───────────────────────────────────────────────────── */
const TABS = [
  { id: 'alerts',    label: 'Alerty',           icon: AlertTriangle },
  { id: 'analysis',  label: 'Analiza dni/tyg.',  icon: BarChart3 },
  { id: 'locations', label: 'Ranking lokalizacji', icon: MapPin },
  { id: 'ask',       label: 'Zapytaj Zofię',    icon: Star },
]

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export function SalesDirector({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient
  companyId: string
}) {
  const [tab, setTab] = useState('alerts')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cfo_alerts')
      .select('*')
      .eq('company_id', companyId)
      .eq('director', 'sales')
      .eq('resolved', false)
      .gte('date', new Date(Date.now() - 7 * 86400000).toLocaleDateString('sv-SE'))
      .order('date', { ascending: false })
    setAlerts((data ?? []) as Alert[])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  // Sort: critical → warning → info, then by trend_days desc
  const sorted = [...alerts].sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 }
    const ds = sevOrder[a.severity] - sevOrder[b.severity]
    if (ds !== 0) return ds
    return (b.trend_days ?? 1) - (a.trend_days ?? 1)
  })

  // Separate positive from negative for alerts tab
  const negative = sorted.filter(a => a.alert_type !== 'weekly_revenue_up')
  const positive  = sorted.filter(a => a.alert_type === 'weekly_revenue_up')

  // For analysis tab — find day_performance_gap alert
  const dowAlert   = alerts.find(a => a.alert_type === 'day_performance_gap')
  const dowData    = dowAlert?.data?.avg_by_dow
  const weekendAlert = alerts.find(a => a.alert_type === 'weekend_dependent')

  // For locations tab — find location alert
  const locAlert   = alerts.find(a => a.alert_type === 'location_underperforming')
  const locData    = locAlert?.data?.all_locations as { name: string; rev: number }[] | undefined

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-black text-[#111827]">Dyrektor Sprzedaży AI</h2>
              <p className="text-[11px] text-[#6B7280]">Zofia — monitoruje przychody 24/7</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-[#9CA3AF]">
              {lastRefresh.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="h-8 w-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-[#9CA3AF]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-[13px]">Ładowanie danych sprzedaży…</span>
        </div>
      )}

      {/* ── Alerts tab ── */}
      {!loading && tab === 'alerts' && (
        <div className="space-y-3">
          {positive.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-2">Dobre wiadomości</p>
              {positive.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}

          {negative.length === 0 && positive.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak alertów sprzedaży</p>
              <p className="text-[12px] text-[#9CA3AF]">Przychody w normie. Zofia monitoruje na bieżąco.</p>
            </div>
          )}

          {negative.length > 0 && (
            <div>
              {negative.length > 0 && positive.length > 0 && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-2">Wymaga uwagi</p>
              )}
              {negative.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Analysis tab ── */}
      {!loading && tab === 'analysis' && (
        <div className="space-y-4">
          {dowData ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
              <p className="text-[13px] font-bold text-[#111827] mb-1">Analiza dni tygodnia (28 dni)</p>
              {dowAlert && (
                <p className="text-[12px] text-[#6B7280] mb-2">{dowAlert.title}</p>
              )}
              <DowChart avgByDow={dowData} />
              {dowAlert && (
                <div className="mt-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <p className="text-[12px] text-[#374151] leading-relaxed">{dowAlert.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
              <p className="text-[13px] font-bold text-[#111827] mb-2">Analiza dni tygodnia</p>
              <p className="text-[12px] text-[#9CA3AF]">
                Brak danych do analizy. Zestawienie pojawi się gdy różnica między najlepszym a najgorszym dniem przekroczy 40%.
              </p>
            </div>
          )}

          {weekendAlert && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-[11px] font-semibold">
                  <Calendar className="w-3 h-3" />
                  Podział weekend / tydzień
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F9FAFB] p-3">
                  <p className="text-[10px] text-[#9CA3AF] mb-0.5">Weekend (śr./dzień)</p>
                  <p className="text-[16px] font-black text-[#6366F1]">
                    {Number(weekendAlert.data?.weekend_avg ?? 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-3">
                  <p className="text-[10px] text-[#9CA3AF] mb-0.5">Tydzień (śr./dzień)</p>
                  <p className="text-[16px] font-black text-[#374151]">
                    {Number(weekendAlert.data?.weekday_avg ?? 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <p className="text-[11px] text-purple-700">{weekendAlert.message}</p>
              </div>
            </div>
          )}

          {!dowData && !weekendAlert && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm text-center">
              <BarChart3 className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[13px] text-[#9CA3AF]">Analiza będzie dostępna po pierwszym uruchomieniu crona sprzedaży.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Locations tab ── */}
      {!loading && tab === 'locations' && (
        <div className="space-y-4">
          {locData ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
              <p className="text-[13px] font-bold text-[#111827] mb-1">Ranking lokalizacji (28 dni)</p>
              {locAlert && (
                <p className="text-[12px] text-[#6B7280] mb-3">{locAlert.title}</p>
              )}
              <LocationRanking locations={locData} />
              {locAlert && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-700 leading-relaxed">{locAlert.message}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm text-center">
              <MapPin className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-[#374151] mb-1">Brak danych o lokalizacjach</p>
              <p className="text-[12px] text-[#9CA3AF]">
                Ranking pojawi się gdy masz co najmniej 2 lokalizacje i różnica przychodów przekroczy 35%.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Ask Zofia tab ── */}
      {!loading && tab === 'ask' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-[13px] font-black text-white">Z</div>
            <div>
              <p className="text-[13px] font-bold text-[#111827]">Zofia</p>
              <p className="text-[11px] text-[#9CA3AF]">Dyrektor Sprzedaży AI — dostępna 24/7</p>
            </div>
          </div>
          <AskZofia supabase={supabase} companyId={companyId} />
        </div>
      )}
    </div>
  )
}
