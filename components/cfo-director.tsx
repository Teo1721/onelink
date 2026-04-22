'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Brain, AlertTriangle, AlertCircle, Info, CheckCircle2,
  RefreshCw, Send, Loader2, ChevronDown, ChevronRight,
  BarChart3, ShieldCheck, TrendingUp, TrendingDown,
  Sparkles, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────

type CfoAlert = {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  data: Record<string, any>
  trend_days?: number
  date: string
  resolved: boolean
  created_at: string
}

type WeeklySummary = {
  id: string
  week_start: string
  week_end: string
  summary: string
  revenue_7d: number
  food_cost_pct: number | null
  labor_cost_pct: number | null
  alerts_count: number
  generated_at: string
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

// ─── Industry benchmarks (Polish gastronomia) ─────────────────────
const BENCHMARKS = {
  food_cost: [
    { label: 'Doskonały',    max: 0.28, color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0' },
    { label: 'Dobry',        max: 0.35, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'Podwyższony',  max: 0.42, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    { label: 'Krytyczny',    max: 1.00, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  ],
  labor_cost: [
    { label: 'Doskonały',    max: 0.22, color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0' },
    { label: 'Dobry',        max: 0.30, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'Podwyższony',  max: 0.35, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    { label: 'Krytyczny',    max: 1.00, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  ],
  ebit: [
    { label: 'Dobry',        min: 0.15, color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0' },
    { label: 'Akceptowalny', min: 0.05, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'Krytyczny',    min: -1,   color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  ],
}

function getBenchmarkBand(value: number, type: 'food_cost' | 'labor_cost') {
  return BENCHMARKS[type].find(b => value <= b.max) ?? BENCHMARKS[type][BENCHMARKS[type].length - 1]
}

// ─── Helpers ─────────────────────────────────────────────────────

const SEV = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    label: 'Krytyczny' },
  warning:  { icon: AlertCircle,   bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',dot: 'bg-amber-500',  label: 'Uwaga'     },
  info:     { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-400',   label: 'Info'      },
}

const fmt0  = (n: number) => n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })
const fmtPct = (n: number | null) => n === null ? '—' : `${(n * 100).toFixed(1)}%`
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })

// ─── Trend badge ─────────────────────────────────────────────────
function TrendBadge({ days }: { days?: number }) {
  if (!days || days < 2) return null
  const color = days >= 5 ? 'text-red-600 bg-red-50 border-red-200'
    : days >= 3 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-[#6B7280] bg-[#F9FAFB] border-[#E5E7EB]'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      <TrendingUp className="w-2.5 h-2.5" />
      {days} dni
    </span>
  )
}

// ─── Benchmark bar ───────────────────────────────────────────────
function BenchmarkBar({ value, type, label }: { value: number; type: 'food_cost' | 'labor_cost'; label: string }) {
  const band = getBenchmarkBand(value, type)
  const pct = Math.min(value * 100, 100)
  const markers = type === 'food_cost' ? [28, 35, 42] : [22, 30, 35]

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#6B7280]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold" style={{ color: band.color }}>{fmtPct(value)}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: band.bg, color: band.color, border: `1px solid ${band.border}` }}>{band.label}</span>
        </div>
      </div>
      <div className="relative h-2 bg-[#F3F4F6] rounded-full overflow-visible">
        {/* Zone fills */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          <div className="h-full rounded-l-full" style={{ width: `${markers[0]}%`, background: '#10B981', opacity: 0.15 }} />
          <div className="h-full" style={{ width: `${markers[1] - markers[0]}%`, background: '#3B82F6', opacity: 0.15 }} />
          <div className="h-full" style={{ width: `${markers[2] - markers[1]}%`, background: '#F59E0B', opacity: 0.15 }} />
          <div className="h-full rounded-r-full flex-1" style={{ background: '#EF4444', opacity: 0.15 }} />
        </div>
        {/* Markers */}
        {markers.map(m => (
          <div key={m} className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: `${m}%` }} />
        ))}
        {/* Value dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all duration-500"
          style={{ left: `${Math.min(pct, 96)}%`, background: band.color }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        {markers.map(m => <span key={m} className="text-[8px] text-[#D1D5DB]">{m}%</span>)}
      </div>
    </div>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────
function AlertCard({ alert, onResolve }: { alert: CfoAlert; onResolve: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEV[alert.severity]

  const hasFoodCost  = alert.data?.food_cost_pct !== undefined
  const hasLaborCost = alert.data?.labor_cost_pct !== undefined
  const hasRevenue   = alert.data?.this_week !== undefined
  const hasEbit      = alert.data?.ebit_pct !== undefined
  const hasInvoices  = alert.data?.invoices !== undefined

  return (
    <div className={`rounded-xl border ${cfg.bg} ${cfg.border} transition-all`}>
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-start gap-3 p-4 text-left">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            <TrendBadge days={alert.trend_days} />
            <span className="text-[10px] text-[#9CA3AF]">{fmtDate(alert.date)}</span>
          </div>
          <p className="text-[13px] font-semibold text-[#111827] leading-snug">{alert.title}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 -mt-1 space-y-3">
          {/* GPT explanation */}
          <p className="text-[13px] text-[#374151] leading-relaxed">{alert.message}</p>

          {/* Benchmark visualization */}
          {hasFoodCost && (
            <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Benchmark branżowy</p>
              <BenchmarkBar value={alert.data.food_cost_pct} type="food_cost" label="Food cost" />
            </div>
          )}
          {hasLaborCost && (
            <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Benchmark branżowy</p>
              <BenchmarkBar value={alert.data.labor_cost_pct} type="labor_cost" label="Koszt pracy" />
            </div>
          )}

          {/* Data pills */}
          <div className="flex flex-wrap gap-2">
            {alert.data.revenue_7d !== undefined && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB]">
                Przychód 7d: <strong>{fmt0(alert.data.revenue_7d)}</strong>
              </span>
            )}
            {alert.data.cos_7d !== undefined && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB]">
                COS 7d: <strong>{fmt0(alert.data.cos_7d)}</strong>
              </span>
            )}
            {alert.data.drop_amount !== undefined && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB] text-red-600">
                Utracone: <strong>{fmt0(alert.data.drop_amount)}</strong>
              </span>
            )}
            {alert.data.count !== undefined && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB]">
                Faktur: <strong>{alert.data.count}</strong>
              </span>
            )}
            {alert.data.total_amount !== undefined && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB]">
                Łącznie: <strong>{fmt0(alert.data.total_amount)}</strong>
              </span>
            )}
          </div>

          {/* Invoice list */}
          {hasInvoices && (alert.data.invoices as any[]).length > 0 && (
            <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
              {(alert.data.invoices as { supplier: string; amount: number }[]).map((inv, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-[#F3F4F6] last:border-0">
                  <span className="text-[12px] text-[#374151]">{inv.supplier}</span>
                  <span className="text-[12px] font-semibold text-[#111827]">{fmt0(inv.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trend context */}
          {(alert.trend_days ?? 1) >= 3 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700">
                Ten problem trwa już <strong>{alert.trend_days} dni z rzędu</strong> — wymaga pilnej reakcji, nie tylko monitorowania.
              </p>
            </div>
          )}

          <button onClick={() => onResolve(alert.id)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280] hover:text-[#10B981] transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Oznacz jako rozwiązane
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Weekly Summary Card ─────────────────────────────────────────
function WeeklySummaryCard({ s }: { s: WeeklySummary }) {
  const [open, setOpen] = useState(false)
  const lines = s.summary.split('\n').filter(Boolean)

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#111827]">Briefing tygodniowy</p>
          <p className="text-[11px] text-[#9CA3AF]">{fmtDate(s.week_start)} – {fmtDate(s.week_end)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {s.revenue_7d > 0 && (
            <div className="text-right">
              <p className="text-[12px] font-bold text-[#111827]">{fmt0(s.revenue_7d)}</p>
              <p className="text-[10px] text-[#9CA3AF]">przychód 7d</p>
            </div>
          )}
          {s.food_cost_pct !== null && (
            <div className="text-right">
              <p className={`text-[12px] font-bold ${s.food_cost_pct > 0.42 ? 'text-red-600' : s.food_cost_pct > 0.35 ? 'text-amber-600' : 'text-[#10B981]'}`}>
                {fmtPct(s.food_cost_pct)}
              </p>
              <p className="text-[10px] text-[#9CA3AF]">food cost</p>
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#F3F4F6] pt-4 space-y-2">
          {lines.map((line, i) =>
            line.startsWith('•') ? (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
                <p className="text-[13px] text-[#374151] leading-relaxed">{line.slice(1).trim()}</p>
              </div>
            ) : (
              <p key={i} className="text-[13px] text-[#374151] leading-relaxed">{line}</p>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Industry Benchmarks Panel ───────────────────────────────────
function BenchmarksPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Benchmarki dla polskiej gastronomii</p>
        <div className="space-y-5">
          {/* Food cost */}
          <div>
            <p className="text-[13px] font-semibold text-[#111827] mb-3">Food Cost (COS / Przychód netto)</p>
            <div className="space-y-2">
              {BENCHMARKS.food_cost.map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className="text-[12px] w-24 text-[#374151] font-medium">{b.label}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: b.bg, border: `1px solid ${b.border}` }} />
                  <span className="text-[11px] text-[#9CA3AF] w-16 text-right">
                    {b.label === 'Doskonały' ? '< 28%' : b.label === 'Dobry' ? '28–35%' : b.label === 'Podwyższony' ? '35–42%' : '> 42%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Labor cost */}
          <div>
            <p className="text-[13px] font-semibold text-[#111827] mb-3">Koszt Pracy (Praca / Przychód netto)</p>
            <div className="space-y-2">
              {BENCHMARKS.labor_cost.map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className="text-[12px] w-24 text-[#374151] font-medium">{b.label}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: b.bg, border: `1px solid ${b.border}` }} />
                  <span className="text-[11px] text-[#9CA3AF] w-16 text-right">
                    {b.label === 'Doskonały' ? '< 22%' : b.label === 'Dobry' ? '22–30%' : b.label === 'Podwyższony' ? '30–35%' : '> 35%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* EBIT */}
          <div>
            <p className="text-[13px] font-semibold text-[#111827] mb-3">Marża EBIT</p>
            <div className="space-y-2">
              {[
                { label: 'Dobry',        range: '> 15%',    color: '#10B981' },
                { label: 'Akceptowalny', range: '5–15%',    color: '#3B82F6' },
                { label: 'Krytyczny',    range: '< 5%',     color: '#EF4444' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className="text-[12px] w-24 text-[#374151] font-medium">{b.label}</span>
                  <div className="flex-1" />
                  <span className="text-[11px] text-[#9CA3AF]">{b.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-4 pt-3 border-t border-[#F3F4F6]">
          Źródło: benchmarki dla restauracji i cateringu w Polsce (GUS, raporty branżowe 2024).
          Wartości mogą różnić się w zależności od segmentu (fast food, fine dining, piekarnia).
        </p>
      </div>

      {/* How alerts work */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Jak działają alerty CFO</p>
        <div className="space-y-3">
          {[
            { icon: AlertTriangle, color: '#EF4444', title: 'Krytyczny', desc: 'Wymaga natychmiastowej reakcji. Food cost > 42% lub EBIT < 0% lub problem trwa 5+ dni z rzędu.' },
            { icon: AlertCircle, color: '#F59E0B', title: 'Uwaga', desc: 'Wymaga monitorowania i działania w ciągu 48h. Próg podwyższony lub 3+ dni trendu.' },
            { icon: Info, color: '#3B82F6', title: 'Info', desc: 'Informacja operacyjna — faktury do zatwierdzenia, brakujące raporty. Działaj w ciągu tygodnia.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
              <div>
                <p className="text-[12px] font-semibold text-[#111827]">{title}</p>
                <p className="text-[11px] text-[#6B7280] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Ask the CFO ─────────────────────────────────────────────────
const QUICK_Q = [
  'Który lokal ma najwyższy food cost?',
  'Jak zmieniły się przychody vs poprzedni tydzień?',
  'Jakie faktury czekają na zatwierdzenie?',
  'Co powinienem zrobić z kosztami pracy?',
  'Podsumuj wyniki tego miesiąca',
]

function AskCFO() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Cześć! Jestem Twoim CFO AI — Marek. Pytaj o przychody, food cost, faktury, marże. Odpowiem na podstawie Twoich rzeczywistych danych.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = useCallback(async (q: string) => {
    if (!q.trim() || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: '', loading: true }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director: 'profit', question: q }),
      })
      const data = await res.json()
      setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: data.answer ?? 'Brak odpowiedzi.' }])
    } catch {
      setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: 'Błąd połączenia — spróbuj ponownie.' }])
    }
    setLoading(false)
  }, [loading])

  return (
    <div className="flex flex-col" style={{ minHeight: 420 }}>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: 360 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Brain className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`max-w-[82%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${
              msg.role === 'user' ? 'bg-[#1D4ED8] text-white rounded-br-sm' : 'bg-[#F3F4F6] text-[#111827] rounded-bl-sm'
            }`}>
              {msg.loading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[#6B7280]" />
                  <span className="text-[#6B7280]">Analizuję dane…</span>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_Q.slice(0, 3).map(q => (
            <button key={q} onClick={() => ask(q)}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-all">
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); ask(input) }} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Zapytaj Marka o Twój biznes…"
          className="flex-1 h-10 px-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#93C5FD] focus:bg-white transition-all"
          disabled={loading} />
        <button type="submit" disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

type Tab = 'alerts' | 'summaries' | 'ask' | 'benchmarks'

export function CfoDirector({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [tab, setTab] = useState<Tab>('alerts')
  const [alerts, setAlerts] = useState<CfoAlert[]>([])
  const [summaries, setSummaries] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: alertData }, { data: summaryData }] = await Promise.all([
      supabase.from('cfo_alerts').select('*').eq('company_id', companyId).eq('director', 'cfo').order('created_at', { ascending: false }).limit(60),
      supabase.from('cfo_weekly_summaries').select('*').eq('company_id', companyId).order('week_start', { ascending: false }).limit(8),
    ])
    setAlerts((alertData ?? []) as CfoAlert[])
    setSummaries((summaryData ?? []) as WeeklySummary[])
    setLoading(false)
  }, [supabase, companyId])

  useEffect(() => { load() }, [load])

  const runAnalysis = async () => {
    setRunning(true)
    try {
      await fetch('/api/ai/trigger-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director: 'cfo' }),
      })
      await load()
      setLastRun(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))
    } finally { setRunning(false) }
  }

  const resolveAlert = async (id: string) => {
    await supabase.from('cfo_alerts').update({ resolved: true }).eq('id', id)
    setAlerts(a => a.map(alert => alert.id === id ? { ...alert, resolved: true } : alert))
  }

  const active   = alerts.filter(a => !a.resolved)
  const resolved = alerts.filter(a => a.resolved)
  const critical = active.filter(a => a.severity === 'critical').length
  const warnings = active.filter(a => a.severity === 'warning').length

  // Sort: critical first, then warning, then info; within same severity sort by trend_days desc
  const sorted = [...active].sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 }
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity]
    return (b.trend_days ?? 1) - (a.trend_days ?? 1)
  })

  const TABS: { key: Tab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { key: 'alerts',     label: 'Alerty',      icon: AlertTriangle, count: active.length },
    { key: 'summaries',  label: 'Briefingi',   icon: BarChart3,     count: summaries.length },
    { key: 'ask',        label: 'Zapytaj CFO', icon: Brain },
    { key: 'benchmarks', label: 'Benchmarki',  icon: TrendingUp },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center shadow-md shadow-blue-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#111827]">Dyrektor Finansowy AI</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[11px] text-[#6B7280]">Aktywny · Monitoruje 24/7</span>
              {lastRun && <span className="text-[11px] text-[#9CA3AF]">· {lastRun}</span>}
            </div>
          </div>
        </div>
        <button onClick={runAnalysis} disabled={running}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white border border-[#E5E7EB] text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all disabled:opacity-50">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Uruchom analizę
        </button>
      </div>

      {/* KPI strip */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { val: critical, label: 'Krytyczne',   color: critical > 0 ? 'text-red-600' : 'text-[#9CA3AF]' },
            { val: warnings, label: 'Ostrzeżenia', color: warnings > 0 ? 'text-amber-600' : 'text-[#9CA3AF]' },
            { val: active.length, label: 'Aktywne', color: active.length > 0 ? 'text-[#111827]' : 'text-[#9CA3AF]' },
            { val: summaries.length, label: 'Briefingi', color: 'text-[#10B981]' },
          ].map(({ val, label, color }) => (
            <div key={label} className="rounded-xl bg-white border border-[#E5E7EB] p-4 text-center">
              <p className={`text-[28px] font-black leading-none mb-1 ${color}`}>{val}</p>
              <p className="text-[11px] text-[#9CA3AF]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 mb-6">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12px] font-medium transition-all ${
              tab === key ? 'bg-white shadow-sm text-[#111827]' : 'text-[#6B7280] hover:text-[#374151]'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-[#E5E7EB] text-[#6B7280]'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <>
          {/* Alerts */}
          {tab === 'alerts' && (
            <div className="space-y-3">
              {sorted.length === 0 && (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
                  <ShieldCheck className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak aktywnych alertów</p>
                  <p className="text-[12px] text-[#9CA3AF]">CFO monitoruje Twój biznes. Uruchom analizę, aby sprawdzić aktualny stan.</p>
                </div>
              )}
              {sorted.map(alert => <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} />)}

              {resolved.length > 0 && (
                <div className="mt-4">
                  <button onClick={() => setShowResolved(v => !v)}
                    className="flex items-center gap-2 text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-2">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showResolved ? 'rotate-90' : ''}`} />
                    {resolved.length} rozwiązanych alertów
                  </button>
                  {showResolved && (
                    <div className="space-y-2 opacity-60">
                      {resolved.map(a => (
                        <div key={a.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3 flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#374151] truncate">{a.title}</p>
                            <p className="text-[10px] text-[#9CA3AF]">{fmtDate(a.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summaries */}
          {tab === 'summaries' && (
            <div className="space-y-3">
              {summaries.length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
                  <BarChart3 className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak briefingów tygodniowych</p>
                  <p className="text-[12px] text-[#9CA3AF]">Briefingi generowane automatycznie co poniedziałek o 08:00.</p>
                </div>
              ) : summaries.map(s => <WeeklySummaryCard key={s.id} s={s} />)}
            </div>
          )}

          {/* Ask */}
          {tab === 'ask' && <AskCFO />}

          {/* Benchmarks */}
          {tab === 'benchmarks' && <BenchmarksPanel />}
        </>
      )}
    </div>
  )
}
