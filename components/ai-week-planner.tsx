'use client'

import { useState } from 'react'
import { Loader2, Sparkles, TrendingUp, TrendingDown, Minus, Users, ShoppingCart, Megaphone, ChevronRight, RefreshCw, AlertTriangle, Calendar } from 'lucide-react'

type DayPlan = {
  date: string
  dayName: string
  dayShort: string
  dow: number
  revLow: number
  revHigh: number
  revMid: number
  vsAvg: number
  confidence: 'high' | 'medium' | 'low'
  staffRec: number
  staffBaseline: number
  orderRecs: string[]
  shouldPromote: boolean
}

type WeekPlan = {
  days: DayPlan[]
  weekTotal: number
  bestDay: string
  worstDay: string
  narrative: string
  topSuppliers: { name: string; total: number }[]
  pendingInvoices: number
  pendingTotal: number
  trendFactor: number
}

interface Props {
  companyId?: string
  locationId?: string  // ops panel: single location
  locationName?: string
}

const CONF_LABEL = { high: 'Wysoka', medium: 'Średnia', low: 'Niska' }
const CONF_COLOR = { high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-[#9CA3AF]' }

export function AiWeekPlanner({ companyId, locationId, locationName }: Props) {
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  async function generate() {
    setLoading(true); setError(null); setPlan(null)
    try {
      const params = new URLSearchParams()
      if (locationId) params.set('locationId', locationId)
      else if (companyId) params.set('companyId', companyId)
      const res = await fetch(`/api/ai/week-plan?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Błąd generowania planu')
      setPlan(json)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const maxRev = plan ? Math.max(...plan.days.map(d => d.revHigh)) : 1

  // Format Polish date
  const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-[#111827]">Plan Tygodnia AI</h1>
          </div>
          <p className="text-[13px] text-[#6B7280]">
            {locationName ? `${locationName} · ` : ''}Prognoza przychodów, rekomendacje kadrowe i zamówieniowe na następne 7 dni — na podstawie Twoich danych historycznych.
          </p>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analizuję…' : plan ? 'Odśwież' : 'Generuj plan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && !error && (
        <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-[18px] font-bold text-[#111827] mb-2">Inteligentny Plan Tygodnia</h2>
          <p className="text-[13px] text-[#6B7280] max-w-md mx-auto mb-6">
            AI przeanalizuje Twoje dane z ostatnich 8 tygodni i wygeneruje spersonalizowaną prognozę: przychody, potrzebną kadrę i rekomendacje zamówieniowe na każdy dzień.
          </p>
          <button onClick={generate}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[14px] font-bold hover:opacity-90 transition-all shadow-md">
            <Sparkles className="w-4 h-4" />
            Wygeneruj plan
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 bg-[#F3F4F6] rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {/* Plan */}
      {plan && !loading && (
        <>
          {/* AI Narrative */}
          <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1.5">Analiza AI</p>
                <p className="text-[14px] leading-relaxed font-medium">{plan.narrative}</p>
              </div>
            </div>
          </div>

          {/* Week summary chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Prognoza tygodnia', value: `${plan.weekTotal.toLocaleString('pl-PL')} zł`, icon: TrendingUp, color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { label: 'Najlepszy dzień', value: plan.bestDay, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { label: 'Najsłabszy dzień', value: plan.worstDay, icon: TrendingDown, color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { label: 'Trend', value: plan.trendFactor > 1.05 ? '📈 Rosnący' : plan.trendFactor < 0.95 ? '📉 Malejący' : '➡️ Stabilny', icon: Minus, color: plan.trendFactor > 1.05 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : plan.trendFactor < 0.95 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-[#F9FAFB] text-[#374151] border-[#E5E7EB]' },
            ].map((chip, i) => (
              <div key={i} className={`rounded-xl border p-3 ${chip.color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">{chip.label}</p>
                <p className="text-[14px] font-bold">{chip.value}</p>
              </div>
            ))}
          </div>

          {/* 7-day cards */}
          <div className="space-y-2">
            {plan.days.map(day => {
              const isExpanded = expandedDay === day.date
              const barWidth = maxRev > 0 ? (day.revMid / maxRev) * 100 : 0
              const isBest = day.dayName === plan.bestDay
              const isWorst = day.dayName === plan.worstDay
              const vsColor = day.vsAvg > 5 ? 'text-emerald-600' : day.vsAvg < -5 ? 'text-red-500' : 'text-[#9CA3AF]'
              const vsIcon = day.vsAvg > 5 ? '↑' : day.vsAvg < -5 ? '↓' : '→'

              return (
                <div key={day.date}
                  className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-violet-300 shadow-md' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'}`}>
                  {/* Main row */}
                  <button className="w-full text-left p-4" onClick={() => setExpandedDay(isExpanded ? null : day.date)}>
                    <div className="flex items-center gap-4">
                      {/* Day */}
                      <div className={`w-14 shrink-0 ${isBest ? 'text-emerald-600' : isWorst ? 'text-amber-600' : 'text-[#374151]'}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{day.dayShort}</p>
                        <p className="text-[13px] font-bold">{fmtDate(day.date)}</p>
                      </div>

                      {/* Revenue bar + range */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[16px] font-bold text-[#111827]">
                              {day.revMid.toLocaleString('pl-PL')} zł
                            </span>
                            <span className="text-[11px] text-[#9CA3AF]">
                              {day.revLow.toLocaleString('pl-PL')}–{day.revHigh.toLocaleString('pl-PL')} zł
                            </span>
                          </div>
                          <span className={`text-[12px] font-bold ${vsColor}`}>
                            {vsIcon} {Math.abs(day.vsAvg).toFixed(0)}%
                          </span>
                        </div>
                        {/* Bar */}
                        <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isBest ? 'bg-emerald-500' : isWorst ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick chips */}
                      <div className="flex items-center gap-2 shrink-0">
                        {day.shouldPromote && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            <Megaphone className="w-2.5 h-2.5" /> Promo
                          </span>
                        )}
                        {day.staffRec > day.staffBaseline && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            <Users className="w-2.5 h-2.5" /> +{day.staffRec - day.staffBaseline}
                          </span>
                        )}
                        {day.staffRec < day.staffBaseline && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-[#F3F4F6] text-[#6B7280] px-2 py-1 rounded-full">
                            <Users className="w-2.5 h-2.5" /> -{day.staffBaseline - day.staffRec}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#F3F4F6]">
                      {/* Staffing */}
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Kadra</p>
                        </div>
                        <p className="text-[20px] font-black text-blue-800">{day.staffRec} <span className="text-[13px] font-semibold">osób</span></p>
                        <p className="text-[11px] text-blue-600 mt-0.5">
                          {day.staffRec === day.staffBaseline && 'Standardowa obsada'}
                          {day.staffRec > day.staffBaseline && `+${day.staffRec - day.staffBaseline} vs normalnie — wzmocnij obsadę`}
                          {day.staffRec < day.staffBaseline && `Zmniejsz o ${day.staffBaseline - day.staffRec} — prognoza słabsza`}
                        </p>
                      </div>

                      {/* Orders */}
                      <div className="bg-violet-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ShoppingCart className="w-3.5 h-3.5 text-violet-600" />
                          <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">Zamówienia</p>
                        </div>
                        {day.orderRecs.length > 0 ? (
                          <div className="space-y-1">
                            {day.orderRecs.map((rec, i) => (
                              <p key={i} className="text-[11px] text-violet-800">{rec}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-violet-600">Standardowe zamówienia — bez zmian</p>
                        )}
                      </div>

                      {/* Promo / Confidence */}
                      <div className={`rounded-xl p-3 ${day.shouldPromote ? 'bg-orange-50' : 'bg-[#F9FAFB]'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          {day.shouldPromote
                            ? <><Megaphone className="w-3.5 h-3.5 text-orange-600" /><p className="text-[11px] font-bold text-orange-700 uppercase tracking-wide">Rekomendacja</p></>
                            : <><TrendingUp className="w-3.5 h-3.5 text-[#6B7280]" /><p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide">Pewność</p></>
                          }
                        </div>
                        {day.shouldPromote ? (
                          <p className="text-[11px] text-orange-800">Prognoza poniżej średniej. Rozważ promocję lunchową lub akcję specjalną.</p>
                        ) : (
                          <>
                            <p className={`text-[14px] font-bold ${CONF_COLOR[day.confidence]}`}>{CONF_LABEL[day.confidence]}</p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                              {day.confidence === 'high' && 'Oparcie na 6+ tygodniach historii'}
                              {day.confidence === 'medium' && 'Oparcie na 3-5 tygodniach historii'}
                              {day.confidence === 'low' && 'Mało danych — szeroki przedział błędu'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom insights */}
          {(plan.pendingInvoices > 0 || plan.topSuppliers.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plan.pendingInvoices > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-[13px] font-bold text-amber-800">Niezatwierdzone faktury</p>
                  </div>
                  <p className="text-[22px] font-black text-amber-700">{plan.pendingInvoices} <span className="text-[14px] font-semibold">faktur</span></p>
                  <p className="text-[12px] text-amber-700 mt-0.5">{plan.pendingTotal.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł czeka na zatwierdzenie</p>
                </div>
              )}
              {plan.topSuppliers.length > 0 && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="w-4 h-4 text-[#6B7280]" />
                    <p className="text-[13px] font-bold text-[#111827]">Top dostawcy (28 dni)</p>
                  </div>
                  <div className="space-y-1.5">
                    {plan.topSuppliers.slice(0,4).map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[12px] text-[#374151] truncate">{s.name}</span>
                        <span className="text-[12px] font-semibold text-[#111827] ml-2 shrink-0">
                          {s.total.toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-[#9CA3AF] text-center">
            Plan wygenerowany na podstawie danych historycznych · Kliknij dzień aby zobaczyć szczegóły · <button onClick={generate} className="underline hover:text-[#6B7280]">Odśwież</button>
          </p>
        </>
      )}
    </div>
  )
}
