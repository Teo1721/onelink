'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, Package, Sparkles, RefreshCw, MessageSquare, AlertTriangle, CheckCircle, ChevronRight, X } from 'lucide-react'

type BriefingStatus = 'ok' | 'warning' | 'critical'

type Briefing = {
  director: string
  summary: string
  status: BriefingStatus
  metric: { label: string; value: string; delta: string }
  generated_at?: string
}

const DIRECTORS = [
  { key: 'profit',    name: 'Profit Director',    title: 'Rentowność i finanse', icon: BarChart3, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'hr',        name: 'HR Director',         title: 'Zespół i czas pracy',  icon: Users,     color: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8' },
  { key: 'inventory', name: 'Inventory Director',  title: 'Magazyn i zamówienia', icon: Package,   color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
]

function StatusBadge({ status }: { status: BriefingStatus }) {
  if (status === 'critical') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-2.5 h-2.5" /> Krytyczny
    </span>
  )
  if (status === 'warning') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-2.5 h-2.5" /> Uwaga
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded-full">
      <CheckCircle className="w-2.5 h-2.5" /> OK
    </span>
  )
}

function SkeletonCard({ color, border }: { color: string; border: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: border }}>
      <div className="h-1 w-full animate-pulse" style={{ background: color }} />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl animate-pulse bg-[#F3F4F6]" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-32" />
            <div className="h-2.5 bg-[#F3F4F6] rounded animate-pulse w-24" />
          </div>
        </div>
        <div className="h-10 bg-[#F3F4F6] rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-full" />
          <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-4/5" />
          <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-2/3" />
        </div>
        <div className="h-9 bg-[#F3F4F6] rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

function DirectorCard({ director, briefing }: { director: typeof DIRECTORS[0]; briefing: Briefing }) {
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const Icon = director.icon

  const handleAsk = async () => {
    if (!question.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director: director.key, question }),
      })
      const data = await res.json()
      setAnswer(data.answer ?? 'Brak odpowiedzi.')
    } catch {
      setAnswer('Błąd połączenia. Spróbuj ponownie.')
    }
    setLoading(false)
  }

  const reset = () => { setAsking(false); setQuestion(''); setAnswer('') }

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border overflow-hidden" style={{ borderColor: director.border }}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${director.color}, ${director.color}80)` }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: director.bg }}>
              <Icon className="w-5 h-5" style={{ color: director.color }} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#111827]">{director.name}</p>
              <p className="text-[10px] text-[#9CA3AF]">{director.title}</p>
            </div>
          </div>
          <StatusBadge status={briefing.status} />
        </div>

        {/* Metric pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-4" style={{ background: director.bg, border: `1px solid ${director.border}` }}>
          <span className="text-[11px] font-medium text-[#6B7280]">{briefing.metric.label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-black" style={{ color: director.color }}>{briefing.metric.value}</span>
            <span className="text-[10px] text-[#9CA3AF]">{briefing.metric.delta}</span>
          </div>
        </div>

        {/* Briefing text */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3" style={{ color: director.color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: director.color }}>Briefing poranny</span>
            {briefing.generated_at && (
              <span className="text-[10px] text-[#9CA3AF] ml-auto">
                {new Date(briefing.generated_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl px-4 py-3">
            <p className="text-[13px] text-[#4B5563] leading-relaxed">{briefing.summary}</p>
          </div>
        </div>

        {/* Ask section */}
        {!asking && !answer && (
          <button
            onClick={() => setAsking(true)}
            className="w-full flex items-center gap-2 h-9 px-3 rounded-xl border border-dashed border-[#D1D5DB] text-[12px] text-[#9CA3AF] hover:text-[#6B7280] hover:border-[#9CA3AF] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            Zapytaj {director.name}...
          </button>
        )}

        {asking && !answer && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder={`Pytanie do ${director.name}...`}
              className="flex-1 h-9 px-3 rounded-xl border border-[#D1D5DB] text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 transition-colors"
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="h-9 px-3 rounded-xl text-[12px] font-bold text-white transition-all flex items-center gap-1 disabled:opacity-50"
              style={{ background: director.color }}
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <button onClick={reset} className="h-9 w-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {answer && (
          <div className="space-y-2">
            <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-[#0369A1] mb-1.5">Odpowiedź AI</p>
              <p className="text-[12px] text-[#0C4A6E] leading-relaxed">{answer}</p>
            </div>
            <button onClick={reset} className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              ← Nowe pytanie
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function AiDirectors() {
  const [briefings, setBriefings] = useState<Record<string, Briefing>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const fetchBriefings = async (force = false) => {
    if (force) setRegenerating(true)
    else setLoading(true)
    setError('')
    try {
      const url = force ? '/api/ai/briefings?force=1' : '/api/ai/briefings'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const map: Record<string, Briefing> = {}
      for (const b of data.briefings ?? []) map[b.director] = b
      setBriefings(map)
    } catch {
      setError('Nie udało się wygenerować briefingu. Spróbuj ponownie.')
    }
    setLoading(false)
    setRegenerating(false)
  }

  useEffect(() => { fetchBriefings() }, [])

  if (error) return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#DC2626]">
      <span>{error}</span>
      <button onClick={() => fetchBriefings()} className="text-[12px] font-semibold underline">Spróbuj ponownie</button>
    </div>
  )

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#8B5CF6] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <h2 className="text-[14px] font-bold text-[#111827]">AI Directors</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] bg-[#F5F3FF] px-2 py-0.5 rounded-full">Beta</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5 ml-8">Briefing poranny · generowany automatycznie na podstawie Twoich danych</p>
        </div>
        <button
          onClick={() => fetchBriefings(true)}
          disabled={regenerating || loading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[11px] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {DIRECTORS.map(d => (
          loading
            ? <SkeletonCard key={d.key} color={d.color} border={d.border} />
            : briefings[d.key]
              ? <DirectorCard key={d.key} director={d} briefing={briefings[d.key]} />
              : <SkeletonCard key={d.key} color={d.color} border={d.border} />
        ))}
      </div>
    </div>
  )
}
