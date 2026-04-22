'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Sparkles, RefreshCw, Lightbulb, TrendingUp, TrendingDown, DollarSign, Users, Clock } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; text: string }

const SUGGESTIONS = [
  'Co jeśli podniosę ceny o 10%?',
  'Co jeśli zatrudnię 2 dodatkowe osoby?',
  'Co jeśli zamknę w poniedziałki?',
  'Co jeśli usunę najsłabiej sprzedające się danie?',
  'Co jeśli skrócę godziny pracy o 2h dziennie?',
  'Co jeśli obniżę food cost o 3pp?',
]

/* ── Slider ─────────────────────────────────────────────────── */
function Slider({
  label, value, onChange, min, max, step = 1, format, color = '#1D4ED8',
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; format: (v: number) => string; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] text-[#374151] font-medium">{label}</label>
        <span className="text-[13px] font-bold text-[#111827]">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} ${pct}%, #E5E7EB ${pct}%)` }}
      />
    </div>
  )
}

/* ── Scenario simulator ──────────────────────────────────────── */
const fmtZl = (n: number) => n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })
const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

function ScenarioSimulator() {
  const [revenue, setRevenue]         = useState(80000)
  const [foodCost, setFoodCost]       = useState(35)
  const [laborCost, setLaborCost]     = useState(28)
  const [priceChange, setPriceChange] = useState(0)
  const [staffChange, setStaffChange] = useState(0)

  const results = useMemo(() => {
    const adjRevenue    = revenue * (1 + priceChange / 100)
    const staffCostDelta = staffChange * 4000 // ~4000 zł/mies per person
    const foodCostAmt   = adjRevenue * (foodCost / 100)
    const laborCostAmt  = revenue * (laborCost / 100) + staffCostDelta
    const ebitda        = adjRevenue - foodCostAmt - laborCostAmt
    const ebitdaPct     = adjRevenue > 0 ? ebitda / adjRevenue : 0

    const baseRevenue   = revenue
    const baseFoodAmt   = baseRevenue * (foodCost / 100)
    const baseLabAmt    = baseRevenue * (laborCost / 100)
    const baseEbitda    = baseRevenue - baseFoodAmt - baseLabAmt
    const ebitdaChange  = ebitda - baseEbitda

    return {
      adjRevenue, foodCostAmt, laborCostAmt: laborCostAmt,
      ebitda, ebitdaPct, ebitdaChange,
      foodPct: foodCostAmt / adjRevenue * 100,
      laborPct: laborCostAmt / adjRevenue * 100,
    }
  }, [revenue, foodCost, laborCost, priceChange, staffChange])

  const isPositive = results.ebitdaChange >= 0

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-white leading-none">Symulator scenariuszy</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Zmień parametry — wynik widoczny od razu</p>
        </div>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-6">
        {/* Sliders */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Twój biznes (baza)</p>
          <Slider label="Miesięczny przychód netto" value={revenue} onChange={setRevenue}
            min={20000} max={500000} step={5000} format={v => `${(v/1000).toFixed(0)}k zł`} color="#1D4ED8" />
          <Slider label="Food cost %" value={foodCost} onChange={setFoodCost}
            min={15} max={60} format={v => `${v}%`} color="#EF4444" />
          <Slider label="Koszt pracy %" value={laborCost} onChange={setLaborCost}
            min={10} max={50} format={v => `${v}%`} color="#F59E0B" />

          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mt-5 mb-4">Scenariusz zmian</p>
          <Slider label="Zmiana cen menu" value={priceChange} onChange={setPriceChange}
            min={-20} max={30} format={v => `${v > 0 ? '+' : ''}${v}%`} color="#6366F1" />
          <Slider label="Nowi pracownicy (+ / –)" value={staffChange} onChange={setStaffChange}
            min={-5} max={10} format={v => `${v > 0 ? '+' : ''}${v} os.`} color="#10B981" />
        </div>

        {/* Results */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Wynik scenariusza</p>

          {/* EBITDA hero */}
          <div className={`rounded-xl p-4 mb-4 text-center ${isPositive ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">EBITDA miesięcznie</p>
            <p className={`text-[32px] font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmtZl(results.ebitda)}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {isPositive
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
              <span className={`text-[12px] font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmtPct(results.ebitdaPct * 100)} marży · {isPositive ? '+' : ''}{fmtZl(results.ebitdaChange)} vs baza
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2">
            {[
              { label: 'Przychód (po zmianie cen)', value: results.adjRevenue, pct: null, icon: DollarSign, color: 'text-[#111827]' },
              { label: `Food cost (${results.foodPct.toFixed(1)}%)`,  value: results.foodCostAmt,  pct: results.foodPct,  icon: TrendingDown, color: 'text-red-600' },
              { label: `Koszt pracy (${results.laborPct.toFixed(1)}%)`, value: results.laborCostAmt, pct: results.laborPct, icon: Users, color: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F9FAFB] border border-[#F3F4F6]">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="text-[12px] text-[#374151]">{label}</span>
                </div>
                <span className={`text-[13px] font-bold ${color}`}>{fmtZl(value)}</span>
              </div>
            ))}
          </div>

          {/* Benchmark alert */}
          {(results.foodPct > 40 || results.laborPct > 35) && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
              ⚠ {results.foodPct > 40 ? `Food cost ${results.foodPct.toFixed(0)}% — powyżej benchmarku 40%.` : ''}{' '}
              {results.laborPct > 35 ? `Koszt pracy ${results.laborPct.toFixed(0)}% — powyżej benchmarku 35%.` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Chat ────────────────────────────────────────────────────── */
function WhatIfChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (question: string) => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer ?? 'Brak odpowiedzi.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Błąd połączenia. Spróbuj ponownie.' }])
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-white leading-none">Zapytaj AI</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Odpowie na podstawie Twoich rzeczywistych danych</p>
        </div>
      </div>

      <div className="h-72 overflow-y-auto px-4 py-4 space-y-3 bg-[#F9FAFB]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#374151] mb-1">Zadaj pytanie "co jeśli…"</p>
              <p className="text-[11px] text-[#9CA3AF]">AI odpowie bazując na Twoich realnych danych</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors shadow-sm"
                >
                  <Lightbulb className="w-3 h-3 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#1E293B] text-white rounded-br-sm'
                : 'bg-white border border-[#E5E7EB] text-[#374151] rounded-bl-sm shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-violet-500 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-[#F3F4F6] bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Co jeśli… (np. podniosę ceny o 15%?)"
            className="flex-1 h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-violet-400 transition-colors bg-[#F9FAFB]"
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-[#1E293B] text-white disabled:opacity-40 hover:bg-[#0F172A] transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="mt-2 text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            Wyczyść rozmowę
          </button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Main export — combines simulator + chat
══════════════════════════════════════════════════════════════ */
export function WhatIfRoom() {
  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <ScenarioSimulator />
      <WhatIfChat />
    </div>
  )
}
