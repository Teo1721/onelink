'use client'

import { useState, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Upload, FileText, Check, AlertTriangle, Loader2,
  Download, X, ChevronRight, Users, Package, BarChart3,
} from 'lucide-react'

type ImportType = 'employees' | 'products' | 'sales'

interface ImportResult {
  inserted: number
  skipped: number
  errors: string[]
}

/* ── CSV parser ──────────────────────────────────────────── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
}

/* ── Templates ───────────────────────────────────────────── */
const TEMPLATES: Record<ImportType, { headers: string[]; example: string[][] }> = {
  employees: {
    headers: ['full_name', 'position', 'email', 'phone', 'hourly_rate', 'contract_type'],
    example: [
      ['Jan Kowalski', 'Kelner', 'jan@restauracja.pl', '+48123456789', '25.50', 'umowa_o_prace'],
      ['Anna Nowak', 'Kucharz', 'anna@restauracja.pl', '', '30.00', 'umowa_zlecenie'],
    ],
  },
  products: {
    headers: ['name', 'category', 'base_unit', 'min_threshold', 'last_price'],
    example: [
      ['Mąka pszenna', 'dry', 'kg', '10', '2.50'],
      ['Mleko 3,2%', 'dairy', 'l', '5', '3.20'],
      ['Polędwica wołowa', 'meat', 'kg', '2', '45.00'],
    ],
  },
  sales: {
    headers: ['date', 'gross_revenue', 'net_revenue', 'card_payments', 'cash_payments', 'transaction_count', 'total_labor_hours'],
    example: [
      ['2024-01-15', '12500', '10162', '8000', '2162', '145', '24'],
      ['2024-01-16', '9800', '7967', '6500', '1467', '112', '20'],
    ],
  },
}

function downloadTemplate(type: ImportType) {
  const { headers, example } = TEMPLATES[type]
  const rows = [headers, ...example].map(r => r.join(',')).join('\n')
  const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `szablon_${type}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Importer logic ──────────────────────────────────────── */
async function importEmployees(
  rows: Record<string, string>[],
  supabase: SupabaseClient,
  companyId: string,
  locationId: string,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] }
  for (const row of rows) {
    if (!row.full_name?.trim()) { result.skipped++; continue }
    const { error } = await supabase.from('employees').insert({
      company_id: companyId,
      location_id: locationId,
      full_name: row.full_name.trim(),
      position: row.position?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      hourly_rate: parseFloat(row.hourly_rate) || null,
      contract_type: row.contract_type?.trim() || null,
      status: 'active',
    })
    if (error) result.errors.push(`${row.full_name}: ${error.message}`)
    else result.inserted++
  }
  return result
}

async function importProducts(
  rows: Record<string, string>[],
  supabase: SupabaseClient,
  companyId: string,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] }
  for (const row of rows) {
    if (!row.name?.trim()) { result.skipped++; continue }
    const { error } = await supabase.from('products').insert({
      company_id: companyId,
      name: row.name.trim(),
      category: row.category?.trim() || 'inne',
      base_unit: row.base_unit?.trim() || 'kg',
      min_threshold: parseFloat(row.min_threshold) || null,
      last_price: parseFloat(row.last_price) || null,
    })
    if (error) result.errors.push(`${row.name}: ${error.message}`)
    else result.inserted++
  }
  return result
}

async function importSales(
  rows: Record<string, string>[],
  supabase: SupabaseClient,
  locationId: string,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] }
  for (const row of rows) {
    if (!row.date?.trim()) { result.skipped++; continue }
    const { error } = await supabase.from('sales_daily').upsert({
      location_id: locationId,
      date: row.date.trim(),
      gross_revenue: parseFloat(row.gross_revenue) || 0,
      net_revenue: parseFloat(row.net_revenue) || 0,
      card_payments: parseFloat(row.card_payments) || 0,
      cash_payments: parseFloat(row.cash_payments) || 0,
      transaction_count: parseInt(row.transaction_count) || 0,
      total_labor_hours: parseFloat(row.total_labor_hours) || 0,
    }, { onConflict: 'location_id,date' })
    if (error) result.errors.push(`${row.date}: ${error.message}`)
    else result.inserted++
  }
  return result
}

/* ── Component ───────────────────────────────────────────── */
interface Props {
  supabase: SupabaseClient
  companyId: string
  locationId: string
}

const TYPE_CONFIG: Record<ImportType, { label: string; icon: any; desc: string; color: string }> = {
  employees: { label: 'Pracownicy',   icon: Users,    desc: 'Imię, stanowisko, email, stawka godzinowa', color: 'text-violet-600 bg-violet-50' },
  products:  { label: 'Produkty',     icon: Package,  desc: 'Nazwa, kategoria, jednostka, cena',          color: 'text-orange-600 bg-orange-50' },
  sales:     { label: 'Sprzedaż',     icon: BarChart3,desc: 'Data, przychody, liczba transakcji',          color: 'text-blue-600 bg-blue-50'   },
}

export function CsvImport({ supabase, companyId, locationId }: Props) {
  const [type, setType] = useState<ImportType>('employees')
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setResult(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setPreview(parseCSV(text).slice(0, 5))
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }

  async function runImport() {
    if (!fileRef.current?.files?.[0]) return
    setImporting(true)
    setResult(null)
    const text = await fileRef.current.files[0].text()
    const rows = parseCSV(text)
    let res: ImportResult
    if (type === 'employees') res = await importEmployees(rows, supabase, companyId, locationId)
    else if (type === 'products') res = await importProducts(rows, supabase, companyId)
    else res = await importSales(rows, supabase, locationId)
    setResult(res)
    setImporting(false)
  }

  function reset() {
    setPreview([])
    setFileName(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Import CSV</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">Zaimportuj dane masowo z pliku CSV. Pobierz szablon aby zobaczyć wymagany format.</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(TYPE_CONFIG) as [ImportType, typeof TYPE_CONFIG[ImportType]][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button key={key} onClick={() => { setType(key); reset() }}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                type === key ? 'border-[#1D4ED8] bg-blue-50' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className={`text-[13px] font-bold ${type === key ? 'text-[#1D4ED8]' : 'text-[#111827]'}`}>{cfg.label}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{cfg.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Template download */}
      <button onClick={() => downloadTemplate(type)}
        className="flex items-center gap-2 text-[13px] font-semibold text-[#2563EB] hover:text-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        Pobierz szablon {TYPE_CONFIG[type].label.toLowerCase()}.csv
      </button>

      {/* Drop zone */}
      {!fileName ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-10 text-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all group"
        >
          <Upload className="w-8 h-8 text-[#9CA3AF] group-hover:text-[#2563EB] mx-auto mb-3 transition-colors" />
          <p className="text-[14px] font-semibold text-[#374151]">Przeciągnij plik CSV lub kliknij aby wybrać</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Obsługiwany format: UTF-8 CSV z nagłówkami</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <span className="text-[13px] font-semibold text-[#111827]">{fileName}</span>
              {preview.length > 0 && (
                <span className="text-[11px] text-[#9CA3AF]">— podgląd {preview.length} wierszy</span>
              )}
            </div>
            <button onClick={reset} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    {Object.keys(preview[0]).map(h => (
                      <th key={h} className="text-left py-1.5 px-2 text-[#9CA3AF] font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6]">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="py-1.5 px-2 text-[#374151] max-w-[120px] truncate">{v || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={runImport}
            disabled={importing}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Importowanie…' : `Importuj ${TYPE_CONFIG[type].label}`}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-5 ${result.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length === 0
              ? <Check className="w-5 h-5 text-emerald-600" />
              : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            <p className="text-[14px] font-bold text-[#111827]">
              {result.errors.length === 0 ? 'Import zakończony pomyślnie' : 'Import zakończony z ostrzeżeniami'}
            </p>
          </div>
          <div className="flex gap-4 text-[13px] mb-3">
            <span className="text-emerald-700 font-semibold">✓ Zaimportowano: {result.inserted}</span>
            {result.skipped > 0 && <span className="text-[#9CA3AF]">Pominięto: {result.skipped}</span>}
            {result.errors.length > 0 && <span className="text-red-600 font-semibold">Błędy: {result.errors.length}</span>}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[11px] text-red-700 font-mono bg-red-50 rounded px-2 py-1">{e}</p>
              ))}
              {result.errors.length > 5 && (
                <p className="text-[11px] text-[#9CA3AF]">+{result.errors.length - 5} więcej błędów…</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
