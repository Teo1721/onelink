'use client'

import { useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Sparkles, Loader2, Check, AlertTriangle, Users, Clock, DollarSign, ChevronLeft, ChevronRight, Trash2, Edit3, Send, RefreshCw, Info } from 'lucide-react'

type Employee = { id: string; name: string; position: string; base_rate: number }

type ShiftSlot = { start: string; end: string; label: string }

type ProposedShift = {
  employee_id: string
  employee_name: string
  position: string
  date: string
  day_name: string
  time_start: string
  time_end: string
  hours: number
  base_rate: number
  cost: number
  reason: string
  from_suggestion: boolean
  slot_label: string
}

type Stats = {
  totalShifts: number; totalHours: number; totalCost: number
  totalRevEst: number; laborPct: number; laborTarget: number
  coveredDays: number; daysWithData: number; onTarget: boolean
}

interface Props {
  supabase: SupabaseClient
  locationId: string
  locationName?: string
}

const DAYS_SHORT = ['Ndz','Pon','Wt','Śr','Czw','Pt','Sob']

function getMonday(d = new Date()) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  return mon.toISOString().slice(0, 10)
}
function pad(n: number) { return String(n).padStart(2, '0') }
function addDays(base: string, n: number) {
  const d = new Date(base + 'T12:00:00'); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function AiAutoSchedule({ supabase, locationId, locationName }: Props) {
  const [weekStart, setWeekStart]       = useState(getMonday)
  const [openTime, setOpenTime]         = useState('07:00')
  const [closeTime, setCloseTime]       = useState('15:00')
  const [laborTarget, setLaborTarget]   = useState(30)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [proposed, setProposed]         = useState<ProposedShift[]>([])
  const [slots, setSlots]               = useState<ShiftSlot[]>([])
  const [weekDates, setWeekDates]       = useState<string[]>([])
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [stats, setStats]               = useState<Stats | null>(null)
  const [aiSummary, setAiSummary]       = useState('')
  const [publishing, setPublishing]     = useState(false)
  const [published, setPublished]       = useState(false)
  const [editingShift, setEditingShift] = useState<string | null>(null)
  const [staffOverride, setStaffOverride] = useState<Record<string, number>>({})

  async function generate() {
    setLoading(true); setError(null); setProposed([]); setPublished(false)
    try {
      const res = await fetch('/api/ai/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId, weekStart, openTime, closeTime,
          staffPerDay: Object.keys(staffOverride).length > 0 ? staffOverride : undefined,
          laborCostTarget: laborTarget / 100,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Błąd generowania')
      setProposed(json.proposed)
      setSlots(json.slots)
      setWeekDates(json.weekDates)
      setEmployees(json.employees)
      setStats(json.stats)
      setAiSummary(json.aiSummary)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  function removeShift(empId: string, date: string) {
    setProposed(p => p.filter(s => !(s.employee_id === empId && s.date === date)))
  }

  function updateShiftTime(empId: string, date: string, field: 'time_start' | 'time_end', val: string) {
    setProposed(p => p.map(s => {
      if (s.employee_id !== empId || s.date !== date) return s
      const updated = { ...s, [field]: val }
      const [sh, sm] = updated.time_start.split(':').map(Number)
      const [eh, em] = updated.time_end.split(':').map(Number)
      updated.hours = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
      updated.cost = updated.hours * updated.base_rate
      return updated
    }))
  }

  async function publish() {
    if (!proposed.length) return
    setPublishing(true)
    const rows = proposed.map(s => ({
      location_id: locationId,
      employee_id: s.employee_id,
      employee_name: s.employee_name,
      date: s.date,
      time_start: s.time_start,
      time_end: s.time_end,
      position: s.position || null,
      status: 'scheduled',
      is_posted: false,
      break_minutes: 0,
    }))
    const { error } = await supabase.from('shifts').insert(rows)
    if (error) { setError('Błąd zapisu: ' + error.message) }
    else { setPublished(true) }
    setPublishing(false)
  }

  // Recalculate stats from current proposed
  const liveStats = proposed.length > 0 ? {
    totalShifts: proposed.length,
    totalHours: Math.round(proposed.reduce((s,p) => s+p.hours, 0) * 10) / 10,
    totalCost: Math.round(proposed.reduce((s,p) => s+p.cost, 0)),
    laborPct: stats?.totalRevEst ? Math.round(proposed.reduce((s,p) => s+p.cost, 0) / stats.totalRevEst * 1000) / 10 : stats?.laborPct ?? 0,
    onTarget: stats?.totalRevEst ? proposed.reduce((s,p) => s+p.cost, 0) / stats.totalRevEst <= laborTarget / 100 : false,
  } : null

  const weekEnd = weekDates[6] ?? addDays(weekStart, 6)

  // Build grid: employees × dates
  const shiftByKey = Object.fromEntries(proposed.map(s => [`${s.employee_id}_${s.date}`, s]))

  const prevWeek = () => setWeekStart(w => addDays(w, -7))
  const nextWeek = () => setWeekStart(w => addDays(w, 7))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-[#111827]">Grafik AI</h1>
          </div>
          <p className="text-[13px] text-[#6B7280]">
            {locationName && `${locationName} · `}AI generuje optymalny grafik na tydzień — uwzględnia dostępność pracowników, prognozę przychodów i cel kosztowy.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-wrap gap-4 items-end">
        {/* Operating hours */}
        <div className="flex gap-3 items-end">
          <div>
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Otwarcie</p>
            <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-[110px]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Zamknięcie</p>
            <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-[110px]" />
          </div>
        </div>

        {/* Week picker */}
        <div>
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Tydzień</p>
          <div className="flex items-center gap-1">
            <button onClick={prevWeek} className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[13px] font-semibold text-[#111827] min-w-[180px] text-center">
              {fmtDate(weekStart)} – {fmtDate(weekEnd)}
            </div>
            <button onClick={nextWeek} className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Labor cost target */}
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">
            Cel koszt pracy: <span className="text-[#111827]">{laborTarget}%</span>
          </p>
          <input type="range" min={20} max={50} value={laborTarget} onChange={e => setLaborTarget(+e.target.value)}
            className="w-full accent-violet-600" />
          <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-0.5">
            <span>20%</span><span>30% (standard)</span><span>50%</span>
          </div>
        </div>

        {/* Detected slots preview */}
        {openTime && closeTime && (() => {
          const open = openTime.split(':').map(Number); const close = closeTime.split(':').map(Number)
          const totalH = (close[0]*60+close[1] - open[0]*60-open[1]) / 60
          const numSlots = totalH <= 8 ? 1 : totalH <= 16 ? 2 : 3
          const SLOT_COLORS = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-indigo-100 text-indigo-700']
          return (
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Zmiany ({numSlots})</p>
              <div className="flex gap-1">
                {Array.from({length: numSlots}).map((_, i) => (
                  <span key={i} className={`text-[11px] font-bold px-2 py-1 rounded-lg ${SLOT_COLORS[i]}`}>
                    {numSlots === 1 ? 'Jedna zmiana' : i === 0 ? 'Rano' : i === 1 ? 'Wieczór' : 'Noc'}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Generate button */}
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generuję…' : proposed.length ? 'Regeneruj' : 'Generuj grafik'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#374151]">Analizuję dostępność i przychody…</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">AI dobiera optymalny skład na każdy dzień</p>
        </div>
      )}

      {/* AI Summary + Stats */}
      {proposed.length > 0 && !loading && (
        <>
          {/* AI briefing */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white flex items-start gap-3">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
            <p className="text-[13px] leading-relaxed">{aiSummary}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Zmian', value: String(liveStats?.totalShifts ?? 0), color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { icon: Clock, label: 'Godzin', value: `${liveStats?.totalHours ?? 0}h`, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
              { icon: DollarSign, label: 'Koszt pracy', value: `${(liveStats?.totalCost ?? 0).toLocaleString('pl-PL')} zł`, color: 'bg-violet-50 text-violet-700 border-violet-100' },
              {
                icon: liveStats?.onTarget ? Check : AlertTriangle,
                label: 'Koszt / Przychód',
                value: `${liveStats?.laborPct ?? 0}%`,
                color: liveStats?.onTarget ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100',
              },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border p-3 ${s.color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">{s.label}</p>
                <p className="text-[18px] font-black">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Schedule grid */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
              <p className="text-[13px] font-bold text-[#111827]">Proponowany grafik — kliknij komórkę aby edytować</p>
              <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" /> Z sugestii
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block ml-2" /> AI
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="px-4 py-2.5 text-left text-[#6B7280] font-semibold sticky left-0 bg-[#F9FAFB] min-w-[140px]">Pracownik</th>
                    {weekDates.map(d => {
                      const dow = new Date(d + 'T12:00:00').getDay()
                      const isWeekend = dow === 0 || dow === 6
                      return (
                        <th key={d} className={`px-2 py-2.5 text-center font-semibold min-w-[90px] ${isWeekend ? 'text-blue-500' : 'text-[#6B7280]'}`}>
                          <div>{DAYS_SHORT[dow]}</div>
                          <div className="text-[10px] font-normal">{fmtDate(d)}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-[#FAFBFF]">
                      <td className="px-4 py-2 sticky left-0 bg-white">
                        <div className="font-semibold text-[#111827] truncate max-w-[130px]">{emp.name}</div>
                        <div className="text-[10px] text-[#9CA3AF] capitalize">{emp.position || 'pracownik'}</div>
                      </td>
                      {weekDates.map(date => {
                        const shift = shiftByKey[`${emp.id}_${date}`]
                        const editKey = `${emp.id}_${date}`
                        const isEditing = editingShift === editKey

                        if (!shift) {
                          return (
                            <td key={date} className="px-2 py-2 text-center">
                              <div className="w-full min-h-[40px] flex items-center justify-center text-[#E5E7EB]">—</div>
                            </td>
                          )
                        }

                        return (
                          <td key={date} className="px-1 py-1.5">
                            {isEditing ? (
                              <div className="bg-violet-50 border border-violet-200 rounded-lg p-1.5 space-y-1">
                                <input type="time" value={shift.time_start}
                                  onChange={e => updateShiftTime(emp.id, date, 'time_start', e.target.value)}
                                  className="w-full h-6 px-1 rounded border border-violet-200 text-[11px] text-center bg-white" />
                                <input type="time" value={shift.time_end}
                                  onChange={e => updateShiftTime(emp.id, date, 'time_end', e.target.value)}
                                  className="w-full h-6 px-1 rounded border border-violet-200 text-[11px] text-center bg-white" />
                                <div className="flex gap-1">
                                  <button onClick={() => setEditingShift(null)}
                                    className="flex-1 h-5 rounded bg-violet-600 text-white text-[9px] font-bold">✓</button>
                                  <button onClick={() => { removeShift(emp.id, date); setEditingShift(null) }}
                                    className="h-5 w-5 rounded bg-red-100 text-red-600 flex items-center justify-center">
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setEditingShift(editKey)}
                                className={`w-full rounded-lg px-2 py-1.5 text-left transition-all hover:opacity-80 ${
                                  shift.from_suggestion
                                    ? 'bg-violet-100 border border-violet-200'
                                    : 'bg-blue-50 border border-blue-100'
                                }`}
                                title={shift.reason}>
                                <div className={`text-[11px] font-bold ${shift.from_suggestion ? 'text-violet-800' : 'text-blue-800'}`}>
                                  {shift.time_start}–{shift.time_end}
                                </div>
                                <div className={`text-[9px] ${shift.from_suggestion ? 'text-violet-600' : 'text-blue-500'}`}>
                                  {shift.slot_label} · {shift.hours.toFixed(1)}h
                                </div>
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Per-day summary row */}
            <div className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex overflow-x-auto">
                <div className="px-4 py-2 sticky left-0 bg-[#F9FAFB] min-w-[140px] text-[11px] font-bold text-[#374151]">Obsada / dzień</div>
                {weekDates.map(date => {
                  const dayShifts = proposed.filter(s => s.date === date)
                  return (
                    <div key={date} className="px-2 py-2 text-center min-w-[90px]">
                      <div className="text-[13px] font-black text-[#111827]">{dayShifts.length}</div>
                      <div className="text-[10px] text-[#9CA3AF]">os.</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#6B7280]">
              Kliknij komórkę aby edytować godziny lub usunąć zmianę. <span className="text-violet-600 font-semibold">Fioletowe</span> = zgłoszona przez pracownika. <span className="text-blue-600 font-semibold">Niebieskie</span> = przydzielone przez AI.
              Zmiany zostaną zapisane jako szkice — pracownicy nie zobaczą ich dopóki nie opublikujesz.
            </p>
          </div>

          {/* Publish */}
          {!published ? (
            <button onClick={publish} disabled={publishing}
              className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[14px] font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {publishing ? 'Zapisywanie…' : `Zapisz ${proposed.length} zmian jako szkice`}
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[14px] font-bold text-emerald-800">Grafik zapisany!</p>
                <p className="text-[12px] text-emerald-700">{proposed.length} zmian dodanych jako szkice. Przejdź do Harmonogramu aby opublikować.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!proposed.length && !loading && !error && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-[17px] font-bold text-[#111827] mb-2">Grafik AI w jeden klik</h2>
          <p className="text-[13px] text-[#6B7280] max-w-md mx-auto">
            AI sprawdzi dostępność pracowników, uwzględni zgłoszone sugestie zmian i prognozę przychodów — i wygeneruje optymalny grafik tygodniowy spełniający Twój cel kosztowy.
          </p>
        </div>
      )}
    </div>
  )
}
