'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Plus, Trash2, GripVertical, CheckCircle2, XCircle, Camera,
  Loader2, AlertCircle, ChevronDown, ChevronUp, Calendar, MapPin,
  Eye, RefreshCw, FileSpreadsheet, Upload, Check, X, ChevronRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'

/* ─────────────────── Types ─────────────────── */
type ChecklistType = 'opening' | 'closing' | 'both'

type Template = {
  id: string
  title: string
  description?: string | null
  requires_photo: boolean
  sort_order: number
  active: boolean
  type: ChecklistType
  category: string | null
}

type Location = { id: string; name: string }

type Submission = {
  id: string
  location_id: string
  date: string
  total_items: number
  done_count: number
  not_done_count: number
  submitted_at: string
  location?: { name: string }
}

type EntryWithTemplate = {
  id: string
  template_id: string
  status: 'done' | 'not_done'
  photo_url?: string | null
  note?: string | null
  template?: { title: string }
}

type Props = {
  supabase: SupabaseClient
  locations: Location[]
}

/* ─────────────────── Component ─────────────────── */
export function ChecklistAdminView({ supabase, locations }: Props) {
  const [tab, setTab] = useState<'manage' | 'submissions'>('manage')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Checklista OPS</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">Zarządzaj pozycjami i przeglądaj wypełnione checklisty</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F3F4F6] rounded-xl p-1 w-fit">
        {([['manage', 'Zarządzaj pozycjami'], ['submissions', 'Wypełnione checklisty']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
              tab === key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'manage' && <ManageTab supabase={supabase} />}
      {tab === 'submissions' && <SubmissionsTab supabase={supabase} locations={locations} />}
    </div>
  )
}

/* ─────────────────── Manage tab ─────────────────── */
const TYPE_CONFIG: Record<ChecklistType, { label: string; color: string; bg: string; border: string }> = {
  opening: { label: 'Otwarcie',  color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  closing: { label: 'Zamknięcie', color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200' },
  both:    { label: 'Oba',        color: 'text-[#6B7280]',   bg: 'bg-[#F3F4F6]',  border: 'border-[#E5E7EB]' },
}

function ManageTab({ supabase }: { supabase: SupabaseClient }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPhoto, setNewPhoto] = useState(false)
  const [newType, setNewType] = useState<ChecklistType>('both')
  const [newCategory, setNewCategory] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [typeFilter, setTypeFilter] = useState<'all' | ChecklistType>('all')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('checklist_templates')
      .select('*')
      .order('sort_order', { ascending: true })
    if (err) setError(err.message)
    else setTemplates((data as Template[]) || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const addTemplate = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    const maxOrder = templates.reduce((m, t) => Math.max(m, t.sort_order), 0)
    const { error: err } = await supabase.from('checklist_templates').insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      requires_photo: newPhoto,
      sort_order: maxOrder + 10,
      active: true,
      type: newType,
      category: newCategory.trim() || null,
    })
    if (err) { setError(err.message) } else {
      setNewTitle(''); setNewDesc(''); setNewPhoto(false); setNewCategory('')
      await fetchTemplates()
    }
    setAdding(false)
  }

  const toggleActive = async (t: Template) => {
    const { error: err } = await supabase
      .from('checklist_templates').update({ active: !t.active }).eq('id', t.id)
    if (err) { setError(err.message) } else {
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, active: !x.active } : x))
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Usunąć tę pozycję? Historyczne wpisy zostaną zachowane.')) return
    setDeleting(prev => ({ ...prev, [id]: true }))
    const { error: err } = await supabase.from('checklist_templates').delete().eq('id', id)
    if (err) setError(err.message)
    else setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(prev => ({ ...prev, [id]: false }))
  }

  const move = async (id: string, dir: 'up' | 'down') => {
    const visible = filteredTemplates
    const idx = visible.findIndex(t => t.id === id)
    if (idx < 0) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= visible.length) return
    const a = visible[idx]; const b = visible[swapIdx]
    await Promise.all([
      supabase.from('checklist_templates').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('checklist_templates').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchTemplates()
  }

  // Filter & group by category
  const filteredTemplates = typeFilter === 'all' ? templates
    : templates.filter(t => t.type === typeFilter || t.type === 'both')

  const grouped: Record<string, Template[]> = {}
  for (const t of filteredTemplates) {
    const cat = t.category || '__none__'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(t)
  }
  const sortedCats = Object.keys(grouped).sort((a, b) =>
    a === '__none__' ? 1 : b === '__none__' ? -1 : a.localeCompare(b, 'pl'))

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Add new item */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 mb-4">
        <p className="text-[13px] font-semibold text-[#111827] mb-3">Dodaj pozycję</p>
        <div className="space-y-2">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTemplate()}
            placeholder="Nazwa pozycji np. Temperatura lodówki"
            className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Opis (opcjonalnie)"
            className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" />
          <div className="flex gap-2">
            {/* Category */}
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)}
              placeholder="Kategoria (np. Sprzątanie, Magazyn)"
              className="flex-1 h-10 px-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" />
            {/* Type */}
            <select value={newType} onChange={e => setNewType(e.target.value as ChecklistType)}
              className="h-10 px-2 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white focus:outline-none focus:border-[#2563EB]">
              <option value="opening">🌅 Otwarcie</option>
              <option value="closing">🌙 Zamknięcie</option>
              <option value="both">↔ Oba</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newPhoto} onChange={e => setNewPhoto(e.target.checked)}
                className="w-4 h-4 rounded border-[#E5E7EB] text-[#2563EB]" />
              <span className="text-[13px] text-[#374151] flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />Wymagaj zdjęcia
              </span>
            </label>
            <button onClick={addTemplate} disabled={!newTitle.trim() || adding}
              className="ml-auto flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Dodaj
            </button>
          </div>
        </div>
      </div>

      {/* Excel import */}
      <ExcelImportSection supabase={supabase} onImported={fetchTemplates} />

      {/* Type filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([['all', 'Wszystkie'], ['opening', '🌅 Otwarcie'], ['closing', '🌙 Zamknięcie'], ['both', '↔ Oba']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTypeFilter(k)}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors border ${
              typeFilter === k ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#93C5FD]'
            }`}>{label}</button>
        ))}
        <span className="ml-auto text-[12px] text-[#9CA3AF] self-center">{filteredTemplates.length} pozycji</span>
      </div>

      {/* Template list grouped by category */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /></div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF] text-[14px]">Brak pozycji. Dodaj pierwszą powyżej.</div>
      ) : (
        <div>
          {sortedCats.map(cat => {
            const items = grouped[cat]
            return (
              <div key={cat} className="mb-5">
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    {cat === '__none__' ? 'Bez kategorii' : cat}
                  </span>
                  <div className="flex-1 h-px bg-[#F3F4F6]" />
                  <span className="text-[11px] text-[#9CA3AF]">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((t, idx) => {
                    const tc = TYPE_CONFIG[t.type ?? 'both']
                    return (
                      <div key={t.id} className={['bg-white border rounded-2xl p-3 flex items-center gap-3 transition-all', t.active ? 'border-[#E5E7EB]' : 'border-[#E5E7EB] opacity-50'].join(' ')}>
                        <GripVertical className="w-4 h-4 text-[#D1D5DB] shrink-0" />
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => move(t.id, 'up')} disabled={idx === 0} className="text-[#9CA3AF] hover:text-[#374151] disabled:opacity-30">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => move(t.id, 'down')} disabled={idx === items.length - 1} className="text-[#9CA3AF] hover:text-[#374151] disabled:opacity-30">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#111827]">{t.title}</p>
                          {t.description && <p className="text-[12px] text-[#6B7280]">{t.description}</p>}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tc.color} ${tc.bg} ${tc.border}`}>{tc.label}</span>
                            {t.requires_photo && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#2563EB] font-medium">
                                <Camera className="w-3 h-3" />Zdjęcie
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => toggleActive(t)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors shrink-0 ${t.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]'}`}>
                          {t.active ? 'Aktywna' : 'Ukryta'}
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} disabled={deleting[t.id]} className="text-[#D1D5DB] hover:text-red-500 transition-colors shrink-0">
                          {deleting[t.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────── Excel import ─────────────────── */
type PreviewItem = {
  _id: number
  title: string
  description: string
  requires_photo: boolean
  include: boolean
  _isHeader: boolean   // auto-detected section header (shown differently)
}

// Heuristics to classify a cell value
function classifyCell(raw: string): 'empty' | 'numbersOnly' | 'sectionHeader' | 'item' {
  const s = raw.trim()
  if (!s) return 'empty'
  // pure number sequence like "1 2 3 4 5 …" (day-number rows)
  if (/^[\d\s]+$/.test(s)) return 'numbersOnly'
  // Roman numeral section header: starts with I. II. III. IV. V. … (up to 10)
  if (/^(I{1,3}|IV|V?I{0,3}|IX|X)\./i.test(s)) return 'sectionHeader'
  return 'item'
}

// Strip leading "1." / "2." etc. from item text
function stripLeadingNumber(s: string): string {
  return s.replace(/^\d+\.\s*/, '').trim()
}

// Find which column index has the most meaningful text content
function detectTextColumn(rows: (string | number | boolean)[][]): number {
  const scores: number[] = []
  const maxCols = Math.max(...rows.map(r => r.length))
  for (let c = 0; c < maxCols; c++) {
    let score = 0
    for (const row of rows) {
      const val = String(row[c] ?? '').trim()
      if (!val) continue
      if (/^[\d\s]+$/.test(val)) score -= 1   // penalty for pure numbers
      else if (val.length > 5) score += 2      // reward for real text
      else score += 1
    }
    scores.push(score)
  }
  return scores.indexOf(Math.max(...scores))
}

function ExcelImportSection({ supabase, onImported }: { supabase: SupabaseClient; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<'idle' | 'colselect' | 'preview'>('idle')
  // raw data: array of rows, each row is array of cells
  const [rawRows, setRawRows] = useState<(string | number | boolean)[][]>([])
  const [selectedCol, setSelectedCol] = useState(0)
  const [items, setItems] = useState<PreviewItem[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ── Parse uploaded file ───────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null); setSuccess(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        // header:1 → raw arrays, no column-header assumption
        const json = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(ws, { header: 1, defval: '' })
        const nonEmpty = json.filter(row => row.some(c => String(c ?? '').trim()))
        if (!nonEmpty.length) { setError('Plik jest pusty lub nie zawiera danych.'); return }
        setRawRows(nonEmpty)
        setSelectedCol(detectTextColumn(nonEmpty))
        setPhase('colselect')
      } catch {
        setError('Nie można odczytać pliku. Sprawdź czy to prawidłowy plik Excel (.xlsx / .xls).')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // ── Build preview ─────────────────────────────────────────────────
  const buildPreview = () => {
    let idCounter = 0
    const built: PreviewItem[] = []
    for (const row of rawRows) {
      const raw = String(row[selectedCol] ?? '').trim()
      const kind = classifyCell(raw)
      if (kind === 'empty' || kind === 'numbersOnly') continue
      const isHeader = kind === 'sectionHeader'
      const cleanTitle = isHeader ? raw : (stripLeadingNumber(raw) || raw)
      built.push({
        _id: idCounter++,
        title: cleanTitle,
        description: '',
        requires_photo: false,
        include: !isHeader,   // section headers auto-unchecked
        _isHeader: isHeader,
      })
    }
    if (!built.length) { setError('Brak wierszy z treścią w wybranej kolumnie.'); return }
    setItems(built)
    setPhase('preview')
  }

  const updateItem = (id: number, field: keyof PreviewItem, value: string | boolean) =>
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: value } : it))

  const removeItem = (id: number) =>
    setItems(prev => prev.filter(it => it._id !== id))

  // ── Import to DB ──────────────────────────────────────────────────
  const handleImport = async () => {
    const toSave = items.filter(it => it.include && it.title.trim())
    if (!toSave.length) { setError('Brak pozycji do zaimportowania.'); return }
    setImporting(true); setError(null)
    try {
      const { data: existing } = await supabase
        .from('checklist_templates').select('sort_order')
        .order('sort_order', { ascending: false }).limit(1)
      let nextOrder = (existing?.[0]?.sort_order ?? 0) + 10
      const rows = toSave.map(it => ({
        title: it.title.trim(),
        description: it.description.trim() || null,
        requires_photo: it.requires_photo,
        sort_order: (nextOrder += 10),
        active: true,
      }))
      const { error: err } = await supabase.from('checklist_templates').insert(rows)
      if (err) throw err
      setSuccess(`Zaimportowano ${rows.length} pozycji do checklisty.`)
      setPhase('idle'); setItems([]); setRawRows([])
      onImported()
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd importu')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setPhase('idle'); setItems([]); setRawRows([])
    setError(null); setSuccess(null)
  }

  // column labels: A, B, C …
  const colLabel = (i: number) => String.fromCharCode(65 + i)
  const numCols = rawRows.length ? Math.max(...rawRows.map(r => r.length)) : 0

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden mb-5">

      {/* Header bar */}
      <button
        onClick={() => phase === 'idle' ? fileRef.current?.click() : reset()}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#111827]">Import z Excela</p>
          <p className="text-[11px] text-[#6B7280]">
            {phase === 'idle'
              ? 'Kliknij aby wczytać plik .xlsx — dowolny format, miesięczne listy, mix kolumn'
              : phase === 'colselect'
              ? `Wczytano ${rawRows.length} wierszy — wybierz kolumnę z treścią`
              : `Podgląd — ${items.filter(i => i.include).length} pozycji do importu`
            }
          </p>
        </div>
        {phase === 'idle'
          ? <Upload className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          : <X className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        }
      </button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />

      {/* Messages */}
      {(error || success) && (
        <div className={`mx-4 mb-3 flex items-center gap-2 p-3 rounded-xl text-[12px] ${error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{error ?? success}</span>
          <button onClick={() => { setError(null); setSuccess(null) }} className="opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      )}

      {/* ── PHASE: column selector ── */}
      {phase === 'colselect' && (
        <div className="px-4 pb-4 border-t border-[#F3F4F6]">
          <p className="text-[12px] font-semibold text-[#374151] mt-3 mb-1">
            Którą kolumnę wczytać jako treść pozycji?
          </p>
          <p className="text-[11px] text-[#9CA3AF] mb-3">
            System automatycznie odrzuci nagłówki sekcji (I., II., …) i wiersze z samymi liczbami.
          </p>

          {/* Column picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: numCols }, (_, i) => {
              // sample up to 2 non-empty values from this column
              const samples = rawRows
                .map(r => String(r[i] ?? '').trim())
                .filter(Boolean)
                .slice(0, 2)
              const isText = samples.some(s => s.length > 4 && !/^[\d\s]+$/.test(s))
              return (
                <button
                  key={i}
                  onClick={() => setSelectedCol(i)}
                  className={[
                    'flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all max-w-[160px]',
                    selectedCol === i
                      ? 'border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#BFDBFE]'
                      : isText
                      ? 'border-[#E5E7EB] bg-white hover:border-[#93C5FD]'
                      : 'border-[#F3F4F6] bg-[#F9FAFB] opacity-60',
                  ].join(' ')}
                >
                  <span className="text-[11px] font-bold text-[#6B7280]">Kol. {colLabel(i)}</span>
                  {samples.map((s, j) => (
                    <span key={j} className="text-[10px] text-[#374151] truncate w-full leading-tight mt-0.5">{s}</span>
                  ))}
                </button>
              )
            })}
          </div>

          {/* Raw data preview of selected column */}
          <div className="rounded-xl border border-[#E5E7EB] overflow-hidden mb-4">
            <div className="bg-[#F9FAFB] px-3 py-2 text-[11px] font-semibold text-[#6B7280] border-b border-[#E5E7EB]">
              Podgląd kolumny {colLabel(selectedCol)} (pierwsze 6 wierszy)
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {rawRows.slice(0, 6).map((row, i) => {
                const val = String(row[selectedCol] ?? '').trim()
                const kind = classifyCell(val)
                return (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 text-[12px] ${
                    kind === 'empty' || kind === 'numbersOnly' ? 'text-[#D1D5DB]' :
                    kind === 'sectionHeader' ? 'text-[#D97706] font-semibold' :
                    'text-[#111827]'
                  }`}>
                    <span className="w-5 text-[10px] text-[#9CA3AF] shrink-0">{i + 1}</span>
                    <span className="flex-1 truncate">{val || '(pusty)'}</span>
                    <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full border">
                      {kind === 'empty' ? '–' :
                       kind === 'numbersOnly' ? 'liczby' :
                       kind === 'sectionHeader' ? 'nagłówek' : '✓ pozycja'}
                    </span>
                  </div>
                )
              })}
            </div>
            {rawRows.length > 6 && (
              <div className="text-[11px] text-[#9CA3AF] text-center py-2 border-t border-[#F3F4F6]">
                …i {rawRows.length - 6} więcej wierszy
              </div>
            )}
          </div>

          <button
            onClick={buildPreview}
            className="w-full h-10 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            Wczytaj i pokaż podgląd
          </button>
        </div>
      )}

      {/* ── PHASE: preview & edit ── */}
      {phase === 'preview' && (
        <div className="px-4 pb-4 border-t border-[#F3F4F6]">
          <div className="flex items-center justify-between mt-3 mb-1">
            <p className="text-[12px] font-semibold text-[#374151]">
              {items.filter(i => i.include).length} zaznaczonych z {items.length} wierszy
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <button onClick={() => setItems(p => p.map(it => ({ ...it, include: !it._isHeader })))}
                className="text-[#2563EB] hover:underline">Pozycje</button>
              <span className="text-[#D1D5DB]">|</span>
              <button onClick={() => setItems(p => p.map(it => ({ ...it, include: true })))}
                className="text-[#6B7280] hover:underline">Wszystkie</button>
              <span className="text-[#D1D5DB]">|</span>
              <button onClick={() => setItems(p => p.map(it => ({ ...it, include: false })))}
                className="text-[#6B7280] hover:underline">Odznacz</button>
            </div>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mb-3">
            Nagłówki sekcji są auto-odznaczone. Edytuj dowolną pozycję przed importem.
          </p>

          <div className="space-y-2 max-h-[420px] overflow-y-auto mb-4 pr-0.5">
            {items.map(item => (
              <div
                key={item._id}
                className={[
                  'rounded-xl border p-3 transition-all',
                  item._isHeader && !item.include
                    ? 'border-[#FEF3C7] bg-[#FFFBEB] opacity-70'
                    : item.include
                    ? 'border-[#DBEAFE] bg-[#F8FAFF]'
                    : 'border-[#F3F4F6] bg-[#F9FAFB] opacity-50',
                ].join(' ')}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={item.include}
                    onChange={e => updateItem(item._id, 'include', e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-[#D1D5DB] text-[#2563EB] cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {item._isHeader && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#D97706] mb-0.5">
                        nagłówek sekcji
                      </span>
                    )}
                    <input
                      value={item.title}
                      onChange={e => updateItem(item._id, 'title', e.target.value)}
                      placeholder="Treść pozycji…"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#111827] font-medium focus:outline-none focus:border-[#2563EB] bg-white"
                    />
                    {!item._isHeader && (
                      <>
                        <input
                          value={item.description}
                          onChange={e => updateItem(item._id, 'description', e.target.value)}
                          placeholder="Opis (opcjonalnie)…"
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#6B7280] focus:outline-none focus:border-[#2563EB] bg-white"
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                          <input
                            type="checkbox"
                            checked={item.requires_photo}
                            onChange={e => updateItem(item._id, 'requires_photo', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#2563EB]"
                          />
                          <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                            <Camera className="w-3 h-3" />Wymaga zdjęcia
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    className="text-[#D1D5DB] hover:text-red-400 transition-colors mt-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPhase('colselect')}
              className="h-10 px-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              ← Wróć
            </button>
            <button
              onClick={handleImport}
              disabled={importing || items.filter(i => i.include).length === 0}
              className="flex-1 h-10 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Importuj {items.filter(i => i.include).length} pozycji
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────── Submissions tab ─────────────────── */
function SubmissionsTab({ supabase, locations }: { supabase: SupabaseClient; locations: Location[] }) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [entries, setEntries] = useState<Record<string, EntryWithTemplate[]>>({})
  const [loadingEntries, setLoadingEntries] = useState<Record<string, boolean>>({})

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    let q = supabase
      .from('checklist_submissions')
      .select('*, location:locations(name)')
      .eq('date', selectedDate)
      .order('submitted_at', { ascending: false })
    if (filterLocation) q = q.eq('location_id', filterLocation)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setSubmissions((data as Submission[]) || [])
    setLoading(false)
  }, [supabase, selectedDate, filterLocation])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  const loadEntries = async (submissionLocationId: string, date: string, subId: string) => {
    if (entries[subId]) { setExpanded(expanded === subId ? null : subId); return }
    setLoadingEntries(prev => ({ ...prev, [subId]: true }))
    const { data, error: err } = await supabase
      .from('checklist_entries')
      .select('*, template:checklist_templates(title)')
      .eq('location_id', submissionLocationId)
      .eq('date', date)
      .order('template_id')
    if (err) setError(err.message)
    else setEntries(prev => ({ ...prev, [subId]: (data as EntryWithTemplate[]) || [] }))
    setLoadingEntries(prev => ({ ...prev, [subId]: false }))
    setExpanded(subId)
  }

  const pct = (s: Submission) =>
    s.total_items > 0 ? Math.round((s.done_count / s.total_items) * 100) : 0

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 h-10">
          <Calendar className="w-4 h-4 text-[#6B7280]" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-[13px] text-[#111827] outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 h-10">
          <MapPin className="w-4 h-4 text-[#6B7280]" />
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="text-[13px] text-[#111827] outline-none bg-transparent pr-2"
          >
            <option value="">Wszystkie lokale</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <button onClick={fetchSubmissions} className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-[#F3F4F6] text-[13px] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />Odśwież
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /></div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] text-[14px]">
          Brak checklisty za {selectedDate}.
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => {
            const p = pct(sub)
            const isExpanded = expanded === sub.id
            return (
              <div key={sub.id} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                {/* Summary row */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#111827]">
                        {sub.location?.name || sub.location_id}
                      </p>
                      <p className="text-[12px] text-[#6B7280]">
                        Wysłano: {new Date(sub.submitted_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {/* Score badge */}
                    <div className={`px-3 py-1 rounded-full text-[12px] font-bold ${
                      p === 100 ? 'bg-green-100 text-green-700' :
                      p >= 70 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {p}% ({sub.done_count}/{sub.total_items})
                    </div>
                  </div>

                  {/* Mini progress */}
                  <div className="mt-3 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p === 100 ? 'bg-green-500' : p >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    <span className="text-[11px] text-green-600">✓ {sub.done_count} wykonane</span>
                    <span className="text-[11px] text-red-500">✕ {sub.not_done_count} niewykonane</span>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => loadEntries(sub.location_id, sub.date, sub.id)}
                    className="mt-3 flex items-center gap-1 text-[12px] text-[#2563EB] font-medium hover:underline"
                  >
                    {loadingEntries[sub.id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {isExpanded ? 'Ukryj szczegóły' : 'Zobacz szczegóły i zdjęcia'}
                  </button>
                </div>

                {/* Expanded entries */}
                {isExpanded && entries[sub.id] && (
                  <div className="border-t border-[#F3F4F6] divide-y divide-[#F9FAFB]">
                    {entries[sub.id].map(entry => (
                      <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                        {entry.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="flex-1 text-[13px] text-[#374151]">
                          {entry.template?.title || entry.template_id}
                        </span>
                        {entry.photo_url && (
                          <a href={entry.photo_url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={entry.photo_url}
                              alt="foto"
                              className="h-12 w-16 object-cover rounded-lg border border-[#E5E7EB] hover:opacity-80 transition-opacity"
                            />
                          </a>
                        )}
                        {entry.status === 'done' && !entry.photo_url && (
                          <span className="text-[11px] text-[#9CA3AF]">brak zdjęcia</span>
                        )}
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
