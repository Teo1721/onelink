'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/supabase-client'
import { useRouter } from 'next/navigation'
import {
  Calendar, Clock, MapPin, LogOut, ChevronLeft, ChevronRight,
  List, Send, Timer, RefreshCw, CheckCircle, XCircle, Edit2, Trash2, KeyRound, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpdatePasswordForm } from '@/components/update-password-form'

/* ─────────────────────── types ── */
type Shift = {
  id: string; date: string
  time_start: string; time_end: string
  break_minutes?: number | null
  position?: string | null
  status?: string
  accepted_by?: string | null
  locations?: { name: string }[] | null
  employee_id?: string | null
}

type Suggestion = {
  id: string; date: string
  time_start: string | null; time_end: string | null
  note: string | null; status: string
  suggestion_type: string | null; created_at: string
}

type ClockRecord = {
  id: string; work_date: string
  clock_in_at: string | null; clock_out_at: string | null
}

type SuggType = 'off' | 'available' | 'specific'

/* ─────────────────────── constants ── */
const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
const MONTH_GEN   = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia']
const DAY_ABBR    = ['Pon','Wt','Śr','Czw','Pt','Sob','Nd']

const POSITION_COLORS: Record<string, string> = {
  kucharz: 'bg-orange-100 text-orange-800 border-orange-300',
  kelner:  'bg-blue-100 text-blue-800 border-blue-300',
  kasjer:  'bg-emerald-100 text-emerald-800 border-emerald-300',
  manager: 'bg-purple-100 text-purple-800 border-purple-300',
  zmywak:  'bg-yellow-100 text-yellow-800 border-yellow-300',
  barista: 'bg-pink-100 text-pink-800 border-pink-300',
  dostawa: 'bg-cyan-100 text-cyan-800 border-cyan-300',
}
const posColor = (pos?: string | null) =>
  pos ? (POSITION_COLORS[pos.toLowerCase()] ?? 'bg-slate-100 text-slate-700 border-slate-300')
      : 'bg-blue-100 text-blue-800 border-blue-300'

const posDot = (pos?: string | null) => {
  const map: Record<string, string> = {
    kucharz:'bg-orange-400', kelner:'bg-blue-400', kasjer:'bg-emerald-400',
    manager:'bg-purple-400', zmywak:'bg-yellow-400', barista:'bg-pink-400', dostawa:'bg-cyan-400',
  }
  return pos ? (map[pos.toLowerCase()] ?? 'bg-slate-400') : 'bg-blue-400'
}

const SUGG_CFG = {
  off:      { label: 'Niedostępny',       color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   icon: '🚫' },
  available:{ label: 'Dostępny',          color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: '✅' },
  specific: { label: 'Konkretne godziny', color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  icon: '⏰' },
}

/* ─────────────────────── helpers ── */
const fmt = (t?: string | null) => (t ?? '').slice(0, 5)

const calcHours = (start: string, end: string, breakMins = 0) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm - breakMins) / 60)
}

const getWeekStart = (iso: string) => {
  const d = new Date(iso); const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1)); return d.toISOString().split('T')[0]
}

const buildWeekDays = (weekStart: string) => {
  const start = new Date(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    return { iso, label: DAY_ABBR[i], dateFull: d.getDate(), month: MONTH_GEN[d.getMonth()],
      isToday: iso === new Date().toISOString().split('T')[0], isWeekend: i >= 5 }
  })
}

const buildCalGrid = (year: number, month: number): (string | null)[] => {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (firstDay.getDay() + 6) % 7
  const cells: (string | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—'

const calcWorked = (inAt: string | null, outAt: string | null) => {
  if (!inAt || !outAt) return null
  const mins = (new Date(outAt).getTime() - new Date(inAt).getTime()) / 60000
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}min`
}

const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]
}

/* ─────────────────────── component ── */
export default function EmployeeDashboard() {
  const supabase = createClient()
  const router   = useRouter()
  const today    = new Date().toISOString().split('T')[0]

  /* ── auth / user ── */
  const [userId,    setUserId]    = useState('')
  const [userName,  setUserName]  = useState('')
  const [employeeId,setEmployeeId]= useState<string | null>(null)
  const [locationId,setLocationId]= useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  /* ── tab ── */
  const [tab, setTab] = useState<'schedule' | 'suggest' | 'clockin'>('schedule')
  const [showChangePw, setShowChangePw] = useState(false)

  /* ── schedule ── */
  const [shifts,      setShifts]      = useState<Shift[]>([])
  const [view,        setView]        = useState<'week' | 'month' | 'list'>('week')
  const [weekStart,   setWeekStart]   = useState(getWeekStart(today))
  const [calYear,     setCalYear]     = useState(new Date().getFullYear())
  const [calMonth,    setCalMonth]    = useState(new Date().getMonth())
  const [monthShifts, setMonthShifts] = useState<Shift[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  /* ── suggestions ── */
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggLoading, setSuggLoading] = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [suggType,    setSuggType]    = useState<SuggType>('specific')
  const [suggDate,    setSuggDate]    = useState(tomorrowStr)
  const [timeStart,   setTimeStart]   = useState('08:00')
  const [timeEnd,     setTimeEnd]     = useState('16:00')
  const [note,        setNote]        = useState('')
  const [suggSaving,  setSuggSaving]  = useState(false)

  /* ── clock in/out ── */
  const [todayRecord,  setTodayRecord]  = useState<ClockRecord | null>(null)
  const [clockHistory, setClockHistory] = useState<ClockRecord[]>([])
  const [clockLoading, setClockLoading] = useState(false)
  const [clockAction,  setClockAction]  = useState(false)

  /* ── init ── */
  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUserId(user.id)

        // Auto-link employee account by email (optional RPC — ignore failures)
        await supabase.rpc('link_employee_on_login').maybeSingle().catch(() => null)

        const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle()
        setUserName(profile?.full_name ?? 'Pracownik')

        // Get employee record + location
        const { data: emp } = await supabase.from('employees').select('id, location_id').eq('user_id', user.id).maybeSingle()
        if (emp) {
          setEmployeeId(emp.id)
          if (emp.location_id) {
            setLocationId(emp.location_id)
          } else {
            const { data: access } = await supabase.from('user_access').select('location_id').eq('user_id', user.id).limit(1).maybeSingle()
            if (access?.location_id) setLocationId(access.location_id)
          }
        }

      } catch (err) {
        console.error('Employee init error:', err)
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── week / list shifts ── */
  const loadShifts = useCallback(async () => {
    if (!userId) return
    const { data: emp } = await supabase.from('employees').select('id').eq('user_id', userId).maybeSingle()
    const empId = emp?.id ?? employeeId
    const filter = empId ? `user_id.eq.${userId},employee_id.eq.${empId}` : `user_id.eq.${userId}`
    const startDate = weekStart < today ? weekStart : today
    const { data } = await supabase
      .from('shifts')
      .select('id, date, time_start, time_end, break_minutes, position, status, accepted_by, employee_id, locations(name)')
      .or(filter).eq('is_posted', true)
      .gte('date', startDate).order('date').limit(90)
    setShifts((data ?? []) as unknown as Shift[])
  }, [userId, employeeId, weekStart, today, supabase])

  useEffect(() => {
    if (userId) loadShifts()
  }, [userId, weekStart, loadShifts])

  /* ── month shifts (fetched when month view opens or month changes) ── */
  const loadMonthShifts = useCallback(async () => {
    if (!userId) return
    const { data: emp } = await supabase.from('employees').select('id').eq('user_id', userId).maybeSingle()
    const empId = emp?.id ?? employeeId
    const filter = empId ? `user_id.eq.${userId},employee_id.eq.${empId}` : `user_id.eq.${userId}`
    const mStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
    const mEnd   = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(new Date(calYear, calMonth + 1, 0).getDate()).padStart(2, '0')}`
    const { data } = await supabase.from('shifts')
      .select('id, date, time_start, time_end, break_minutes, position, status, accepted_by, employee_id, locations(name)')
      .or(filter).eq('is_posted', true)
      .gte('date', mStart).lte('date', mEnd).order('date')
    setMonthShifts((data ?? []) as unknown as Shift[])
  }, [userId, employeeId, calYear, calMonth, supabase])

  useEffect(() => {
    if (view === 'month' && userId) loadMonthShifts()
  }, [view, calYear, calMonth, userId, loadMonthShifts])

  /* ── suggestions ── */
  const loadSuggestions = useCallback(async () => {
    if (!userId) return
    setSuggLoading(true)
    const { data } = await supabase.from('shift_suggestions')
      .select('id, date, time_start, time_end, note, status, suggestion_type, created_at')
      .eq('user_id', userId).order('date', { ascending: false }).limit(30)
    setSuggestions((data ?? []) as Suggestion[])
    setSuggLoading(false)
  }, [userId, supabase])

  useEffect(() => { if (tab === 'suggest' && userId) loadSuggestions() }, [tab, userId, loadSuggestions])

  const resetSuggForm = () => {
    setEditingId(null); setSuggType('specific'); setSuggDate(tomorrowStr())
    setTimeStart('08:00'); setTimeEnd('16:00'); setNote('')
  }

  const startEditSugg = (s: Suggestion) => {
    setEditingId(s.id); setSuggType((s.suggestion_type ?? 'specific') as SuggType)
    setSuggDate(s.date); setTimeStart(s.time_start?.slice(0,5) ?? '08:00')
    setTimeEnd(s.time_end?.slice(0,5) ?? '16:00'); setNote(s.note ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitSuggestion = async () => {
    if (!locationId) { alert('Brak powiązanej lokalizacji. Skontaktuj się z managerem.'); return }
    setSuggSaving(true)
    const payload = {
      suggestion_type: suggType, date: suggDate,
      time_start: suggType === 'specific' ? timeStart : null,
      time_end:   suggType === 'specific' ? timeEnd   : null,
      note: note.trim() || null, status: 'pending',
    }
    if (editingId) {
      await supabase.from('shift_suggestions').update(payload).eq('id', editingId)
    } else {
      await supabase.from('shift_suggestions').insert({ ...payload, employee_id: employeeId, user_id: userId, location_id: locationId })
    }
    resetSuggForm(); await loadSuggestions()
    setSuggSaving(false)
  }

  const deleteSuggestion = async (id: string) => {
    if (!confirm('Usunąć tę sugestię?')) return
    await supabase.from('shift_suggestions').delete().eq('id', id)
    if (editingId === id) resetSuggForm()
    await loadSuggestions()
  }

  /* ── clock in/out ── */
  const loadClockRecords = useCallback(async () => {
    if (!userId) return
    setClockLoading(true)
    const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7)
    const { data } = await supabase.from('shift_clock_ins')
      .select('id, work_date, clock_in_at, clock_out_at')
      .eq('user_id', userId).gte('work_date', sevenAgo.toISOString().split('T')[0])
      .order('work_date', { ascending: false })
    const recs = (data ?? []) as ClockRecord[]
    setTodayRecord(recs.find(r => r.work_date === today) ?? null)
    setClockHistory(recs.filter(r => r.work_date !== today))
    setClockLoading(false)
  }, [userId, today, supabase])

  useEffect(() => { if (tab === 'clockin' && userId) loadClockRecords() }, [tab, userId, loadClockRecords])

  const handleClockIn = async () => {
    setClockAction(true)
    const { data, error } = await supabase.from('shift_clock_ins').insert({
      user_id: userId, location_id: locationId, work_date: today, clock_in_at: new Date().toISOString(),
    }).select().single()
    if (!error) setTodayRecord(data as ClockRecord)
    setClockAction(false)
  }

  const handleClockOut = async () => {
    if (!todayRecord) return
    setClockAction(true)
    const { data, error } = await supabase.from('shift_clock_ins')
      .update({ clock_out_at: new Date().toISOString() }).eq('id', todayRecord.id).select().single()
    if (!error) setTodayRecord(data as ClockRecord)
    setClockAction(false)
  }

  /* ── computed ── */
  const weekDays   = buildWeekDays(weekStart)
  const weekEnd    = weekDays[6]?.iso ?? weekStart
  const weekShifts = shifts.filter(s => s.date >= weekStart && s.date <= weekEnd)
  const weekHours  = weekShifts.reduce((a, s) => a + calcHours(fmt(s.time_start), fmt(s.time_end), s.break_minutes ?? 0), 0)
  const nextShift  = shifts[0]
  const calCells   = buildCalGrid(calYear, calMonth)
  const monthHours = monthShifts.reduce((a, s) => a + calcHours(fmt(s.time_start), fmt(s.time_end)), 0)
  const selectedShifts = selectedDay ? monthShifts.filter(s => s.date === selectedDay) : []

  /* ── loading screen ── */
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Wczytywanie...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Top header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">Cześć, {userName.split(' ')[0]} 👋</h1>
            <p className="text-[11px] text-gray-400">
              {tab === 'schedule' && 'Twój grafik pracy'}
              {tab === 'suggest' && 'Zaproponuj zmianę'}
              {tab === 'clockin' && 'Odbicia czasu pracy'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChangePw(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />Hasło
            </button>
            <button
              onClick={() => { supabase.auth.signOut(); router.push('/auth/login') }}
              className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* ── Change password modal ── */}
      {showChangePw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-[#111827]">Zmień hasło</h2>
              <button onClick={() => setShowChangePw(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <UpdatePasswordForm redirectTo="/employee" />
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* ══════════════════════════════════════════ SCHEDULE TAB ══ */}
        {tab === 'schedule' && (
          <div className="space-y-4">

            {/* Next shift hero */}
            {nextShift && (
              <div className="bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] rounded-2xl p-5 text-white shadow-lg">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-2">Następna zmiana</p>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{fmt(nextShift.time_start)} – {fmt(nextShift.time_end)}</p>
                    <p className="text-blue-200 text-sm mt-1 capitalize">
                      {new Date(nextShift.date + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {nextShift.locations?.[0]?.name && (
                      <div className="flex items-center gap-1 mt-2 text-blue-300 text-xs">
                        <MapPin className="w-3 h-3" />{nextShift.locations[0].name}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {nextShift.position && (
                      <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full capitalize block">{nextShift.position}</span>
                    )}
                    <p className="text-blue-200 text-xs mt-2">
                      {calcHours(fmt(nextShift.time_start), fmt(nextShift.time_end), nextShift.break_minutes ?? 0).toFixed(1)} godz.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {shifts.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800">
                <p className="font-semibold mb-1">Brak zaplanowanych zmian</p>
                <p className="text-xs text-blue-600">Poproś managera o powiązanie Twojego konta (podaj mu swój adres e-mail).</p>
              </div>
            )}

            {/* View toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              {(['week', 'month', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${view === v ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {v === 'week' ? 'Tydzień' : v === 'month' ? 'Miesiąc' : 'Lista'}
                </button>
              ))}
            </div>

            {/* ── WEEK VIEW ── */}
            {view === 'week' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                    const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d.toISOString().split('T')[0])
                  }}><ChevronLeft className="w-4 h-4" /></Button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">
                      {weekDays[0]?.dateFull} {weekDays[0]?.month} – {weekDays[6]?.dateFull} {weekDays[6]?.month}
                    </p>
                    {weekHours > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{weekShifts.length} zmian · {weekHours.toFixed(1)} godz.</p>
                    )}
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                    const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d.toISOString().split('T')[0])
                  }}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map(d => {
                    const dayShifts = weekShifts.filter(s => s.date === d.iso)
                    return (
                      <div key={d.iso} className={`rounded-xl border p-1.5 min-h-[90px] flex flex-col gap-1
                        ${d.isToday ? 'border-blue-400 bg-blue-50' : d.isWeekend ? 'border-slate-100 bg-slate-50' : 'border-slate-100 bg-white'}`}>
                        <div className="text-center">
                          <p className={`text-[9px] font-bold uppercase ${d.isToday ? 'text-blue-500' : 'text-slate-400'}`}>{d.label}</p>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[11px] font-bold
                            ${d.isToday ? 'bg-blue-500 text-white' : 'text-slate-700'}`}>{d.dateFull}</div>
                        </div>
                        {dayShifts.map(shift => (
                          <div key={shift.id} className={`rounded-lg border px-1 py-0.5 text-center ${posColor(shift.position)}`}>
                            <p className="text-[9px] font-bold tabular-nums">{fmt(shift.time_start)}</p>
                            <p className="text-[9px] tabular-nums opacity-70">{fmt(shift.time_end)}</p>
                          </div>
                        ))}
                        {dayShifts.length === 0 && (
                          <div className="flex-1 flex items-center justify-center">
                            <span className="text-[10px] text-slate-200">–</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── MONTH VIEW ── */}
            {view === 'month' && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Month nav */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <button onClick={() => {
                    let m = calMonth - 1, y = calYear
                    if (m < 0) { m = 11; y-- }
                    setCalMonth(m); setCalYear(y); setSelectedDay(null)
                  }} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</p>
                    {monthHours > 0 && <p className="text-[11px] text-gray-400">{monthShifts.length} zmian · {monthHours.toFixed(1)}h</p>}
                  </div>
                  <button onClick={() => {
                    let m = calMonth + 1, y = calYear
                    if (m > 11) { m = 0; y++ }
                    setCalMonth(m); setCalYear(y); setSelectedDay(null)
                  }} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {DAY_ABBR.map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calCells.map((iso, idx) => {
                    if (!iso) return <div key={`e${idx}`} className="aspect-square border-b border-r border-gray-50 last:border-r-0" />
                    const dayShifts = monthShifts.filter(s => s.date === iso)
                    const isToday   = iso === today
                    const isSel     = iso === selectedDay
                    const isWeekend = idx % 7 >= 5
                    return (
                      <button key={iso} onClick={() => setSelectedDay(iso === selectedDay ? null : iso)}
                        className={`aspect-square border-b border-r border-gray-50 flex flex-col items-center justify-start pt-1.5 relative transition-colors
                          ${isSel ? 'bg-[#1E3A8A]' : isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'}`}>
                        <span className={`text-xs font-semibold ${isSel ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                          {parseInt(iso.split('-')[2])}
                        </span>
                        {dayShifts.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayShifts.slice(0, 3).map(s => (
                              <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : posDot(s.position)}`} />
                            ))}
                          </div>
                        )}
                        {dayShifts.length > 0 && (
                          <span className={`text-[8px] font-bold mt-0.5 ${isSel ? 'text-blue-200' : 'text-gray-400'}`}>
                            {dayShifts.reduce((a, s) => a + calcHours(fmt(s.time_start), fmt(s.time_end)), 0).toFixed(0)}h
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected day detail */}
                {selectedDay && (
                  <div className="border-t border-gray-100 p-4">
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {selectedShifts.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-2">— wolny dzień —</p>
                    ) : selectedShifts.map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-2 border-t border-gray-50 first:border-t-0">
                        <div className={`w-1 h-10 rounded-full ${posDot(s.position)}`} />
                        <div className="flex-1">
                          <p className="text-base font-bold text-gray-900">{fmt(s.time_start)} – {fmt(s.time_end)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.position && <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${posColor(s.position)}`}>{s.position}</span>}
                            <span className="text-[11px] text-gray-500">{calcHours(fmt(s.time_start), fmt(s.time_end)).toFixed(1)}h</span>
                            {s.locations?.[0]?.name && <span className="text-[11px] text-gray-400">📍 {s.locations[0].name}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Month summary */}
                <div className="grid grid-cols-3 border-t border-gray-100">
                  {[
                    { val: monthShifts.length, lbl: 'zmian' },
                    { val: `${monthHours.toFixed(1)}h`, lbl: 'łącznie' },
                    { val: monthShifts.filter(s => s.accepted_by).length, lbl: 'zaakceptowanych' },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className="py-3 text-center border-r border-gray-100 last:border-r-0">
                      <p className="text-lg font-bold text-gray-900">{val}</p>
                      <p className="text-[10px] text-gray-400">{lbl}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── LIST VIEW ── */}
            {view === 'list' && (
              <div className="space-y-2">
                {shifts.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                    <p className="text-2xl mb-2">📅</p>
                    <p className="font-bold text-blue-800 text-sm mb-1">Brak nadchodzących zmian</p>
                    <p className="text-xs text-blue-600">Manager nie opublikował jeszcze grafiku.</p>
                  </div>
                ) : shifts.map(shift => {
                  const hrs = calcHours(fmt(shift.time_start), fmt(shift.time_end), shift.break_minutes ?? 0)
                  const isToday = shift.date === today
                  return (
                    <div key={shift.id} className={`bg-white rounded-xl overflow-hidden flex border ${isToday ? 'border-blue-400' : 'border-gray-100'} shadow-sm`}>
                      <div className={`w-1.5 shrink-0 ${posDot(shift.position)}`} />
                      <div className="flex-1 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                              {isToday ? 'DZIŚ · ' : ''}{new Date(shift.date + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-base font-bold text-gray-900 tabular-nums">{fmt(shift.time_start)} – {fmt(shift.time_end)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{hrs.toFixed(1)}h</span>
                              {shift.locations?.[0]?.name && <span className="text-xs text-gray-400">📍 {shift.locations[0].name}</span>}
                            </div>
                          </div>
                          {shift.position && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize shrink-0 ${posColor(shift.position)}`}>
                              {shift.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ SUGGEST TAB ══ */}
        {tab === 'suggest' && (
          <div className="space-y-4">

            {/* Form card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold text-gray-900 mb-0.5">{editingId ? '✏️ Edytuj sugestię' : 'Nowa sugestia'}</p>
              <p className="text-xs text-gray-500 mb-4">
                {editingId ? 'Zmień szczegóły i zapisz.' : 'Powiadom managera o swojej dostępności lub zaproponuj konkretny termin.'}
              </p>

              {/* Type selector */}
              <p className="text-xs font-semibold text-gray-700 mb-2">Typ sugestii</p>
              <div className="space-y-2 mb-4">
                {(['off', 'available', 'specific'] as SuggType[]).map(t => {
                  const cfg = SUGG_CFG[t]
                  const active = suggType === t
                  return (
                    <button key={t} onClick={() => setSuggType(t)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
                        ${active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                      <span className="text-lg">{cfg.icon}</span>
                      <span className={`text-sm font-semibold ${active ? cfg.color : 'text-gray-700'}`}>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Date */}
              <p className="text-xs font-semibold text-gray-700 mb-2">Data</p>
              <input type="date" value={suggDate} min={tomorrowStr()}
                onChange={e => setSuggDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 mb-4 focus:outline-none focus:border-blue-400" />

              {/* Times (specific only) */}
              {suggType === 'specific' && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Od</p>
                    <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Do</p>
                    <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
              )}

              {/* Info banners */}
              {suggType === 'off' && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-xs text-red-700">Manager zostanie poinformowany, że nie możesz tego dnia pracować.</p>
                </div>
              )}
              {suggType === 'available' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-xs text-green-700">Manager zostanie poinformowany, że jesteś dostępny tego dnia.</p>
                </div>
              )}

              {/* Note */}
              <p className="text-xs font-semibold text-gray-700 mb-2">Uwaga (opcjonalnie)</p>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="np. mogę wcześniej/później, proszę o ten dział..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 resize-none focus:outline-none focus:border-blue-400 mb-4" />

              {/* Actions */}
              <div className="flex gap-2">
                {editingId && (
                  <button onClick={resetSuggForm}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors">
                    ✕ Anuluj
                  </button>
                )}
                <button onClick={submitSuggestion} disabled={suggSaving}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-60
                    ${editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1D4ED8] hover:bg-blue-800'}`}>
                  {suggSaving ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Wyślij sugestię'}
                </button>
              </div>
            </div>

            {/* History */}
            {suggLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : suggestions.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Moje sugestie</p>
                <div className="space-y-2">
                  {suggestions.map(s => {
                    const isEditing = editingId === s.id
                    const statusCfg = s.status === 'approved'
                      ? { icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Zatwierdzona', cls: 'text-green-700 bg-green-50' }
                      : s.status === 'rejected'
                      ? { icon: <XCircle className="w-3.5 h-3.5" />, text: 'Odrzucona', cls: 'text-red-700 bg-red-50' }
                      : { icon: <RefreshCw className="w-3.5 h-3.5" />, text: 'Oczekuje', cls: 'text-amber-700 bg-amber-50' }
                    const tc = SUGG_CFG[(s.suggestion_type ?? 'specific') as SuggType]
                    return (
                      <div key={s.id} className={`bg-white rounded-xl border p-3 shadow-sm transition-all ${isEditing ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-900">{s.date}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tc.bg} ${tc.color} ${tc.border} border`}>{tc.icon} {tc.label}</span>
                            </div>
                            {s.suggestion_type === 'specific' && s.time_start && (
                              <p className="text-xs font-semibold text-gray-700">{fmt(s.time_start)} – {fmt(s.time_end)}</p>
                            )}
                            {s.note && <p className="text-xs text-gray-500 italic mt-0.5">{s.note}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusCfg.cls}`}>
                              {statusCfg.icon}<span>{statusCfg.text}</span>
                            </div>
                            {s.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={() => startEditSugg(s)}
                                  className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100">
                                  <Edit2 className="w-3 h-3 text-blue-600" />
                                </button>
                                <button onClick={() => deleteSuggestion(s.id)}
                                  className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100">
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ CLOCK TAB ══ */}
        {tab === 'clockin' && (
          <div className="space-y-4">

            {/* Today card */}
            <div className="bg-[#1E3A8A] rounded-2xl p-5 shadow-lg">
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-4">DZIŚ · {today}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-blue-300 text-xs mb-1">Przyjście</p>
                  <p className={`text-2xl font-bold tabular-nums ${todayRecord?.clock_in_at ? 'text-green-400' : 'text-slate-500'}`}>
                    {fmtTime(todayRecord?.clock_in_at ?? null)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-blue-300 text-xs mb-1">Wyjście</p>
                  <p className={`text-2xl font-bold tabular-nums ${todayRecord?.clock_out_at ? 'text-red-400' : 'text-slate-500'}`}>
                    {fmtTime(todayRecord?.clock_out_at ?? null)}
                  </p>
                </div>
              </div>
              {calcWorked(todayRecord?.clock_in_at ?? null, todayRecord?.clock_out_at ?? null) && (
                <p className="text-blue-200 text-sm text-center mb-4">
                  Przepracowano: <strong>{calcWorked(todayRecord?.clock_in_at ?? null, todayRecord?.clock_out_at ?? null)}</strong>
                </p>
              )}
              {clockLoading ? (
                <div className="flex justify-center py-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
              ) : !todayRecord?.clock_in_at ? (
                <button onClick={handleClockIn} disabled={clockAction}
                  className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-60">
                  {clockAction ? 'Zapisywanie...' : '▶ Rozpocznij zmianę'}
                </button>
              ) : !todayRecord?.clock_out_at ? (
                <button onClick={handleClockOut} disabled={clockAction}
                  className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-base transition-colors disabled:opacity-60">
                  {clockAction ? 'Zapisywanie...' : '⏹ Zakończ zmianę'}
                </button>
              ) : (
                <div className="py-3 rounded-xl bg-green-500/20 text-center">
                  <p className="text-green-400 font-bold">✓ Zmiana zakończona</p>
                </div>
              )}
            </div>

            {/* 7-day history */}
            {clockHistory.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Ostatnie 7 dni</p>
                <div className="space-y-2">
                  {clockHistory.map(rec => (
                    <div key={rec.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">{rec.work_date}</p>
                      <p className="text-sm text-gray-600 tabular-nums">{fmtTime(rec.clock_in_at)} → {fmtTime(rec.clock_out_at)}</p>
                      {calcWorked(rec.clock_in_at, rec.clock_out_at) && (
                        <p className="text-sm font-bold text-blue-600">{calcWorked(rec.clock_in_at, rec.clock_out_at)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 shadow-lg">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          {([
            { key: 'schedule', icon: Calendar,  label: 'Grafik' },
            { key: 'suggest',  icon: Send,       label: 'Sugestie' },
            { key: 'clockin',  icon: Timer,      label: 'Odbicia' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${tab === key ? 'text-[#1D4ED8]' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{label}</span>
              {tab === key && <div className="absolute bottom-0 w-8 h-0.5 bg-[#1D4ED8] rounded-t-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
