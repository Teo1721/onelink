'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, TrendingUp, Users, BarChart3, Send, X, Loader2, Sparkles, ChevronRight, Zap } from 'lucide-react'

type Agent = {
  key: string
  name: string
  role: string
  subtitle: string
  initial: string
  color: string
  gradientFrom: string
  gradientTo: string
  navKey: string
}

const AGENTS: Agent[] = [
  {
    key: 'cfo',
    name: 'Marek',
    role: 'CFO AI',
    subtitle: 'Finanse & rentowność',
    initial: 'M',
    color: '#3B82F6',
    gradientFrom: '#1D4ED8',
    gradientTo: '#06B6D4',
    navKey: 'cfo_director',
  },
  {
    key: 'hr',
    name: 'Ania',
    role: 'HR AI',
    subtitle: 'Zespół & zmiany',
    initial: 'A',
    color: '#EC4899',
    gradientFrom: '#BE185D',
    gradientTo: '#F97316',
    navKey: 'hr_ai_director',
  },
  {
    key: 'sales',
    name: 'Zofia',
    role: 'Sprzedaż AI',
    subtitle: 'Przychody & menu',
    initial: 'Z',
    color: '#10B981',
    gradientFrom: '#059669',
    gradientTo: '#06B6D4',
    navKey: 'sales_director',
  },
  {
    key: 'investor',
    name: 'Paweł',
    role: 'Inwestorski AI',
    subtitle: 'Wzrost & strategie',
    initial: 'P',
    color: '#8B5CF6',
    gradientFrom: '#6D28D9',
    gradientTo: '#3B82F6',
    navKey: 'investor_director',
  },
]

type Message = { role: 'user' | 'agent'; text: string; agentName?: string }

type Props = {
  onNavigate: (view: string) => void
  onClose: () => void
}

export function AiSidePanel({ onNavigate, onClose }: Props) {
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0])
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      text: 'Hej! Jestem Twoim zespołem AI. Kliknij na mnie lub zadaj pytanie — odpiszę w kilka sekund.',
      agentName: 'OneLink AI',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Map side-panel agent keys to the director keys the briefings API understands
  const DIRECTOR_MAP: Record<string, string> = {
    cfo:      'profit',
    hr:       'hr',
    sales:    'revenue',
    investor: 'investor',
  }

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: msg,
          director: DIRECTOR_MAP[activeAgent.key] ?? activeAgent.key,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'agent',
        text: data.answer || data.reply || 'Analizuję dane…',
        agentName: activeAgent.name,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'agent',
        text: 'Przepraszam, wystąpił błąd połączenia. Spróbuj ponownie.',
        agentName: activeAgent.name,
      }])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    'Jak wygląda marża dziś?',
    'Sprawdź ryzyko rotacji',
    'Prognoza na ten tydzień',
    'Gdzie mogę obniżyć koszty?',
  ]

  return (
    <div className="hidden lg:flex fixed right-0 top-0 h-screen w-[300px] bg-white border-l border-[#E5E7EB] flex-col z-20 shadow-xl">

      {/* ── Header ── */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#E5E7EB] shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white leading-none">AI Dyrektorzy</p>
            <p className="text-[10px] text-[#64748B] mt-0.5">Twój zespół jest online</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-[#64748B] hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Agent picker ── */}
      <div className="flex gap-1.5 px-3 py-3 border-b border-[#F3F4F6] shrink-0 overflow-x-auto">
        {AGENTS.map(agent => {
          const isActive = activeAgent.key === agent.key
          return (
            <button
              key={agent.key}
              onClick={() => setActiveAgent(agent)}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all shrink-0 ${
                isActive ? 'bg-[#F8FAFF]' : 'hover:bg-[#F9FAFB]'
              }`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${agent.gradientFrom}, ${agent.gradientTo})` }}
              >
                {agent.initial}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-[#1D4ED8]' : 'text-[#6B7280]'}`}>
                {agent.name}
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-[#3B82F6]" />}
            </button>
          )
        })}
      </div>

      {/* Active agent info strip */}
      <div
        className="mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${activeAgent.gradientFrom}18, ${activeAgent.gradientTo}18)`, border: `1px solid ${activeAgent.color}30` }}
        onClick={() => onNavigate(activeAgent.navKey)}
      >
        <div>
          <p className="text-[12px] font-bold text-[#111827]">{activeAgent.name} — {activeAgent.role}</p>
          <p className="text-[11px] text-[#6B7280]">{activeAgent.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#2563EB] font-semibold">Pełny widok</span>
          <ChevronRight className="w-3 h-3 text-[#2563EB]" />
        </div>
      </div>

      {/* ── Chat messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'agent' && (
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white mr-1.5 mt-0.5 shrink-0"
                style={{ background: `linear-gradient(135deg, ${activeAgent.gradientFrom}, ${activeAgent.gradientTo})` }}
              >
                {msg.agentName === 'OneLink AI' ? <Sparkles className="w-3 h-3" /> : activeAgent.initial}
              </div>
            )}
            <div
              className={`max-w-[200px] px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1D4ED8] text-white rounded-tr-sm'
                  : 'bg-[#F8FAFF] border border-[#E5E7EB] text-[#374151] rounded-tl-sm'
              }`}
            >
              {msg.agentName && msg.role === 'agent' && (
                <p className="text-[10px] font-bold text-[#6B7280] mb-1">{msg.agentName}</p>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white mr-1.5 mt-0.5 shrink-0"
              style={{ background: `linear-gradient(135deg, ${activeAgent.gradientFrom}, ${activeAgent.gradientTo})` }}
            >
              {activeAgent.initial}
            </div>
            <div className="bg-[#F8FAFF] border border-[#E5E7EB] px-3 py-2.5 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick actions ── */}
      <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
        {quickActions.map(q => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="text-[10px] px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] font-medium transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Input ── */}
      <div className="px-3 pb-4 shrink-0">
        <div className="flex items-center gap-2 bg-[#F8FAFF] border border-[#E5E7EB] rounded-xl px-3 h-10 focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#DBEAFE] transition-all">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Zapytaj ${activeAgent.name}…`}
            className="flex-1 text-[12px] text-[#111827] bg-transparent outline-none placeholder:text-[#9CA3AF]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-[#2563EB] text-white disabled:opacity-30 hover:bg-[#1D4ED8] transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}
