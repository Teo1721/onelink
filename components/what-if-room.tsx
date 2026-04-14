'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, RefreshCw, Lightbulb } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; text: string }

const SUGGESTIONS = [
  'Co jeśli podniosę ceny o 10%?',
  'Co jeśli zatrudnię 2 dodatkowe osoby?',
  'Co jeśli zamknę w poniedziałki?',
  'Co jeśli usunę najsłabiej sprzedające się danie?',
  'Co jeśli skrócę godziny pracy o 2h dziennie?',
]

export function WhatIfRoom() {
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
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-white leading-none">Pokój "Co jeśli"</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Symulator decyzji biznesowych · AI na Twoich danych</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="h-72 overflow-y-auto px-4 py-4 space-y-3 bg-[#F9FAFB]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#374151] mb-1">Zadaj pytanie o swój biznes</p>
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
            <div
              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#1E293B] text-white rounded-br-sm'
                  : 'bg-white border border-[#E5E7EB] text-[#374151] rounded-bl-sm shadow-sm'
              }`}
            >
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#F3F4F6] bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Co jeśli... (np. podniosę ceny o 15%?)"
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
