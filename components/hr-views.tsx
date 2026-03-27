'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  AlertCircle, FileSpreadsheet, Save, Plus, Trash2, AlertTriangle,
  FileText, Loader2, RefreshCw, Clock, Calendar, User,
  Umbrella, Building2, GitCompare, GraduationCap, FolderOpen,
  Upload, BellRing, Download, Eye,
} from 'lucide-react'
import * as XLSX from 'xlsx'

/* ================================================================== */
/* TYPES                                                               */
/* ================================================================== */
export type ClockEntry = {
  id: string; user_id: string | null; employee_id: string | null
  work_date: string; clock_in_at: string | null; clock_out_at: string | null
  clock_in_photo_url: string | null; clock_out_photo_url: string | null
}
export type AttEmp = { id: string; full_name: string; position: string | null; user_id: string | null; base_rate: number | null }
export type AttSummary = AttEmp & { records: ClockEntry[]; days: number; totalMinutes: number }

export type LeaveRequest = {
  id: string; employee_id: string | null; user_id: string | null
  leave_type: string; date_from: string; date_to: string
  note: string | null; status: string; created_at: string
  employees?: { full_name: string; position: string | null } | null
}

export type SwapRequest = {
  id: string; shift_id: string; note: string | null; status: string; created_at: string
  requester_employee_id: string | null; target_employee_id: string | null
  requester?: { full_name: string } | null
  target?: { full_name: string } | null
  shift?: { date: string; time_start: string; time_end: string } | null
}

export type Cert = {
  id: string; employee_id: string; name: string
  issued_date: string | null; expiry_date: string | null; note: string | null
}

export type EmpDoc = {
  id: string; employee_id: string; name: string; file_url: string
  file_size: number | null; file_type: string | null; created_at: string
}

/* ================================================================== */
/* HR DASHBOARD VIEW                                                   */
/* ================================================================== */
type LocStat = {
  locationId: string; name: string
  clockedIn: number; shiftsToday: number; pendingLeaves: number; totalEmployees: number
}

export function HRDashboardView({
  locations,
  supabase,
}: {
  locations: { id: string; name: string }[]
  supabase: any
}) {
  const [stats, setStats] = useState<LocStat[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('sv-SE')

  useEffect(() => {
    if (!locations.length) return
    ;(async () => {
      setLoading(true)
      const results = await Promise.all(
        locations.map(async loc => {
          const [{ count: clockedIn }, { count: shiftsToday }, { count: pendingLeaves }, { count: totalEmployees }] =
            await Promise.all([
              supabase.from('shift_clock_ins').select('id', { count: 'exact', head: true })
                .eq('location_id', loc.id).eq('work_date', today).not('clock_in_at', 'is', null),
              supabase.from('shifts').select('id', { count: 'exact', head: true })
                .eq('location_id', loc.id).eq('date', today).eq('is_posted', true),
              supabase.from('leave_requests').select('id', { count: 'exact', head: true })
                .eq('location_id', loc.id).eq('status', 'pending'),
              supabase.from('employees').select('id', { count: 'exact', head: true })
                .eq('location_id', loc.id).in('status', ['active', 'confirmed']),
            ])
          return {
            locationId: loc.id, name: loc.name,
            clockedIn: clockedIn ?? 0, shiftsToday: shiftsToday ?? 0,
            pendingLeaves: pendingLeaves ?? 0, totalEmployees: totalEmployees ?? 0,
          }
        })
      )
      setStats(results)
      setLoading(false)
    })()
  }, [locations.length])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  )

  const totals = stats.reduce(
    (a, s) => ({
      clockedIn: a.clockedIn + s.clockedIn,
      shiftsToday: a.shiftsToday + s.shiftsToday,
      pendingLeaves: a.pendingLeaves + s.pendingLeaves,
      totalEmployees: a.totalEmployees + s.totalEmployees,
    }),
    { clockedIn: 0, shiftsToday: 0, pendingLeaves: 0, totalEmployees: 0 }
  )

  return (
    <div className="max-w-4xl mx-auto py-6 px-2">
      <h2 className="text-[22px] font-bold text-[#111827] mb-1">Dashboard HR</h2>
      <p className="text-[13px] text-[#9CA3AF] mb-6">
        Przegląd wszystkich lokalizacji —{' '}
        {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Zalogowanych dziś',   val: totals.clockedIn,      icon: Clock,    color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Zmian zaplanowanych', val: totals.shiftsToday,    icon: Calendar, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Wniosków urlopowych', val: totals.pendingLeaves,  icon: Umbrella, color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Pracowników łącznie', val: totals.totalEmployees, icon: User,     color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{val}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {stats.map(s => (
          <div key={s.locationId} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[#6B7280]" />
              <h3 className="font-bold text-[#111827] text-[15px]">{s.name}</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Zalogowanych', val: s.clockedIn,      color: 'text-green-600' },
                { label: 'Zmian dziś',   val: s.shiftsToday,    color: 'text-blue-600'  },
                { label: 'Urlopy',       val: s.pendingLeaves,  color: s.pendingLeaves > 0 ? 'text-amber-600' : 'text-gray-400' },
                { label: 'Pracownicy',   val: s.totalEmployees, color: 'text-gray-700'  },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl font-bold ${color}`}>{val}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/* ATTENDANCE VIEW                                                     */
/* ================================================================== */
export function AttendanceView({
  locationId,
  locationName,
  supabase,
}: {
  locationId: string
  locationName: string
  supabase: any
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [records,    setRecords]    = useState<ClockEntry[]>([])
  const [employees,  setEmployees]  = useState<AttEmp[]>([])
  const [loading,    setLoading]    = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [photoModal, setPhotoModal] = useState<string | null>(null)

  type ModalMode  = 'add' | 'edit'
  type ModalState = { mode: ModalMode; record?: ClockEntry; empId?: string } | null
  const [modal,   setModal]   = useState<ModalState>(null)
  const [mForm,   setMForm]   = useState({ employee_id: '', date: '', clock_in: '', clock_out: '' })
  const [mSaving, setMSaving] = useState(false)
  const [mError,  setMError]  = useState<string | null>(null)

  function openAdd(empId?: string) {
    const today = new Date().toLocaleDateString('sv-SE')
    setMForm({ employee_id: empId ?? '', date: today, clock_in: '', clock_out: '' })
    setMError(null)
    setModal({ mode: 'add', empId })
  }
  function openEdit(record: ClockEntry, empId: string) {
    const inT  = record.clock_in_at  ? new Date(record.clock_in_at ).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : ''
    const outT = record.clock_out_at ? new Date(record.clock_out_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : ''
    setMForm({ employee_id: empId, date: record.work_date, clock_in: inT, clock_out: outT })
    setMError(null)
    setModal({ mode: 'edit', record, empId })
  }
  function mSet(k: string, v: string) { setMForm(f => ({ ...f, [k]: v })) }
  function buildISO(date: string, time: string): string | null {
    if (!time) return null
    return new Date(`${date}T${time}:00`).toISOString()
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [y, m]  = month.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const start   = `${month}-01`
    const end     = `${month}-${String(lastDay).padStart(2, '0')}`
    const [{ data: empData }, { data: clockData }] = await Promise.all([
      supabase.from('employees').select('id, full_name, position, user_id, base_rate')
        .eq('location_id', locationId).in('status', ['active', 'confirmed']),
      supabase.from('shift_clock_ins')
        .select('id, user_id, employee_id, work_date, clock_in_at, clock_out_at, clock_in_photo_url, clock_out_photo_url')
        .eq('location_id', locationId).gte('work_date', start).lte('work_date', end).order('work_date'),
    ])
    setEmployees((empData ?? []) as AttEmp[])
    setRecords((clockData ?? []) as ClockEntry[])
    setLoading(false)
  }, [locationId, month, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveEntry() {
    setMSaving(true); setMError(null)
    const { employee_id, date, clock_in, clock_out } = mForm
    if (!date || !clock_in) { setMError('Data i godzina przyjścia są wymagane'); setMSaving(false); return }
    const emp = employees.find(e => e.id === employee_id)
    const payload = {
      employee_id, user_id: emp?.user_id ?? null, location_id: locationId,
      work_date: date, clock_in_at: buildISO(date, clock_in), clock_out_at: buildISO(date, clock_out),
    }
    let err: { message: string } | null = null
    if (modal?.mode === 'add') {
      ;({ error: err } = await supabase.from('shift_clock_ins').insert(payload))
    } else if (modal?.record) {
      ;({ error: err } = await supabase.from('shift_clock_ins')
        .update({ clock_in_at: payload.clock_in_at, clock_out_at: payload.clock_out_at })
        .eq('id', modal.record.id))
    }
    if (err) { setMError(err.message); setMSaving(false); return }
    setModal(null); await fetchData(); setMSaving(false)
  }

  async function deleteEntry() {
    if (!modal?.record) return
    if (!confirm('Usunąć ten wpis?')) return
    setMSaving(true)
    await supabase.from('shift_clock_ins').delete().eq('id', modal.record.id)
    setModal(null); await fetchData(); setMSaving(false)
  }

  const summary = useMemo<AttSummary[]>(() => {
    return employees.map(emp => {
      const empRecs = records.filter(r =>
        (r.employee_id && r.employee_id === emp.id) ||
        (emp.user_id && r.user_id === emp.user_id)
      )
      const totalMinutes = empRecs.reduce((sum, r) => {
        if (!r.clock_in_at || !r.clock_out_at) return sum
        return sum + Math.round((new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime()) / 60_000)
      }, 0)
      return { ...emp, records: empRecs, days: empRecs.filter(r => r.clock_in_at).length, totalMinutes }
    }).sort((a, b) => b.days - a.days)
  }, [employees, records])

  const totalMinAll   = summary.reduce((s, e) => s + e.totalMinutes, 0)
  const totalDaysAll  = summary.reduce((s, e) => s + e.days, 0)
  const activeWorkers = summary.filter(e => e.days > 0).length

  function fmtHM(min: number) {
    if (min <= 0) return '0h 0min'
    return `${Math.floor(min / 60)}h ${min % 60}min`
  }
  function fmtTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }
  function monthLabel() {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
  }
  function recMin(r: ClockEntry) {
    if (!r.clock_in_at || !r.clock_out_at) return 0
    return Math.round((new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime()) / 60_000)
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`Ewidencja czasu pracy — ${locationName} — ${monthLabel()}`], [],
      ['Pracownik', 'Pozycja', 'Stawka godz.', 'Dni pracy', 'Godziny', 'Minuty ogółem', 'Śr./dzień', 'Szac. koszt'],
      ...summary.map(e => [
        e.full_name, e.position ?? '—', e.base_rate ? `${e.base_rate} zł` : '—',
        e.days, fmtHM(e.totalMinutes), e.totalMinutes,
        e.days > 0 ? fmtHM(Math.round(e.totalMinutes / e.days)) : '—',
        e.base_rate ? `${((e.base_rate * e.totalMinutes) / 60).toFixed(2)} zł` : '—',
      ]),
      [], ['RAZEM', '', '', totalDaysAll, fmtHM(totalMinAll), totalMinAll, '', ''],
    ])
    ws1['!cols'] = [{ wch: 26 }, { wch: 15 }, { wch: 13 }, { wch: 10 }, { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Podsumowanie')
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Pracownik', 'Data', 'Przyjście', 'Wyjście', 'Czas pracy', 'Minuty'],
      ...summary.flatMap(e => e.records.map(r => [
        e.full_name, r.work_date,
        fmtTime(r.clock_in_at), r.clock_out_at ? fmtTime(r.clock_out_at) : 'W trakcie',
        fmtHM(recMin(r)), recMin(r),
      ])),
    ])
    ws2['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 8 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Szczegóły')
    XLSX.writeFile(wb, `ewidencja-${locationName.replace(/\s+/g, '-')}-${month}.xlsx`)
  }

  function exportPDF() {
    const sumRows = summary.map(e => `
      <tr>
        <td>${e.full_name}</td><td>${e.position ?? '—'}</td>
        <td class="c">${e.days}</td><td class="r">${fmtHM(e.totalMinutes)}</td>
        <td class="r">${e.days > 0 ? fmtHM(Math.round(e.totalMinutes / e.days)) : '—'}</td>
        <td class="r">${e.base_rate ? ((e.base_rate * e.totalMinutes) / 60).toFixed(2) + ' zł' : '—'}</td>
      </tr>`).join('')
    const detailRows = summary.flatMap(e => e.records.map(r => `
      <tr>
        <td>${e.full_name}</td><td>${r.work_date}</td>
        <td class="c">${fmtTime(r.clock_in_at)}</td>
        <td class="c">${r.clock_out_at ? fmtTime(r.clock_out_at) : '<em>W trakcie</em>'}</td>
        <td class="r">${fmtHM(recMin(r))}</td>
      </tr>`)).join('')
    const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8">
      <title>Ewidencja — ${locationName} — ${monthLabel()}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:28px}
      h1{font-size:17px;font-weight:700;margin-bottom:3px}.meta{color:#666;font-size:11px;margin-bottom:20px}
      h2{font-size:12px;font-weight:700;margin:22px 0 6px;color:#1D4ED8;text-transform:uppercase;letter-spacing:.06em}
      table{width:100%;border-collapse:collapse}thead tr{background:#1D4ED8;color:#fff}
      th{padding:7px 10px;font-size:10px;font-weight:600;text-align:left}td{padding:6px 10px;border-bottom:1px solid #E5E7EB}
      tr:nth-child(even) td{background:#F9FAFB}.foot td{font-weight:700;border-top:2px solid #1D4ED8;background:#EFF6FF}
      .c{text-align:center}.r{text-align:right}@media print{@page{margin:16mm}}</style></head><body>
      <h1>Ewidencja czasu pracy</h1>
      <p class="meta">${locationName} &bull; ${monthLabel()} &bull; Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}</p>
      <h2>Podsumowanie</h2>
      <table><thead><tr><th>Pracownik</th><th>Pozycja</th><th class="c">Dni</th><th class="r">Godziny</th><th class="r">Śr./dzień</th><th class="r">Szac. koszt</th></tr></thead>
      <tbody>${sumRows}<tr class="foot"><td colspan="2">RAZEM (${activeWorkers} pracowników)</td>
      <td class="c">${totalDaysAll}</td><td class="r">${fmtHM(totalMinAll)}</td><td></td><td></td></tr></tbody></table>
      <h2>Szczegóły odbitek</h2>
      <table><thead><tr><th>Pracownik</th><th>Data</th><th class="c">Przyjście</th><th class="c">Wyjście</th><th class="r">Czas pracy</th></tr></thead>
      <tbody>${detailRows}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`
    const win = window.open('', '_blank')
    win?.document.write(html); win?.document.close()
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Ewidencja czasu pracy</h2>
          <p className="text-[13px] text-[#9CA3AF]">{locationName} — {monthLabel()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={() => openAdd()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Dodaj wpis
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-[13px] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pracownicy z odbiciami', value: `${activeWorkers} / ${employees.length}`, color: 'text-blue-600' },
          { label: 'Łączne godziny', value: fmtHM(totalMinAll), color: 'text-emerald-600' },
          { label: 'Łączne dni pracy', value: `${totalDaysAll}`, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-[22px] font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Late/absent today */}
      {(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE')
        if (month !== todayStr.slice(0, 7)) return null
        const notClockedIn = employees.filter(emp =>
          !records.some(r =>
            r.work_date === todayStr &&
            ((r.employee_id && r.employee_id === emp.id) || (emp.user_id && r.user_id === emp.user_id))
          )
        )
        if (notClockedIn.length === 0) return null
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-[13px] font-bold text-amber-800">Niezalogowani dziś ({notClockedIn.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {notClockedIn.map(e => (
                <span key={e.id} className="text-[12px] bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{e.full_name}</span>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#9CA3AF]">
            <Loader2 className="w-5 h-5 animate-spin" /> Ładowanie…
          </div>
        ) : summary.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF] text-[14px]">Brak danych dla wybranego miesiąca</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Pracownik', 'Pozycja', 'Dni pracy', 'Godziny ogółem', 'Śr./dzień', 'Stawka', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map(emp => (
                <>
                  <tr key={emp.id} onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                    className={`border-b border-[#F3F4F6] cursor-pointer hover:bg-[#F9FAFB] transition-colors ${emp.days === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                          {emp.full_name[0]?.toUpperCase()}
                        </div>
                        <span className="text-[14px] font-semibold text-[#111827]">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B7280]">{emp.position ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[14px] font-bold ${emp.days > 0 ? 'text-[#111827]' : 'text-[#D1D5DB]'}`}>{emp.days}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[14px] font-bold ${emp.totalMinutes > 0 ? 'text-emerald-600' : 'text-[#D1D5DB]'}`}>
                        {fmtHM(emp.totalMinutes)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                      {emp.days > 0 ? fmtHM(Math.round(emp.totalMinutes / emp.days)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                      {emp.base_rate ? `${emp.base_rate} zł/h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-blue-500">{expandedId === emp.id ? '▲' : '▼'}</span>
                    </td>
                  </tr>
                  {expandedId === emp.id && (
                    <tr key={`${emp.id}-detail`} className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex justify-end mb-2">
                          <button onClick={e => { e.stopPropagation(); openAdd(emp.id) }}
                            className="flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-800">
                            <Plus className="w-3.5 h-3.5" /> Dodaj dzień
                          </button>
                        </div>
                        {emp.records.length === 0 ? (
                          <p className="text-[13px] text-[#9CA3AF] py-2">Brak odbitek — kliknij &quot;Dodaj dzień&quot; aby wprowadzić ręcznie</p>
                        ) : (
                          <div className="grid gap-1">
                            <div className="grid grid-cols-[1fr_100px_100px_90px_60px_1fr_56px] text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider px-2 pb-1 gap-1">
                              <span>Data</span><span>Przyjście</span><span>Wyjście</span><span>Czas</span><span>Foto</span><span>Status</span><span></span>
                            </div>
                            {emp.records.map(r => {
                              const min = recMin(r)
                              return (
                                <div key={r.id} className="grid grid-cols-[1fr_100px_100px_90px_60px_1fr_56px] items-center bg-white rounded-lg px-2 py-2 border border-[#E5E7EB] text-[13px] gap-1">
                                  <span className="font-medium text-[#374151]">{r.work_date}</span>
                                  <span className="text-green-600 font-mono flex items-center gap-1">
                                    {fmtTime(r.clock_in_at)}
                                    {r.clock_in_photo_url && (
                                      <button onClick={e => { e.stopPropagation(); setPhotoModal(r.clock_in_photo_url) }}>
                                        <img src={r.clock_in_photo_url} alt="wejście" className="w-7 h-7 rounded-md object-cover border border-green-200 hover:scale-110 transition-transform" />
                                      </button>
                                    )}
                                  </span>
                                  <span className="text-orange-600 font-mono flex items-center gap-1">
                                    {r.clock_out_at ? fmtTime(r.clock_out_at) : <em className="text-slate-400">W trakcie</em>}
                                    {r.clock_out_photo_url && (
                                      <button onClick={e => { e.stopPropagation(); setPhotoModal(r.clock_out_photo_url) }}>
                                        <img src={r.clock_out_photo_url} alt="wyjście" className="w-7 h-7 rounded-md object-cover border border-orange-200 hover:scale-110 transition-transform" />
                                      </button>
                                    )}
                                  </span>
                                  <span className="font-semibold text-[#374151]">{min > 0 ? fmtHM(min) : '—'}</span>
                                  <span className="text-center">
                                    {(r.clock_in_photo_url || r.clock_out_photo_url)
                                      ? <span className="text-[10px] text-blue-500">📷</span>
                                      : <span className="text-[10px] text-slate-300">—</span>}
                                  </span>
                                  <span>
                                    {!r.clock_in_at ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">Brak</span>
                                      : !r.clock_out_at ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">W trakcie</span>
                                      : <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px]">Zakończona</span>}
                                  </span>
                                  <button onClick={e => { e.stopPropagation(); openEdit(r, emp.id) }}
                                    className="flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 text-[11px] font-medium">
                                    <Save className="w-3.5 h-3.5" /> Edytuj
                                  </button>
                                </div>
                              )
                            })}
                            <div className="grid grid-cols-5 px-2 pt-1 text-[12px] font-bold text-[#374151]">
                              <span>Suma:</span><span></span><span></span>
                              <span className="text-emerald-600">{fmtHM(emp.totalMinutes)}</span>
                              {emp.base_rate && <span className="text-blue-600">{((emp.base_rate * emp.totalMinutes) / 60).toFixed(2)} zł</span>}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#EFF6FF] border-t-2 border-[#1D4ED8]">
                <td className="px-4 py-3 text-[13px] font-bold text-[#1D4ED8]" colSpan={2}>RAZEM ({activeWorkers} pracowników)</td>
                <td className="px-4 py-3 text-[14px] font-bold text-[#111827]">{totalDaysAll}</td>
                <td className="px-4 py-3 text-[14px] font-bold text-emerald-600">{fmtHM(totalMinAll)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="mt-4 text-[12px] text-[#9CA3AF]">
        * Szacunkowy koszt = stawka godzinowa × godziny przepracowane. Kliknij wiersz pracownika, aby zobaczyć szczegóły.
      </p>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-[18px] font-bold text-[#111827] mb-4">
              {modal.mode === 'add' ? 'Dodaj odbicie' : 'Edytuj odbicie'}
            </h3>
            {modal.mode === 'add' && (
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Pracownik *</label>
                <select value={mForm.employee_id} onChange={e => mSet('employee_id', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">— wybierz pracownika —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
            )}
            {modal.mode === 'edit' && (
              <p className="text-[13px] text-[#6B7280] mb-4">
                Pracownik: <strong className="text-[#111827]">{employees.find(e => e.id === modal.empId)?.full_name}</strong>
              </p>
            )}
            <div className="mb-4">
              <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Data *</label>
              <input type="date" value={mForm.date} onChange={e => mSet('date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Przyjście *</label>
                <input type="time" value={mForm.clock_in} onChange={e => mSet('clock_in', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Wyjście</label>
                <input type="time" value={mForm.clock_out} onChange={e => mSet('clock_out', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            {mError && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">{mError}</div>}
            <div className="flex gap-2">
              {modal.mode === 'edit' && (
                <button onClick={deleteEntry} disabled={mSaving}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold transition-colors disabled:opacity-40">
                  Usuń
                </button>
              )}
              <button onClick={() => setModal(null)} disabled={mSaving}
                className="flex-1 py-2 rounded-lg border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
                Anuluj
              </button>
              <button onClick={saveEntry} disabled={mSaving}
                className="flex-[2] py-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white font-bold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                {mSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {photoModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={photoModal} alt="Zdjęcie odbicia" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
            <button onClick={() => setPhotoModal(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* LEAVE VIEW                                                          */
/* ================================================================== */
const LEAVE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  vacation: { label: 'Urlop wypoczynkowy', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  sick:     { label: 'Zwolnienie L4',      color: 'text-red-700',    bg: 'bg-red-50'    },
  unpaid:   { label: 'Urlop bezpłatny',    color: 'text-gray-700',   bg: 'bg-gray-50'   },
  other:    { label: 'Inny',               color: 'text-purple-700', bg: 'bg-purple-50' },
}
const LEAVE_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Oczekuje',     color: 'text-amber-700',  bg: 'bg-amber-50' },
  approved: { label: 'Zatwierdzony', color: 'text-green-700',  bg: 'bg-green-50' },
  rejected: { label: 'Odrzucony',    color: 'text-red-700',    bg: 'bg-red-50'   },
}

export function LeaveView({
  locationId,
  locationName,
  supabase,
}: {
  locationId: string
  locationName: string
  supabase: any
}) {
  const [requests,   setRequests]   = useState<LeaveRequest[]>([])
  const [employees,  setEmployees]  = useState<{ id: string; full_name: string }[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [saving,     setSaving]     = useState<string | null>(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [form,       setForm]       = useState({ employee_id: '', leave_type: 'vacation', date_from: '', date_to: '', note: '' })
  const [formSaving, setFormSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: reqs }, { data: emps }] = await Promise.all([
      supabase.from('leave_requests').select('*, employees(full_name, position)')
        .eq('location_id', locationId).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, full_name').eq('location_id', locationId)
        .in('status', ['active', 'confirmed']).order('full_name'),
    ])
    setRequests((reqs ?? []) as LeaveRequest[])
    setEmployees(emps ?? [])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function reviewRequest(id: string, status: 'approved' | 'rejected') {
    setSaving(id)
    await supabase.from('leave_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    setSaving(null); fetchData()
  }

  async function submitAdd() {
    if (!form.employee_id || !form.date_from || !form.date_to) return
    setFormSaving(true)
    await supabase.from('leave_requests').insert({
      employee_id: form.employee_id, location_id: locationId,
      leave_type: form.leave_type, date_from: form.date_from, date_to: form.date_to,
      note: form.note || null, status: 'approved',
    })
    setShowAdd(false)
    setForm({ employee_id: '', leave_type: 'vacation', date_from: '', date_to: '', note: '' })
    setFormSaving(false); fetchData()
  }

  async function deleteRequest(id: string) {
    if (!confirm('Usunąć wniosek?')) return
    await supabase.from('leave_requests').delete().eq('id', id); fetchData()
  }

  function dateDiff(from: string, to: string) {
    const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
    return `${d} ${d === 1 ? 'dzień' : 'dni'}`
  }

  function dayCount(from: string, to: string) {
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const pending  = requests.filter(r => r.status === 'pending')

  function exportExcel() {
    const approved = requests.filter(r => r.status === 'approved')
    const month = new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })

    const wb = XLSX.utils.book_new()

    // Sheet 1: approved leaves (for finance/payroll)
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`Zestawienie urlopów — ${locationName} — ${month}`], [],
      ['Pracownik', 'Stanowisko', 'Typ urlopu', 'Od', 'Do', 'Liczba dni', 'Notatka'],
      ...approved.map(r => [
        r.employees?.full_name ?? '—',
        r.employees?.position ?? '—',
        LEAVE_LABELS[r.leave_type]?.label ?? r.leave_type,
        r.date_from,
        r.date_to,
        dayCount(r.date_from, r.date_to),
        r.note ?? '',
      ]),
      [],
      ['RAZEM dni urlopowych', '', '', '', '', approved.reduce((s, r) => s + dayCount(r.date_from, r.date_to), 0), ''],
    ])
    ws1['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Zatwierdzone urlopy')

    // Sheet 2: all requests (full audit trail)
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Pracownik', 'Typ urlopu', 'Od', 'Do', 'Dni', 'Status', 'Zgłoszono', 'Notatka'],
      ...requests.map(r => [
        r.employees?.full_name ?? '—',
        LEAVE_LABELS[r.leave_type]?.label ?? r.leave_type,
        r.date_from,
        r.date_to,
        dayCount(r.date_from, r.date_to),
        r.status === 'approved' ? 'Zatwierdzony' : r.status === 'rejected' ? 'Odrzucony' : 'Oczekuje',
        new Date(r.created_at).toLocaleDateString('pl-PL'),
        r.note ?? '',
      ]),
    ])
    ws2['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 14 }, { wch: 13 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Wszystkie wnioski')

    XLSX.writeFile(wb, `urlopy-${locationName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 7)}.xlsx`)
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Urlopy — {locationName}</h2>
          <p className="text-[13px] text-[#9CA3AF]">Zarządzaj wnioskami urlopowymi pracowników</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors">
            <FileSpreadsheet className="w-4 h-4" />Excel
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#1D4ED8] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />Dodaj urlop
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BellRing className="w-4 h-4 text-amber-600" />
            <p className="text-[13px] font-bold text-amber-800">{pending.length} wniosków oczekuje na decyzję</p>
          </div>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="bg-white rounded-lg border border-amber-200 p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] truncate">{r.employees?.full_name ?? '—'}</p>
                  <p className="text-[11px] text-[#6B7280]">
                    {LEAVE_LABELS[r.leave_type]?.label ?? r.leave_type} · {r.date_from} → {r.date_to} ({dateDiff(r.date_from, r.date_to)})
                  </p>
                  {r.note && <p className="text-[11px] text-[#9CA3AF] italic truncate">{r.note}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => reviewRequest(r.id, 'approved')} disabled={saving === r.id}
                    className="h-7 px-3 rounded-lg bg-green-500 text-white text-[12px] font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                    {saving === r.id ? '...' : '✓ Zatwierdź'}
                  </button>
                  <button onClick={() => reviewRequest(r.id, 'rejected')} disabled={saving === r.id}
                    className="h-7 px-3 rounded-lg bg-red-500 text-white text-[12px] font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
                    ✕ Odrzuć
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex rounded-xl border border-[#E5E7EB] overflow-hidden bg-white mb-4 shadow-sm">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-[12px] font-semibold transition-colors ${filter === f ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}>
            {f === 'pending' ? 'Oczekujące' : f === 'approved' ? 'Zatwierdzone' : f === 'rejected' ? 'Odrzucone' : 'Wszystkie'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF]">
          <Umbrella className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">Brak wniosków</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const lt = LEAVE_LABELS[r.leave_type] ?? { label: r.leave_type, color: 'text-gray-700', bg: 'bg-gray-50' }
            const st = LEAVE_STATUS_CFG[r.status] ?? { label: r.status, color: 'text-gray-700', bg: 'bg-gray-50' }
            return (
              <div key={r.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[14px] text-[#111827]">{r.employees?.full_name ?? '—'}</p>
                      {r.employees?.position && <span className="text-[10px] text-[#9CA3AF]">· {r.employees.position}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${lt.bg} ${lt.color}`}>{lt.label}</span>
                      <span className="text-[12px] text-[#374151] font-mono">{r.date_from} → {r.date_to}</span>
                      <span className="text-[11px] text-[#6B7280]">{dateDiff(r.date_from, r.date_to)}</span>
                    </div>
                    {r.note && <p className="text-[12px] text-[#6B7280] italic mt-1">{r.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => reviewRequest(r.id, 'approved')} disabled={saving === r.id}
                          className="h-7 px-2.5 rounded-lg bg-green-50 text-green-700 text-[12px] font-bold hover:bg-green-100 disabled:opacity-50 border border-green-200">✓</button>
                        <button onClick={() => reviewRequest(r.id, 'rejected')} disabled={saving === r.id}
                          className="h-7 px-2.5 rounded-lg bg-red-50 text-red-700 text-[12px] font-bold hover:bg-red-100 disabled:opacity-50 border border-red-200">✕</button>
                      </div>
                    )}
                    <button onClick={() => deleteRequest(r.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-[16px] text-[#111827] mb-4">Dodaj urlop manualnie</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">Pracownik *</label>
                <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">— wybierz —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">Typ urlopu</label>
                <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1">Od *</label>
                  <input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1">Do *</label>
                  <input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">Notatka</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">Anuluj</button>
              <button onClick={submitAdd} disabled={formSaving || !form.employee_id || !form.date_from || !form.date_to}
                className="flex-[2] py-2.5 rounded-xl bg-[#1D4ED8] text-white font-bold text-[14px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dodaj urlop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* SWAP VIEW                                                           */
/* ================================================================== */
export function SwapView({
  locationId,
  locationName,
  supabase,
}: {
  locationId: string
  locationName: string
  supabase: any
}) {
  const [swaps,   setSwaps]   = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shift_swap_requests')
      .select(`*, requester:requester_employee_id(full_name), target:target_employee_id(full_name), shift:shift_id(date, time_start, time_end)`)
      .eq('location_id', locationId).order('created_at', { ascending: false })
    setSwaps((data ?? []) as SwapRequest[])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function reviewSwap(id: string, status: 'approved' | 'rejected') {
    setSaving(id)
    await supabase.from('shift_swap_requests').update({ status }).eq('id', id)
    setSaving(null); fetchData()
  }

  const pending = swaps.filter(s => s.status === 'pending')
  const rest    = swaps.filter(s => s.status !== 'pending')

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <h2 className="text-[22px] font-bold text-[#111827] mb-1">Zamiany zmian — {locationName}</h2>
      <p className="text-[13px] text-[#9CA3AF] mb-6">Pracownicy mogą wnioskować o zamianę zmian. Tutaj zatwierdzasz lub odrzucasz.</p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF]">
          <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">Brak wniosków o zamianę</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <p className="text-[12px] font-bold text-amber-700 uppercase tracking-wide mb-1">Oczekujące ({pending.length})</p>
          )}
          {[...pending, ...rest].map(s => {
            const statusCfg = s.status === 'approved'
              ? { color: 'text-green-700', bg: 'bg-green-50', label: 'Zatwierdzona' }
              : s.status === 'rejected'
              ? { color: 'text-red-700',   bg: 'bg-red-50',   label: 'Odrzucona'    }
              : { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Oczekuje'     }
            return (
              <div key={s.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[14px] text-[#111827]">{s.requester?.full_name ?? '—'}</span>
                      <GitCompare className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      <span className="font-semibold text-[14px] text-[#111827]">{s.target?.full_name ?? 'dowolny'}</span>
                    </div>
                    {s.shift && (
                      <p className="text-[12px] text-[#374151] font-mono">
                        {s.shift.date} · {s.shift.time_start?.slice(0, 5)} – {s.shift.time_end?.slice(0, 5)}
                      </p>
                    )}
                    {s.note && <p className="text-[12px] text-[#6B7280] italic mt-0.5">{s.note}</p>}
                    <p className="text-[11px] text-[#9CA3AF] mt-1">{new Date(s.created_at).toLocaleDateString('pl-PL')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
                    {s.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => reviewSwap(s.id, 'approved')} disabled={saving === s.id}
                          className="h-7 px-2.5 rounded-lg bg-green-50 text-green-700 text-[12px] font-bold hover:bg-green-100 disabled:opacity-50 border border-green-200">✓</button>
                        <button onClick={() => reviewSwap(s.id, 'rejected')} disabled={saving === s.id}
                          className="h-7 px-2.5 rounded-lg bg-red-50 text-red-700 text-[12px] font-bold hover:bg-red-100 disabled:opacity-50 border border-red-200">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* CERTIFICATIONS VIEW                                                 */
/* ================================================================== */
export function CertsView({
  locationId,
  supabase,
}: {
  locationId: string
  supabase: any
}) {
  const [employees,   setEmployees]   = useState<{ id: string; full_name: string; position: string | null }[]>([])
  const [certs,       setCerts]       = useState<Cert[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null)
  const [modal,       setModal]       = useState<{ cert?: Cert; empId: string } | null>(null)
  const [form,        setForm]        = useState({ name: '', issued_date: '', expiry_date: '', note: '' })
  const [saving,      setSaving]      = useState(false)

  const today = new Date().toLocaleDateString('sv-SE')
  const soon  = new Date(Date.now() + 30 * 86400000).toLocaleDateString('sv-SE')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: emps }, { data: certData }] = await Promise.all([
      supabase.from('employees').select('id, full_name, position').eq('location_id', locationId)
        .in('status', ['active', 'confirmed']).order('full_name'),
      supabase.from('employee_certifications').select('*').in(
        'employee_id',
        (await supabase.from('employees').select('id').eq('location_id', locationId)).data?.map((e: any) => e.id) ?? []
      ).order('expiry_date'),
    ])
    setEmployees(emps ?? [])
    setCerts((certData ?? []) as Cert[])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  function openAdd(empId: string) {
    setForm({ name: '', issued_date: '', expiry_date: '', note: '' }); setModal({ empId })
  }
  function openEdit(cert: Cert) {
    setForm({ name: cert.name, issued_date: cert.issued_date ?? '', expiry_date: cert.expiry_date ?? '', note: cert.note ?? '' })
    setModal({ cert, empId: cert.employee_id })
  }

  async function saveCert() {
    if (!modal || !form.name) return
    setSaving(true)
    const payload = { employee_id: modal.empId, name: form.name, issued_date: form.issued_date || null, expiry_date: form.expiry_date || null, note: form.note || null }
    if (modal.cert) {
      await supabase.from('employee_certifications').update(payload).eq('id', modal.cert.id)
    } else {
      await supabase.from('employee_certifications').insert(payload)
    }
    setModal(null); setSaving(false); fetchData()
  }

  async function deleteCert(id: string) {
    if (!confirm('Usunąć certyfikat?')) return
    await supabase.from('employee_certifications').delete().eq('id', id); fetchData()
  }

  function certStatus(c: Cert) {
    if (!c.expiry_date) return { color: 'text-gray-400', bg: 'bg-gray-50', label: 'Bezterminowy' }
    if (c.expiry_date < today) return { color: 'text-red-700', bg: 'bg-red-50', label: 'Wygasł' }
    if (c.expiry_date <= soon) return { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Wygasa wkrótce' }
    return { color: 'text-green-700', bg: 'bg-green-50', label: 'Ważny' }
  }

  const expiringSoon = certs.filter(c => c.expiry_date && c.expiry_date >= today && c.expiry_date <= soon)
  const expired      = certs.filter(c => c.expiry_date && c.expiry_date < today)
  const displayEmps  = selectedEmp ? employees.filter(e => e.id === selectedEmp) : employees

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Certyfikaty i szkolenia</h2>
          <p className="text-[13px] text-[#9CA3AF]">Śledzenie certyfikatów pracowników i dat ważności</p>
        </div>
      </div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="space-y-2 mb-5">
          {expired.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-[13px] text-red-800 font-medium">{expired.length} certyfikatów wygasło — wymagają odnowienia</p>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-[13px] text-amber-800 font-medium">{expiringSoon.length} certyfikatów wygasa w ciągu 30 dni</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setSelectedEmp(null)}
          className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${!selectedEmp ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
          Wszyscy
        </button>
        {employees.map(e => (
          <button key={e.id} onClick={() => setSelectedEmp(e.id === selectedEmp ? null : e.id)}
            className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${selectedEmp === e.id ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
            {e.full_name.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="space-y-4">
          {displayEmps.map(emp => {
            const empCerts = certs.filter(c => c.employee_id === emp.id)
            return (
              <div key={emp.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                  <div>
                    <p className="font-semibold text-[14px] text-[#111827]">{emp.full_name}</p>
                    {emp.position && <p className="text-[11px] text-[#9CA3AF]">{emp.position}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#9CA3AF]">{empCerts.length} certyfikatów</span>
                    <button onClick={() => openAdd(emp.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {empCerts.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-[#9CA3AF] italic">Brak certyfikatów</div>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {empCerts.map(c => {
                      const st = certStatus(c)
                      return (
                        <div key={c.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#111827]">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {c.issued_date && <span className="text-[11px] text-[#9CA3AF]">Wydany: {c.issued_date}</span>}
                              {c.expiry_date && <span className="text-[11px] text-[#9CA3AF]">Wygasa: {c.expiry_date}</span>}
                              {c.note && <span className="text-[11px] text-[#9CA3AF] italic">{c.note}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                            <button onClick={() => openEdit(c)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-blue-600">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteCert(c.id)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-[16px] text-[#111827] mb-4">{modal.cert ? 'Edytuj certyfikat' : 'Dodaj certyfikat'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">Nazwa *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="np. Badania lekarskie, Sanepid..."
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1">Data wydania</label>
                  <input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1">Data wygaśnięcia</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">Notatka</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">Anuluj</button>
              <button onClick={saveCert} disabled={saving || !form.name}
                className="flex-[2] py-2.5 rounded-xl bg-[#1D4ED8] text-white font-bold text-[14px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* DOCUMENTS VIEW                                                      */
/* ================================================================== */
export function DocumentsView({
  locationId,
  supabase,
}: {
  locationId: string
  supabase: any
}) {
  const [employees,   setEmployees]   = useState<{ id: string; full_name: string }[]>([])
  const [docs,        setDocs]        = useState<EmpDoc[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadEmp,   setUploadEmp]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const BUCKET = 'employee-documents'

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: emps } = await supabase.from('employees').select('id, full_name')
      .eq('location_id', locationId).in('status', ['active', 'confirmed']).order('full_name')
    const empIds = (emps ?? []).map((e: any) => e.id)
    const { data: docData } = empIds.length > 0
      ? await supabase.from('employee_documents').select('*').in('employee_id', empIds).order('created_at', { ascending: false })
      : { data: [] }
    setEmployees(emps ?? [])
    setDocs((docData ?? []) as EmpDoc[])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleUpload(empId: string, file: File) {
    setUploading(true)
    const path = `${locationId}/${empId}/${Date.now()}_${file.name}`
    try {
      await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})
      const { data: uploaded, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (error || !uploaded?.path) { alert('Błąd przesyłania pliku'); setUploading(false); return }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path)
      await supabase.from('employee_documents').insert({
        employee_id: empId, location_id: locationId,
        name: file.name, file_url: urlData.publicUrl,
        file_size: file.size, file_type: file.type,
      })
      fetchData()
    } finally {
      setUploading(false); setUploadEmp(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deleteDoc(doc: EmpDoc) {
    if (!confirm(`Usunąć "${doc.name}"?`)) return
    const urlParts = doc.file_url.split(`/${BUCKET}/`)
    if (urlParts.length > 1) await supabase.storage.from(BUCKET).remove([urlParts[1]])
    await supabase.from('employee_documents').delete().eq('id', doc.id); fetchData()
  }

  function fmtSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const displayEmps = selectedEmp ? employees.filter(e => e.id === selectedEmp) : employees

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <h2 className="text-[22px] font-bold text-[#111827] mb-1">Dokumenty pracowników</h2>
      <p className="text-[13px] text-[#9CA3AF] mb-6">Umowy, certyfikaty, zaświadczenia — pliki przypisane do pracowników</p>

      <input ref={fileRef} type="file" className="hidden" accept="*/*"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && uploadEmp) await handleUpload(uploadEmp, file)
        }} />

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setSelectedEmp(null)}
          className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${!selectedEmp ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
          Wszyscy
        </button>
        {employees.map(e => (
          <button key={e.id} onClick={() => setSelectedEmp(e.id === selectedEmp ? null : e.id)}
            className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${selectedEmp === e.id ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
            {e.full_name.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="space-y-4">
          {displayEmps.map(emp => {
            const empDocs = docs.filter(d => d.employee_id === emp.id)
            return (
              <div key={emp.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                  <div>
                    <p className="font-semibold text-[14px] text-[#111827]">{emp.full_name}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{empDocs.length} dokumentów</p>
                  </div>
                  <button onClick={() => { setUploadEmp(emp.id); setTimeout(() => fileRef.current?.click(), 50) }}
                    disabled={uploading}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-[12px] font-semibold disabled:opacity-50">
                    {uploading && uploadEmp === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Dodaj plik
                  </button>
                </div>
                {empDocs.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-[#9CA3AF] italic">Brak dokumentów</div>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {empDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FolderOpen className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#111827] truncate">{doc.name}</p>
                            <p className="text-[11px] text-[#9CA3AF]">
                              {fmtSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a href={doc.file_url} target="_blank" rel="noreferrer"
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-blue-50 text-[#9CA3AF] hover:text-blue-600 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <a href={doc.file_url} download={doc.name}
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-green-50 text-[#9CA3AF] hover:text-green-600 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => deleteDoc(doc)}
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
