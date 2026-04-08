'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '../supabase-client'
import { useRouter } from 'next/navigation'
import { OpsSidebar } from '@/components/OpsSidebar'
import { ScheduleGrid } from '@/components/schedule-grid'
import { TipsView } from '@/components/tips-view'
import { OnboardingView } from '@/components/onboarding-view'
import { EmployeesManager } from '@/components/employees-manager'
import { WeeklySalesImport } from '@/components/weekly-sales-import'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import IngredientAutocomplete from '@/components/ingredient-autocomplete'
import ProductAutocomplete from '@/components/product-autocomplete'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle, FileSpreadsheet, Save, CheckCircle, Plus,
  Trash2, AlertTriangle, ShieldAlert, Package, Receipt, FileText,
  ClipboardList, Search, ArrowLeft, Send, Clock, ChevronRight,
  Loader2, Calendar, RefreshCw, User, CreditCard, LogOut,
  ExternalLink, ShieldCheck, XCircle, Umbrella, LayoutGrid,
  GitCompare, GraduationCap, FolderOpen, Upload, Building2,
  ChevronDown, Award, BellRing, Download, Eye,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import QRCode from 'react-qr-code'
import { HelpDrawer } from '@/components/help-drawer'

/* ================================================================== */
/* TYPES                                                               */
/* ================================================================== */
type LocationData = {
  location_id: string
  locations: { name: string; id: string; company_id: string }
}
type Employee = { id: string; full_name: string; real_hour_cost: number | null; base_rate?: number | null; user_id?: string | null; phone?: string | null; position?: string | null; email?: string | null; status?: string }
type EmployeeRow = { employee_id: string; hours: string; rate: string }
type ValidationError = { field: string; message: string }
type InvoiceLineItem = {
  product: string; cosCategory: string; quantity: string
  unit: string; netPrice: string; vatRate: string
  ingredient_id?: string | null
  product_id?: string | null
  source?: 'ingredient' | 'product'
}
type SemisLineItem = {
  description: string; category: string; totalNet: string; vatRate: string
}
type InventoryJob = {
  id: string; location_id: string; type: 'MONTHLY' | 'WEEKLY'
  status: 'draft' | 'submitted' | 'approved' | 'correction'
  due_date: string; created_at: string; created_by: string
  note?: string; submitted_at?: string; submitted_by?: string
  item_count?: number
}
type InventoryJobItem = {
  id: string; job_id: string; product_id: string
  product_name: string; unit: string; category: string
  expected_qty: number | null; counted_qty: string
  note: string; last_price: number | null
}
type SemisReconciliationEntry = {
  id?: string
  location_id: string
  invoice_number: string
  supplier: string
  invoice_date: string
  accounting_account: string
  amount: string
  description: string
  status: 'pending' | 'submitted'
}

type DailyReportHistoryItem = {
  id: string
  date: string
  gross_revenue: number | null
  net_revenue: number | null
  transaction_count: number | null
  total_labor_hours: number | null
  status: string | null
  closing_person: string | null
}

type InvoiceHistoryItem = {
  id: string
  invoice_type: 'COS' | 'SEMIS'
  supplier_name: string
  invoice_number: string
  service_date: string
  total_gross: number
  status: string
  created_at: string
}

type InventoryProduct = {
  id: string; name: string; unit: string; category: string
  is_food: boolean; active: boolean; last_price: number
}
type ExcelProductRow = {
  name: string; unit: string; category: string; last_price: string; is_food: boolean
}

type ActiveView = 'reporting' | 'invoices' | 'inventory' | 'scheduling' | 'employees' | 'account' | 'my_schedule' | 'kiosk' | 'attendance' | 'leave' | 'dashboard' | 'swaps' | 'certs' | 'documents' | 'tips' | 'onboarding'
type ShiftCell = {
  id?: string
  user_id: string
  date: string
  position: string
  time_start: string
  time_end: string
}

/* ================================================================== */
/* CONSTANTS                                                           */
/* ================================================================== */
const VAT_RATE = 0.08

const COS_CATEGORIES = [
  { value: 'mieso_drob', label: 'Mięso / Drób' },
  { value: 'ryby_owoce_morza', label: 'Ryby / Owoce morza' },
  { value: 'nabial', label: 'Nabiał' },
  { value: 'warzywa_owoce', label: 'Warzywa / Owoce' },
  { value: 'pieczywo', label: 'Pieczywo' },
  { value: 'napoje', label: 'Napoje' },
  { value: 'suche_przyprawy', label: 'Suche / Przyprawy' },
  { value: 'opakowania', label: 'Opakowania' },
  { value: 'inne_cos', label: 'Inne (COS)' },
]

const SEMIS_CATEGORIES = [
  { value: 'czynsz', label: 'Czynsz' },
  { value: 'media', label: 'Media (prąd, woda, gaz)' },
  { value: 'marketing', label: 'Marketing / Reklama' },
  { value: 'serwis_naprawy', label: 'Serwis / Naprawy' },
  { value: 'ubezpieczenia', label: 'Ubezpieczenia' },
  { value: 'it_software', label: 'IT / Software' },
  { value: 'transport', label: 'Transport / Logistyka' },
  { value: 'czystosc_higiena', label: 'Czystość / Higiena' },
  { value: 'administracja', label: 'Administracja' },
  { value: 'inne_semis', label: 'Inne (SEMIS)' },
]

const ACCOUNTING_ACCOUNTS = [
  { value: '401-01', label: '401-01 - Czynsz' },
  { value: '402-01', label: '402-01 - Media' },
  { value: '403-01', label: '403-01 - Marketing' },
  { value: '404-01', label: '404-01 - Serwis' },
  { value: '405-01', label: '405-01 - Ubezpieczenia' },
  { value: '406-01', label: '406-01 - IT/Software' },
  { value: '407-01', label: '407-01 - Transport' },
  { value: '408-01', label: '408-01 - Czystość' },
  { value: '409-01', label: '409-01 - Administracja' },
  { value: '410-01', label: '410-01 - Inne' },
]

const UNITS = [
  { value: 'kg', label: 'kg' }, { value: 'szt', label: 'szt.' },
  { value: 'l', label: 'l' }, { value: 'opak', label: 'opak.' },
  { value: 'but', label: 'but.' }, { value: 'kart', label: 'kart.' },
]

const VAT_RATES = [
  { value: '0', label: '0%' }, { value: '0.05', label: '5%' },
  { value: '0.08', label: '8%' }, { value: '0.23', label: '23%' },
]

const PRODUCT_CATEGORIES = [
  'kawa', 'herbata', 'napoje', 'nabial', 'pieczywo', 'mieso',
  'warzywa', 'owoce', 'suche', 'opakowania', 'dodatki', 'inne'
]

const emptyLineItem: InvoiceLineItem = {
  product: '', cosCategory: '', quantity: '', unit: 'kg', netPrice: '', vatRate: '0.08',
  ingredient_id: null, product_id: null, source: 'ingredient'
}
const emptySemisLine: SemisLineItem = { description: '', category: '', totalNet: '', vatRate: '0.23' }

const emptySemisReconEntry: SemisReconciliationEntry = {
  location_id: '',
  invoice_number: '',
  supplier: '',
  invoice_date: '',
  accounting_account: '',
  amount: '',
  description: '',
  status: 'pending'
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Robocza', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Wysłana', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Zatwierdzona', color: 'bg-green-100 text-green-700' },
  correction: { label: 'Do korekty', color: 'bg-red-100 text-red-700' },
}

const getWeekStartMonday = (isoDate: string) => {
  const d = new Date(isoDate)
  const day = d.getDay() || 7 // Sunday as 7
  d.setDate(d.getDate() - (day - 1))
  return d.toISOString().split('T')[0]
}

const buildWeekDays = (weekStart: string): { iso: string; label: string }[] => {
  if (!weekStart) return []
  const start = new Date(weekStart)
  const days: { iso: string; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' })
    days.push({ iso, label })
  }
  return days
}

/* ================================================================== */
/* ACCOUNT VIEW COMPONENT                                              */
/* ================================================================== */
const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  start:    { label: 'Start',   color: '#6B7280', bg: '#F3F4F6' },
  rozwoj:   { label: 'Rozwój',  color: '#2563EB', bg: '#EFF6FF' },
  siec:     { label: 'Sieć',    color: '#7C3AED', bg: '#F5F3FF' },
  trial:    { label: 'Trial',   color: '#D97706', bg: '#FFFBEB' },
}

type AccountViewProps = {
  supabase: ReturnType<typeof createClient>
  router: ReturnType<typeof useRouter>
  accountProfile: { email: string; full_name: string; plan_code: string | null; stripe_customer_id: string | null } | null
  setAccountProfile: (p: AccountViewProps['accountProfile']) => void
  accountLoading: boolean
  setAccountLoading: (v: boolean) => void
  portalLoading: boolean
  setPortalLoading: (v: boolean) => void
  deleteConfirm: string
  setDeleteConfirm: (v: string) => void
  deleteLoading: boolean
  setDeleteLoading: (v: boolean) => void
  deleteError: string
  setDeleteError: (v: string) => void
  accountError: string
  setAccountError: (v: string) => void
}

/* ================================================================== */
/* ATTENDANCE VIEW                                                     */
/* ================================================================== */
type ClockEntry = {
  id: string; user_id: string | null; employee_id: string | null
  work_date: string; clock_in_at: string | null; clock_out_at: string | null
  clock_in_photo_url: string | null; clock_out_photo_url: string | null
}
type AttEmp = { id: string; full_name: string; position: string | null; user_id: string | null; base_rate: number | null }
type AttSummary = AttEmp & { records: ClockEntry[]; days: number; totalMinutes: number }

function AttendanceView({ locationId, locationName, supabase }: { locationId: string; locationName: string; supabase: any }) {
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [records,   setRecords]   = useState<ClockEntry[]>([])
  const [employees, setEmployees] = useState<AttEmp[]>([])
  const [loading,   setLoading]   = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [photoModal, setPhotoModal] = useState<string | null>(null)

  /* ── Manual entry / edit modal ── */
  type ModalMode = 'add' | 'edit'
  type ModalState = { mode: ModalMode; record?: ClockEntry; empId?: string } | null
  const [modal,       setModal]       = useState<ModalState>(null)
  const [mForm,       setMForm]       = useState({ employee_id: '', date: '', clock_in: '', clock_out: '' })
  const [mSaving,     setMSaving]     = useState(false)
  const [mError,      setMError]      = useState<string | null>(null)

  function openAdd(empId?: string) {
    const today = new Date().toLocaleDateString('sv-SE')
    setMForm({ employee_id: empId ?? '', date: today, clock_in: '', clock_out: '' })
    setMError(null)
    setModal({ mode: 'add', empId })
  }
  function openEdit(record: ClockEntry, empId: string) {
    const inT  = record.clock_in_at  ? new Date(record.clock_in_at ).toLocaleTimeString('pl-PL',  { hour: '2-digit', minute: '2-digit' }) : ''
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

  async function saveEntry() {
    setMSaving(true); setMError(null)
    const { employee_id, date, clock_in, clock_out } = mForm
    if (!date || !clock_in) { setMError('Data i godzina przyjścia są wymagane'); setMSaving(false); return }
    const emp = employees.find(e => e.id === employee_id)
    const payload = {
      employee_id,
      user_id: emp?.user_id ?? null,
      location_id: locationId,
      work_date: date,
      clock_in_at: buildISO(date, clock_in),
      clock_out_at: buildISO(date, clock_out),
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [y, m]   = month.split('-').map(Number)
    const lastDay  = new Date(y, m, 0).getDate()
    const start    = `${month}-01`
    const end      = `${month}-${String(lastDay).padStart(2, '0')}`

    const [{ data: empData }, { data: clockData }] = await Promise.all([
      supabase.from('employees')
        .select('id, full_name, position, user_id, base_rate')
        .eq('location_id', locationId)
        .in('status', ['active', 'confirmed']),
      supabase.from('shift_clock_ins')
        .select('id, user_id, employee_id, work_date, clock_in_at, clock_out_at, clock_in_photo_url, clock_out_photo_url')
        .eq('location_id', locationId)
        .gte('work_date', start).lte('work_date', end)
        .order('work_date'),
    ])
    setEmployees((empData ?? []) as AttEmp[])
    setRecords((clockData ?? []) as ClockEntry[])
    setLoading(false)
  }, [locationId, month, supabase])

  useEffect(() => { fetchData() }, [fetchData])

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

  /* ── Excel export ── */
  function exportExcel() {
    const wb = XLSX.utils.book_new()
    // Sheet 1: summary
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`Ewidencja czasu pracy — ${locationName} — ${monthLabel()}`], [],
      ['Pracownik', 'Pozycja', 'Stawka godz.', 'Dni pracy', 'Godziny', 'Minuty ogółem', 'Śr./dzień', 'Szac. koszt'],
      ...summary.map(e => [
        e.full_name, e.position ?? '—', e.base_rate ? `${e.base_rate} zł` : '—',
        e.days, fmtHM(e.totalMinutes), e.totalMinutes,
        e.days > 0 ? fmtHM(Math.round(e.totalMinutes / e.days)) : '—',
        e.base_rate ? `${((e.base_rate * e.totalMinutes) / 60).toFixed(2)} zł` : '—',
      ]),
      [],
      ['RAZEM', '', '', totalDaysAll, fmtHM(totalMinAll), totalMinAll, '', ''],
    ])
    ws1['!cols'] = [{ wch: 26 }, { wch: 15 }, { wch: 13 }, { wch: 10 }, { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Podsumowanie')

    // Sheet 2: details
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

  /* ── PDF (print in new window) ── */
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
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:28px}
        h1{font-size:17px;font-weight:700;margin-bottom:3px}
        .meta{color:#666;font-size:11px;margin-bottom:20px}
        h2{font-size:12px;font-weight:700;margin:22px 0 6px;color:#1D4ED8;text-transform:uppercase;letter-spacing:.06em}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#1D4ED8;color:#fff}
        th{padding:7px 10px;font-size:10px;font-weight:600;text-align:left}
        td{padding:6px 10px;border-bottom:1px solid #E5E7EB}
        tr:nth-child(even) td{background:#F9FAFB}
        .foot td{font-weight:700;border-top:2px solid #1D4ED8;background:#EFF6FF}
        .c{text-align:center}.r{text-align:right}
        @media print{@page{margin:16mm}}
      </style></head><body>
      <h1>Ewidencja czasu pracy</h1>
      <p class="meta">${locationName} &bull; ${monthLabel()} &bull; Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}</p>
      <h2>Podsumowanie</h2>
      <table>
        <thead><tr><th>Pracownik</th><th>Pozycja</th><th class="c">Dni</th><th class="r">Godziny</th><th class="r">Śr./dzień</th><th class="r">Szac. koszt</th></tr></thead>
        <tbody>${sumRows}
          <tr class="foot"><td colspan="2">RAZEM (${activeWorkers} pracowników)</td>
          <td class="c">${totalDaysAll}</td><td class="r">${fmtHM(totalMinAll)}</td><td></td><td></td></tr>
        </tbody>
      </table>
      <h2>Szczegóły odbitek</h2>
      <table>
        <thead><tr><th>Pracownik</th><th>Data</th><th class="c">Przyjście</th><th class="c">Wyjście</th><th class="r">Czas pracy</th></tr></thead>
        <tbody>${detailRows}</tbody>
      </table>
      <script>window.onload=()=>window.print()</script>
    </body></html>`

    const win = window.open('', '_blank')
    win?.document.write(html); win?.document.close()
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Ewidencja czasu pracy</h2>
          <p className="text-[13px] text-[#9CA3AF]">{locationName} — {monthLabel()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month" value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
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

      {/* Stat cards */}
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

      {/* ── Late/absent today ── */}
      {(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE')
        const isCurrentMonth = month === todayStr.slice(0, 7)
        if (!isCurrentMonth) return null
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

      {/* Table */}
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
                  <tr
                    key={emp.id}
                    onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                    className={`border-b border-[#F3F4F6] cursor-pointer hover:bg-[#F9FAFB] transition-colors ${emp.days === 0 ? 'opacity-50' : ''}`}
                  >
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
                          <button
                            onClick={e => { e.stopPropagation(); openAdd(emp.id) }}
                            className="flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-800"
                          >
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
                                  {/* Clock-in + photo */}
                                  <span className="text-green-600 font-mono flex items-center gap-1">
                                    {fmtTime(r.clock_in_at)}
                                    {r.clock_in_photo_url && (
                                      <button onClick={e => { e.stopPropagation(); setPhotoModal(r.clock_in_photo_url) }}>
                                        <img src={r.clock_in_photo_url} alt="wejście" className="w-7 h-7 rounded-md object-cover border border-green-200 hover:scale-110 transition-transform" />
                                      </button>
                                    )}
                                  </span>
                                  {/* Clock-out + photo */}
                                  <span className="text-orange-600 font-mono flex items-center gap-1">
                                    {r.clock_out_at ? fmtTime(r.clock_out_at) : <em className="text-slate-400">W trakcie</em>}
                                    {r.clock_out_photo_url && (
                                      <button onClick={e => { e.stopPropagation(); setPhotoModal(r.clock_out_photo_url) }}>
                                        <img src={r.clock_out_photo_url} alt="wyjście" className="w-7 h-7 rounded-md object-cover border border-orange-200 hover:scale-110 transition-transform" />
                                      </button>
                                    )}
                                  </span>
                                  <span className="font-semibold text-[#374151]">{min > 0 ? fmtHM(min) : '—'}</span>
                                  {/* Photos count badge */}
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
                                  <button
                                    onClick={e => { e.stopPropagation(); openEdit(r, emp.id) }}
                                    className="flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 text-[11px] font-medium"
                                  >
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
        * Szacunkowy koszt = stawka godzinowa × godziny przepracowane. Kliknij wiersz pracownika, aby zobaczyć szczegóły odbitek.
      </p>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-[18px] font-bold text-[#111827] mb-4">
              {modal.mode === 'add' ? 'Dodaj odbicie' : 'Edytuj odbicie'}
            </h3>

            {/* Employee (add mode only) */}
            {modal.mode === 'add' && (
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Pracownik *</label>
                <select
                  value={mForm.employee_id}
                  onChange={e => mSet('employee_id', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
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

            {/* Date */}
            <div className="mb-4">
              <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Data *</label>
              <input
                type="date" value={mForm.date}
                onChange={e => mSet('date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Przyjście *</label>
                <input
                  type="time" value={mForm.clock_in}
                  onChange={e => mSet('clock_in', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Wyjście</label>
                <input
                  type="time" value={mForm.clock_out}
                  onChange={e => mSet('clock_out', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Error */}
            {mError && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">{mError}</div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {modal.mode === 'edit' && (
                <button
                  onClick={deleteEntry} disabled={mSaving}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold transition-colors disabled:opacity-40"
                >
                  Usuń
                </button>
              )}
              <button
                onClick={() => setModal(null)} disabled={mSaving}
                className="flex-1 py-2 rounded-lg border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={saveEntry} disabled={mSaving}
                className="flex-[2] py-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white font-bold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {mSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo lightbox ── */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={photoModal} alt="Zdjęcie odbicia" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* KIOSK VIEW                                                          */
/* ================================================================== */
function KioskView({ locationId, locationName }: { locationId: string; locationName: string }) {
  const [qrData,    setQrData]    = useState<{ clockUrl: string; expiresIn: number } | null>(null)
  const [countdown, setCountdown] = useState(270)
  const [loading,   setLoading]   = useState(false)
  const [now,       setNow]       = useState(new Date())

  const fetchToken = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/clock/token?locationId=${locationId}`)
      const json = await res.json()
      if (res.ok) { setQrData(json); setCountdown(Math.min(json.expiresIn - 10, 270)) }
    } finally { setLoading(false) }
  }, [locationId])

  useEffect(() => { fetchToken() }, [fetchToken])

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { fetchToken(); return 270 } return prev - 1 })
    }, 1000)
    return () => clearInterval(t)
  }, [fetchToken])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmtCd = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="max-w-lg mx-auto py-8">
      <h2 className="text-[22px] font-bold text-[#111827] mb-1">Kiosk QR — {locationName}</h2>
      <p className="text-[13px] text-[#9CA3AF] mb-6">
        Wyświetl ten kod na tablecie przy wejściu. Pracownicy skanują go telefonem, aby się odbić.
      </p>

      {/* QR card */}
      <div className="bg-[#0F172A] rounded-2xl p-8 text-center mb-4 shadow-lg">
        <p className="text-slate-400 text-[11px] uppercase tracking-widest mb-4">Zeskanuj, aby się odbić</p>
        <div className="bg-white rounded-2xl p-5 inline-block mb-4 shadow-inner">
          {loading || !qrData ? (
            <div className="w-48 h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <QRCode value={qrData.clockUrl} size={192} level="M" />
          )}
        </div>
        <p className="text-white font-bold text-[18px] mb-0.5">{locationName}</p>
        <p className="text-slate-400 text-[14px] font-mono">
          {now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] px-4 py-3">
        <span className="text-[13px] text-[#6B7280]">Odświeży za <strong className="text-[#111827]">{fmtCd(countdown)}</strong></span>
        <button
          onClick={fetchToken}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Odśwież teraz
        </button>
      </div>

      <p className="mt-4 text-[12px] text-[#9CA3AF] text-center">
        Kod automatycznie rotuje co 5 minut dla bezpieczeństwa.
        Pracownicy nie mogą się odbić poza lokalem.
      </p>

      {/* Links */}
      <div className="mt-4 space-y-3">
        {qrData && (
          <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-[11px] text-[#9CA3AF] mb-1">🔲 Kiosk QR — pracownicy skanują własnym telefonem</p>
            <a href={`/kiosk?location=${locationId}`} target="_blank" rel="noopener noreferrer"
              className="text-[13px] text-blue-600 hover:underline break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/kiosk?location=${locationId}` : `/kiosk?location=${locationId}`}
            </a>
          </div>
        )}
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-[11px] text-purple-600 font-semibold mb-1">🔢 Kiosk PIN — pracownicy wpisują PIN na urządzeniu firmowym</p>
          <p className="text-[11px] text-[#9CA3AF] mb-1.5">Otwórz na firmowym tablecie/telefonie. Zaloguj się raz — pracownicy odbijają się PINem.</p>
          <a href={`/kiosk-pin?location=${locationId}`} target="_blank" rel="noopener noreferrer"
            className="text-[13px] text-purple-700 hover:underline break-all font-medium">
            {typeof window !== 'undefined' ? `${window.location.origin}/kiosk-pin?location=${locationId}` : `/kiosk-pin?location=${locationId}`}
          </a>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* DASHBOARD VIEW (multi-location overview)                            */
/* ================================================================== */
function DashboardView({ locations, supabase }: { locations: LocationData[]; supabase: any }) {
  type LocStat = {
    locationId: string; name: string
    clockedIn: number; shiftsToday: number; pendingLeaves: number; totalEmployees: number
  }
  const [stats,   setStats]   = useState<LocStat[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('sv-SE')

  useEffect(() => {
    if (!locations.length) return
    ;(async () => {
      setLoading(true)
      const results = await Promise.all(locations.map(async loc => {
        const locId = loc.location_id
        const [{ count: clockedIn }, { count: shiftsToday }, { count: pendingLeaves }, { count: totalEmployees }] = await Promise.all([
          supabase.from('shift_clock_ins').select('id', { count: 'exact', head: true })
            .eq('location_id', locId).eq('work_date', today).not('clock_in_at', 'is', null),
          supabase.from('shifts').select('id', { count: 'exact', head: true })
            .eq('location_id', locId).eq('date', today).eq('is_posted', true),
          supabase.from('leave_requests').select('id', { count: 'exact', head: true })
            .eq('location_id', locId).eq('status', 'pending'),
          supabase.from('employees').select('id', { count: 'exact', head: true })
            .eq('location_id', locId).in('status', ['active', 'confirmed']),
        ])
        return {
          locationId: locId, name: loc.locations.name,
          clockedIn: clockedIn ?? 0, shiftsToday: shiftsToday ?? 0,
          pendingLeaves: pendingLeaves ?? 0, totalEmployees: totalEmployees ?? 0,
        }
      }))
      setStats(results)
      setLoading(false)
    })()
  }, [locations.length])

  if (loading) return (
    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
  )

  const totals = stats.reduce((a, s) => ({
    clockedIn: a.clockedIn + s.clockedIn,
    shiftsToday: a.shiftsToday + s.shiftsToday,
    pendingLeaves: a.pendingLeaves + s.pendingLeaves,
    totalEmployees: a.totalEmployees + s.totalEmployees,
  }), { clockedIn: 0, shiftsToday: 0, pendingLeaves: 0, totalEmployees: 0 })

  return (
    <div className="max-w-4xl mx-auto py-6 px-2">
      <h2 className="text-[22px] font-bold text-[#111827] mb-1">Dashboard</h2>
      <p className="text-[13px] text-[#9CA3AF] mb-6">Przegląd wszystkich lokalizacji — {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {/* Global totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Zalogowanych dziś',  val: totals.clockedIn,      icon: Clock,     color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Zmian zaplanowanych',val: totals.shiftsToday,    icon: Calendar,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Wniosków urlopowych',val: totals.pendingLeaves,  icon: Umbrella,  color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Pracowników łącznie',val: totals.totalEmployees, icon: User,      color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{val}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-location cards */}
      <div className="space-y-3">
        {stats.map(s => (
          <div key={s.locationId} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[#6B7280]" />
              <h3 className="font-bold text-[#111827] text-[15px]">{s.name}</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Zalogowanych', val: s.clockedIn,      color: 'text-green-600'  },
                { label: 'Zmian dziś',   val: s.shiftsToday,    color: 'text-blue-600'   },
                { label: 'Urlopy',       val: s.pendingLeaves,  color: s.pendingLeaves > 0 ? 'text-amber-600' : 'text-gray-400' },
                { label: 'Pracownicy',   val: s.totalEmployees, color: 'text-gray-700'   },
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
/* LEAVE VIEW                                                          */
/* ================================================================== */
type LeaveRequest = {
  id: string; employee_id: string | null; user_id: string | null
  leave_type: string; date_from: string; date_to: string
  note: string | null; status: string; created_at: string
  employees?: { full_name: string; position: string | null } | null
}

function LeaveView({ locationId, locationName, supabase }: { locationId: string; locationName: string; supabase: any }) {
  const [requests,  setRequests]  = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [saving,    setSaving]    = useState<string | null>(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [form,      setForm]      = useState({ employee_id: '', leave_type: 'vacation', date_from: '', date_to: '', note: '' })
  const [formSaving,setFormSaving]= useState(false)

  const LEAVE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    vacation: { label: 'Urlop wypoczynkowy', color: 'text-blue-700',   bg: 'bg-blue-50'   },
    sick:     { label: 'Zwolnienie L4',      color: 'text-red-700',    bg: 'bg-red-50'    },
    unpaid:   { label: 'Urlop bezpłatny',    color: 'text-gray-700',   bg: 'bg-gray-50'   },
    other:    { label: 'Inny',               color: 'text-purple-700', bg: 'bg-purple-50' },
  }
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Oczekuje',    color: 'text-amber-700',  bg: 'bg-amber-50'  },
    approved: { label: 'Zatwierdzony', color: 'text-green-700', bg: 'bg-green-50'  },
    rejected: { label: 'Odrzucony',   color: 'text-red-700',   bg: 'bg-red-50'    },
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: reqs }, { data: emps }] = await Promise.all([
      supabase.from('leave_requests')
        .select('*, employees(full_name, position)')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false }),
      supabase.from('employees')
        .select('id, full_name')
        .eq('location_id', locationId)
        .in('status', ['active', 'confirmed'])
        .order('full_name'),
    ])
    setRequests((reqs ?? []) as LeaveRequest[])
    setEmployees(emps ?? [])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function reviewRequest(id: string, status: 'approved' | 'rejected') {
    setSaving(id)
    await supabase.from('leave_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    setSaving(null)
    fetchData()
  }

  async function submitAdd() {
    if (!form.employee_id || !form.date_from || !form.date_to) return
    setFormSaving(true)
    const emp = employees.find(e => e.id === form.employee_id)
    await supabase.from('leave_requests').insert({
      employee_id: form.employee_id,
      location_id: locationId,
      leave_type: form.leave_type,
      date_from: form.date_from,
      date_to: form.date_to,
      note: form.note || null,
      status: 'approved',
    })
    setShowAdd(false)
    setForm({ employee_id: '', leave_type: 'vacation', date_from: '', date_to: '', note: '' })
    setFormSaving(false)
    fetchData()
  }

  async function deleteRequest(id: string) {
    if (!confirm('Usunąć wniosek?')) return
    await supabase.from('leave_requests').delete().eq('id', id)
    fetchData()
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const pending  = requests.filter(r => r.status === 'pending')

  function dateDiff(from: string, to: string) {
    const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
    return `${d} ${d === 1 ? 'dzień' : 'dni'}`
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Urlopy — {locationName}</h2>
          <p className="text-[13px] text-[#9CA3AF]">Zarządzaj wnioskami urlopowymi pracowników</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#1D4ED8] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />Dodaj urlop
        </button>
      </div>

      {/* Pending alerts */}
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

      {/* Filter tabs */}
      <div className="flex rounded-xl border border-[#E5E7EB] overflow-hidden bg-white mb-4 shadow-sm">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-[12px] font-semibold transition-colors ${filter === f ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}>
            {f === 'pending' ? 'Oczekujące' : f === 'approved' ? 'Zatwierdzone' : f === 'rejected' ? 'Odrzucone' : 'Wszystkie'}
          </button>
        ))}
      </div>

      {/* List */}
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
            const st = STATUS_CFG[r.status] ?? { label: r.status, color: 'text-gray-700', bg: 'bg-gray-50' }
            return (
              <div key={r.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[14px] text-[#111827]">{r.employees?.full_name ?? '—'}</p>
                      {r.employees?.position && (
                        <span className="text-[10px] text-[#9CA3AF]">· {r.employees.position}</span>
                      )}
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

      {/* Add leave modal */}
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
/* SWAP REQUESTS VIEW                                                  */
/* ================================================================== */
type SwapRequest = {
  id: string; shift_id: string; note: string | null; status: string; created_at: string
  requester_employee_id: string | null; target_employee_id: string | null
  requester?: { full_name: string } | null
  target?: { full_name: string } | null
  shift?: { date: string; time_start: string; time_end: string } | null
}

function SwapView({ locationId, locationName, supabase }: { locationId: string; locationName: string; supabase: any }) {
  const [swaps,   setSwaps]   = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        requester:requester_employee_id(full_name),
        target:target_employee_id(full_name),
        shift:shift_id(date, time_start, time_end)
      `)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
    setSwaps((data ?? []) as SwapRequest[])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function reviewSwap(id: string, status: 'approved' | 'rejected') {
    setSaving(id)
    await supabase.from('shift_swap_requests').update({ status }).eq('id', id)
    setSaving(null)
    fetchData()
  }

  const pending  = swaps.filter(s => s.status === 'pending')
  const rest     = swaps.filter(s => s.status !== 'pending')

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
              ? { color: 'text-red-700', bg: 'bg-red-50', label: 'Odrzucona' }
              : { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Oczekuje' }
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
                        {s.shift.date} · {s.shift.time_start?.slice(0,5)} – {s.shift.time_end?.slice(0,5)}
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
type Cert = {
  id: string; employee_id: string; name: string
  issued_date: string | null; expiry_date: string | null; note: string | null
}

function CertsView({ locationId, supabase }: { locationId: string; supabase: any }) {
  const [employees,  setEmployees]  = useState<{ id: string; full_name: string; position: string | null }[]>([])
  const [certs,      setCerts]      = useState<Cert[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selectedEmp,setSelectedEmp]= useState<string | null>(null)
  const [modal,      setModal]      = useState<{ cert?: Cert; empId: string } | null>(null)
  const [form,       setForm]       = useState({ name: '', issued_date: '', expiry_date: '', note: '' })
  const [saving,     setSaving]     = useState(false)

  const today = new Date().toLocaleDateString('sv-SE')
  const soon  = new Date(Date.now() + 30 * 86400000).toLocaleDateString('sv-SE')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: emps }, { data: certData }] = await Promise.all([
      supabase.from('employees').select('id, full_name, position').eq('location_id', locationId).in('status', ['active', 'confirmed']).order('full_name'),
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
    setForm({ name: '', issued_date: '', expiry_date: '', note: '' })
    setModal({ empId })
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
    await supabase.from('employee_certifications').delete().eq('id', id)
    fetchData()
  }

  const expiringSoon = certs.filter(c => c.expiry_date && c.expiry_date >= today && c.expiry_date <= soon)
  const expired      = certs.filter(c => c.expiry_date && c.expiry_date < today)

  function certStatus(c: Cert) {
    if (!c.expiry_date) return { color: 'text-gray-400', bg: 'bg-gray-50', label: 'Bezterminowy' }
    if (c.expiry_date < today) return { color: 'text-red-700', bg: 'bg-red-50', label: 'Wygasł' }
    if (c.expiry_date <= soon) return { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Wygasa wkrótce' }
    return { color: 'text-green-700', bg: 'bg-green-50', label: 'Ważny' }
  }

  const displayEmps = selectedEmp ? employees.filter(e => e.id === selectedEmp) : employees

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Certyfikaty i szkolenia</h2>
          <p className="text-[13px] text-[#9CA3AF]">Śledzenie certyfikatów pracowników i dat ważności</p>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Employee filter */}
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

      {/* Cert modal */}
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
type EmpDoc = { id: string; employee_id: string; name: string; file_url: string; file_size: number | null; file_type: string | null; created_at: string }

function DocumentsView({ locationId, supabase }: { locationId: string; supabase: any }) {
  const [employees,  setEmployees]  = useState<{ id: string; full_name: string }[]>([])
  const [docs,       setDocs]       = useState<EmpDoc[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selectedEmp,setSelectedEmp]= useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [uploadEmp,  setUploadEmp]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const BUCKET = 'employee-documents'

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: emps } = await supabase.from('employees').select('id, full_name').eq('location_id', locationId).in('status', ['active', 'confirmed']).order('full_name')
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
    await supabase.from('employee_documents').delete().eq('id', doc.id)
    fetchData()
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

      {/* Hidden file input */}
      <input ref={fileRef} type="file" className="hidden" accept="*/*"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && uploadEmp) await handleUpload(uploadEmp, file)
        }}
      />

      {/* Employee filter */}
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
                  <button
                    onClick={() => { setUploadEmp(emp.id); setTimeout(() => fileRef.current?.click(), 50) }}
                    disabled={uploading}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-[12px] font-semibold disabled:opacity-50"
                  >
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

function AccountView({
  supabase, router,
  accountProfile, setAccountProfile,
  accountLoading, setAccountLoading,
  portalLoading, setPortalLoading,
  deleteConfirm, setDeleteConfirm,
  deleteLoading, setDeleteLoading,
  deleteError, setDeleteError,
  accountError, setAccountError,
}: AccountViewProps) {
  const [showDeleteSection, setShowDeleteSection] = useState(false)

  // ── 2FA / MFA state ──
  const [mfaFactors, setMfaFactors] = useState<{ id: string; factor_type: string; friendly_name?: string }[]>([])
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify'>('idle')
  const [mfaQr, setMfaQr] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaFactors(data?.totp ?? [])
    })
  }, [])

  async function startMfaEnroll() {
    setMfaLoading(true); setMfaError(''); setMfaSuccess('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'OneLink 2FA' })
    if (error || !data) { setMfaError(error?.message ?? 'Błąd'); setMfaLoading(false); return }
    setMfaQr(data.totp.qr_code)
    setMfaSecret(data.totp.secret)
    setMfaFactorId(data.id)
    setMfaStep('setup')
    setMfaLoading(false)
  }

  async function verifyMfa() {
    if (mfaCode.length !== 6) { setMfaError('Wpisz 6-cyfrowy kod'); return }
    setMfaLoading(true); setMfaError('')
    const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (ce || !ch) { setMfaError(ce?.message ?? 'Błąd'); setMfaLoading(false); return }
    const { error: ve } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch.id, code: mfaCode })
    if (ve) { setMfaError(ve.message); setMfaLoading(false); return }
    setMfaFactors(prev => [...prev, { id: mfaFactorId, factor_type: 'totp', friendly_name: 'OneLink 2FA' }])
    setMfaStep('idle'); setMfaCode(''); setMfaSuccess('Weryfikacja dwuetapowa włączona!')
    setMfaLoading(false)
  }

  async function disableMfa(factorId: string) {
    if (!confirm('Wyłączyć weryfikację dwuetapową?')) return
    setMfaLoading(true)
    await supabase.auth.mfa.unenroll({ factorId })
    setMfaFactors(prev => prev.filter(f => f.id !== factorId))
    setMfaLoading(false)
    setMfaSuccess('')
  }

  useEffect(() => {
    if (accountProfile) return
    setAccountLoading(true)
    setAccountError('')
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAccountLoading(false); return }
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, plan_code, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()
      if (error) setAccountError(error.message)
      else setAccountProfile({ email: user.email ?? '', full_name: data?.full_name ?? '', plan_code: data?.plan_code ?? null, stripe_customer_id: data?.stripe_customer_id ?? null })
      setAccountLoading(false)
    })
  }, [])

  const openPortal = async () => {
    setPortalLoading(true)
    setAccountError('')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else setAccountError(json.error ?? 'Nie można otworzyć portalu Stripe.')
    } catch {
      setAccountError('Błąd połączenia z serwerem.')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'USUŃ KONTO') return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/admin/delete-account', { method: 'POST' })
      if (res.ok) {
        await supabase.auth.signOut()
        router.push('/')
      } else {
        const json = await res.json()
        setDeleteError(json.error ?? 'Nie udało się usunąć konta.')
      }
    } catch {
      setDeleteError('Błąd połączenia z serwerem.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const plan = accountProfile?.plan_code ? PLAN_LABELS[accountProfile.plan_code] ?? PLAN_LABELS['trial'] : PLAN_LABELS['trial']
  const hasStripe = !!accountProfile?.stripe_customer_id

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Zarządzaj kontem</h1>
        <p className="text-sm text-gray-500 mt-1">Subskrypcja, dane konta, usunięcie konta</p>
      </header>

      {accountError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{accountError}</span>
        </div>
      )}

      {/* ── Profile card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">E-mail</span>
            <span className="text-sm font-medium text-gray-900">{accountProfile?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Imię i nazwisko</span>
            <span className="text-sm font-medium text-gray-900">{accountProfile?.full_name || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Plan</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: plan.color, background: plan.bg }}>
              {plan.label}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Subscription card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            Subskrypcja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasStripe ? (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                Zarządzaj swoją subskrypcją przez bezpieczny portal Stripe — zmień plan, zaktualizuj metodę płatności lub anuluj subskrypcję.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Otwórz portal Stripe
                </button>
                <button
                  onClick={() => router.push('/pricing')}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Zmień plan
                </button>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  { icon: ShieldCheck, text: 'Płatności obsługuje Stripe' },
                  { icon: CheckCircle, text: 'Anuluj kiedy chcesz' },
                  { icon: RefreshCw, text: 'Zmiana planu od razu' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Icon className="w-3.5 h-3.5 text-green-500" />
                    {text}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 leading-relaxed">
                Nie masz aktywnej subskrypcji. Wybierz plan aby uzyskać pełny dostęp do platformy.
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-blue-500/20"
              >
                <ChevronRight className="w-4 h-4" />
                Wybierz plan
              </button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 2FA card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            Weryfikacja dwuetapowa (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />{mfaSuccess}
            </div>
          )}
          {mfaFactors.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Masz włączoną weryfikację dwuetapową (TOTP). Aplikacja uwierzytelniająca jest wymagana przy logowaniu.</p>
              {mfaFactors.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <ShieldCheck className="w-4 h-4" />{f.friendly_name ?? 'Authenticator App'}
                  </div>
                  <button onClick={() => disableMfa(f.id)} disabled={mfaLoading}
                    className="text-xs text-red-600 hover:underline">Wyłącz</button>
                </div>
              ))}
            </div>
          ) : mfaStep === 'idle' ? (
            <>
              <p className="text-sm text-gray-500 leading-relaxed">Dodaj dodatkową warstwę bezpieczeństwa. Przy każdym logowaniu będziesz pytany o kod z aplikacji uwierzytelniającej (np. Google Authenticator).</p>
              <button onClick={startMfaEnroll} disabled={mfaLoading}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Włącz 2FA
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Zeskanuj kod QR w aplikacji uwierzytelniającej (Google Authenticator, Authy itp.), następnie wpisz 6-cyfrowy kod.</p>
              {mfaQr && (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mfaQr} alt="QR 2FA" className="w-40 h-40 border rounded-lg" />
                  <p className="text-[11px] text-gray-400 font-mono break-all max-w-xs text-center">
                    Lub wpisz ręcznie: {mfaSecret}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kod weryfikacyjny</label>
                <input type="text" inputMode="numeric" maxLength={6} value={mfaCode}
                  onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setMfaError('') }}
                  placeholder="000000"
                  className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {mfaError && <p className="text-xs text-red-600 mt-1">{mfaError}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setMfaStep('idle'); setMfaCode(''); setMfaError('') }}
                  className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Anuluj</button>
                <button onClick={verifyMfa} disabled={mfaLoading || mfaCode.length !== 6}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Weryfikuj i włącz'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sign out ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="w-4 h-4 text-gray-500" />
            Wyloguj się
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">Wyloguj się ze wszystkich urządzeń. Twoje dane pozostają zachowane.</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Wyloguj
          </button>
        </CardContent>
      </Card>

      {/* ── Delete account ── */}
      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <XCircle className="w-4 h-4" />
            Strefa niebezpieczna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Usunięcie konta jest nieodwracalne. Wszystkie dane, raporty, faktury i konfiguracja zostaną trwale usunięte po 30 dniach.
          </p>

          {!showDeleteSection ? (
            <button
              onClick={() => setShowDeleteSection(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Usuń konto
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm font-semibold text-red-800">
                Wpisz <span className="font-mono bg-red-100 px-1 rounded">USUŃ KONTO</span> aby potwierdzić
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => { setDeleteConfirm(e.target.value); setDeleteError('') }}
                placeholder="USUŃ KONTO"
                className="w-full h-9 px-3 rounded-lg border border-red-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'USUŃ KONTO' || deleteLoading}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Potwierdź usunięcie
                </button>
                <button
                  onClick={() => { setShowDeleteSection(false); setDeleteConfirm(''); setDeleteError('') }}
                  className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/* COMPONENT                                                           */
/* ================================================================== */
export default function OpsDashboard() {
  const supabase = createClient()
  const router = useRouter()

  // ── Core ──
  const [loading, setLoading] = useState(true)
  const [myLocations, setMyLocations] = useState<LocationData[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('reporting')
  const [reportDate, setReportDate] = useState('')
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [scheduleWeekStart, setScheduleWeekStart] = useState('')
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [myShiftsWeekStart, setMyShiftsWeekStart] = useState('')
  const [reportingSubView, setReportingSubView] = useState<'form' | 'history'>('form')
  const [dailyReportHistory, setDailyReportHistory] = useState<DailyReportHistoryItem[]>([])

  // ── Account management ──
  const [accountProfile, setAccountProfile] = useState<{ email: string; full_name: string; plan_code: string | null; stripe_customer_id: string | null } | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [accountError, setAccountError] = useState('')

  // ── Closing person ──
  const [closingPersonName, setClosingPersonName] = useState('')
  const [closingPersonEmail, setClosingPersonEmail] = useState('')

  // ── Employees (reporting) ──
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([{ employee_id: '', hours: '', rate: '' }])
  const [shiftMatrix, setShiftMatrix] = useState<Record<string, ShiftCell>>({})
  const [newWorker, setNewWorker] = useState({ full_name: '', real_hour_cost: '', user_email: '' })

  // ── Sales form ──
  const [salesForm, setSalesForm] = useState({
    transactions: '', gross: '', netRevenue: '', card: '', cash: '', online: '',
    comments: '', targetGross: '', targetTx: '', totalHoursAgg: '',
    avgRateAgg: '', cashReported: '', cashPhysical: '',
    pettyExpense: '', losses: '', refunds: '',
    incidentType: '', incidentDetails: '',
    staffMorning: '', staffAfternoon: '', staffEvening: '',
    laborExplanation: '', salesDeviationExplanation: '', cashDiffExplanation: '',
  })
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [existingReportId, setExistingReportId] = useState<string | null>(null)

  // ── Invoice state ──
  const [invoiceType, setInvoiceType] = useState<'COS' | 'SEMIS' | ''>('')
  const [invoiceCommon, setInvoiceCommon] = useState({
    supplier: '', invoiceNumber: '', saleDate: '', receiptDate: '',
  })
  const [cosLineItems, setCosLineItems] = useState<InvoiceLineItem[]>([{ ...emptyLineItem }])
  const [semisLineItems, setSemisLineItems] = useState<SemisLineItem[]>([{ ...emptySemisLine }])
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [invoiceErrors, setInvoiceErrors] = useState<ValidationError[]>([])
  const [excelLoading, setExcelLoading] = useState(false)
  const [invoiceSubView, setInvoiceSubView] = useState<'form' | 'semis_recon' | 'history'>('form')
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistoryItem[]>([])

  // ── SEMIS Reconciliation Entry ──
  const [semisReconEntries, setSemisReconEntries] = useState<SemisReconciliationEntry[]>([])
  const [newSemisEntry, setNewSemisEntry] = useState<SemisReconciliationEntry>({ ...emptySemisReconEntry })
  const [semisReconSaving, setSemisReconSaving] = useState(false)

  // ── Inventory state ──
  const [inventorySubView, setInventorySubView] = useState<'active' | 'fill' | 'history' | 'products'>('active')
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([])
  const [invProductSearch, setInvProductSearch] = useState('')
  const [invProductCategoryFilter, setInvProductCategoryFilter] = useState('')
  const [newInvProduct, setNewInvProduct] = useState({ name: '', unit: 'kg', category: 'inne', is_food: true, last_price: '' })
  const [editingInvProduct, setEditingInvProduct] = useState<InventoryProduct | null>(null)
  const [invProductSaving, setInvProductSaving] = useState(false)
  const [excelProductRows, setExcelProductRows] = useState<ExcelProductRow[]>([])
  const [excelProductLoading, setExcelProductLoading] = useState(false)
  const [excelProductSaving, setExcelProductSaving] = useState(false)
  const [inventoryJobs, setInventoryJobs] = useState<InventoryJob[]>([])
  const [inventoryHistory, setInventoryHistory] = useState<InventoryJob[]>([])
  const [selectedJob, setSelectedJob] = useState<InventoryJob | null>(null)
  const [jobItems, setJobItems] = useState<InventoryJobItem[]>([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('')
  const [inventorySaving, setInventorySaving] = useState(false)

  // ═══════════════════════════════════════════════════════════════════
  // FORMATTING
  // ═══════════════════════════════════════════════════════════════════
  const fmt0 = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(v || 0)
  const fmt2 = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(v || 0)
  const fmtPct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + '%'

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setReportDate(today)
    setScheduleWeekStart(getWeekStartMonday(today))
    setMyShiftsWeekStart(getWeekStartMonday(today))
    setInvoiceCommon(p => ({ ...p, saleDate: today, receiptDate: today }))
    setNewSemisEntry(p => ({ ...p, invoice_date: today }))

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setClosingPersonEmail(user.email || '')
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('user_profiles').select('role, full_name').eq('id', user.id).single()
      const role = profile?.role || 'employee'
      setUserRole(role)
      setClosingPersonName(profile?.full_name || user.email || 'Nieznany')
      if (['regional_manager', 'accounting', 'employee'].includes(role)) setIsReadOnly(true)

      const { data: access } = await supabase
        .from('user_access')
        .select('location_id, locations ( id, name, company_id )')
        .eq('user_id', user.id)
      if (access) {
        // @ts-expect-error - Supabase join type mismatch
        setMyLocations(access)
        // @ts-expect-error - Supabase join type mismatch
        if (access.length === 1) setSelectedLocation(access[0])
      }
      setLoading(false)
    }
    init()
  }, [router, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: Reporting data
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedLocation || !reportDate) return
    const fetch = async () => {
      const { data } = await supabase.from('sales_daily').select('*')
        .eq('location_id', selectedLocation.location_id).eq('date', reportDate).single()
      if (data) {
        setSalesForm(p => ({
          ...p,
          transactions: data.transaction_count ?? '', gross: data.gross_revenue ?? '',
          netRevenue: data.net_revenue ?? '', card: data.card_payments ?? '',
          cash: data.cash_payments ?? '', online: data.online_payments ?? '',
          comments: data.comments ?? '',
          targetGross: data.target_gross_sales ?? '', targetTx: data.target_transactions ?? '',
          totalHoursAgg: data.total_labor_hours ?? '', avgRateAgg: data.avg_hourly_rate ?? '',
          cashReported: data.cash_reported ?? '', cashPhysical: data.cash_physical ?? '',
          pettyExpense: data.petty_expenses ?? '', losses: data.daily_losses ?? '',
          refunds: data.daily_refunds ?? '', incidentType: data.incident_type ?? '',
          incidentDetails: data.incident_details ?? '',
          staffMorning: data.staff_morning ?? '', staffAfternoon: data.staff_afternoon ?? '',
          staffEvening: data.staff_evening ?? '',
          laborExplanation: data.labor_explanation ?? '',
          salesDeviationExplanation: data.sales_deviation_explanation ?? '',
          cashDiffExplanation: data.cash_diff_explanation ?? '',
        }))
        setExistingReportId(data.id)
      } else {
        setSalesForm(p => ({
          ...p, transactions: '', gross: '', netRevenue: '', card: '', cash: '', online: '',
          comments: '', targetGross: '', targetTx: '', totalHoursAgg: '',
          avgRateAgg: '', cashReported: '', cashPhysical: '', pettyExpense: '',
          losses: '', refunds: '', incidentType: '', incidentDetails: '',
          staffMorning: '', staffAfternoon: '', staffEvening: '',
          laborExplanation: '', salesDeviationExplanation: '', cashDiffExplanation: '',
        }))
        setExistingReportId(null)
      }

      // Try to include user_id (available after migration 202603170004)
      const { data: emps } = await supabase.from('employees')
        .select('id, full_name, real_hour_cost, base_rate, status, user_id, phone, position, email')
        .eq('location_id', selectedLocation.location_id)
        .neq('status', 'inactive')
      if (emps) {
        setEmployees(emps.map((e: any) => ({
          id: e.id, full_name: e.full_name,
          real_hour_cost: e.real_hour_cost, base_rate: e.base_rate ?? null,
          user_id: e.user_id ?? null, phone: e.phone ?? null,
          position: e.position ?? null, email: e.email ?? null, status: e.status,
        })))
      }

      const { data: hrs } = await supabase.from('employee_daily_hours')
        .select('employee_id, hours, hour_cost')
        .eq('location_id', selectedLocation.location_id).eq('date', reportDate)
      if (hrs && hrs.length > 0) {
        setEmployeeRows(hrs.map((r: any) => ({ employee_id: r.employee_id, hours: String(r.hours), rate: r.hour_cost ? String(r.hour_cost) : '' })))
      } else setEmployeeRows([{ employee_id: '', hours: '', rate: '' }])
    }
    fetch()
  }, [selectedLocation, reportDate, activeView, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: Inventory data
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedLocation || activeView !== 'inventory') return
    const fetchInventory = async () => {
      // Active jobs
      const { data: active } = await supabase.from('inventory_jobs')
        .select('*, inventory_job_items(count)')
        .eq('location_id', selectedLocation.location_id)
        .in('status', ['draft', 'correction'])
        .order('due_date', { ascending: true })
      if (active) {
        setInventoryJobs(active.map((j: any) => ({
          ...j,
          item_count: j.inventory_job_items?.[0]?.count || 0,
        })))
      }

      // History
      const { data: hist } = await supabase.from('inventory_jobs')
        .select('*, inventory_job_items(count)')
        .eq('location_id', selectedLocation.location_id)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .limit(20)
      if (hist) {
        setInventoryHistory(hist.map((j: any) => ({
          ...j, item_count: j.inventory_job_items?.[0]?.count || 0,
        })))
      }
    }
    fetchInventory()
  }, [selectedLocation, activeView, supabase, inventorySubView])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: Scheduling data (shifts)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedLocation || !scheduleWeekStart || activeView !== 'scheduling') return
    const fetchShifts = async () => {
      const start = scheduleWeekStart
      const startDate = new Date(start)
      const endDate = new Date(start)
      endDate.setDate(startDate.getDate() + 6)
      const end = endDate.toISOString().split('T')[0]

      const { data } = await supabase
        .from('shifts')
        .select('id, user_id, date, time_start, time_end, position')
        .eq('location_id', selectedLocation.location_id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('time_start', { ascending: true })

      if (data) {
        const map: Record<string, ShiftCell> = {}
        data.forEach((s: any) => {
          const d = s.date
          const key = `${s.user_id}__${d}`
          map[key] = {
            id: s.id,
            user_id: s.user_id,
            date: d,
            position: s.position || '',
            time_start: s.time_start?.slice(0, 5) || '',
            time_end: s.time_end?.slice(0, 5) || '',
          }
        })
        setShiftMatrix(map)
      } else {
        setShiftMatrix({})
      }
    }
    fetchShifts()
  }, [selectedLocation, scheduleWeekStart, activeView, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: My personal shifts
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!userId || !myShiftsWeekStart) return
    const fetchMyShifts = async () => {
      const { data: emp } = await supabase.from('employees').select('id').eq('user_id', userId).maybeSingle()
      const empId = emp?.id
      const filter = empId ? `user_id.eq.${userId},employee_id.eq.${empId}` : `user_id.eq.${userId}`
      const today = new Date().toISOString().split('T')[0]
      const startDate = myShiftsWeekStart < today ? myShiftsWeekStart : today
      const { data } = await supabase
        .from('shifts')
        .select('id, date, time_start, time_end, break_minutes, position, locations(name)')
        .or(filter)
        .eq('is_posted', true)
        .gte('date', startDate)
        .order('date')
        .limit(90)
      setMyShifts(data ?? [])
    }
    fetchMyShifts()
  }, [userId, myShiftsWeekStart, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: Daily report history
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedLocation || activeView !== 'reporting' || reportingSubView !== 'history') return
    const fetchHistory = async () => {
      const { data } = await supabase.from('sales_daily')
        .select('id, date, gross_revenue, net_revenue, transaction_count, total_labor_hours, status, closing_person')
        .eq('location_id', selectedLocation.location_id)
        .order('date', { ascending: false })
        .limit(30)
      if (data) setDailyReportHistory(data as DailyReportHistoryItem[])
    }
    fetchHistory()
  }, [selectedLocation, activeView, reportingSubView, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: Invoice history
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedLocation || activeView !== 'invoices' || invoiceSubView !== 'history') return
    const fetchInvHistory = async () => {
      const { data } = await supabase.from('invoices')
        .select('id, invoice_type, supplier_name, invoice_number, service_date, total_gross, status, created_at')
        .eq('location_id', selectedLocation.location_id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setInvoiceHistory(data as InvoiceHistoryItem[])
    }
    fetchInvHistory()
  }, [selectedLocation, activeView, invoiceSubView, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: Inventory products
  // ═══════════════════════════════════════════════════════════════════
  const fetchInvProducts = async () => {
    if (!selectedLocation) return
    const locCompanyId = selectedLocation.locations?.company_id
    let q = supabase.from('inventory_products').select('*').order('category').order('name')
    if (locCompanyId) q = q.eq('company_id', locCompanyId)
    const { data } = await q
    if (data) setInventoryProducts(data as InventoryProduct[])
  }
  useEffect(() => {
    if (!selectedLocation || activeView !== 'inventory' || inventorySubView !== 'products') return
    fetchInvProducts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, activeView, inventorySubView, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // LOAD: SEMIS Reconciliation entries
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedLocation || activeView !== 'invoices' || invoiceSubView !== 'semis_recon') return
    const fetchSemisRecon = async () => {
      const { data } = await supabase.from('semis_reconciliation_entries')
        .select('*')
        .eq('location_id', selectedLocation.location_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (data) setSemisReconEntries(data as SemisReconciliationEntry[])
    }
    fetchSemisRecon()
  }, [selectedLocation, activeView, invoiceSubView, supabase])

  // ═══════════════════════════════════════════════════════════════════
  // DERIVED KPI VALUES
  // ═══════════════════════════════════════════════════════════════════
  const gross = Number(salesForm.gross) || 0
  const tx = Number(salesForm.transactions) || 0
  const card = Number(salesForm.card) || 0
  const cash = Number(salesForm.cash) || 0
  const planGross = Number(salesForm.targetGross) || 0
  const planTx = Number(salesForm.targetTx) || 0
  const netManual = Number(salesForm.netRevenue) || 0
  const netCalculated = gross > 0 ? gross / (1 + VAT_RATE) : 0
  const net = netManual > 0 ? netManual : netCalculated
  const isNetManual = netManual > 0
  const _vat = gross - net
  const cashReported = Number(salesForm.cashReported) || 0
  const cashPhysical = Number(salesForm.cashPhysical) || 0
  const cashDiff = cashPhysical - cashReported
  const pettyExpense = Number(salesForm.pettyExpense) || 0
  const lossesVal = Number(salesForm.losses) || 0
  const refundsVal = Number(salesForm.refunds) || 0
  const dailyOpsTotal = pettyExpense + lossesVal + refundsVal
  const planNet = planGross // user now enters plan as netto directly
  const planRealisation = planNet > 0 ? net / planNet : 0
  const aov = tx > 0 ? net / tx : 0
  const online = Number(salesForm.online) || 0
  const cardPercent = gross > 0 ? card / gross : 0
  const cashPercent = gross > 0 ? cash / gross : 0
  const onlinePercent = gross > 0 ? online / gross : 0

  const employeeTotals = employeeRows.reduce((acc, row) => {
    const h = Number(row.hours) || 0
    if (!row.employee_id || h <= 0) return acc
    const emp = employees.find(e => e.id === row.employee_id)
    const rate = Number(row.rate) || emp?.real_hour_cost || emp?.base_rate || 0
    acc.totalHours += h; acc.totalCost += h * rate
    return acc
  }, { totalHours: 0, totalCost: 0 })

  const hoursAgg = Number(salesForm.totalHoursAgg) || 0
  const rateAgg = Number(salesForm.avgRateAgg) || 0
  const totalHours = employeeTotals.totalHours > 0 ? employeeTotals.totalHours : hoursAgg
  const laborCost = employeeTotals.totalCost > 0 ? employeeTotals.totalCost : hoursAgg * rateAgg
  const laborPercent = net > 0 ? laborCost / net : 0
  const salesPerHour = totalHours > 0 ? net / totalHours : 0
  const effectiveHourlyRate = totalHours > 0 ? laborCost / totalHours : 0
  const staffMorning = Number(salesForm.staffMorning) || 0
  const staffAfternoon = Number(salesForm.staffAfternoon) || 0
  const staffEvening = Number(salesForm.staffEvening) || 0
  const totalStaff = staffMorning + staffAfternoon + staffEvening
  const isLaborAboveThreshold = laborPercent > 0.4 && net > 0
  const isSalesBelow80 = planNet > 0 && planRealisation < 0.8
  const isCashDiffAbove20 = Math.abs(cashDiff) > 20

  // Invoice calcs
  const getLineNet = (i: InvoiceLineItem) => (Number(i.quantity) || 0) * (Number(i.netPrice) || 0)
  const getLineGross = (i: InvoiceLineItem) => getLineNet(i) * (1 + (Number(i.vatRate) || 0))
  const cosTotalNet = cosLineItems.reduce((s, i) => s + getLineNet(i), 0)
  const cosTotalGross = cosLineItems.reduce((s, i) => s + getLineGross(i), 0)
  const cosTotalVat = cosTotalGross - cosTotalNet
  const semisTotalNet = semisLineItems.reduce((s, item) => s + (Number(item.totalNet) || 0), 0)
  const semisTotalGross = semisLineItems.reduce((s, item) => {
    const net = Number(item.totalNet) || 0
    return s + net * (1 + (Number(item.vatRate) || 0))
  }, 0)

  // Inventory filtered items
  const filteredJobItems = useMemo(() => {
    let items = jobItems
    if (inventorySearch) {
      const q = inventorySearch.toLowerCase()
      items = items.filter(i => i.product_name.toLowerCase().includes(q))
    }
    if (inventoryCategoryFilter) {
      items = items.filter(i => i.category === inventoryCategoryFilter)
    }
    return items
  }, [jobItems, inventorySearch, inventoryCategoryFilter])

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════
  const validateReport = (): ValidationError[] => {
    const e: ValidationError[] = []
    if (!gross && !netManual) e.push({ field: 'gross', message: 'Utarg brutto lub netto jest wymagany.' })
    if (gross > 0 && Math.abs(card + cash + online - gross) > 0.5)
      e.push({ field: 'card_cash', message: `Karty + Gotówka + Online ≠ Brutto. Różnica: ${fmt2(Math.abs(card + cash + online - gross))}` })
    if (gross > 0 && net > gross)
      e.push({ field: 'gross', message: `Netto (${fmt2(net)} zł) nie może być wyższe niż Brutto (${fmt2(gross)} zł).` })
    if (net > 0 && tx <= 0) e.push({ field: 'transactions', message: 'Utarg > 0, ale brak transakcji.' })
    if (net > 0 && totalHours <= 0) e.push({ field: 'hours', message: 'Utarg > 0, ale brak godzin pracy.' })
    if (Math.abs(cashDiff) > 0.01 && !salesForm.cashDiffExplanation.trim())
      e.push({ field: 'cashDiffExplanation', message: `Różnica w kasie: ${fmt2(cashDiff)}. Wyjaśnienie wymagane.` })
    if (isLaborAboveThreshold && !salesForm.laborExplanation.trim())
      e.push({ field: 'laborExplanation', message: `Koszt pracy > 40%. Wyjaśnienie wymagane.` })
    if (isSalesBelow80 && !salesForm.salesDeviationExplanation.trim())
      e.push({ field: 'salesDeviationExplanation', message: `Sprzedaż < 80% planu. Wyjaśnienie wymagane.` })
    if (isCashDiffAbove20 && !salesForm.cashDiffExplanation.trim())
      e.push({ field: 'cashDiffExplanation', message: `Różnica w kasie > 20 zł. Wyjaśnienie wymagane.` })
    if (net > 0 && totalStaff <= 0) e.push({ field: 'staff', message: 'Uzupełnij liczbę osób na zmianach.' })
    return e
  }

  const validateInvoice = (): ValidationError[] => {
    const e: ValidationError[] = []
    if (!invoiceType) { e.push({ field: 'invoiceType', message: 'Wybierz typ faktury.' }); return e }
    if (!invoiceCommon.supplier.trim()) e.push({ field: 'supplier', message: 'Dostawca wymagany.' })
    if (!invoiceCommon.invoiceNumber.trim()) e.push({ field: 'invoiceNumber', message: 'Numer faktury wymagany.' })
    if (!invoiceCommon.saleDate) e.push({ field: 'saleDate', message: 'Data sprzedaży wymagana.' })
    if (invoiceType === 'COS') {
      if (!invoiceFile) e.push({ field: 'file', message: 'Załącznik obowiązkowy dla COS.' })
      const valid = cosLineItems.filter(i => i.product.trim() && Number(i.quantity) > 0 && Number(i.netPrice) > 0)
      if (valid.length === 0) e.push({ field: 'lineItems', message: 'Dodaj min. jedną pozycję.' })
      cosLineItems.forEach((i, idx) => {
        if (i.product.trim() && !i.cosCategory) e.push({ field: `lineItem_${idx}`, message: `Poz. ${idx + 1}: brak kategorii COS.` })
      })
    }
    if (invoiceType === 'SEMIS') {
      const validSemis = semisLineItems.filter(item => item.category && Number(item.totalNet) > 0)
      if (validSemis.length === 0) e.push({ field: 'semisAmount', message: 'Dodaj min. jedną pozycję z kwotą i kategorią.' })
    }
    return e
  }

  const fieldErr = (f: string) => validationErrors.some(e => e.field === f)
  const invErr = (f: string) => invoiceErrors.some(e => e.field === f)

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS: Reporting
  // ═══════════════════════════════════════════════════════════════════
  const handleReportSubmit = async () => {
    if (isReadOnly || !selectedLocation) return
    const errors = validateReport()
    setValidationErrors(errors)
    if (errors.length > 0) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }

    const payload: any = {
      location_id: selectedLocation.location_id,
      company_id: selectedLocation.locations.company_id,
      date: reportDate, transaction_count: tx, gross_revenue: gross,
      net_revenue: net, card_payments: card, cash_payments: cash, online_payments: online,
      comments: salesForm.comments, target_gross_sales: planGross,
      target_transactions: planTx, total_labor_hours: totalHours,
      avg_hourly_rate: totalHours > 0 ? laborCost / totalHours : 0,
      status: 'submitted', cash_reported: cashReported, cash_physical: cashPhysical,
      cash_diff: cashDiff, petty_expenses: pettyExpense,
      daily_losses: lossesVal, daily_refunds: refundsVal,
      incident_type: salesForm.incidentType, incident_details: salesForm.incidentDetails,
      closing_person: closingPersonName, closing_person_email: closingPersonEmail,
      closing_time: new Date().toISOString(),
      staff_morning: staffMorning, staff_afternoon: staffAfternoon, staff_evening: staffEvening,
      labor_explanation: salesForm.laborExplanation || null,
      sales_deviation_explanation: salesForm.salesDeviationExplanation || null,
      cash_diff_explanation: salesForm.cashDiffExplanation || null,
    }

    const q = existingReportId
      ? supabase.from('sales_daily').update(payload).eq('id', existingReportId)
      : supabase.from('sales_daily').insert(payload)
    const { error } = await q
    if (error) { alert('Błąd: ' + error.message); return }

    const validRows = employeeRows.filter(r => r.employee_id && Number(r.hours) > 0)
    await supabase.from('employee_daily_hours').delete()
      .eq('location_id', selectedLocation.location_id).eq('date', reportDate)
    if (validRows.length > 0) {
      const rows = validRows.map(r => {
        const h = Number(r.hours) || 0
        const emp = employees.find(e => e.id === r.employee_id)
        const rate = Number(r.rate) || emp?.real_hour_cost || emp?.base_rate || 0
        return { date: reportDate, location_id: selectedLocation.location_id,
          employee_id: r.employee_id, hours: h, hour_cost: rate, daily_cost: h * rate }
      })
      const { error: hErr } = await supabase.from('employee_daily_hours').insert(rows)
      if (hErr) { alert('Raport OK, ale błąd godzin: ' + hErr.message); return }
    }

    // Create notification for admin
    await supabase.from('admin_notifications').insert({
      type: 'daily_report',
      location_id: selectedLocation.location_id,
      company_id: selectedLocation.locations.company_id,
      title: `Raport dzienny - ${selectedLocation.locations.name}`,
      message: `Nowy raport za ${reportDate} od ${closingPersonName}`,
      reference_id: existingReportId || null,
      status: 'unread',
      created_by: userId,
    })

    alert('✅ Raport zapisany i wysłany do zatwierdzenia')
    setValidationErrors([])
  }

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS: Invoice
  // ═══════════════════════════════════════════════════════════════════
  const handleInvoiceSubmit = async () => {
    if (!selectedLocation) return
    const errors = validateInvoice()
    setInvoiceErrors(errors)
    if (errors.length > 0) return
    setUploading(true)
    let attachmentUrl: string | null = null
    if (invoiceFile) {
      const ext = invoiceFile.name.split('.').pop()
      const fn = `${selectedLocation.location_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('invoices').upload(fn, invoiceFile)
      if (upErr) { alert('Błąd pliku: ' + upErr.message); setUploading(false); return }
      attachmentUrl = supabase.storage.from('invoices').getPublicUrl(fn).data.publicUrl
    }

    let invoiceId: string | null = null

    if (invoiceType === 'COS') {
      const valid = cosLineItems.filter(i => i.product.trim() && Number(i.quantity) > 0 && Number(i.netPrice) > 0)
      // build payloads for RPC
      const invoicePayload = {
        location_id: selectedLocation.location_id,
        company_id: selectedLocation.locations.company_id,
        invoice_type: 'COS', supplier_name: invoiceCommon.supplier,
        invoice_number: invoiceCommon.invoiceNumber,
        service_date: invoiceCommon.saleDate, receipt_date: invoiceCommon.receiptDate,
        total_net: cosTotalNet, total_vat: cosTotalVat, total_gross: cosTotalGross,
        payment_method: 'przelew', attachment_url: attachmentUrl, status: 'submitted'
      }
      const itemsPayload = valid.map((i, idx) => ({
        line_number: idx + 1,
        product_name: i.product,
        cos_category: i.cosCategory,
        quantity: Number(i.quantity),
        unit: i.unit,
        net_price: Number(i.netPrice),
        net_value: getLineNet(i),
        vat_rate: Number(i.vatRate),
        gross_value: getLineGross(i),
        ingredient_id: (i as any).ingredient_id || ''
      }))

      const txsPayload = itemsPayload.filter(it => it.ingredient_id).map(it => ({
        ingredient_id: it.ingredient_id,
        location_id: selectedLocation.location_id,
        tx_type: 'invoice_in',
        quantity: it.quantity,
        unit: it.unit,
        price: it.net_price,
        reason: 'invoice import',
        created_by: userId,
        created_at: invoiceCommon.saleDate || new Date().toISOString()
      }))

      const priceHistoryPayload = itemsPayload.filter(it => it.ingredient_id).map(it => ({
        ingredient_id: it.ingredient_id,
        price: it.net_price,
        unit: it.unit,
        supplier: invoiceCommon.supplier,
        invoice_ref: '',
        recorded_at: invoiceCommon.saleDate || new Date().toISOString()
      }))

      // Call server-side RPC to perform atomic insert + alerts
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_invoice_with_items_and_txs', {
        invoice_json: invoicePayload,
        items_json: itemsPayload,
        txs_json: txsPayload,
        price_history_json: priceHistoryPayload,
        price_change_threshold: 0.1
      })
      if (rpcErr) {
        console.error('RPC error', rpcErr)
        alert('Błąd zapisu faktury: ' + rpcErr.message)
        setUploading(false); return
      }
      invoiceId = rpcRes?.invoice_id || null
      alert(`✅ Faktura COS zapisana (${valid.length} pozycji)`)
    }

    if (invoiceType === 'SEMIS') {
      const validItems = semisLineItems.filter(item => item.category && Number(item.totalNet) > 0)
      const rows = validItems.map((item, idx) => {
        const net = Number(item.totalNet) || 0
        const gross = net * (1 + (Number(item.vatRate) || 0))
        return {
          location_id: selectedLocation.location_id,
          company_id: selectedLocation.locations.company_id,
          invoice_type: 'SEMIS' as const, supplier_name: invoiceCommon.supplier,
          invoice_number: invoiceCommon.invoiceNumber,
          service_date: invoiceCommon.saleDate, receipt_date: invoiceCommon.receiptDate,
          total_net: net, total_vat: gross - net,
          total_gross: gross, semis_category: item.category,
          description: item.description, payment_method: 'przelew',
          attachment_url: idx === 0 ? attachmentUrl : null, status: 'submitted',
        }
      })
      const { data: invRows, error: e } = await supabase.from('invoices').insert(rows).select('id')
      if (e) { alert('Błąd: ' + e.message); setUploading(false); return }
      invoiceId = invRows?.[0]?.id
      alert(`✅ Faktura SEMIS zapisana (${rows.length} pozycji)`)
    }

    // Create notification for admin
    if (invoiceId) {
      await supabase.from('admin_notifications').insert({
        type: 'invoice',
        location_id: selectedLocation.location_id,
        company_id: selectedLocation.locations.company_id,
        title: `Nowa faktura ${invoiceType} - ${selectedLocation.locations.name}`,
        message: `Faktura ${invoiceCommon.invoiceNumber} od ${invoiceCommon.supplier}`,
        reference_id: invoiceId,
        status: 'unread',
        created_by: userId,
      })
    }

    setInvoiceType('')
    setInvoiceCommon({ supplier: '', invoiceNumber: '', saleDate: new Date().toISOString().split('T')[0], receiptDate: new Date().toISOString().split('T')[0] })
    setCosLineItems([{ ...emptyLineItem }])
    setSemisLineItems([{ ...emptySemisLine }])
    setInvoiceFile(null); setInvoiceErrors([]); setUploading(false)
  }

  const handleExcelUpload = async (e: any) => {
    if (!selectedLocation) return
    const file = e.target.files[0]; if (!file) return
    setExcelLoading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' })
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[]
        const rows: any[] = []
        data.forEach(row => {
          const amt = row['PLN Netto'] || row['Netto']; if (!amt) return
          let d = row['Data sprzedaży']
          if (typeof d === 'number') d = new Date((d - 25569) * 86400 * 1000).toISOString().split('T')[0]
          else if (!d) d = new Date().toISOString().split('T')[0]
          const desc = row['RK'] || row['Opis kosztu'] || 'Brak opisu'
          const lower = String(desc).toLowerCase()
          const type = ['food', 'bev', 'meat', 'produce', 'towar'].some(k => lower.includes(k)) ? 'COS' : 'SEMIS'
          rows.push({ location_id: selectedLocation.location_id, cost_date: d,
            supplier: String(row['Sprzedawca'] || 'Nieznany'), account_description: String(desc),
            amount: Number(amt), cost_type: type, source: 'IMPORT_EXCEL' })
        })
        if (rows.length === 0) alert('Brak danych.')
        else { await supabase.from('imported_costs').insert(rows); alert(`✅ ${rows.length} pozycji zaimportowanych`) }
      } catch (err: any) { alert('Błąd: ' + err.message) }
      finally { setExcelLoading(false); e.target.value = null }
    }
    reader.readAsBinaryString(file)
  }

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS: SEMIS Reconciliation Entry
  // ═══════════════════════════════════════════════════════════════════
  const handleAddSemisReconEntry = async () => {
    if (!selectedLocation) return
    if (!newSemisEntry.invoice_number || !newSemisEntry.amount) {
      alert('Wypełnij numer faktury i kwotę')
      return
    }
    setSemisReconSaving(true)
    
    const { error } = await supabase.from('semis_reconciliation_entries').insert({
      ...newSemisEntry,
      location_id: selectedLocation.location_id,
      company_id: selectedLocation.locations.company_id,
      amount: Number(newSemisEntry.amount),
      status: 'pending',
      created_by: userId,
    })
    
    if (error) {
      alert('Błąd: ' + error.message)
    } else {
      alert('✅ Pozycja dodana')
      setNewSemisEntry({ ...emptySemisReconEntry, invoice_date: new Date().toISOString().split('T')[0], location_id: '' })
      // Refresh list
      const { data } = await supabase.from('semis_reconciliation_entries')
        .select('*')
        .eq('location_id', selectedLocation.location_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (data) setSemisReconEntries(data as SemisReconciliationEntry[])
    }
    setSemisReconSaving(false)
  }

  const handleSubmitSemisReconBatch = async () => {
    if (!selectedLocation || semisReconEntries.length === 0) return
    setSemisReconSaving(true)
    
    // Update all pending entries to submitted
    const { error } = await supabase.from('semis_reconciliation_entries')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('location_id', selectedLocation.location_id)
      .eq('status', 'pending')
    
    if (error) {
      alert('Błąd: ' + error.message)
    } else {
      // Create notification for admin
      await supabase.from('admin_notifications').insert({
        type: 'semis_reconciliation',
        location_id: selectedLocation.location_id,
        company_id: selectedLocation.locations.company_id,
        title: `Uzgodnienie SEMIS - ${selectedLocation.locations.name}`,
        message: `${semisReconEntries.length} pozycji do weryfikacji`,
        status: 'unread',
        created_by: userId,
      })
      
      alert('✅ Uzgodnienie wysłane do zatwierdzenia')
      setSemisReconEntries([])
    }
    setSemisReconSaving(false)
  }

  const handleDeleteSemisEntry = async (id: string) => {
    const { error } = await supabase.from('semis_reconciliation_entries').delete().eq('id', id)
    if (!error) {
      setSemisReconEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS: Inventory
  // ═══════════════════════════════════════════════════════════════════
  const openJob = async (job: InventoryJob) => {
    setSelectedJob(job)
    const { data } = await supabase.from('inventory_job_items')
      .select('*, inventory_products(name, unit, category, last_price)')
      .eq('job_id', job.id)
      .order('inventory_products(category)', { ascending: true })

    if (data) {
      setJobItems(data.map((i: any) => ({
        id: i.id, job_id: i.job_id, product_id: i.product_id,
        product_name: i.inventory_products?.name || 'Nieznany',
        unit: i.inventory_products?.unit || 'szt',
        category: i.inventory_products?.category || 'inne',
        expected_qty: i.expected_qty, counted_qty: i.counted_qty?.toString() || '',
        note: i.note || '',
        last_price: i.inventory_products?.last_price || null,
      })))
    }
    setInventorySubView('fill')
  }

  const updateJobItem = (id: string, field: 'counted_qty' | 'note', val: string) => {
    setJobItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i))
  }

  const _handleAddWorker = async () => {
    if (!selectedLocation) return
    const name = newWorker.full_name.trim()
    if (!name) {
      alert('Podaj imię i nazwisko pracownika')
      return
    }

    // Insert employee (without user_id — linked separately via the link-employee API after migration)
    const { data: newEmp, error } = await supabase.from('employees').insert({
      location_id: selectedLocation.location_id,
      full_name: name,
      real_hour_cost: newWorker.real_hour_cost ? Number(newWorker.real_hour_cost) : null,
      status: 'active',
    }).select('id').single()

    if (error) {
      alert('Błąd podczas dodawania pracownika: ' + error.message)
      return
    }

    // If email provided, link via admin API (works after migration adds user_id to employees)
    const email = newWorker.user_email.trim()
    if (email && newEmp?.id) {
      const res = await fetch('/api/admin/link-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, employee_id: newEmp.id }),
      })
      if (!res.ok) {
        const { error: linkErr } = await res.json()
        // Non-fatal: employee added, just not linked to login account yet
        console.warn('Link employee warning:', linkErr)
      }
    }

    setNewWorker({ full_name: '', real_hour_cost: '', user_email: '' })

    const { data: emps, error: reloadErr } = await supabase.from('employees')
      .select('id, full_name, real_hour_cost, status, user_id')
      .eq('location_id', selectedLocation.location_id)
      .neq('status', 'inactive')
    if (!reloadErr && emps) {
      setEmployees(emps.map((e: any) => ({
        id: e.id, full_name: e.full_name,
        real_hour_cost: e.real_hour_cost, user_id: e.user_id ?? null,
      })))
    } else {
      const { data: emps2 } = await supabase.from('employees')
        .select('id, full_name, real_hour_cost, status')
        .eq('location_id', selectedLocation.location_id)
        .neq('status', 'inactive')
      setEmployees((emps2 ?? []).map((e: any) => ({
        id: e.id, full_name: e.full_name,
        real_hour_cost: e.real_hour_cost, user_id: null,
      })))
    }
  }

  const saveInventoryDraft = async () => {
    if (!selectedJob) return
    setInventorySaving(true)
    const updates = jobItems.filter(i => i.counted_qty !== '').map(i => ({
      id: i.id, counted_qty: Number(i.counted_qty) || 0, note: i.note,
    }))
    for (const u of updates) {
      await supabase.from('inventory_job_items')
        .update({ counted_qty: u.counted_qty, note: u.note }).eq('id', u.id)
    }
    await supabase.from('inventory_jobs').update({ status: 'draft' }).eq('id', selectedJob.id)
    setInventorySaving(false)
    alert('✅ Zapisano roboczo')
  }

  const submitInventory = async () => {
    if (!selectedJob || !selectedLocation) return
    const empty = jobItems.filter(i => i.counted_qty === '' || i.counted_qty === undefined)
    if (empty.length > 0) {
      alert(`⚠ Uzupełnij stan dla ${empty.length} pozycji przed wysłaniem.`)
      return
    }
    setInventorySaving(true)
    const updates = jobItems.map(i => ({
      id: i.id, counted_qty: Number(i.counted_qty) || 0, note: i.note,
    }))
    for (const u of updates) {
      await supabase.from('inventory_job_items')
        .update({ counted_qty: u.counted_qty, note: u.note }).eq('id', u.id)
    }
    await supabase.from('inventory_jobs').update({
      status: 'submitted', submitted_at: new Date().toISOString(), submitted_by: closingPersonName,
    }).eq('id', selectedJob.id)

    // Create notification for admin
    await supabase.from('admin_notifications').insert({
      type: 'inventory',
      location_id: selectedLocation.location_id,
      company_id: selectedLocation.locations.company_id,
      title: `Inwentaryzacja - ${selectedLocation.locations.name}`,
      message: `${selectedJob.type === 'MONTHLY' ? 'Miesięczna' : 'Tygodniowa'} inwentaryzacja wysłana przez ${closingPersonName}`,
      reference_id: selectedJob.id,
      status: 'unread',
      created_by: userId,
    })

    setInventorySaving(false)
    alert('✅ Inwentaryzacja wysłana do zatwierdzenia')
    setSelectedJob(null)
    setInventorySubView('active')
  }

  // ── Row helpers ──
  const addEmployeeRow = () => setEmployeeRows(p => [...p, { employee_id: '', hours: '', rate: '' }])
  const removeEmployeeRow = (i: number) => setEmployeeRows(p => p.length > 1 ? p.filter((_, idx) => idx !== i) : p)
  const updateEmployeeRow = (i: number, f: 'employee_id' | 'hours' | 'rate', v: string) =>
    setEmployeeRows(p => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c })
  const selectEmployee = (i: number, empId: string) => {
    const emp = employees.find(e => e.id === empId)
    const autoRate = emp ? String(emp.real_hour_cost ?? emp.base_rate ?? '') : ''
    setEmployeeRows(p => { const c = [...p]; c[i] = { ...c[i], employee_id: empId, rate: c[i].rate || autoRate }; return c })
  }
  const _updateShiftCell = (userId: string, date: string, field: keyof ShiftCell, value: string) => {
    setShiftMatrix(prev => {
      const key = `${userId}__${date}`
      const existing = prev[key] || { id: undefined, user_id: userId, date, position: '', time_start: '', time_end: '' }
      const updated: ShiftCell = { ...existing, [field]: value }
      return { ...prev, [key]: updated }
    })
  }
  const addCosLine = () => setCosLineItems(p => [...p, { ...emptyLineItem }])
  const removeCosLine = (i: number) => setCosLineItems(p => p.length > 1 ? p.filter((_, idx) => idx !== i) : p)
  const updateCosLine = (i: number, f: keyof InvoiceLineItem, v: string) =>
    setCosLineItems(p => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c })
  const addSemisLine = () => setSemisLineItems(p => [...p, { ...emptySemisLine }])
  const removeSemisLine = (i: number) => setSemisLineItems(p => p.length > 1 ? p.filter((_, idx) => idx !== i) : p)
  const updateSemisLine = (i: number, f: keyof SemisLineItem, v: string) =>
    setSemisLineItems(p => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c })

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Ładowanie…</div>

  if (!selectedLocation) return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto flex flex-col justify-center">
      <h1 className="text-2xl font-bold mb-8 text-center text-slate-900">Wybierz lokalizację</h1>
      <div className="grid gap-4">
        {myLocations.map((item, i) => (
          <Button key={i} variant="outline" className="h-20 text-lg border-2" onClick={() => setSelectedLocation(item)}>📍 {item.locations.name}</Button>
        ))}
      </div>
      <Button variant="ghost" className="mt-8 text-slate-500" onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}>Wyloguj</Button>
    </div>
  )

  const kpiColor = laborPercent < 0.27 ? 'text-green-700' : laborPercent <= 0.3 ? 'text-yellow-700' : laborPercent <= 0.4 ? 'text-orange-600' : 'text-red-700'
  const cashDiffColor = Math.abs(cashDiff) < 0.01 ? 'text-green-700' : 'text-red-700'
  const scheduleWeekDays = buildWeekDays(scheduleWeekStart)

  const _saveSchedule = async () => {
    if (!selectedLocation || !scheduleWeekStart || scheduleWeekDays.length === 0) return

    const start = scheduleWeekStart
    const end = scheduleWeekDays[scheduleWeekDays.length - 1].iso

    // Remove existing shifts for this location/week and insert current set
    await supabase
      .from('shifts')
      .delete()
      .eq('location_id', selectedLocation.location_id)
      .gte('date', start)
      .lte('date', end)

    const allCells = Object.values(shiftMatrix)
    const validCells = allCells.filter(c => c.user_id && c.date && c.time_start && c.time_end)

    if (validCells.length === 0) {
      setShiftMatrix({})
      return
    }

    const payload = validCells.map(c => ({
      user_id: c.user_id,
      location_id: selectedLocation.location_id,
      date: c.date,
      time_start: c.time_start,
      time_end: c.time_end,
      position: c.position || null,
    }))

    const { error } = await supabase.from('shifts').insert(payload)
    if (error) {
      alert('Błąd podczas zapisywania harmonogramu: ' + error.message)
      return
    }

    alert('✅ Harmonogram tygodniowy zapisany')
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <OpsSidebar
        locationName={selectedLocation.locations.name}
        activeView={activeView}
        onNavigate={(v: string) => setActiveView(v as ActiveView)}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
        onSwitchLocation={() => setSelectedLocation(null)}
      />

      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 p-4 md:p-8">

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  0. SCHEDULING (WEEKLY GRID)                            ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'scheduling' && (
          <div className="max-w-full">
            <ScheduleGrid
              locationId={selectedLocation?.location_id}
              employees={employees.map(e => ({ id: e.id, full_name: e.full_name, real_hour_cost: e.real_hour_cost, base_rate: e.base_rate ?? null, user_id: e.user_id ?? null, position: e.position ?? null, phone: e.phone ?? null }))}
              supabase={supabase}
              userId={userId}
            />
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  MY SCHEDULE                                            ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'my_schedule' && (() => {
          const weekDays = buildWeekDays(myShiftsWeekStart)
          const weekEnd = weekDays[6]?.iso ?? myShiftsWeekStart
          const weekShifts = myShifts.filter(s => s.date >= myShiftsWeekStart && s.date <= weekEnd)
          const today = new Date().toISOString().split('T')[0]
          const fmtT = (t?: string | null) => (t ?? '').slice(0, 5)
          const calcH = (ts: string, te: string, brk = 0) => {
            const [sh, sm] = ts.split(':').map(Number)
            const [eh, em] = te.split(':').map(Number)
            return Math.max(0, (eh * 60 + em - sh * 60 - sm - brk) / 60)
          }
          const POSITIONS: Record<string, string> = {
            kucharz: 'bg-orange-100 text-orange-800', kelner: 'bg-blue-100 text-blue-800',
            kasjer: 'bg-emerald-100 text-emerald-800', manager: 'bg-purple-100 text-purple-800',
            zmywak: 'bg-yellow-100 text-yellow-800', barista: 'bg-pink-100 text-pink-800',
            dostawa: 'bg-cyan-100 text-cyan-800', point_manager: 'bg-purple-100 text-purple-800',
          }
          const posColor = (pos?: string) => pos ? (POSITIONS[pos.toLowerCase()] ?? 'bg-slate-100 text-slate-700') : 'bg-blue-100 text-blue-800'
          return (
            <div className="max-w-2xl">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Mój grafik</h1>

              {/* Week navigator */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => { const d = new Date(myShiftsWeekStart); d.setDate(d.getDate() - 7); setMyShiftsWeekStart(d.toISOString().split('T')[0]) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                  >‹</button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">
                      {weekDays[0] && new Date(weekDays[0].iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {weekDays[6] && new Date(weekDays[6].iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {weekShifts.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {weekShifts.length} zmian · {weekShifts.reduce((a, s) => a + calcH(fmtT(s.time_start), fmtT(s.time_end), s.break_minutes ?? 0), 0).toFixed(1)}h
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { const d = new Date(myShiftsWeekStart); d.setDate(d.getDate() + 7); setMyShiftsWeekStart(d.toISOString().split('T')[0]) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                  >›</button>
                </div>

                {/* 7-day grid */}
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map(d => {
                    const dayShifts = weekShifts.filter(s => s.date === d.iso)
                    const isToday = d.iso === today
                    return (
                      <div key={d.iso} className={`rounded-xl border p-1.5 min-h-[80px] flex flex-col gap-1 ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                        <div className="text-center">
                          <p className={`text-[10px] font-semibold uppercase ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{d.label.slice(0, 2)}</p>
                          <p className={`text-[13px] font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>{new Date(d.iso + 'T12:00:00').getDate()}</p>
                        </div>
                        {dayShifts.map(s => (
                          <div key={s.id} className="bg-blue-600 rounded-lg p-1 text-white">
                            <p className="text-[9px] font-bold tabular-nums">{fmtT(s.time_start)}–{fmtT(s.time_end)}</p>
                            {s.position && <p className="text-[8px] opacity-80 capitalize truncate">{s.position}</p>}
                          </div>
                        ))}
                        {dayShifts.length === 0 && <p className="text-[9px] text-gray-300 text-center mt-1">—</p>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Upcoming list */}
              <div className="space-y-2">
                {myShifts.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                    <p className="text-2xl mb-2">📅</p>
                    <p className="font-bold text-blue-800 text-sm">Brak nadchodzących zmian</p>
                    <p className="text-xs text-blue-600 mt-1">Grafik nie został jeszcze opublikowany.</p>
                  </div>
                ) : myShifts.filter(s => s.date >= today).map(shift => {
                  const isToday = shift.date === today
                  const hrs = calcH(fmtT(shift.time_start), fmtT(shift.time_end), shift.break_minutes ?? 0)
                  return (
                    <div key={shift.id} className={`bg-white rounded-xl overflow-hidden flex border ${isToday ? 'border-blue-400' : 'border-gray-100'} shadow-sm`}>
                      <div className="w-1.5 shrink-0 bg-blue-500" />
                      <div className="flex-1 p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                            {isToday ? 'DZIŚ · ' : ''}{new Date(shift.date + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <p className="text-base font-bold text-gray-900 tabular-nums">{fmtT(shift.time_start)} – {fmtT(shift.time_end)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{hrs.toFixed(1)}h{shift.locations ? ` · ${(shift.locations as any)?.name ?? (Array.isArray(shift.locations) ? shift.locations[0]?.name : '')}` : ''}</p>
                        </div>
                        {shift.position && (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${posColor(shift.position)}`}>
                            {shift.position}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  EMPLOYEES                                              ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'employees' && selectedLocation && (
          <EmployeesManager
            supabase={supabase}
            companyId={selectedLocation.locations?.company_id ?? ''}
            locations={[{ id: selectedLocation.location_id, name: selectedLocation.locations?.name ?? '' }]}
            defaultLocationId={selectedLocation.location_id}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  KIOSK QR                                               ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'kiosk' && selectedLocation && (
          <KioskView locationId={selectedLocation.location_id} locationName={selectedLocation.locations?.name ?? ''} />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  ATTENDANCE / TIME RECORDS                              ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'attendance' && selectedLocation && (
          <AttendanceView
            locationId={selectedLocation.location_id}
            locationName={selectedLocation.locations?.name ?? ''}
            supabase={supabase}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  DASHBOARD (multi-location)                             ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'dashboard' && (
          <DashboardView locations={myLocations} supabase={supabase} />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  LEAVE REQUESTS                                         ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'leave' && selectedLocation && (
          <LeaveView
            locationId={selectedLocation.location_id}
            locationName={selectedLocation.locations?.name ?? ''}
            supabase={supabase}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  SHIFT SWAPS                                            ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'swaps' && selectedLocation && (
          <SwapView
            locationId={selectedLocation.location_id}
            locationName={selectedLocation.locations?.name ?? ''}
            supabase={supabase}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  CERTIFICATIONS                                         ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'certs' && selectedLocation && (
          <CertsView locationId={selectedLocation.location_id} supabase={supabase} />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  DOCUMENTS                                              ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'documents' && selectedLocation && (
          <DocumentsView locationId={selectedLocation.location_id} supabase={supabase} />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  TIPS LOG                                               ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'tips' && selectedLocation && (
          <TipsView
            locationId={selectedLocation.location_id}
            locationName={selectedLocation.locations?.name ?? ''}
            supabase={supabase}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  EMPLOYEE ONBOARDING                                    ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'onboarding' && selectedLocation && (
          <OnboardingView
            locationId={selectedLocation.location_id}
            locationName={selectedLocation.locations?.name ?? ''}
            supabase={supabase}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  ACCOUNT MANAGEMENT                                     ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'account' && (
          <AccountView
            supabase={supabase}
            router={router}
            accountProfile={accountProfile}
            setAccountProfile={setAccountProfile}
            accountLoading={accountLoading}
            setAccountLoading={setAccountLoading}
            portalLoading={portalLoading}
            setPortalLoading={setPortalLoading}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            deleteLoading={deleteLoading}
            setDeleteLoading={setDeleteLoading}
            deleteError={deleteError}
            setDeleteError={setDeleteError}
            accountError={accountError}
            setAccountError={setAccountError}
          />
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  1. DAILY REPORTING                                      ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'reporting' && (
          <div className="max-w-4xl">
            <header className="mb-6">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">Raport dzienny</h1>
              <div className="flex gap-2 mt-4">
                <Button variant={reportingSubView === 'form' ? 'default' : 'outline'} onClick={() => setReportingSubView('form')}>
                  <FileText className="w-4 h-4 mr-2" />Formularz</Button>
                <Button variant={reportingSubView === 'history' ? 'default' : 'outline'} onClick={() => setReportingSubView('history')}>
                  <Clock className="w-4 h-4 mr-2" />Historia</Button>
              </div>
            </header>

            {reportingSubView === 'history' && (
              <Card>
                <CardHeader><CardTitle>Historia raportów dziennych</CardTitle></CardHeader>
                <CardContent>
                  {dailyReportHistory.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Brak raportów</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-xs text-slate-500 uppercase">
                          <th className="py-2 pr-3">Data</th>
                          <th className="pr-3 text-right">Brutto</th>
                          <th className="pr-3 text-right">Netto</th>
                          <th className="pr-3 text-right">Tx</th>
                          <th className="pr-3 text-right">Godz.</th>
                          <th className="pr-3">Status</th>
                          <th className="pr-3">Zamykający</th>
                        </tr></thead>
                        <tbody>
                          {dailyReportHistory.map(r => (
                            <tr key={r.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 pr-3 font-medium">{r.date}</td>
                              <td className="pr-3 text-right">{r.gross_revenue != null ? fmt2(r.gross_revenue) : '—'}</td>
                              <td className="pr-3 text-right">{r.net_revenue != null ? fmt2(r.net_revenue) : '—'}</td>
                              <td className="pr-3 text-right">{r.transaction_count ?? '—'}</td>
                              <td className="pr-3 text-right">{r.total_labor_hours != null ? r.total_labor_hours.toFixed(1) : '—'}</td>
                              <td className="pr-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[r.status || 'draft']?.color || 'bg-gray-100'}`}>{STATUS_LABELS[r.status || 'draft']?.label || r.status}</span></td>
                              <td className="pr-3 text-slate-500 text-xs">{r.closing_person || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {reportingSubView === 'form' && (
            <>
            {validationErrors.length > 0 && (
              <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-6 h-6 text-red-600" />
                  <h3 className="font-bold text-red-800 text-lg">Nie można zapisać ({validationErrors.length} błędów)</h3></div>
                <ul className="space-y-1">{validationErrors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{e.message}</li>
                ))}</ul>
              </div>
            )}

            <div className="bg-white border border-gray-300 rounded-sm shadow-sm p-8">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-50 border border-slate-200 rounded p-4">
                <div className="space-y-1"><Label className="font-semibold">Data raportu</Label>
                  <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="bg-white h-10 w-48" /></div>
                <div className="text-right"><p className="text-xs text-slate-500 uppercase font-semibold">Osoba zamykająca</p>
                  <p className="text-sm font-medium text-slate-800">{closingPersonName}</p>
                  <p className="text-xs text-slate-400">{closingPersonEmail}</p></div>
              </div>

              {/* S1: Sprzedaż */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">1. Sprzedaż rzeczywista</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-6">
                <div className="space-y-2"><Label>Utarg brutto *{fieldErr('gross') && <span className="text-red-500 text-xs ml-1">⚠</span>}</Label>
                  <div className="relative"><span className="absolute left-3 top-3 text-gray-400">zł</span>
                    <Input type="number" placeholder="0,00" value={salesForm.gross} onChange={e => setSalesForm({...salesForm, gross: e.target.value})}
                      disabled={isReadOnly} className={`bg-gray-50 h-12 text-lg pl-8 ${fieldErr('gross') ? 'border-red-400 ring-1 ring-red-300' : ''}`} /></div></div>
                <div className="space-y-2"><Label>Utarg netto <span className="text-xs text-slate-400 ml-1">{isNetManual ? '(ręcznie)' : '(auto)'}</span></Label>
                  <div className="relative"><span className="absolute left-3 top-3 text-gray-400">zł</span>
                    <Input type="number" placeholder={gross > 0 ? netCalculated.toFixed(2) : '0,00'} value={salesForm.netRevenue}
                      onChange={e => setSalesForm({...salesForm, netRevenue: e.target.value})} disabled={isReadOnly} className="bg-gray-50 h-12 text-lg pl-8" /></div>
                  {!isNetManual && gross > 0 && <p className="text-xs text-slate-400">Auto: {fmt2(netCalculated)}</p>}
                  {isNetManual && gross > 0 && Math.abs(netManual - netCalculated) > 1 && <p className="text-xs text-amber-600">⚠ Różnica: {fmt2(netManual - netCalculated)}</p>}</div>
                <div className="space-y-2"><Label>Transakcje *{fieldErr('transactions') && <span className="text-red-500 text-xs ml-1">⚠</span>}</Label>
                  <Input type="number" placeholder="0" value={salesForm.transactions} onChange={e => setSalesForm({...salesForm, transactions: e.target.value})}
                    disabled={isReadOnly} className={`bg-gray-50 h-12 text-lg ${fieldErr('transactions') ? 'border-red-400 ring-1 ring-red-300' : ''}`} /></div>
                <div />
                <div className="space-y-2"><Label>Karty{fieldErr('card_cash') && <span className="text-red-500 text-xs ml-1">⚠</span>}</Label>
                  <div className="relative"><span className="absolute left-3 top-3 text-gray-400">zł</span>
                    <Input type="number" placeholder="0,00" value={salesForm.card} onChange={e => setSalesForm({...salesForm, card: e.target.value})}
                      disabled={isReadOnly} className={`bg-gray-50 h-12 text-lg pl-8 ${fieldErr('card_cash') ? 'border-red-400' : ''}`} /></div></div>
                <div className="space-y-2"><Label>Gotówka{fieldErr('card_cash') && <span className="text-red-500 text-xs ml-1">⚠</span>}</Label>
                  <div className="relative"><span className="absolute left-3 top-3 text-gray-400">zł</span>
                    <Input type="number" placeholder="0,00" value={salesForm.cash} onChange={e => setSalesForm({...salesForm, cash: e.target.value})}
                      disabled={isReadOnly} className={`bg-gray-50 h-12 text-lg pl-8 ${fieldErr('card_cash') ? 'border-red-400' : ''}`} /></div></div>
                <div className="space-y-2"><Label>Online</Label>
                  <div className="relative"><span className="absolute left-3 top-3 text-gray-400">zł</span>
                    <Input type="number" placeholder="0,00" value={salesForm.online} onChange={e => setSalesForm({...salesForm, online: e.target.value})}
                      disabled={isReadOnly} className="bg-gray-50 h-12 text-lg pl-8" /></div></div>
              </div>

              {gross > 0 && Math.abs(card + cash + online - gross) > 0.5 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 rounded flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4" />Karty + Gotówka + Online = {fmt2(card + cash + online)} ≠ Brutto {fmt2(gross)}</div>
              )}

              <Card className="mb-8"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-600">Podsumowanie sprzedaży</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-slate-500 uppercase">Netto</p><p className="text-xl font-bold">{fmt0(net)}</p>
                    {isNetManual && <p className="text-xs text-blue-600">📝 Ręczne</p>}</div>
                  <div><p className="text-xs text-slate-500 uppercase">Śr. paragon</p><p className="text-xl font-bold">{fmt2(aov)}</p>
                    <p className="text-xs text-slate-500">Tx: {tx}</p></div>
                  <div><p className="text-xs text-slate-500 uppercase">Płatności</p>
                    <p className="text-xs text-slate-500">Karty: {gross > 0 ? fmtPct(cardPercent) : '—'}</p>
                    <p className="text-xs text-slate-500">Gotówka: {gross > 0 ? fmtPct(cashPercent) : '—'}</p>
                    <p className="text-xs text-slate-500">Online: {gross > 0 && online > 0 ? fmtPct(onlinePercent) : '—'}</p></div>
                </CardContent></Card>

              {/* S2: Plan */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">2. Plan vs wykonanie</h3>
              <div className="grid grid-cols-2 gap-6 mb-4 bg-gray-50 p-6 rounded border border-gray-200">
                <div className="space-y-2"><Label>Plan netto</Label><Input type="number" placeholder="0" value={salesForm.targetGross} onChange={e => setSalesForm({...salesForm, targetGross: e.target.value})} disabled={isReadOnly} className="bg-white" /></div>
                <div className="space-y-2"><Label>Plan transakcji</Label><Input type="number" placeholder="0" value={salesForm.targetTx} onChange={e => setSalesForm({...salesForm, targetTx: e.target.value})} disabled={isReadOnly} className="bg-white" /></div>
              </div>

              {isSalesBelow80 && (
                <div className={`mb-8 p-4 rounded border-2 ${fieldErr('salesDeviationExplanation') ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'}`}>
                  <p className="font-bold text-amber-800 text-sm mb-2">⚠ Sprzedaż &lt; 80% planu ({fmtPct(planRealisation)}) — wyjaśnij *</p>
                  <textarea value={salesForm.salesDeviationExplanation} onChange={e => setSalesForm({...salesForm, salesDeviationExplanation: e.target.value})}
                    disabled={isReadOnly} placeholder="Przyczyna…" className="w-full min-h-[60px] rounded-md border border-input bg-white px-3 py-2 text-sm" /></div>
              )}

              {/* S3: Obsada */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">3. Obsada zmian{fieldErr('staff') && <span className="text-red-500 text-sm ml-2">⚠</span>}</h3>
              <div className={`grid grid-cols-3 gap-6 mb-8 p-6 rounded border ${fieldErr('staff') ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                {[['staffMorning', '🌅 Rano'], ['staffAfternoon', '☀️ Popołudnie'], ['staffEvening', '🌙 Wieczór']].map(([key, label]) => (
                  <div key={key} className="space-y-2"><Label>{label as string}</Label>
                    <Input type="number" min="0" placeholder="0" value={(salesForm as any)[key]}
                      onChange={e => setSalesForm({...salesForm, [key]: e.target.value})} disabled={isReadOnly} className="bg-white h-12 text-lg text-center" /></div>
                ))}
              </div>

              {/* S4: Godziny */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">4. Godziny pracowników{fieldErr('hours') && <span className="text-red-500 text-sm ml-2">⚠</span>}</h3>
              <Card className={`mb-6 ${fieldErr('hours') ? 'border-red-300' : ''}`}>
                <CardContent className="space-y-3 pt-4">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 border-b pb-2">
                    <div className="col-span-4">Pracownik</div><div className="col-span-2 text-right">Godziny</div>
                    <div className="col-span-2 text-right">Stawka/h</div><div className="col-span-3 text-right">Koszt</div><div className="col-span-1" /></div>
                  {employeeRows.map((row, i) => {
                    const emp = employees.find(e => e.id === row.employee_id)
                    const h = Number(row.hours) || 0
                    const rate = Number(row.rate) || emp?.real_hour_cost || emp?.base_rate || 0
                    return (<div key={i} className="grid grid-cols-12 gap-2 items-center text-sm">
                      <div className="col-span-4"><select value={row.employee_id} onChange={e => selectEmployee(i, e.target.value)}
                        disabled={isReadOnly} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="">– wybierz –</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                      <div className="col-span-2"><Input type="number" value={row.hours} onChange={e => updateEmployeeRow(i, 'hours', e.target.value)} disabled={isReadOnly} className="h-9 text-right" /></div>
                      <div className="col-span-2"><Input type="number" value={row.rate} onChange={e => updateEmployeeRow(i, 'rate', e.target.value)} disabled={isReadOnly} placeholder={emp ? String(emp.real_hour_cost ?? emp.base_rate ?? '—') : '—'} className="h-9 text-right" /></div>
                      <div className="col-span-3 text-right font-medium">{h * rate > 0 ? fmt2(h * rate) : '—'}</div>
                      <div className="col-span-1 flex justify-end">{!isReadOnly && <Button variant="ghost" size="icon" onClick={() => removeEmployeeRow(i)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>}</div>
                    </div>)})}
                  {!isReadOnly && <Button variant="outline" size="sm" onClick={addEmployeeRow} className="mt-2"><Plus className="w-4 h-4 mr-1" />Dodaj</Button>}
                  <div className="border-t pt-3 text-xs text-slate-500 flex justify-between">
                    <span>Suma: <b>{totalHours.toFixed(1)} h</b></span><span>Koszt: <b>{fmt2(laborCost)}</b></span><span>Śr: <b>{fmt2(effectiveHourlyRate)}</b></span></div>
                </CardContent></Card>

              {isLaborAboveThreshold && (
                <div className={`mb-8 p-4 rounded border-2 ${fieldErr('laborExplanation') ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'}`}>
                  <p className="font-bold text-red-800 text-sm mb-2">⚠ Koszt pracy &gt; 40% ({fmtPct(laborPercent)}) — wyjaśnij *</p>
                  <textarea value={salesForm.laborExplanation} onChange={e => setSalesForm({...salesForm, laborExplanation: e.target.value})}
                    disabled={isReadOnly} placeholder="Przyczyna…" className="w-full min-h-[60px] rounded-md border border-input bg-white px-3 py-2 text-sm" /></div>
              )}

              {/* S5: KPI */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">5. KPI dnia</h3>
              <Card className="mb-8"><CardContent className="grid grid-cols-3 gap-4 text-sm pt-6">
                <div><p className="text-xs text-slate-500 uppercase">Netto</p><p className="text-lg font-bold">{fmt0(net)}</p></div>
                <div><p className="text-xs text-slate-500 uppercase">Plan %</p><p className={`text-lg font-bold ${isSalesBelow80 ? 'text-red-700' : ''}`}>{planNet > 0 ? fmtPct(planRealisation) : '—'}</p></div>
                <div><p className="text-xs text-slate-500 uppercase">Paragon</p><p className="text-lg font-bold">{fmt2(aov)}</p></div>
                <div><p className="text-xs text-slate-500 uppercase">Praca %</p><p className={`text-lg font-bold ${kpiColor}`}>{net > 0 ? fmtPct(laborPercent) : '—'}</p></div>
                <div><p className="text-xs text-slate-500 uppercase">Netto/h</p><p className="text-lg font-bold">{fmt2(salesPerHour)}</p></div>
                <div><p className="text-xs text-slate-500 uppercase">Obsada</p><p className="text-lg font-bold">{totalStaff} <span className="text-xs font-normal text-slate-500">({staffMorning}/{staffAfternoon}/{staffEvening})</span></p></div>
              </CardContent></Card>

              {/* S6: Gotówka */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">6. Kontrola gotówki</h3>
              <Card className="mb-4"><CardContent className="grid grid-cols-3 gap-4 pt-4 text-sm">
                <div className="space-y-2"><Label>Raport kasowy</Label><Input type="number" value={salesForm.cashReported} onChange={e => setSalesForm({...salesForm, cashReported: e.target.value})} disabled={isReadOnly} className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>Stan fizyczny</Label><Input type="number" value={salesForm.cashPhysical} onChange={e => setSalesForm({...salesForm, cashPhysical: e.target.value})} disabled={isReadOnly} className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>Różnica</Label><p className={`h-10 flex items-center font-bold ${cashDiffColor}`}>{fmt2(cashDiff)} {cashDiff === 0 ? '(OK)' : cashDiff > 0 ? '– nadw.' : '– niedob.'}</p></div>
              </CardContent></Card>

              {(Math.abs(cashDiff) > 0.01) && (
                <div className={`mb-8 p-4 rounded border-2 ${fieldErr('cashDiffExplanation') ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'}`}>
                  <p className={`font-bold text-sm mb-2 ${isCashDiffAbove20 ? 'text-red-800' : 'text-amber-800'}`}>⚠ Różnica: {fmt2(cashDiff)} — wyjaśnij *</p>
                  <textarea value={salesForm.cashDiffExplanation} onChange={e => setSalesForm({...salesForm, cashDiffExplanation: e.target.value})}
                    disabled={isReadOnly} placeholder="Przyczyna…" className="w-full min-h-[60px] rounded-md border border-input bg-white px-3 py-2 text-sm" /></div>
              )}

              {/* S7: Koszty ops */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">7. Koszty operacyjne</h3>
              <Card className="mb-8"><CardContent className="grid grid-cols-4 gap-4 pt-4 text-sm">
                {[['pettyExpense', 'Wydatki drobne'], ['losses', 'Straty'], ['refunds', 'Zwroty']].map(([k, l]) => (
                  <div key={k} className="space-y-2"><Label>{l as string}</Label><Input type="number" placeholder="0" value={(salesForm as any)[k]}
                    onChange={e => setSalesForm({...salesForm, [k]: e.target.value})} disabled={isReadOnly} className="bg-gray-50" /></div>
                ))}<div className="space-y-2"><Label>Suma</Label><p className="h-10 flex items-center font-bold">{fmt2(dailyOpsTotal)}</p></div>
              </CardContent></Card>

              {/* S8: Zdarzenia */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">8. Zdarzenia dnia</h3>
              <Card className="mb-8"><CardContent className="space-y-4 pt-4 text-sm">
                <select value={salesForm.incidentType} onChange={e => setSalesForm({...salesForm, incidentType: e.target.value})} disabled={isReadOnly}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">– brak –</option><option value="problem_operacyjny">Problem operacyjny</option>
                  <option value="awaria">Awaria</option><option value="braki_kadrowe">Braki kadrowe</option>
                  <option value="reklamacje">Reklamacje</option><option value="inne">Inne</option></select>
                <textarea value={salesForm.incidentDetails} onChange={e => setSalesForm({...salesForm, incidentDetails: e.target.value})}
                  disabled={isReadOnly} placeholder="Opis…" className="w-full min-h-[60px] rounded-md border border-input bg-gray-50 px-3 py-2 text-sm" />
              </CardContent></Card>

              {/* S9: Komentarz */}
              <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">9. Komentarz</h3>
              <textarea value={salesForm.comments} onChange={e => setSalesForm({...salesForm, comments: e.target.value})}
                disabled={isReadOnly} placeholder="Uwagi (opcjonalnie)…" className="w-full min-h-[60px] rounded-md border border-input bg-gray-50 px-3 py-2 text-sm mb-8" />

              {!isReadOnly && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Zamykający: {closingPersonName}</p>
                  <Button onClick={handleReportSubmit} className="bg-black text-white hover:bg-gray-800 h-14 px-8 text-lg font-bold"><Send className="w-4 h-4 mr-2" />Wyślij raport</Button>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  2. INVOICES & COSTS                                     ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'invoices' && (
          <div className="max-w-5xl">
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Faktury i koszty</h1>
              <div className="flex gap-2 mt-4">
                <Button variant={invoiceSubView === 'form' ? 'default' : 'outline'} onClick={() => setInvoiceSubView('form')}>
                  <FileText className="w-4 h-4 mr-2" />Nowa faktura</Button>
                <Button variant={invoiceSubView === 'semis_recon' ? 'default' : 'outline'} onClick={() => setInvoiceSubView('semis_recon')}>
                  <RefreshCw className="w-4 h-4 mr-2" />Uzgodnienie SEMIS</Button>
                <Button variant={invoiceSubView === 'history' ? 'default' : 'outline'} onClick={() => setInvoiceSubView('history')}>
                  <Clock className="w-4 h-4 mr-2" />Historia</Button>
              </div>
            </header>

            {/* ── Invoice Form ── */}
            {invoiceSubView === 'form' && (
              <>
                {invoiceErrors.length > 0 && (
                  <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-6 h-6 text-red-600" /><h3 className="font-bold text-red-800">Nie można zapisać</h3></div>
                    <ul className="space-y-1">{invoiceErrors.map((e, i) => <li key={i} className="flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 mt-0.5" />{e.message}</li>)}</ul>
                  </div>
                )}

                {/* Type selection */}
                <Card className={`mb-6 ${invErr('invoiceType') ? 'border-red-400' : ''}`}>
                  <CardHeader><CardTitle>Krok 1 — Typ faktury</CardTitle></CardHeader>
                  <CardContent><div className="grid grid-cols-2 gap-4">
                    {[{ t: 'COS' as const, icon: Package, label: 'Zakup magazynowy (COS)', desc: 'Rozbijana na pozycje — COGS, stany', color: 'blue' },
                      { t: 'SEMIS' as const, icon: Receipt, label: 'Koszt operacyjny (SEMIS)', desc: 'Zbiorczo — czynsz, media, marketing', color: 'emerald' }
                    ].map(({ t, icon: Icon, label, desc, color }) => (
                      <button key={t} onClick={() => { setInvoiceType(t); setInvoiceErrors([]) }}
                        className={`p-6 rounded-lg border-2 text-left transition-all ${invoiceType === t ? `border-${color}-600 bg-${color}-50 ring-2 ring-${color}-200` : 'border-gray-200 hover:border-gray-400'}`}>
                        <div className="flex items-center gap-3 mb-2"><Icon className={`w-6 h-6 ${invoiceType === t ? `text-${color}-600` : 'text-gray-400'}`} />
                          <span className="font-bold text-lg">{label}</span></div>
                        <p className="text-sm text-slate-500">{desc}</p>
                      </button>
                    ))}</div></CardContent></Card>

                {invoiceType && (
                  <>
                    {/* Common fields */}
                    <Card className="mb-6"><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Krok 2 — Dane faktury
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${invoiceType === 'COS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {invoiceType === 'COS' ? '📦 Magazynowa' : '💼 Kosztowa'}</span></CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2"><Label>Dostawca *{invErr('supplier') && <span className="text-red-500 text-xs ml-1">⚠</span>}</Label>
                            <Input placeholder="np. Hurtownia" value={invoiceCommon.supplier} onChange={e => setInvoiceCommon({...invoiceCommon, supplier: e.target.value})} className={invErr('supplier') ? 'border-red-400' : ''} /></div>
                          <div className="space-y-2"><Label>Numer faktury *{invErr('invoiceNumber') && <span className="text-red-500 text-xs ml-1">⚠</span>}</Label>
                            <Input placeholder="FV/2025/001" value={invoiceCommon.invoiceNumber} onChange={e => setInvoiceCommon({...invoiceCommon, invoiceNumber: e.target.value})} className={invErr('invoiceNumber') ? 'border-red-400' : ''} /></div>
                          <div className="space-y-2"><Label>Data sprzedaży *</Label><Input type="date" value={invoiceCommon.saleDate} onChange={e => setInvoiceCommon({...invoiceCommon, saleDate: e.target.value})} /></div>
                          <div className="space-y-2"><Label>Data wpływu</Label><Input type="date" value={invoiceCommon.receiptDate} onChange={e => setInvoiceCommon({...invoiceCommon, receiptDate: e.target.value})} /></div>
                        </div>
                        <div className={`mt-6 border-2 border-dashed p-4 rounded ${invoiceType === 'COS' && invErr('file') ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                          <Label className="mb-2 block font-semibold">{invoiceType === 'COS' ? 'Załącznik (obowiązkowy) *' : 'Załącznik (opcjonalnie)'}</Label>
                          <Input type="file" accept="image/*,application/pdf" onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                          {invoiceFile && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{invoiceFile.name}</p>}
                        </div>
                        <div className="mt-4 bg-slate-50 rounded p-3 text-sm text-slate-600">💳 Płatność: <b>Przelew</b> (auto)</div>
                      </CardContent></Card>

                    {/* COS Line Items */}
                    {invoiceType === 'COS' && (
                      <Card className={`mb-6 ${invErr('lineItems') ? 'border-red-400' : ''}`}>
                        <CardHeader><CardTitle>Krok 3 — Pozycje (COS)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 border-b pb-2">
                            <div className="col-span-1">Typ</div><div className="col-span-2">Produkt</div><div className="col-span-2">Kategoria</div>
                            <div className="col-span-1 text-right">Ilość</div><div className="col-span-1">Jedn.</div>
                            <div className="col-span-1 text-right">Cena</div><div className="col-span-1 text-right">Netto</div>
                            <div className="col-span-1">VAT</div><div className="col-span-1 text-right">Brutto</div><div className="col-span-1" /></div>
                          {cosLineItems.map((item, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center text-sm">
                              <div className="col-span-1">
                                <select value={item.source || 'ingredient'} onChange={e => setCosLineItems(p => { const c = [...p]; c[i] = { ...c[i], source: e.target.value as 'ingredient' | 'product', product: '', ingredient_id: null, product_id: null }; return c })}
                                  className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs">
                                  <option value="ingredient">Skł.</option>
                                  <option value="product">Prod.</option>
                                </select>
                              </div>
                              <div className="col-span-2">
                                {(item.source || 'ingredient') === 'ingredient' ? (
                                  <IngredientAutocomplete
                                    value={item.product}
                                    onChange={(v) => updateCosLine(i, 'product', v)}
                                    onSelect={(ing) => {
                                      setCosLineItems(p => { const c = [...p]; c[i] = { ...c[i], product: ing.name, ingredient_id: ing.id, product_id: null }; return c })
                                    }}
                                  />
                                ) : (
                                  <ProductAutocomplete
                                    value={item.product}
                                    onChange={(v) => updateCosLine(i, 'product', v)}
                                    onSelect={(prod) => {
                                      setCosLineItems(p => { const c = [...p]; c[i] = { ...c[i], product: prod.name, product_id: prod.id, ingredient_id: null, unit: prod.unit || c[i].unit, netPrice: prod.last_price ? String(prod.last_price) : c[i].netPrice }; return c })
                                    }}
                                  />
                                )}
                              </div>
                              <div className="col-span-2"><select value={item.cosCategory} onChange={e => updateCosLine(i, 'cosCategory', e.target.value)}
                                className={`h-9 w-full rounded-md border ${item.product && !item.cosCategory ? 'border-red-300' : 'border-input'} bg-background px-1 text-xs`}>
                                <option value="">–</option>{COS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                              <div className="col-span-1"><Input type="number" value={item.quantity} onChange={e => updateCosLine(i, 'quantity', e.target.value)} className="h-9 text-right" /></div>
                              <div className="col-span-1"><select value={item.unit} onChange={e => updateCosLine(i, 'unit', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs">
                                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
                              <div className="col-span-1"><Input type="number" value={item.netPrice} onChange={e => updateCosLine(i, 'netPrice', e.target.value)} className="h-9 text-right" /></div>
                              <div className="col-span-1 text-right text-slate-700 font-medium">{getLineNet(item) > 0 ? fmt2(getLineNet(item)) : '—'}</div>
                              <div className="col-span-1"><select value={item.vatRate} onChange={e => updateCosLine(i, 'vatRate', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs">
                                {VAT_RATES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}</select></div>
                              <div className="col-span-1 text-right font-medium">{getLineGross(item) > 0 ? fmt2(getLineGross(item)) : '—'}</div>
                              <div className="col-span-1 flex justify-end"><Button variant="ghost" size="icon" onClick={() => removeCosLine(i)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></div>
                            </div>))}
                          <Button variant="outline" size="sm" onClick={addCosLine}><Plus className="w-4 h-4 mr-1" />Dodaj pozycję</Button>
                          <div className="border-t-2 pt-4 mt-4 grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500 uppercase">Netto</p><p className="text-xl font-bold">{fmt2(cosTotalNet)}</p></div>
                            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500 uppercase">VAT</p><p className="text-xl font-bold">{fmt2(cosTotalVat)}</p></div>
                            <div className="bg-blue-50 rounded p-3 border border-blue-200"><p className="text-xs text-blue-600 uppercase font-semibold">Brutto</p><p className="text-xl font-bold text-blue-800">{fmt2(cosTotalGross)}</p></div>
                          </div>
                        </CardContent></Card>
                    )}

                    {/* SEMIS Form */}
                    {invoiceType === 'SEMIS' && (
                      <Card className={`mb-6 ${invErr('semisAmount') ? 'border-red-400' : ''}`}>
                        <CardHeader><CardTitle>Krok 3 — Koszty (SEMIS)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 border-b pb-2">
                            <div className="col-span-4">Opis</div>
                            <div className="col-span-3">Kategoria</div>
                            <div className="col-span-2 text-right">Kwota netto</div>
                            <div className="col-span-2">VAT</div>
                            <div className="col-span-1" />
                          </div>
                          {semisLineItems.map((item, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <Input placeholder="Opis pozycji…" value={item.description} onChange={e => updateSemisLine(i, 'description', e.target.value)} className="h-9 text-sm" />
                              </div>
                              <div className="col-span-3">
                                <select value={item.category} onChange={e => updateSemisLine(i, 'category', e.target.value)}
                                  className={`h-9 w-full rounded-md border ${item.description && !item.category ? 'border-red-300' : 'border-input'} bg-background px-1 text-xs`}>
                                  <option value="">– wybierz –</option>
                                  {SEMIS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                              </div>
                              <div className="col-span-2">
                                <div className="relative"><span className="absolute left-2 top-2 text-gray-400 text-xs">zł</span>
                                  <Input type="number" placeholder="0,00" value={item.totalNet} onChange={e => updateSemisLine(i, 'totalNet', e.target.value)} className="pl-6 h-9 text-right text-sm" /></div>
                              </div>
                              <div className="col-span-2">
                                <select value={item.vatRate} onChange={e => updateSemisLine(i, 'vatRate', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs">
                                  {VAT_RATES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </select>
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <Button variant="ghost" size="icon" onClick={() => removeSemisLine(i)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={addSemisLine}><Plus className="w-4 h-4 mr-1" />Dodaj pozycję</Button>
                          <div className="grid grid-cols-3 gap-4 border-t-2 pt-4">
                            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500 uppercase">Netto</p><p className="text-xl font-bold">{fmt2(semisTotalNet)}</p></div>
                            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500 uppercase">VAT</p><p className="text-xl font-bold">{fmt2(semisTotalGross - semisTotalNet)}</p></div>
                            <div className="bg-emerald-50 rounded p-3 border border-emerald-200"><p className="text-xs text-emerald-600 uppercase font-semibold">Brutto</p><p className="text-xl font-bold text-emerald-800">{fmt2(semisTotalGross)}</p></div>
                          </div>
                        </CardContent></Card>
                    )}

                    <div className="flex justify-end mb-8">
                      <Button onClick={handleInvoiceSubmit} disabled={uploading}
                        className={`h-14 px-8 text-lg font-bold text-white ${invoiceType === 'COS' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        <Send className="w-4 h-4 mr-2" />{uploading ? 'Zapisywanie…' : 'Wyślij fakturę'}</Button>
                    </div>
                  </>
                )}

                {/* Excel import */}
                <Card className="bg-green-50 border-green-200"><CardHeader><CardTitle className="text-green-800 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Import z Excela</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-green-700">Kolumny: <b>Data sprzedaży</b>, <b>Sprzedawca</b>, <b>RK</b>, <b>PLN Netto</b></p>
                    <div className="bg-white p-6 rounded border border-green-200 text-center"><Input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} disabled={excelLoading} /></div>
                    {excelLoading ? <p className="text-center font-bold text-green-800 animate-pulse">Przetwarzanie…</p>
                      : <div className="flex items-center justify-center gap-2 text-green-700 text-sm"><CheckCircle className="w-4 h-4" />Gotowe</div>}
                  </CardContent></Card>
              </>
            )}

            {/* ── SEMIS Reconciliation Entry (Ops data entry) ── */}
            {invoiceSubView === 'semis_recon' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />Uzgodnienie SEMIS — wprowadzanie danych
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 mb-6">
                      Wprowadź dane z faktury do uzgodnienia z księgowością. Po wprowadzeniu wszystkich pozycji, wyślij do zatwierdzenia.
                    </p>

                    {/* Entry form */}
                    <div className="bg-slate-50 rounded-lg p-6 mb-6">
                      <h4 className="font-semibold mb-4">Nowa pozycja</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Nr faktury *</Label>
                          <Input 
                            placeholder="FV/2025/001" 
                            value={newSemisEntry.invoice_number}
                            onChange={e => setNewSemisEntry({...newSemisEntry, invoice_number: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dostawca</Label>
                          <Input 
                            placeholder="Nazwa dostawcy"
                            value={newSemisEntry.supplier}
                            onChange={e => setNewSemisEntry({...newSemisEntry, supplier: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data faktury</Label>
                          <Input 
                            type="date"
                            value={newSemisEntry.invoice_date}
                            onChange={e => setNewSemisEntry({...newSemisEntry, invoice_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Konto księgowe</Label>
                          <select 
                            value={newSemisEntry.accounting_account}
                            onChange={e => setNewSemisEntry({...newSemisEntry, accounting_account: e.target.value})}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">– wybierz –</option>
                            {ACCOUNTING_ACCOUNTS.map(a => (
                              <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Kwota netto *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400">zł</span>
                            <Input 
                              type="number" 
                              placeholder="0,00"
                              value={newSemisEntry.amount}
                              onChange={e => setNewSemisEntry({...newSemisEntry, amount: e.target.value})}
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Opis</Label>
                          <Input 
                            placeholder="Opcjonalny opis"
                            value={newSemisEntry.description}
                            onChange={e => setNewSemisEntry({...newSemisEntry, description: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button onClick={handleAddSemisReconEntry} disabled={semisReconSaving}>
                          <Plus className="w-4 h-4 mr-2" />Dodaj pozycję
                        </Button>
                      </div>
                    </div>

                    {/* Pending entries list */}
                    {semisReconEntries.length > 0 ? (
                      <>
                        <h4 className="font-semibold mb-3">Pozycje do wysłania ({semisReconEntries.length})</h4>
                        <div className="border rounded-lg overflow-hidden mb-4">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr className="border-b text-left text-xs text-slate-500 uppercase">
                                <th className="py-2 px-3">Nr faktury</th>
                                <th className="px-3">Dostawca</th>
                                <th className="px-3">Data</th>
                                <th className="px-3">Konto</th>
                                <th className="px-3 text-right">Kwota</th>
                                <th className="px-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {semisReconEntries.map((entry) => (
                                <tr key={entry.id} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-3 font-medium">{entry.invoice_number}</td>
                                  <td className="px-3">{entry.supplier || '—'}</td>
                                  <td className="px-3 text-slate-500">{entry.invoice_date}</td>
                                  <td className="px-3 text-slate-500">{entry.accounting_account || '—'}</td>
                                  <td className="px-3 text-right font-medium">{fmt2(Number(entry.amount) || 0)}</td>
                                  <td className="px-3">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => entry.id && handleDeleteSemisEntry(entry.id)}
                                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-800 font-medium">Suma: {fmt2(semisReconEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0))}</p>
                            <p className="text-xs text-blue-600">{semisReconEntries.length} pozycji do weryfikacji</p>
                          </div>
                          <Button 
                            onClick={handleSubmitSemisReconBatch}
                            disabled={semisReconSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {semisReconSaving ? 'Wysyłanie...' : 'Wyślij do zatwierdzenia'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Brak pozycji do wysłania</p>
                        <p className="text-sm mt-1">Dodaj pozycje używając formularza powyżej</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Invoice History ── */}
            {invoiceSubView === 'history' && (
              <Card>
                <CardHeader><CardTitle>Historia wysłanych faktur</CardTitle></CardHeader>
                <CardContent>
                  {invoiceHistory.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Brak faktur</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-xs text-slate-500 uppercase">
                          <th className="py-2 pr-3">Typ</th>
                          <th className="pr-3">Nr faktury</th>
                          <th className="pr-3">Dostawca</th>
                          <th className="pr-3">Data sprzedaży</th>
                          <th className="pr-3 text-right">Brutto</th>
                          <th className="pr-3">Status</th>
                        </tr></thead>
                        <tbody>
                          {invoiceHistory.map(inv => (
                            <tr key={inv.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 pr-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inv.invoice_type === 'COS' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {inv.invoice_type === 'COS' ? 'COS (magazyn)' : 'SEMIS (koszt)'}
                                </span>
                              </td>
                              <td className="pr-3 font-medium">{inv.invoice_number}</td>
                              <td className="pr-3">{inv.supplier_name}</td>
                              <td className="pr-3 text-slate-500">{inv.service_date}</td>
                              <td className="pr-3 text-right font-medium">{fmt2(Number(inv.total_gross) || 0)}</td>
                              <td className="pr-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[inv.status]?.color || 'bg-gray-100'}`}>{STATUS_LABELS[inv.status]?.label || inv.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║  3. INVENTORY                                            ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}
        {activeView === 'inventory' && (
          <div className="max-w-5xl">
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardList className="w-8 h-8" />Inwentaryzacja
              </h1>
              {inventorySubView !== 'fill' && (
                <div className="flex gap-2 mt-4">
                  <Button variant={inventorySubView === 'active' ? 'default' : 'outline'} onClick={() => setInventorySubView('active')}>Aktywne</Button>
                  <Button variant={inventorySubView === 'history' ? 'default' : 'outline'} onClick={() => setInventorySubView('history')}>Historia</Button>
                  <Button variant={inventorySubView === 'products' ? 'default' : 'outline'} onClick={() => setInventorySubView('products')}>
                    <Package className="w-4 h-4 mr-2" />Produkty</Button>
                </div>
              )}
            </header>

            {/* ── Active Jobs ── */}
            {inventorySubView === 'active' && (
              <div className="space-y-4">
                {inventoryJobs.length === 0 ? (
                  <Card><CardContent className="py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Brak aktywnych inwentaryzacji do wykonania</p>
                    <p className="text-sm text-slate-400 mt-1">Inwentaryzacje zlecane są przez administratora</p>
                  </CardContent></Card>
                ) : (
                  inventoryJobs.map(job => (
                    <Card key={job.id} className={`hover:shadow-md transition-shadow cursor-pointer ${job.status === 'correction' ? 'border-red-300 bg-red-50' : ''}`}
                      onClick={() => openJob(job)}>
                      <CardContent className="flex items-center justify-between py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${job.type === 'MONTHLY' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                            {job.type === 'MONTHLY' ? <Calendar className="w-6 h-6 text-blue-600" /> : <ClipboardList className="w-6 h-6 text-amber-600" />}
                          </div>
                          <div>
                            <p className="font-bold text-lg">{job.type === 'MONTHLY' ? 'Miesięczna — Pełna' : 'Tygodniowa — Zlecona'}</p>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Termin: {job.due_date}</span>
                              <span>{job.item_count} pozycji</span>
                            </div>
                            {job.note && <p className="text-sm text-slate-600 mt-1 italic">&bdquo;{job.note}&rdquo;</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_LABELS[job.status]?.color || 'bg-gray-100'}`}>
                            {STATUS_LABELS[job.status]?.label || job.status}</span>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── Fill Form ── */}
            {inventorySubView === 'fill' && selectedJob && (
              <div className="space-y-6">
                <Button variant="ghost" onClick={() => { setInventorySubView('active'); setSelectedJob(null) }} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />Powrót</Button>

                {/* Job header */}
                <Card><CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">{selectedJob.type === 'MONTHLY' ? '📋 Inwentaryzacja miesięczna' : '📋 Inwentaryzacja tygodniowa'}</p>
                      <p className="text-sm text-slate-500">Termin: {selectedJob.due_date} • {jobItems.length} pozycji</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_LABELS[selectedJob.status]?.color}`}>
                      {STATUS_LABELS[selectedJob.status]?.label}</span>
                  </div>
                </CardContent></Card>

                {selectedJob.status === 'correction' && selectedJob.note && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-sm text-red-800">
                    <p className="font-bold mb-1">⚠ Komentarz admina (korekta):</p>
                    <p>{selectedJob.note}</p>
                  </div>
                )}

                {/* Search + filter */}
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input placeholder="Szukaj produktu…" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} className="pl-10" />
                  </div>
                  <select value={inventoryCategoryFilter} onChange={e => setInventoryCategoryFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Wszystkie kategorie</option>
                    {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Items table */}
                <Card><CardContent className="pt-4">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 border-b pb-2 mb-2">
                    <div className="col-span-3">Produkt</div><div className="col-span-1">Kategoria</div>
                    <div className="col-span-1">Jedn.</div><div className="col-span-2 text-right">Oczekiwany</div>
                    <div className="col-span-2 text-right">Policzony</div><div className="col-span-3">Uwagi</div>
                  </div>
                  {filteredJobItems.length === 0 ? (
                    <p className="text-center py-4 text-slate-400">Brak pozycji pasujących do filtrów</p>
                  ) : (
                    filteredJobItems.map(item => {
                      const counted = Number(item.counted_qty) || 0
                      const expected = item.expected_qty || 0
                      const diff = counted - expected
                      const hasDiff = item.counted_qty !== '' && expected > 0 && Math.abs(diff) > 0.01
                      return (
                        <div key={item.id} className={`grid grid-cols-12 gap-2 items-center text-sm py-2 border-b border-gray-100 ${hasDiff ? 'bg-amber-50' : ''}`}>
                          <div className="col-span-3 font-medium">{item.product_name}</div>
                          <div className="col-span-1 text-xs text-slate-500">{item.category}</div>
                          <div className="col-span-1 text-xs text-slate-500">{item.unit}</div>
                          <div className="col-span-2 text-right text-slate-500">{expected > 0 ? expected : '—'}</div>
                          <div className="col-span-2">
                            <Input type="number" value={item.counted_qty} onChange={e => updateJobItem(item.id, 'counted_qty', e.target.value)}
                              disabled={selectedJob.status === 'submitted' || selectedJob.status === 'approved'}
                              className={`h-9 text-right ${hasDiff ? 'border-amber-400' : ''}`} />
                          </div>
                          <div className="col-span-3">
                            <Input value={item.note} onChange={e => updateJobItem(item.id, 'note', e.target.value)}
                              disabled={selectedJob.status === 'submitted' || selectedJob.status === 'approved'}
                              placeholder="Uwagi…" className="h-9 text-xs" />
                          </div>
                        </div>
                      )
                    })
                  )}

                  <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Wyświetlane: {filteredJobItems.length} / {jobItems.length} pozycji</span>
                    <span>Uzupełnione: {jobItems.filter(i => i.counted_qty !== '').length} / {jobItems.length}</span>
                  </div>
                </CardContent></Card>

                {/* Actions */}
                {(selectedJob.status === 'draft' || selectedJob.status === 'correction') && (
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={saveInventoryDraft} disabled={inventorySaving}>
                      {inventorySaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Zapisz roboczo</Button>
                    <Button onClick={submitInventory} disabled={inventorySaving} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 text-lg font-bold">
                      <Send className="w-4 h-4 mr-2" />Wyślij do zatwierdzenia</Button>
                  </div>
                )}
              </div>
            )}

            {/* ── History ── */}
            {inventorySubView === 'history' && (
              <div className="space-y-4">
                {inventoryHistory.length === 0 ? (
                  <Card><CardContent className="py-12 text-center"><p className="text-slate-400">Brak historii</p></CardContent></Card>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs text-slate-500 uppercase">
                        <th className="py-2 pr-2">Data</th><th className="pr-2">Typ</th><th className="pr-2">Status</th>
                        <th className="pr-2">Pozycje</th><th className="pr-2">Wysłana przez</th>
                      </tr></thead>
                      <tbody>{inventoryHistory.map(job => (
                        <tr key={job.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 pr-2">{job.due_date}</td>
                          <td className="pr-2">{job.type === 'MONTHLY' ? '📅 Miesięczna' : '📋 Tygodniowa'}</td>
                          <td className="pr-2"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[job.status]?.color}`}>
                            {STATUS_LABELS[job.status]?.label}</span></td>
                          <td className="pr-2">{job.item_count}</td>
                          <td className="pr-2 text-slate-500">{job.submitted_by || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Products ── */}
            {inventorySubView === 'products' && (
              <div className="space-y-4">

                {/* ── Add product form ── */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Dodaj produkt do systemu</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-slate-500">Nazwa produktu</Label>
                        <Input placeholder="np. Mleko 3,2% 1L" value={newInvProduct.name} onChange={e => setNewInvProduct({...newInvProduct, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Jednostka</Label>
                        <select value={newInvProduct.unit} onChange={e => setNewInvProduct({...newInvProduct, unit: e.target.value})}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Kategoria</Label>
                        <select value={newInvProduct.category} onChange={e => setNewInvProduct({...newInvProduct, category: e.target.value})}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Cena netto (opcjonalnie)</Label>
                          <Input type="number" placeholder="0,00" value={newInvProduct.last_price} onChange={e => setNewInvProduct({...newInvProduct, last_price: e.target.value})} className="w-36" />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-4">
                          <input type="checkbox" checked={newInvProduct.is_food} onChange={e => setNewInvProduct({...newInvProduct, is_food: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                          <span className="text-sm text-slate-700">Produkt spożywczy</span>
                        </label>
                      </div>
                      <Button disabled={invProductSaving} onClick={async () => {
                        if (!newInvProduct.name.trim()) { alert('Podaj nazwę'); return }
                        setInvProductSaving(true)
                        const cid = selectedLocation?.locations?.company_id
                        const { error } = await supabase.from('inventory_products').insert({ name: newInvProduct.name.trim(), unit: newInvProduct.unit, category: newInvProduct.category, is_food: newInvProduct.is_food, last_price: Number(newInvProduct.last_price) || 0, active: true, company_id: cid || null })
                        setInvProductSaving(false)
                        if (error) { alert('Błąd: ' + error.message); return }
                        setNewInvProduct({ name: '', unit: 'kg', category: 'inne', is_food: true, last_price: '' })
                        fetchInvProducts()
                      }} className="h-10 px-6">
                        {invProductSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Zapisz produkt
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Products list ── */}
                <Card>
                  <CardContent className="pt-5">
                    {/* toolbar */}
                    <div className="flex flex-wrap gap-3 mb-4 items-center">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input placeholder="Szukaj produktu…" value={invProductSearch} onChange={e => setInvProductSearch(e.target.value)} className="pl-9" />
                      </div>
                      <select value={invProductCategoryFilter} onChange={e => setInvProductCategoryFilter(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]">
                        <option value="">Wszystkie kategorie</option>
                        {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Import z Excela</span>
                          <label className="cursor-pointer">
                            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={excelProductLoading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setExcelProductLoading(true)
                                const reader = new FileReader()
                                reader.onload = (evt) => {
                                  try {
                                    const wb = XLSX.read(evt.target?.result as string, { type: 'binary' })
                                    const ws = wb.Sheets[wb.SheetNames[0]]
                                    const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Array<Record<string, any>>
                                    const rows: ExcelProductRow[] = data.map(row => ({
                                      name: String(row['name'] ?? row['Produkt'] ?? row['Nazwa'] ?? '').trim(),
                                      unit: String(row['Jednostka'] ?? row['unit'] ?? 'kg').trim(),
                                      category: String(row['Kategoria'] ?? row['category'] ?? 'inne').trim(),
                                      last_price: String(row['Cena netto'] ?? row['last_price'] ?? row['Cena'] ?? ''),
                                      is_food: true,
                                    })).filter(r => r.name)
                                    setExcelProductRows(rows)
                                  } catch { alert('Błąd odczytu pliku') }
                                  setExcelProductLoading(false)
                                }
                                reader.readAsBinaryString(file)
                                e.target.value = ''
                              }}
                            />
                            <span className="h-10 px-4 inline-flex items-center gap-1.5 rounded-md border border-input bg-white text-sm font-medium cursor-pointer hover:bg-slate-50">
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                              {excelProductLoading ? 'Wczytywanie…' : 'Wybierz plik'}
                            </span>
                          </label>
                        </div>
                        <p className="text-[11px] text-slate-400">Kolumny: name / Produkt, Jednostka, Kategoria, Cena netto</p>
                      </div>
                    </div>

                    {/* Excel preview */}
                    {excelProductRows.length > 0 && (
                      <div className="mb-6 border border-blue-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-blue-800">Podgląd importu — {excelProductRows.length} produktów</p>
                            <p className="text-xs text-blue-600">Sprawdź i popraw dane, a następnie kliknij &bdquo;Zapisz wszystkie&rdquo;</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setExcelProductRows([])}>Anuluj</Button>
                            <Button size="sm" disabled={excelProductSaving} onClick={async () => {
                              const validRows = excelProductRows.filter(r => r.name.trim())
                              if (!validRows.length) return
                              setExcelProductSaving(true)
                              const cid = selectedLocation?.locations?.company_id
                              const payload = validRows.map(r => ({ name: r.name.trim(), unit: r.unit || 'kg', category: r.category || 'inne', is_food: r.is_food, last_price: Number(r.last_price) || 0, active: true, company_id: cid || null }))
                              const { error } = await supabase.from('inventory_products').insert(payload)
                              setExcelProductSaving(false)
                              if (error) { alert('Błąd zapisu: ' + error.message); return }
                              setExcelProductRows([])
                              fetchInvProducts()
                              alert(`✅ Zaimportowano ${validRows.length} produktów`)
                            }} className="bg-blue-600 hover:bg-blue-700 text-white">
                              {excelProductSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                              Zapisz wszystkie ({excelProductRows.length})
                            </Button>
                          </div>
                        </div>
                        <div className="overflow-x-auto max-h-72">
                          <table className="w-full text-sm">
                            <thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
                              <tr className="text-xs text-blue-700 uppercase">
                                <th className="px-3 py-2 text-left">Nazwa</th>
                                <th className="px-3 py-2 text-left">Jednostka</th>
                                <th className="px-3 py-2 text-left">Kategoria</th>
                                <th className="px-3 py-2 text-right">Cena netto</th>
                                <th className="px-3 py-2 text-center">Spożywczy</th>
                                <th className="px-2 py-2 w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {excelProductRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30">
                                  <td className="px-2 py-1"><Input value={row.name} onChange={e => setExcelProductRows(p => { const c = [...p]; c[idx] = {...c[idx], name: e.target.value}; return c })} className="h-8 text-sm" /></td>
                                  <td className="px-2 py-1"><select value={row.unit} onChange={e => setExcelProductRows(p => { const c = [...p]; c[idx] = {...c[idx], unit: e.target.value}; return c })} className="h-8 rounded border border-input bg-background px-1 text-xs w-full">{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                                  <td className="px-2 py-1"><select value={row.category} onChange={e => setExcelProductRows(p => { const c = [...p]; c[idx] = {...c[idx], category: e.target.value}; return c })} className="h-8 rounded border border-input bg-background px-1 text-xs w-full">{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                                  <td className="px-2 py-1"><Input type="number" value={row.last_price} onChange={e => setExcelProductRows(p => { const c = [...p]; c[idx] = {...c[idx], last_price: e.target.value}; return c })} className="h-8 text-sm text-right w-24" /></td>
                                  <td className="px-2 py-1 text-center"><input type="checkbox" checked={row.is_food} onChange={e => setExcelProductRows(p => { const c = [...p]; c[idx] = {...c[idx], is_food: e.target.checked}; return c })} className="w-4 h-4 accent-blue-600" /></td>
                                  <td className="px-2 py-1"><button onClick={() => setExcelProductRows(p => p.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Products table */}
                    {inventoryProducts.length === 0 && excelProductRows.length === 0 ? (
                      <p className="text-slate-400 text-center py-10">Brak produktów — dodaj ręcznie lub zaimportuj z Excela</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              <th className="py-2.5 pr-3">Nazwa</th>
                              <th className="pr-3">Kategoria</th>
                              <th className="pr-3">Jedn.</th>
                              <th className="pr-3 text-right">Cena netto</th>
                              <th className="pr-3">Status</th>
                              <th className="pr-3 text-right">Akcje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {inventoryProducts
                              .filter(p =>
                                (!invProductSearch || p.name.toLowerCase().includes(invProductSearch.toLowerCase())) &&
                                (!invProductCategoryFilter || p.category === invProductCategoryFilter)
                              )
                              .map(p => (
                              <tr key={p.id} className={`hover:bg-slate-50 ${!p.active ? 'opacity-50' : ''}`}>
                                {editingInvProduct?.id === p.id ? (
                                  <>
                                    <td className="py-1.5 pr-3"><Input value={editingInvProduct.name} onChange={e => setEditingInvProduct({...editingInvProduct, name: e.target.value})} className="h-8 text-sm" /></td>
                                    <td className="pr-3"><select value={editingInvProduct.category} onChange={e => setEditingInvProduct({...editingInvProduct, category: e.target.value})} className="h-8 rounded border border-input bg-background px-1 text-xs w-full">{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                                    <td className="pr-3"><select value={editingInvProduct.unit} onChange={e => setEditingInvProduct({...editingInvProduct, unit: e.target.value})} className="h-8 rounded border border-input bg-background px-1 text-xs">{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                                    <td className="pr-3"><Input type="number" value={editingInvProduct.last_price} onChange={e => setEditingInvProduct({...editingInvProduct, last_price: Number(e.target.value)})} className="h-8 text-sm w-24 text-right" /></td>
                                    <td className="pr-3">
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={editingInvProduct.is_food} onChange={e => setEditingInvProduct({...editingInvProduct, is_food: e.target.checked})} className="w-3.5 h-3.5 accent-blue-600" />
                                        <span className="text-xs text-slate-600">Spożywczy</span>
                                      </label>
                                    </td>
                                    <td className="pr-3">
                                      <div className="flex gap-1 justify-end">
                                        <button onClick={async () => {
                                          await supabase.from('inventory_products').update({ name: editingInvProduct.name, unit: editingInvProduct.unit, category: editingInvProduct.category, is_food: editingInvProduct.is_food, last_price: editingInvProduct.last_price }).eq('id', p.id)
                                          setEditingInvProduct(null)
                                          fetchInvProducts()
                                        }} className="h-7 px-3 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Zapisz</button>
                                        <button onClick={() => setEditingInvProduct(null)} className="h-7 px-2 text-xs border border-slate-200 rounded hover:bg-slate-50">Anuluj</button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2.5 pr-3 font-medium text-slate-800">{p.name}</td>
                                    <td className="pr-3 text-slate-500 text-xs">{p.category}</td>
                                    <td className="pr-3 text-slate-500 text-xs">{p.unit}</td>
                                    <td className="pr-3 text-right font-medium">{p.last_price ? `${fmt2(p.last_price)} zł` : '—'}</td>
                                    <td className="pr-3">
                                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {p.active ? 'Aktywny' : 'Nieaktywny'}
                                      </span>
                                    </td>
                                    <td className="pr-3">
                                      <div className="flex gap-1 justify-end">
                                        <button onClick={() => setEditingInvProduct(p)} title="Edytuj"
                                          className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600">
                                          <FileText className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={async () => {
                                          if (!confirm(`Usunąć "${p.name}"?`)) return
                                          await supabase.from('inventory_products').delete().eq('id', p.id)
                                          fetchInvProducts()
                                        }} title="Usuń"
                                          className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Weekly Sales Import ── */}
            {inventorySubView !== 'fill' && inventorySubView !== 'products' && (
              <WeeklySalesImport
                locations={myLocations.map(l => ({ id: l.location_id, name: l.locations.name }))}
              />
            )}
          </div>
        )}

      </main>

      <HelpDrawer
        activeView={activeView}
        keyMap={{
          attendance: 'hr_attendance',
          leave: 'hr_leave',
          swaps: 'hr_swaps',
          certs: 'hr_certs',
          documents: 'hr_documents',
          tips: 'hr_tips',
          onboarding: 'hr_onboarding',
          scheduling: 'schedule',
          dashboard: 'hr_dashboard',
        }}
      />
    </div>
  )
}
