'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, X, Download, Info } from 'lucide-react'

type LocationRow = { id: string; name: string }

type PreviewRow = {
  date: string          // YYYY-MM-DD
  locationId: string
  locationName: string
  netRevenue: number
}

type ImportResult = {
  inserted: number
  skipped: number
  errors: string[]
}

interface Props {
  supabase: SupabaseClient
  locations: LocationRow[]
  /** When provided, locks import to a single location (ops page use case) */
  fixedLocationId?: string
  fixedLocationName?: string
  /** 'submitted' = goes to admin approval queue; 'approved' = auto-approved (admin import) */
  status?: 'submitted' | 'approved'
}

function pad(n: number) { return String(n).padStart(2, '0') }

function parseNumber(v: any): number {
  if (v == null || v === '') return 0
  const s = String(v).replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function downloadExampleFile() {
  const wb = XLSX.utils.book_new()
  const rows = [
    ['Dzień', 'Sklep Centrum', 'Sklep Północ', 'Sklep Południe'],
    [1, 3200, 1800, 2400],
    [2, 2900, 1650, 2200],
    [3, 3100, 1900, 2600],
    ['...', '', '', ''],
    [31, 3400, 2000, 2800],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Utargi')
  XLSX.writeFile(wb, 'szablon_utargi_miesiac.xlsx')
}

export function MonthlyRevenueImport({ supabase, locations, fixedLocationId, fixedLocationName, status = 'submitted' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1) // 1-12

  // Raw sheet data after parsing
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<any[][]>([])

  // Column mapping: colIndex → locationId ('' = skip)
  const [colMap, setColMap] = useState<Record<number, string>>({})

  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function reset() {
    setFileName(null)
    setHeaders([])
    setRows([])
    setColMap({})
    setPreview([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFile(file: File) {
    reset()
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (raw.length < 2) return

      // Find header row (first row with more than 1 non-empty cell)
      let headerIdx = 0
      for (let i = 0; i < Math.min(5, raw.length); i++) {
        if (raw[i].filter((c: any) => c !== '').length > 1) { headerIdx = i; break }
      }

      const hdrs = raw[headerIdx].map((h: any) => String(h ?? ''))
      setHeaders(hdrs)
      setRows(raw.slice(headerIdx + 1))

      // Auto-map columns: try to match header name to location name
      const autoMap: Record<number, string> = {}
      hdrs.forEach((h, i) => {
        if (!h || i === 0) return // skip first col (usually day/date)
        if (fixedLocationId) {
          // Single-location mode: map first data column that looks like numbers
          const sampleVal = raw.slice(headerIdx + 1).find((r: any[]) => parseNumber(r[i]) > 0)
          if (sampleVal) autoMap[i] = fixedLocationId
        } else {
          const match = locations.find(l =>
            l.name.toLowerCase().includes(h.toLowerCase()) ||
            h.toLowerCase().includes(l.name.toLowerCase())
          )
          if (match) autoMap[i] = match.id
        }
      })
      setColMap(autoMap)
    }
    reader.readAsArrayBuffer(file)
  }

  function buildPreview(mapOverride?: Record<number, string>): PreviewRow[] {
    const map = mapOverride ?? colMap
    const locById = Object.fromEntries(locations.map(l => [l.id, l.name]))
    const results: PreviewRow[] = []

    for (const row of rows) {
      // First column = day number
      const dayRaw = row[0]
      if (!dayRaw && dayRaw !== 0) continue
      const day = parseInt(String(dayRaw))
      if (isNaN(day) || day < 1 || day > 31) continue

      // Validate date
      const dateStr = `${year}-${pad(month)}-${pad(day)}`
      const dateObj = new Date(dateStr)
      if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month) continue

      for (const [colIdx, locId] of Object.entries(map)) {
        if (!locId) continue
        const val = parseNumber(row[+colIdx])
        if (val <= 0) continue
        results.push({
          date: dateStr,
          locationId: locId,
          locationName: locById[locId] ?? locId,
          netRevenue: val,
        })
      }
    }
    return results
  }

  function handleMapChange(colIdx: number, locId: string) {
    const newMap = { ...colMap, [colIdx]: locId }
    setColMap(newMap)
    setPreview(buildPreview(newMap))
    setResult(null)
  }

  function handleGeneratePreview() {
    setPreview(buildPreview())
    setResult(null)
  }

  async function runImport() {
    if (!preview.length) return
    setImporting(true)
    setResult(null)
    const res: ImportResult = { inserted: 0, skipped: 0, errors: [] }

    for (const row of preview) {
      const { error } = await supabase.from('sales_daily').upsert({
        location_id: row.locationId,
        date: row.date,
        net_revenue: row.netRevenue,
        gross_revenue: row.netRevenue,
        status,
      }, { onConflict: 'location_id,date' })

      if (error) {
        res.errors.push(`${row.date} ${row.locationName}: ${error.message}`)
      } else {
        res.inserted++
      }
    }

    setResult(res)
    setImporting(false)
  }

  const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

  const mappedCols = Object.entries(colMap).filter(([, v]) => v).length
  const previewByLoc = preview.reduce((acc, r) => {
    if (!acc[r.locationName]) acc[r.locationName] = { days: 0, total: 0 }
    acc[r.locationName].days++
    acc[r.locationName].total += r.netRevenue
    return acc
  }, {} as Record<string, { days: number; total: number }>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Import utargów miesięcznych</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          {fixedLocationId
            ? `Wgraj plik Excel z utargami — dane zostaną dodane do ${fixedLocationName ?? 'Twojego lokalu'} i wysłane do akceptacji w panelu właściciela.`
            : 'Wgraj plik Excel z utargami dziennymi sklepów — system automatycznie uzupełni raporty dzienne.'}
        </p>
      </div>

      {/* Info box */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-blue-800 space-y-1">
          <p className="font-semibold">Wymagany format pliku Excel:</p>
          <p>• Pierwsza kolumna: dzień miesiąca (liczba 1–31)</p>
          <p>• Kolejne kolumny: utarg netto danego sklepu (jedna kolumna = jeden sklep)</p>
          <p>• Pierwszy wiersz: nagłówki (np. "Dzień", "Sklep Centrum", "Sklep Północ")</p>
        </div>
        <button onClick={downloadExampleFile} className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 transition-colors">
          <Download className="w-3.5 h-3.5" />
          Pobierz szablon
        </button>
      </div>

      {/* Month / Year selector */}
      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold text-[#374151]">Miesiąc:</label>
          <select
            value={month}
            onChange={e => setMonth(+e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS_PL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold text-[#374151]">Rok:</label>
          <select
            value={year}
            onChange={e => setYear(+e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* File upload */}
      {!fileName ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-10 text-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all group"
        >
          <FileSpreadsheet className="w-8 h-8 text-[#9CA3AF] group-hover:text-[#2563EB] mx-auto mb-3 transition-colors" />
          <p className="text-[14px] font-semibold text-[#374151]">Przeciągnij plik Excel lub kliknij aby wybrać</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Obsługiwane formaty: .xlsx, .xls</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-5">
          {/* File header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-[13px] font-semibold text-[#111827]">{fileName}</span>
              <span className="text-[11px] text-[#9CA3AF]">{rows.length} wierszy danych</span>
            </div>
            <button onClick={reset} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Column mapping */}
          {headers.length > 1 && (
            <div>
              <p className="text-[13px] font-bold text-[#111827] mb-3">
                Przypisz kolumny do sklepów:
              </p>
              <div className="space-y-2">
                {headers.map((h, i) => {
                  if (i === 0) return (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <span className="w-36 text-[12px] font-mono bg-[#F3F4F6] px-2 py-1 rounded text-[#6B7280] truncate">{h || `Kolumna ${i+1}`}</span>
                      <span className="text-[12px] text-[#9CA3AF] italic">← kolumna dnia (automatyczna)</span>
                    </div>
                  )
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-36 text-[12px] font-mono bg-[#F3F4F6] px-2 py-1 rounded text-[#374151] truncate">{h || `Kolumna ${i+1}`}</span>
                      <span className="text-[#D1D5DB]">→</span>
                      <select
                        value={colMap[i] ?? ''}
                        onChange={e => handleMapChange(i, e.target.value)}
                        className="h-8 px-2 rounded-lg border border-[#E5E7EB] text-[12px] text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                      >
                        <option value="">— pomiń —</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Generate preview button */}
          {mappedCols > 0 && preview.length === 0 && (
            <button
              onClick={handleGeneratePreview}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#F3F4F6] text-[#374151] text-[13px] font-semibold hover:bg-[#E5E7EB] transition-colors"
            >
              Podgląd danych
            </button>
          )}

          {/* Preview summary */}
          {preview.length > 0 && (
            <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-4">
              <p className="text-[13px] font-bold text-[#111827] mb-3">
                Podgląd — {MONTHS_PL[month-1]} {year}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {Object.entries(previewByLoc).map(([name, s]) => (
                  <div key={name} className="bg-white rounded-xl border border-[#E5E7EB] p-3">
                    <p className="text-[11px] text-[#9CA3AF] truncate">{name}</p>
                    <p className="text-[15px] font-bold text-[#111827] mt-0.5">{s.total.toLocaleString('pl-PL')} zł</p>
                    <p className="text-[11px] text-[#6B7280]">{s.days} dni</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#9CA3AF]">Łącznie {preview.length} wierszy do zaimportowania. Istniejące dane zostaną nadpisane.</p>
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {preview.length > 0 && !result && (
        <button
          onClick={runImport}
          disabled={importing}
          className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? 'Importowanie…' : `Importuj ${preview.length} rekordów do raportów dziennych`}
        </button>
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
          <div className="flex gap-4 text-[13px] mb-3">
            <span className="text-emerald-700 font-semibold">✓ Zaimportowano: {result.inserted} dni</span>
            {result.skipped > 0 && <span className="text-[#9CA3AF]">Pominięto: {result.skipped}</span>}
            {result.errors.length > 0 && <span className="text-red-600 font-semibold">Błędy: {result.errors.length}</span>}
          </div>
          {result.errors.length === 0 && (
            <p className="text-[12px] text-emerald-700">
              {status === 'submitted'
                ? 'Raporty zostały przesłane do akceptacji — właściciel zobaczy je w panelu administracyjnym.'
                : 'Raporty dzienne są gotowe — dane pojawią się w P&L, prognozach i analizach AI.'}
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
    </div>
  )
}
