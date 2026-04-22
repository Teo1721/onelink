'use client'

import { useEffect, useState, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  BarChart3, TrendingUp, TrendingDown, RefreshCw,
  ChevronDown, ChevronUp, Send, Loader2,
  AlertTriangle, Info, Zap, DollarSign, MapPin, ArrowUpRight, ArrowDownRight,
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
  revenue_growth_acceleration: 'Wzrost przychodów',
  revenue_growth_decline:      'Spadek przychodów',
  ebitda_margin_low:           'Marża EBITDA',
  ebitda_healthy:              'EBITDA zdrowa',
  avg_ticket_up:               'Paragon ↑',
  avg_ticket_down:             'Paragon ↓',
  invoice_exposure:            'Ekspozycja faktur',
  location_low_ebitda:         'EBITDA lokalizacji',
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

const fmt0 = (n: number) => n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

/* ── AlertCard ──────────────────────────────────────────────── */
function AlertCard({ alert }: { alert: Alert }) {
  const [open, setOpen] = useState(false)
  const s = SEV[alert.severity]
  const Icon = s.icon
  const isPositive = ['revenue_growth_acceleration', 'ebitda_healthy', 'avg_ticket_up'].includes(alert.alert_type)

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.badge}`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
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

          {/* Revenue growth pills */}
          {alert.data?.current_28d != null && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                <p className="text-[13px] font-black text-[#111827]">{fmt0(alert.data.current_28d)}</p>
                <p className="text-[10px] text-[#9CA3AF]">Te 28 dni</p>
              </div>
              <div className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                <p className="text-[13px] font-black text-[#111827]">{fmt0(alert.data.prior_28d)}</p>
                <p className="text-[10px] text-[#9CA3AF]">Poprzednie 28d</p>
              </div>
              <div className={`rounded-lg p-2 text-center ${alert.data.growth_pct > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className={`text-[13px] font-black ${alert.data.growth_pct > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {alert.data.growth_pct > 0 ? '+' : ''}{(alert.data.growth_pct * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] text-[#9CA3AF]">Zmiana MoM</p>
              </div>
            </div>
          )}

          {/* EBITDA breakdown */}
          {alert.data?.ebitda != null && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Struktura kosztów (28d)</p>
              {[
                { label: 'Przychody netto', value: alert.data.revenue, color: 'text-green-600' },
                { label: 'Koszt pracy',     value: -alert.data.labor,  color: 'text-amber-600' },
                { label: 'Food cost',       value: -alert.data.food,   color: 'text-red-600' },
                { label: 'EBITDA',          value: alert.data.ebitda,  color: alert.data.ebitda >= 0 ? 'text-emerald-600' : 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#6B7280]">{label}</span>
                  <span className={`font-bold ${color}`}>{value >= 0 ? '' : '–'}{fmt0(Math.abs(value))}</span>
                </div>
              ))}
              <div className="border-t border-[#E5E7EB] pt-1 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#374151]">Marża EBITDA</span>
                <span className={`text-[14px] font-black ${alert.data.ebitda_margin >= 0.12 ? 'text-emerald-600' : alert.data.ebitda_margin >= 0.05 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fmtPct(alert.data.ebitda_margin)}
                </span>
              </div>
            </div>
          )}

          {/* Avg ticket */}
          {alert.data?.avg_ticket != null && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {alert.data.change_pct > 0
                    ? <ArrowUpRight className="w-3 h-3 text-green-500" />
                    : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                  <p className="text-[15px] font-black text-[#111827]">{fmt0(alert.data.avg_ticket)}</p>
                </div>
                <p className="text-[10px] text-[#9CA3AF]">Śr. paragon (28d)</p>
              </div>
              <div className="rounded-lg bg-white/70 border border-[#E5E7EB] p-2 text-center">
                <p className="text-[15px] font-black text-[#9CA3AF]">{fmt0(alert.data.avg_ticket_prior)}</p>
                <p className="text-[10px] text-[#9CA3AF]">Poprzednie 28d</p>
              </div>
            </div>
          )}

          {/* Invoice exposure */}
          {alert.data?.total_exposure != null && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 border border-[#E5E7EB]">
              <div>
                <p className="text-[12px] font-semibold text-[#111827]">{alert.data.invoice_count} faktur oczekujących</p>
                <p className="text-[11px] text-[#6B7280]">= {alert.data.exposure_days.toFixed(1)} dni przychodów</p>
              </div>
              <p className="text-[15px] font-black text-red-600">{fmt0(alert.data.total_exposure)}</p>
            </div>
          )}

          {/* Location EBITDA */}
          {alert.data?.all_locations && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Marże EBITDA wg lokalizacji (28d)</p>
              {(alert.data.all_locations as { name: string; ebitdaMargin: number; net: number }[]).map((loc) => (
                <div key={loc.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                    <span className="text-[12px] text-[#374151]">{loc.name}</span>
                  </div>
                  <span className={`text-[12px] font-bold ${loc.ebitdaMargin >= 0.12 ? 'text-emerald-600' : loc.ebitdaMargin >= 0.05 ? 'text-amber-600' : 'text-red-600'}`}>
                    {fmtPct(loc.ebitdaMargin)}
                  </span>
                </div>
              ))}
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

/* ── Key metrics strip ───────────────────────────────────────── */
function MetricsStrip({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [metrics, setMetrics] = useState<{ rev28: number; ebitdaPct: number; avgTicket: number; txns28: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: locs } = await supabase.from('locations').select('id').eq('company_id', companyId)
      const locIds = locs?.map((l: any) => l.id) ?? []
      if (!locIds.length) return

      const d28ago = new Date(); d28ago.setDate(d28ago.getDate() - 28)
      const { data } = await supabase
        .from('sales_daily')
        .select('net_revenue, total_labor_hours, avg_hourly_rate, food_cost_amount, transaction_count')
        .in('location_id', locIds)
        .gte('date', d28ago.toLocaleDateString('sv-SE'))

      if (!data?.length) return
      const rev   = data.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
      const labor = data.reduce((s: number, r: any) => s + (r.total_labor_hours || 0) * (r.avg_hourly_rate || 0), 0)
      const food  = data.reduce((s: number, r: any) => s + (r.food_cost_amount || 0), 0)
      const txns  = data.reduce((s: number, r: any) => s + (r.transaction_count || 0), 0)
      setMetrics({
        rev28: rev,
        ebitdaPct: rev > 0 ? (rev - labor - food) / rev : 0,
        avgTicket: txns > 0 ? rev / txns : 0,
        txns28: txns,
      })
    }
    load()
  }, [companyId])

  if (!metrics) return null

  const kpis = [
    { label: 'Przychody 28d',  value: fmt0(metrics.rev28),        sub: 'netto',          color: 'text-[#111827]' },
    { label: 'EBITDA',         value: fmtPct(metrics.ebitdaPct),  sub: 'marża',          color: metrics.ebitdaPct >= 0.15 ? 'text-emerald-600' : metrics.ebitdaPct >= 0.05 ? 'text-amber-600' : 'text-red-600' },
    { label: 'Śr. paragon',    value: fmt0(metrics.avgTicket),    sub: 'na transakcję',  color: 'text-[#111827]' },
    { label: 'Transakcje',     value: metrics.txns28.toLocaleString('pl-PL'), sub: '28 dni', color: 'text-[#111827]' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {kpis.map(({ label, value, sub, color }) => (
        <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] p-3 shadow-sm">
          <p className={`text-[17px] font-black ${color}`}>{value}</p>
          <p className="text-[11px] font-semibold text-[#374151]">{label}</p>
          <p className="text-[10px] text-[#9CA3AF]">{sub}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Ask Marek chat ──────────────────────────────────────────── */
function AskMarek({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Cześć! Jestem Marek — Dyrektor Inwestorski AI. Pytaj o EBITDA, rentowność, wzrost, unit economics lub wycenę biznesu.' },
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
        body: JSON.stringify({ company_id: companyId, director: 'investor', question: q }),
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
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mr-2 mt-0.5">M</div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] text-white rounded-br-sm'
                : 'bg-[#F3F4F6] text-[#111827] rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex items-center justify-center mr-2 shrink-0 mt-0.5">
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
          placeholder="Zapytaj Marka o rentowność..."
          className="flex-1 h-10 px-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── TABS ───────────────────────────────────────────────────── */
const TABS = [
  { id: 'alerts',  label: 'Alerty',      icon: AlertTriangle },
  { id: 'metrics', label: 'Metryki',     icon: BarChart3 },
  { id: 'ask',     label: 'Zapytaj Marka', icon: DollarSign },
]

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export function InvestorDirector({
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
      .eq('director', 'investor')
      .eq('resolved', false)
      .gte('date', new Date(Date.now() - 14 * 86400000).toLocaleDateString('sv-SE'))
      .order('date', { ascending: false })
    setAlerts((data ?? []) as Alert[])
    setLastRefresh(new Date())
    setLoading(false)
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-[#111827]">Dyrektor Inwestorski AI</h2>
            <p className="text-[11px] text-[#6B7280]">Marek — monitoruje rentowność i wzrost</p>
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
          <span className="text-[13px]">Ładowanie danych inwestorskich…</span>
        </div>
      )}

      {!loading && tab === 'alerts' && (
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak alertów inwestorskich</p>
              <p className="text-[12px] text-[#9CA3AF]">Metryki w normie. Marek monitoruje rentowność.</p>
            </div>
          ) : sorted.map(a => <AlertCard key={a.id} alert={a} />)}
        </div>
      )}

      {!loading && tab === 'metrics' && (
        <div className="space-y-4">
          <MetricsStrip supabase={supabase} companyId={companyId} />
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Benchmarki branżowe (gastronomia PL)</p>
            <div className="space-y-3">
              {[
                { label: 'Marża EBITDA',    excellent: '>20%', good: '12–20%', bad: '<5%', icon: TrendingUp },
                { label: 'Food cost',        excellent: '<28%', good: '28–35%', bad: '>42%', icon: DollarSign },
                { label: 'Koszt pracy',      excellent: '<22%', good: '22–30%', bad: '>35%', icon: DollarSign },
                { label: 'Wzrost MoM',       excellent: '>10%', good: '0–10%',  bad: '<-10%', icon: TrendingUp },
              ].map(({ label, excellent, good, bad, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-[#374151] mb-1">{label}</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ {excellent}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⚠ {good}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">✗ {bad}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'ask' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex items-center justify-center text-[13px] font-black text-white">M</div>
            <div>
              <p className="text-[13px] font-bold text-[#111827]">Marek</p>
              <p className="text-[11px] text-[#9CA3AF]">Dyrektor Inwestorski AI — dostępny 24/7</p>
            </div>
          </div>
          <AskMarek supabase={supabase} companyId={companyId} />
        </div>
      )}
    </div>
  )
}
