'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, MessageSquare, ChevronRight, X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

type BriefingStatus = 'ok' | 'warning' | 'critical'

type Briefing = {
  director: string
  dzieje: string
  dlaczego: string
  wplyw: string
  zrob: string
  status: BriefingStatus
  metric: { label: string; value: string; delta: string }
  generated_at?: string
}

const PERSONAS = [
  {
    key: 'profit',
    name: 'Marek',
    role: 'Finanse',
    subtitle: 'Pilnuję Twojej rentowności',
    initial: 'M',
    color: '#3B82F6',
    colorLight: '#EFF6FF',
    colorBorder: '#BFDBFE',
    colorDark: '#1D4ED8',
  },
  {
    key: 'hr',
    name: 'Ania',
    role: 'HR',
    subtitle: 'Dbam o zespół i zmiany',
    initial: 'A',
    color: '#EC4899',
    colorLight: '#FDF2F8',
    colorBorder: '#FBCFE8',
    colorDark: '#BE185D',
  },
  {
    key: 'inventory',
    name: 'Kuba',
    role: 'Magazyn',
    subtitle: 'Kontroluję stany i zamówienia',
    initial: 'K',
    color: '#8B5CF6',
    colorLight: '#F5F3FF',
    colorBorder: '#DDD6FE',
    colorDark: '#6D28D9',
  },
]

const STATUS_CONFIG = {
  critical: { label: 'Krytyczny', icon: AlertCircle,  bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  warning:  { label: 'Uwaga',     icon: AlertTriangle, bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  ok:       { label: 'Stabilnie', icon: CheckCircle,   bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
}

function StatusBadge({ status }: { status: BriefingStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function SkeletonCard({ persona }: { persona: typeof PERSONAS[0] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: persona.colorBorder }}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${persona.color}, ${persona.colorDark})` }} />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: persona.colorLight }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 rounded animate-pulse w-28" style={{ background: persona.colorLight }} />
            <div className="h-2.5 rounded animate-pulse w-36" style={{ background: persona.colorLight }} />
          </div>
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 rounded animate-pulse w-24 bg-[#F3F4F6]" />
            <div className="h-3 rounded animate-pulse bg-[#F3F4F6]" style={{ width: `${70 + i * 5}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{label}</p>
      <p className="text-[13px] leading-snug" style={{ color: color ?? '#374151' }}>{value}</p>
    </div>
  )
}

function DirectorCard({ persona, briefing }: { persona: typeof PERSONAS[0]; briefing: Briefing }) {
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAsk = async () => {
    if (!question.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director: persona.key, question }),
      })
      const data = await res.json()
      setAnswer(data.answer ?? 'Brak odpowiedzi.')
    } catch {
      setAnswer('Błąd połączenia. Spróbuj ponownie.')
    }
    setLoading(false)
  }

  const reset = () => { setAsking(false); setQuestion(''); setAnswer('') }

  const actionBg = briefing.status === 'critical' ? '#FEF2F2' : briefing.status === 'warning' ? '#FFFBEB' : '#F0FDF4'
  const actionBorder = briefing.status === 'critical' ? '#FECACA' : briefing.status === 'warning' ? '#FDE68A' : '#BBF7D0'
  const actionText = briefing.status === 'critical' ? '#DC2626' : briefing.status === 'warning' ? '#D97706' : '#059669'

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border flex flex-col overflow-hidden" style={{ borderColor: persona.colorBorder }}>
      {/* Top color bar */}
      <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${persona.color}, ${persona.colorDark})` }} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-black text-white" style={{ background: `linear-gradient(135deg, ${persona.color}, ${persona.colorDark})` }}>
              {persona.initial}
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#111827] leading-none">
                {persona.name} <span className="font-normal text-[#9CA3AF]">· {persona.role}</span>
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: persona.color }}>{persona.subtitle}</p>
            </div>
          </div>
          <StatusBadge status={briefing.status} />
        </div>

        {/* 4 structured sections */}
        <div className="space-y-3">
          <Section label="Co się dzieje" value={briefing.dzieje} />
          <Section label="Dlaczego" value={briefing.dlaczego} />
          <Section label="Wpływ" value={briefing.wplyw} />
        </div>

        {/* Action block — most prominent */}
        <div className="rounded-xl px-4 py-3 mt-auto" style={{ background: actionBg, border: `1px solid ${actionBorder}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: actionText }}>Co zrobić teraz</p>
          <p className="text-[13px] font-semibold leading-snug" style={{ color: actionText }}>{briefing.zrob}</p>
        </div>

        {/* Ask section */}
        {!asking && !answer && (
          <button
            onClick={() => setAsking(true)}
            className="w-full flex items-center gap-2 h-9 px-3 rounded-xl border border-dashed border-[#D1D5DB] text-[12px] text-[#9CA3AF] hover:text-[#6B7280] hover:border-[#9CA3AF] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            Zapytaj {persona.name}...
          </button>
        )}

        {asking && !answer && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder={`Pytanie do ${persona.name}...`}
              className="flex-1 h-9 px-3 rounded-xl border border-[#D1D5DB] text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 transition-colors"
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="h-9 px-3 rounded-xl text-[12px] font-bold text-white flex items-center disabled:opacity-50 transition-all"
              style={{ background: persona.color }}
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <button onClick={reset} className="h-9 w-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {answer && (
          <div className="space-y-2">
            <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-[#0369A1] mb-1.5">{persona.name} odpowiada:</p>
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
      const res = await fetch(force ? '/api/ai/briefings?force=1' : '/api/ai/briefings', { cache: 'no-store' })
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-[#111827]">Twój zespół AI</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] bg-[#F5F3FF] px-2 py-0.5 rounded-full">Beta</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Briefing poranny · generowany na podstawie Twoich danych</p>
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

      <div className="grid md:grid-cols-3 gap-4">
        {PERSONAS.map(p => (
          loading
            ? <SkeletonCard key={p.key} persona={p} />
            : briefings[p.key]
              ? <DirectorCard key={p.key} persona={p} briefing={briefings[p.key]} />
              : <SkeletonCard key={p.key} persona={p} />
        ))}
      </div>
    </div>
  )
}
