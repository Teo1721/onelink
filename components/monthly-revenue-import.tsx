'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, X, Download, Trash2 } from 'lucide-react'

type LocationRow = { id: string; name: string }

type EditableRow = {
  _id: string
  date: string        // YYYY-MM-DD
  locationKey: string // detected name from excel
  locationId: string  // mapped system location id
  gross: string
  cash: string
  blik: string
  card: string
}

type SavedRow = {
  date: string; location_id: string
  gross_revenue: number | null; cash_payments: number | null
  card_payments: number | null; online_payments: number | null; status: string
}

interface Props {
  supabase: SupabaseClient
  locations: LocationRow[]
  fixedLocationId?: string
  fixedLocationName?: string
  status?: 'submitted' | 'approved'
}

/* ── number parser: handles "1,066.65 zł", "7.3", "-", "#VALUE!", "" → number ── */
function pn(v: any): number {
  if (v == null) return 0
  const s = String(v).trim()
  if (!s || s === '-' || s.startsWith('#')) return 0
  const n = parseFloat(s.replace(/\s/g, '').replace('zł', '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/* ── date parser: M/D/YYYY, DD.MM.YYYY, YYYY-MM-DD, Excel serial ── */
function pd(v: any): string | null {
  if (v == null || v === '' || v === '-') return null
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`
  }
  const s = String(v).trim()
  // M/D/YYYY or M/D/YY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m1) {
    const y = m1[3].length === 2 ? `20${m1[3]}` : m1[3]
    return `${y}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`
  }
  // DD.MM.YYYY
  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial
  if (typeof v === 'number' && v > 1000) {
    try {
      const d = XLSX.SSF.parse_date_code(v)
      if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    } catch { /* ignore */ }
  }
  return null
}

/* ── main parser ── */
function parseSheet(raw: any[][]): { locKeys: string[]; rows: Omit<EditableRow, '_id' | 'locationId'>[] } {
  if (raw.length < 2) return { locKeys: [], rows: [] }

  // Find header row: has "data" in col 0 OR "kwota" somewhere
  let hIdx = -1
  for (let i = 0; i < Math.min(8, raw.length); i++) {
    const c0 = String(raw[i][0] ?? '').trim().toLowerCase()
    const rowStr = raw[i].map((c: any) => String(c ?? '').toLowerCase()).join(' ')
    if (c0 === 'data' || rowStr.includes('kwota brutto')) { hIdx = i; break }
  }
  if (hIdx < 0) return { locKeys: [], rows: [] }

  const hRow = raw[hIdx]
  const locRow = hIdx > 0 ? raw[hIdx - 1] : []

  // Find location names: scan header row for "kwota brutto" groups
  // Each "kwota brutto" column starts a new location (cols: brutto, gotówka, [blik,] karta)
  type LocGroup = { key: string; colBrutto: number; colCash: number; colBlik: number; colCard: number }
  const groups: LocGroup[] = []
  let locIdx = 0

  for (let c = 1; c < hRow.length; c++) {
    const h = String(hRow[c] ?? '').toLowerCase().trim()
    if (h.includes('kwota') || h.includes('brutto')) {
      // Find location name from locRow (scan leftward for non-empty)
      let locName = ''
      for (let lc = c; lc >= 1; lc--) {
        const candidate = String(locRow[lc] ?? '').trim()
        if (candidate && !candidate.toLowerCase().includes('kwota')) { locName = candidate; break }
      }
      if (!locName) locName = `Sklep ${++locIdx}`

      // Look ahead to find cash/blik/card columns
      let colCash = c + 1, colBlik = -1, colCard = c + 2
      const h2 = String(hRow[c+1] ?? '').toLowerCase()
      const h3 = String(hRow[c+2] ?? '').toLowerCase()
      const h4 = String(hRow[c+3] ?? '').toLowerCase()

      if (h2.includes('gotów') || h2.includes('cash')) colCash = c + 1
      if (h3.includes('blik')) { colBlik = c + 2; colCard = c + 3 }
      else if (h3.includes('karta') || h3.includes('card')) colCard = c + 2
      if (h4.includes('karta') || h4.includes('card')) colCard = c + 3

      groups.push({ key: locName, colBrutto: c, colCash, colBlik, colCard })
    }
  }

  // If no groups found, try single-location format (no merged header)
  if (groups.length === 0) {
    const locName = fixedFromLocRow(locRow) || 'Lokal'
    // Find columns by header names
    let cB = -1, cCash = -1, cBlik = -1, cCard = -1
    hRow.forEach((h: any, i: number) => {
      const s = String(h ?? '').toLowerCase()
      if (s.includes('brutto')) cB = i
      else if (s.includes('gotów')) cCash = i
      else if (s.includes('blik')) cBlik = i
      else if (s.includes('karta') || s.includes('card')) cCard = i
    })
    if (cB >= 0) groups.push({ key: locName, colBrutto: cB, colCash: cCash, colBlik: cBlik, colCard: cCard })
  }

  const locKeys = [...new Set(groups.map(g => g.key))]
  const rows: Omit<EditableRow, '_id' | 'locationId'>[] = []

  for (const row of raw.slice(hIdx + 1)) {
    const date = pd(row[0])
    if (!date) continue
    // Skip SUMA/TOTAL rows
    const c0 = String(row[0] ?? '').toLowerCase()
    if (c0.includes('suma') || c0.includes('total')) continue

    for (const g of groups) {
      const gross = pn(row[g.colBrutto])
      const cash  = pn(g.colCash >= 0 ? row[g.colCash] : null)
      const blik  = pn(g.colBlik >= 0 ? row[g.colBlik] : null)
      const card  = pn(g.colCard >= 0 ? row[g.colCard] : null)
      rows.push({
        date, locationKey: g.key,
        gross: gross > 0 ? String(gross) : '',
        cash:  cash  > 0 ? String(cash)  : '',
        blik:  blik  > 0 ? String(blik)  : '',
        card:  card  > 0 ? String(card)  : '',
      })
    }
  }

  return { locKeys, rows }
}

function fixedFromLocRow(row: any[]): string {
  for (let i = 0; i < row.length; i++) {
    const s = String(row[i] ?? '').trim()
    if (s && !s.toLowerCase().includes('data') && !s.toLowerCase().includes('kwota')) return s
  }
  return ''
}

let _uid = 0
const uid = () => String(++_uid)

/* ── component ── */
export function MonthlyRevenueImport({ supabase, locations, fixedLocationId, fixedLocationName, status = 'submitted' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [locKeys, setLocKeys] = useState<string[]>([])
  const [rows, setRows] = useState<EditableRow[]>([])
  const [locMap, setLocMap] = useState<Record<string, string>>({})  // key → locationId
  const [showEmpty, setShowEmpty] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const [savedRows, setSavedRows] = useState<SavedRow[]>([])

  function reset() {
    setFileName(null); setLocKeys([]); setRows([]); setLocMap({})
    setResult(null); setSavedRows([])
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFile(file: File) {
    reset()
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })

      const { locKeys: keys, rows: parsed } = parseSheet(raw)
      setLocKeys(keys)

      // Auto-map location keys → system location IDs
      const autoMap: Record<string, string> = {}
      if (fixedLocationId) {
        keys.forEach(k => { autoMap[k] = fixedLocationId })
      } else {
        keys.forEach(k => {
          const match = locations.find(l =>
            l.name.toLowerCase().includes(k.toLowerCase()) ||
            k.toLowerCase().includes(l.name.toLowerCase())
          )
          if (match) autoMap[k] = match.id
        })
      }
      setLocMap(autoMap)

      const editableRows: EditableRow[] = parsed.map(r => ({
        ...r,
        _id: uid(),
        locationId: fixedLocationId ?? (autoMap[r.locationKey] ?? ''),
      }))
      setRows(editableRows)
    }
    reader.readAsArrayBuffer(file)
  }

  function updateRow(id: string, field: keyof EditableRow, value: string) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
  }

  function deleteRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  function remapLocation(key: string, locId: string) {
    setLocMap(m => ({ ...m, [key]: locId }))
    setRows(prev => prev.map(r => r.locationKey === key ? { ...r, locationId: locId } : r))
  }

  const visibleRows = rows.filter(r => showEmpty || r.gross !== '')
  const mappedRows = rows.filter(r => r.locationId && r.gross !== '')
  const unmappedKeys = locKeys.filter(k => !locMap[k])

  async function runImport() {
    if (!mappedRows.length) return
    setImporting(true); setResult(null)
    const res = { inserted: 0, errors: [] as string[] }

    for (const row of mappedRows) {
      const { error } = await supabase.from('sales_daily').upsert({
        location_id: row.locationId,
        date: row.date,
        gross_revenue: pn(row.gross),
        net_revenue: pn(row.gross),
        cash_payments: pn(row.cash),
        card_payments: pn(row.card),
        online_payments: pn(row.blik),
        status,
      }, { onConflict: 'location_id,date' })
      if (error) res.errors.push(`${row.date} ${row.locationKey}: ${error.message}`)
      else res.inserted++
    }

    setResult(res)
    setImporting(false)

    if (res.inserted > 0) {
      const locIds = [...new Set(mappedRows.map(r => r.locationId))]
      const dates = mappedRows.map(r => r.date).sort()
      const { data } = await supabase.from('sales_daily')
        .select('date, location_id, gross_revenue, cash_payments, card_payments, online_payments, status')
        .in('location_id', locIds).gte('date', dates[0]).lte('date', dates[dates.length - 1])
        .order('date')
      setSavedRows((data ?? []) as SavedRow[])
    }
  }

  const fmt = (v: number | null) => v && v > 0 ? v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł' : '—'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">Import utargów</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          {fixedLocationId ? 'Wgraj plik Excel — dane trafią do akceptacji właściciela.' : 'Wgraj plik Excel z utargami sklepów.'}
        </p>
      </div>

      {/* Upload */}
      {!fileName ? (
        <div onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-10 text-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all group">
          <FileSpreadsheet className="w-8 h-8 text-[#9CA3AF] group-hover:text-[#2563EB] mx-auto mb-3 transition-colors" />
          <p className="text-[14px] font-semibold text-[#374151]">Przeciągnij plik Excel lub kliknij aby wybrać</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">.xlsx · .xls — wszystkie formaty z kolumną Data + kwota brutto</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="text-[13px] font-semibold text-[#111827]">{fileName}</span>
            <span className="text-[11px] text-[#9CA3AF]">{locKeys.length} sklep(ów) · {rows.filter(r=>r.gross!=='').length} dni z danymi</span>
          </div>
          <button onClick={reset} className="text-[#9CA3AF] hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Location mapping */}
      {locKeys.length > 0 && !fixedLocationId && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
          <p className="text-[13px] font-bold text-[#111827] mb-3">Przypisz sklepy do lokali:</p>
          {locKeys.map(key => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[12px] font-mono bg-[#F3F4F6] px-2 py-1.5 rounded-lg text-[#374151] min-w-[160px] truncate">{key}</span>
              <span className="text-[#D1D5DB]">→</span>
              <select value={locMap[key] ?? ''} onChange={e => remapLocation(key, e.target.value)}
                className={`h-8 px-2 rounded-lg border text-[12px] text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]
                  ${locMap[key] ? 'border-emerald-300' : 'border-amber-300'}`}>
                <option value="">— wybierz lokal —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {locMap[key] ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* Editable preview table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <p className="text-[13px] font-bold text-[#111827]">
              Podgląd — {visibleRows.length} wierszy
              {!showEmpty && rows.filter(r=>r.gross==='').length > 0 && (
                <span className="text-[11px] font-normal text-[#9CA3AF] ml-2">({rows.filter(r=>r.gross==='').length} pustych ukrytych)</span>
              )}
            </p>
            <button onClick={() => setShowEmpty(v => !v)}
              className="text-[11px] font-semibold text-[#6B7280] hover:text-[#374151] transition-colors">
              {showEmpty ? 'Ukryj puste' : 'Pokaż puste dni'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-[#6B7280] font-semibold">Data</th>
                  {!fixedLocationId && <th className="px-3 py-2 text-left text-[#6B7280] font-semibold">Sklep</th>}
                  <th className="px-3 py-2 text-right text-[#6B7280] font-semibold">Brutto</th>
                  <th className="px-3 py-2 text-right text-[#6B7280] font-semibold">Gotówka</th>
                  <th className="px-3 py-2 text-right text-[#6B7280] font-semibold">Blik</th>
                  <th className="px-3 py-2 text-right text-[#6B7280] font-semibold">Karta</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {visibleRows.map(row => {
                  const isEmpty = row.gross === ''
                  return (
                    <tr key={row._id} className={`hover:bg-[#F9FAFB] ${isEmpty ? 'opacity-40' : ''}`}>
                      <td className="px-3 py-1.5">
                        <input value={row.date} onChange={e => updateRow(row._id, 'date', e.target.value)}
                          className="w-[100px] h-7 px-2 rounded border border-transparent hover:border-[#E5E7EB] focus:border-blue-400 focus:outline-none bg-transparent text-[#111827]" />
                      </td>
                      {!fixedLocationId && (
                        <td className="px-3 py-1.5">
                          <select value={row.locationId} onChange={e => updateRow(row._id, 'locationId', e.target.value)}
                            className="h-7 px-1 rounded border border-transparent hover:border-[#E5E7EB] focus:border-blue-400 focus:outline-none bg-transparent text-[#374151] max-w-[140px]">
                            <option value="">—</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </td>
                      )}
                      {(['gross','cash','blik','card'] as const).map(f => (
                        <td key={f} className="px-3 py-1.5 text-right">
                          <input value={row[f]} onChange={e => updateRow(row._id, f, e.target.value)}
                            placeholder="0"
                            className="w-[80px] h-7 px-2 rounded border border-transparent hover:border-[#E5E7EB] focus:border-blue-400 focus:outline-none bg-transparent text-right text-[#111827]" />
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <button onClick={() => deleteRow(row._id)} className="text-[#E5E7EB] hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {mappedRows.length > 0 && (
                <tfoot className="sticky bottom-0 bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                  <tr className="font-bold text-[12px]">
                    <td className="px-3 py-2 text-[#374151]">SUMA ({mappedRows.length} dni)</td>
                    {!fixedLocationId && <td />}
                    {(['gross','cash','blik','card'] as const).map(f => (
                      <td key={f} className="px-3 py-2 text-right text-[#111827]">
                        {mappedRows.reduce((s,r) => s + pn(r[f]), 0).toLocaleString('pl-PL', {minimumFractionDigits: 2})} zł
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Warnings */}
      {unmappedKeys.length > 0 && rows.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800">
            Nieprzypisane sklepy: <strong>{unmappedKeys.join(', ')}</strong> — ich dane nie zostaną zaimportowane.
          </p>
        </div>
      )}

      {/* Import button */}
      {mappedRows.length > 0 && !result && (
        <button onClick={runImport} disabled={importing}
          className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? 'Importowanie…' : `Importuj ${mappedRows.length} raportów dziennych`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-5 ${result.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.errors.length === 0 ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            <p className="text-[14px] font-bold text-[#111827]">
              {result.errors.length === 0 ? 'Import zakończony!' : 'Import z błędami'}
            </p>
          </div>
          <p className="text-[13px] text-emerald-700 font-semibold">✓ {result.inserted} dni zaimportowanych</p>
          {result.errors.length === 0 && (
            <p className="text-[12px] text-emerald-700 mt-1">
              {status === 'submitted' ? 'Wysłano do akceptacji właściciela.' : 'Dane aktywne w P&L i analizach.'}
            </p>
          )}
          {result.errors.slice(0,3).map((e,i) => (
            <p key={i} className="text-[11px] text-red-700 font-mono bg-red-50 rounded px-2 py-1 mt-1">{e}</p>
          ))}
          <button onClick={reset} className="mt-3 text-[12px] font-semibold text-[#6B7280] hover:text-[#374151] transition-colors">
            Importuj kolejny plik →
          </button>
        </div>
      )}

      {/* Verification table */}
      {savedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <p className="text-[13px] font-bold text-[#111827]">Weryfikacja — dane z bazy</p>
            <span className="text-[12px] font-bold text-[#111827]">
              Suma: {savedRows.reduce((s,r) => s+(r.gross_revenue??0),0).toLocaleString('pl-PL',{minimumFractionDigits:2})} zł
            </span>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-2 text-left text-[#6B7280] font-semibold">Data</th>
                  <th className="px-4 py-2 text-right text-[#6B7280] font-semibold">Brutto</th>
                  <th className="px-4 py-2 text-right text-[#6B7280] font-semibold">Gotówka</th>
                  <th className="px-4 py-2 text-right text-[#6B7280] font-semibold">Blik</th>
                  <th className="px-4 py-2 text-right text-[#6B7280] font-semibold">Karta</th>
                  <th className="px-4 py-2 text-center text-[#6B7280] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {savedRows.map((r,i) => (
                  <tr key={i} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2 font-medium text-[#111827]">{r.date.split('-').reverse().join('.')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-[#111827]">{fmt(r.gross_revenue)}</td>
                    <td className="px-4 py-2 text-right text-[#374151]">{fmt(r.cash_payments)}</td>
                    <td className="px-4 py-2 text-right text-[#374151]">{fmt(r.online_payments)}</td>
                    <td className="px-4 py-2 text-right text-[#374151]">{fmt(r.card_payments)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status==='approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status==='approved' ? '✓ Zatwierdzone' : '⏳ Do akceptacji'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
