'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, X, Download, Info } from 'lucide-react'

type LocationRow = { id: string; name: string }

// One column-group per detected Excel location
type ExcelLocation = {
  name: string      // as detected in the Excel file
  colBrutto: number
  colGotowka: number
  colBlik: number
  colKarta: number
}

type ParsedRow = {
  date: string        // YYYY-MM-DD
  excelLocName: string
  gross: number
  cash: number
  blik: number
  card: number
}

type ImportResult = { inserted: number; skipped: number; errors: string[] }

type SavedRow = {
  date: string
  location_id: string
  gross_revenue: number | null
  cash_payments: number | null
  card_payments: number | null
  online_payments: number | null
  status: string
}

interface Props {
  supabase: SupabaseClient
  locations: LocationRow[]
  fixedLocationId?: string
  fixedLocationName?: string
  status?: 'submitted' | 'approved'
}

/* ── helpers ────────────────────────────────────────────────── */
function pad(n: number) { return String(n).padStart(2, '0') }

function parsePolishNumber(v: any): number {
  if (v == null) return 0
  const s = String(v).trim()
  if (s === '' || s === '-' || s.startsWith('#')) return 0
  const clean = s.replace(/\s/g, '').replace('zł', '').replace(',', '.').trim()
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function parseDateCell(v: any): string | null {
  if (v == null || v === '' || v === '-') return null
  // JS Date (cellDates: true)
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
  }
  const s = String(v).trim()
  // DD.MM.YYYY
  const m1 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m1) return `${m1[3]}-${pad(+m1[2])}-${pad(+m1[1])}`
  // DD.MM.YY
  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/)
  if (m2) return `20${m2[3]}-${pad(+m2[2])}-${pad(+m2[1])}`
  // YYYY-MM-DD already
  const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m3) return s
  return null
}

function downloadExampleFile() {
  const wb = XLSX.utils.book_new()
  const rows = [
    ['', '4 LO Toruń', '', '', '', '7 LO Toruń', '', '', ''],
    ['Data', 'kwota brutto', 'gotówka', 'blik', 'karta', 'kwota brutto', 'gotówka', 'blik', 'karta'],
    ['01.05.2026', '', '', '', '', '', '', '', ''],
    ['11.05.2026', '549,00 zł', '32,00 zł', '24,50 zł', '492,50 zł', '400,90 zł', '84,80 zł', '', '316,10 zł'],
    ['12.05.2026', '771,00 zł', '184,50 zł', '40,00 zł', '546,50 zł', '300,10 zł', '59,50 zł', '', '240,60 zł'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = Array(9).fill({ wch: 16 })
  XLSX.utils.book_append_sheet(wb, ws, 'Utargi')
  XLSX.writeFile(wb, 'szablon_utargi_sklepiki.xlsx')
}

/* ── main parser ────────────────────────────────────────────── */
function parseExcelFile(raw: any[][]): { locations: ExcelLocation[]; rows: ParsedRow[] } {
  if (raw.length < 2) return { locations: [], rows: [] }

  // Find the header row: col 0 should be "Data" (case-insensitive)
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const c0 = String(raw[i][0] ?? '').trim().toLowerCase()
    if (c0 === 'data') { headerRowIdx = i; break }
    // fallback: row contains "kwota" anywhere
    if (raw[i].some((c: any) => String(c ?? '').toLowerCase().includes('kwota'))) {
      headerRowIdx = i; break
    }
  }
  if (headerRowIdx < 0) return { locations: [], rows: [] }

  const headerRow   = raw[headerRowIdx]
  const locationRow = headerRowIdx > 0 ? raw[headerRowIdx - 1] : []

  // Detect location groups: every column where header contains "kwota" starts a new group
  const excelLocations: ExcelLocation[] = []
  let currentLocName = ''

  for (let c = 1; c < headerRow.length; c++) {
    const h = String(headerRow[c] ?? '').trim().toLowerCase()

    if (h.includes('kwota') || h.includes('brutto')) {
      // Location name: scan leftward in location row for the nearest non-empty cell
      let locName = ''
      for (let lc = c; lc >= 1; lc--) {
        const candidate = String(locationRow[lc] ?? '').trim()
        if (candidate) { locName = candidate; break }
      }
      currentLocName = locName || `Sklep ${excelLocations.length + 1}`
      excelLocations.push({
        name: currentLocName,
        colBrutto:  c,
        colGotowka: c + 1,
        colBlik:    c + 2,
        colKarta:   c + 3,
      })
    }
  }

  // Parse data rows
  const dataRows = raw.slice(headerRowIdx + 1)
  const parsedRows: ParsedRow[] = []

  for (const row of dataRows) {
    const dateStr = parseDateCell(row[0])
    if (!dateStr) continue

    for (const loc of excelLocations) {
      const gross = parsePolishNumber(row[loc.colBrutto])
      const cash  = parsePolishNumber(row[loc.colGotowka])
      const blik  = parsePolishNumber(row[loc.colBlik])
      const card  = parsePolishNumber(row[loc.colKarta])

      if (gross <= 0 && cash <= 0 && blik <= 0 && card <= 0) continue // skip empty day

      parsedRows.push({ date: dateStr, excelLocName: loc.name, gross, cash, blik, card })
    }
  }

  return { locations: excelLocations, rows: parsedRows }
}

/* ── component ──────────────────────────────────────────────── */
export function MonthlyRevenueImport({
  supabase, locations, fixedLocationId, fixedLocationName, status = 'submitted',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab]                         = useState<'import' | 'history'>('import')

  // Import tab state
  const [fileName, setFileName]               = useState<string | null>(null)
  const [excelLocations, setExcelLocations]   = useState<ExcelLocation[]>([])
  const [parsedRows, setParsedRows]           = useState<ParsedRow[]>([])
  const [locMap, setLocMap]                   = useState<Record<string, string>>({})
  const [importing, setImporting]             = useState(false)
  const [result, setResult]                   = useState<ImportResult | null>(null)
  const [savedRows, setSavedRows]             = useState<SavedRow[]>([])
  const [verifying, setVerifying]             = useState(false)

  // History tab state
  const [histYear, setHistYear]               = useState(new Date().getFullYear())
  const [histMonth, setHistMonth]             = useState(new Date().getMonth() + 1)
  const [histLocId, setHistLocId]             = useState(fixedLocationId ?? '')
  const [histRows, setHistRows]               = useState<SavedRow[]>([])
  const [histLoading, setHistLoading]         = useState(false)
  const [histLoaded, setHistLoaded]           = useState(false)

  function reset() {
    setFileName(null); setExcelLocations([]); setParsedRows([])
    setLocMap({}); setResult(null); setSavedRows([]); setVerifying(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function loadHistory(year: number, month: number, locId: string) {
    if (!locId) return
    setHistLoading(true)
    setHistLoaded(false)
    setHistRows([])
    const firstDay = `${year}-${pad(month)}-01`
    const lastDay  = `${year}-${pad(month)}-31`
    const { data } = await supabase
      .from('sales_daily')
      .select('date, location_id, gross_revenue, cash_payments, card_payments, online_payments, status')
      .eq('location_id', locId)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: true })
    setHistRows((data ?? []) as SavedRow[])
    setHistLoading(false)
    setHistLoaded(true)
  }

  function handleFile(file: File) {
    reset()
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })

      const { locations: xlLocs, rows } = parseExcelFile(raw)
      setExcelLocations(xlLocs)
      setParsedRows(rows)

      // Auto-map: try to match Excel location name → system location
      const autoMap: Record<string, string> = {}
      if (fixedLocationId) {
        // Single-location mode: map everything to the fixed location
        xlLocs.forEach(l => { autoMap[l.name] = fixedLocationId })
      } else {
        xlLocs.forEach(xl => {
          const match = locations.find(sl =>
            sl.name.toLowerCase().includes(xl.name.toLowerCase()) ||
            xl.name.toLowerCase().includes(sl.name.toLowerCase())
          )
          if (match) autoMap[xl.name] = match.id
        })
      }
      setLocMap(autoMap)
    }
    reader.readAsArrayBuffer(file)
  }

  async function runImport() {
    const mappedRows = parsedRows.filter(r => locMap[r.excelLocName])
    if (!mappedRows.length) return
    setImporting(true)
    setResult(null)
    const res: ImportResult = { inserted: 0, skipped: 0, errors: [] }

    for (const row of mappedRows) {
      const locationId = locMap[row.excelLocName]
      const { error } = await supabase.from('sales_daily').upsert({
        location_id:    locationId,
        date:           row.date,
        gross_revenue:  row.gross,
        net_revenue:    row.gross, // same as gross — no VAT info in file
        cash_payments:  row.cash,
        card_payments:  row.card,
        online_payments: row.blik,
        status,
      }, { onConflict: 'location_id,date' })

      if (error) res.errors.push(`${row.date} ${row.excelLocName}: ${error.message}`)
      else res.inserted++
    }

    setResult(res)
    setImporting(false)

    // Auto-fetch saved data to show verification table
    if (res.inserted > 0) {
      setVerifying(true)
      const locationIds = [...new Set(mappedRows.map(r => locMap[r.excelLocName]))]
      const dates = mappedRows.map(r => r.date).sort()
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]
      const { data } = await supabase
        .from('sales_daily')
        .select('date, location_id, gross_revenue, cash_payments, card_payments, online_payments, status')
        .in('location_id', locationIds)
        .gte('date', minDate)
        .lte('date', maxDate)
        .order('date', { ascending: true })
      setSavedRows((data ?? []) as SavedRow[])
      setVerifying(false)
    }
  }

  // Summary per Excel location for preview
  const summaryByLoc: Record<string, { days: number; total: number; mapped: boolean }> = {}
  for (const r of parsedRows) {
    if (!summaryByLoc[r.excelLocName]) summaryByLoc[r.excelLocName] = { days: 0, total: 0, mapped: !!locMap[r.excelLocName] }
    summaryByLoc[r.excelLocName].days++
    summaryByLoc[r.excelLocName].total += r.gross
    summaryByLoc[r.excelLocName].mapped = !!locMap[r.excelLocName]
  }

  const mappedCount  = parsedRows.filter(r => locMap[r.excelLocName]).length
  const totalRows    = parsedRows.length
  const allMapped    = excelLocations.length > 0 && excelLocations.every(l => locMap[l.name])

  const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Utargi miesięczne</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          {fixedLocationId
            ? 'Importuj lub sprawdź wgrane utargi dla tego lokalu.'
            : 'Importuj lub sprawdź wgrane utargi sklepów.'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 w-fit">
        {(['import', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
            }`}>
            {t === 'import' ? 'Import pliku' : 'Sprawdź wgrane'}
          </button>
        ))}
      </div>

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Miesiąc</label>
              <select value={histMonth} onChange={e => setHistMonth(+e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONTHS_PL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Rok</label>
              <select value={histYear} onChange={e => setHistYear(+e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {!fixedLocationId && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Lokal</label>
                <select value={histLocId} onChange={e => setHistLocId(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— wybierz —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            <button
              onClick={() => loadHistory(histYear, histMonth, histLocId || fixedLocationId || '')}
              disabled={histLoading || (!histLocId && !fixedLocationId)}
              className="h-9 px-4 rounded-xl bg-[#1D4ED8] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {histLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sprawdź
            </button>
          </div>

          {/* Results */}
          {histLoaded && histRows.length === 0 && (
            <div className="bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] p-8 text-center">
              <FileSpreadsheet className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-[14px] font-semibold text-[#374151]">Brak danych za {MONTHS_PL[histMonth-1]} {histYear}</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">Ten miesiąc nie został jeszcze zaimportowany.</p>
            </div>
          )}

          {histRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6]">
                <p className="text-[13px] font-bold text-[#111827]">
                  {MONTHS_PL[histMonth-1]} {histYear} — {histRows.length} dni
                </p>
                <span className="text-[12px] font-bold text-[#111827]">
                  Suma: {histRows.reduce((s, r) => s + (r.gross_revenue ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="text-left px-4 py-2.5 text-[#6B7280] font-semibold">Data</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Kwota brutto</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Gotówka</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Blik</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Karta</th>
                      <th className="text-center px-4 py-2.5 text-[#6B7280] font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {histRows.map((r, i) => {
                      const fmt = (v: number | null) =>
                        v != null && v > 0
                          ? v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł'
                          : '—'
                      return (
                        <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-2.5 font-medium text-[#111827]">{r.date.split('-').reverse().join('.')}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[#111827]">{fmt(r.gross_revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-[#374151]">{fmt(r.cash_payments)}</td>
                          <td className="px-4 py-2.5 text-right text-[#374151]">{fmt(r.online_payments)}</td>
                          <td className="px-4 py-2.5 text-right text-[#374151]">{fmt(r.card_payments)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {r.status === 'approved' ? '✓ Zatwierdzone' : '⏳ Do akceptacji'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB] font-bold text-[12px]">
                      <td className="px-4 py-2.5 text-[#374151]">SUMA</td>
                      <td className="px-4 py-2.5 text-right text-[#111827]">
                        {histRows.reduce((s, r) => s + (r.gross_revenue ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#374151]">
                        {histRows.reduce((s, r) => s + (r.cash_payments ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#374151]">
                        {histRows.reduce((s, r) => s + (r.online_payments ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#374151]">
                        {histRows.reduce((s, r) => s + (r.card_payments ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (<>

      {/* Info: expected format */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-blue-800 space-y-0.5 flex-1">
          <p className="font-semibold">Obsługiwany format (taki jak Twój plik Excel):</p>
          <p>• Wiersz 1: nazwy sklepów (np. "4 LO Toruń", "7 LO Toruń") — scalone komórki</p>
          <p>• Wiersz 2: nagłówki — <b>Data</b>, kwota brutto, gotówka, blik, karta (powtórzone dla każdego sklepu)</p>
          <p>• Wiersze 3+: daty w formacie DD.MM.RRRR, kwoty z "zł" lub bez</p>
          <p>• Puste dni ("-") i błędy "#ARG!" są automatycznie pomijane</p>
        </div>
        <button onClick={downloadExampleFile}
          className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 transition-colors">
          <Download className="w-3.5 h-3.5" /> Pobierz szablon
        </button>
      </div>

      {/* Upload zone */}
      {!fileName ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-10 text-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all group"
        >
          <FileSpreadsheet className="w-8 h-8 text-[#9CA3AF] group-hover:text-[#2563EB] mx-auto mb-3 transition-colors" />
          <p className="text-[14px] font-semibold text-[#374151]">Przeciągnij plik Excel lub kliknij aby wybrać</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Obsługiwane: .xlsx, .xls</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-5">
          {/* File info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-[13px] font-semibold text-[#111827]">{fileName}</span>
              <span className="text-[11px] text-[#9CA3AF]">
                {excelLocations.length} sklep(ów) · {totalRows} dni z danymi
              </span>
            </div>
            <button onClick={reset} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {excelLocations.length === 0 && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="text-[12px]">Nie znaleziono struktury danych. Sprawdź czy plik zawiera wiersz z nagłówkiem "Data" i "kwota brutto".</p>
            </div>
          )}

          {/* Location mapping */}
          {excelLocations.length > 0 && !fixedLocationId && (
            <div>
              <p className="text-[13px] font-bold text-[#111827] mb-3">Przypisz sklepy z pliku do lokali w systemie:</p>
              <div className="space-y-2">
                {excelLocations.map(xl => (
                  <div key={xl.name} className="flex items-center gap-3">
                    <span className="text-[12px] font-mono bg-[#F3F4F6] px-2 py-1.5 rounded-lg text-[#374151] min-w-[160px] truncate">{xl.name}</span>
                    <span className="text-[#D1D5DB] text-sm">→</span>
                    <select
                      value={locMap[xl.name] ?? ''}
                      onChange={e => setLocMap(m => ({ ...m, [xl.name]: e.target.value }))}
                      className={`h-8 px-2 rounded-lg border text-[12px] text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] ${
                        locMap[xl.name] ? 'border-emerald-300' : 'border-amber-300'
                      }`}
                    >
                      <option value="">— wybierz lokal —</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    {locMap[xl.name]
                      ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed location info */}
          {fixedLocationId && excelLocations.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-800">
                Dane zostaną przypisane do: <strong>{fixedLocationName}</strong>
                {excelLocations.length > 1 && ` · Wykryto ${excelLocations.length} kolumn z danymi — importowana będzie suma dla tego lokalu`}
              </p>
            </div>
          )}

          {/* Preview cards */}
          {Object.keys(summaryByLoc).length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-[#111827] mb-3">Podgląd danych:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(summaryByLoc).map(([name, s]) => (
                  <div key={name} className={`rounded-xl border p-3 ${s.mapped ? 'bg-white border-[#E5E7EB]' : 'bg-amber-50 border-amber-200'}`}>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{name}</p>
                    <p className="text-[15px] font-bold text-[#111827] mt-0.5">
                      {s.total.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                    </p>
                    <p className="text-[11px] text-[#6B7280]">{s.days} dni</p>
                    {!s.mapped && <p className="text-[10px] text-amber-600 font-semibold mt-1">⚠ Nie przypisano lokalu</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {mappedCount > 0 && !result && (
        <button
          onClick={runImport}
          disabled={importing || !allMapped}
          className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing
            ? 'Importowanie…'
            : `Importuj ${mappedCount} raportów dziennych`}
        </button>
      )}

      {!allMapped && mappedCount > 0 && !result && (
        <p className="text-[12px] text-amber-600">Przypisz wszystkie sklepy do lokali, aby włączyć import.</p>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-5 ${result.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length === 0
              ? <Check className="w-5 h-5 text-emerald-600" />
              : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            <p className="text-[14px] font-bold text-[#111827]">
              {result.errors.length === 0 ? 'Import zakończony pomyślnie!' : 'Import zakończony z ostrzeżeniami'}
            </p>
          </div>
          <p className="text-[13px] text-emerald-700 font-semibold mb-1">✓ Zaimportowano: {result.inserted} dni</p>
          {result.errors.length === 0 && (
            <p className="text-[12px] text-emerald-700">
              {status === 'submitted'
                ? 'Raporty zostały przesłane do akceptacji — właściciel zobaczy je w panelu administracyjnym.'
                : 'Raporty są aktywne — widoczne w P&L, prognozach i analizach AI.'}
            </p>
          )}
          {result.errors.slice(0, 5).map((e, i) => (
            <p key={i} className="text-[11px] text-red-700 font-mono bg-red-50 rounded px-2 py-1 mt-1">{e}</p>
          ))}
          <button onClick={reset} className="mt-3 text-[12px] font-semibold text-[#6B7280] hover:text-[#374151] transition-colors">
            Importuj kolejny plik →
          </button>
        </div>
      )}

      {/* ── Verification table ── */}
      {result && result.inserted > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6]">
            <p className="text-[13px] font-bold text-[#111827]">Weryfikacja zapisanych danych</p>
            {verifying && <Loader2 className="w-4 h-4 animate-spin text-[#9CA3AF]" />}
          </div>

          {verifying && (
            <div className="px-5 py-6 text-center text-[13px] text-[#9CA3AF]">Pobieranie danych z bazy…</div>
          )}

          {!verifying && savedRows.length === 0 && (
            <div className="px-5 py-6 text-center text-[13px] text-amber-600">Brak danych w bazie dla zaimportowanego zakresu.</div>
          )}

          {!verifying && savedRows.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="text-left px-4 py-2.5 text-[#6B7280] font-semibold">Data</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Kwota brutto</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Gotówka</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Blik</th>
                      <th className="text-right px-4 py-2.5 text-[#6B7280] font-semibold">Karta</th>
                      <th className="text-center px-4 py-2.5 text-[#6B7280] font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {savedRows.map((r, i) => {
                      const fmt = (v: number | null) =>
                        v != null && v > 0
                          ? v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł'
                          : <span className="text-[#D1D5DB]">—</span>
                      return (
                        <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-2.5 font-medium text-[#111827]">
                            {r.date.split('-').reverse().join('.')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[#111827]">{fmt(r.gross_revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-[#374151]">{fmt(r.cash_payments)}</td>
                          <td className="px-4 py-2.5 text-right text-[#374151]">{fmt(r.online_payments)}</td>
                          <td className="px-4 py-2.5 text-right text-[#374151]">{fmt(r.card_payments)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {r.status === 'approved' ? 'Zatwierdzone' : 'Do akceptacji'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                      <td className="px-4 py-2.5 text-[12px] font-bold text-[#374151]">SUMA ({savedRows.length} dni)</td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-bold text-[#111827]">
                        {savedRows.reduce((s, r) => s + (r.gross_revenue ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#374151]">
                        {savedRows.reduce((s, r) => s + (r.cash_payments ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#374151]">
                        {savedRows.reduce((s, r) => s + (r.online_payments ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#374151]">
                        {savedRows.reduce((s, r) => s + (r.card_payments ?? 0), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="px-5 py-3 text-[11px] text-[#9CA3AF] border-t border-[#F3F4F6]">
                Dane odczytane bezpośrednio z bazy — możesz porównać z plikiem Excel.
              </p>
            </>
          )}
        </div>
      )}
      </>)}
    </div>
  )
}
