'use client'

import { useEffect, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, Plus, Pencil, Trash2, ShieldAlert, Printer, Search } from 'lucide-react'

/* ─── types ──────────────────────────────────────────────────────── */
interface Props {
  companyId: string
  supabase: SupabaseClient
}

interface AllergenRecord {
  id: string
  company_id: string
  dish_name: string
  category: string
  allergens: string[]
  notes: string | null
  updated_at: string
  created_at: string
}

type FormState = {
  dish_name: string
  category: string
  allergens: string[]
  notes: string
}

/* ─── constants ──────────────────────────────────────────────────── */
const ALLERGENS = [
  { key: 'gluten',      label: 'Gluten',           short: 'Glut', emoji: '🌾' },
  { key: 'crustaceans', label: 'Skorupiaki',        short: 'Skor', emoji: '🦐' },
  { key: 'eggs',        label: 'Jaja',              short: 'Jaja', emoji: '🥚' },
  { key: 'fish',        label: 'Ryby',              short: 'Ryby', emoji: '🐟' },
  { key: 'peanuts',     label: 'Orzeszki ziemne',   short: 'Orze', emoji: '🥜' },
  { key: 'soybeans',    label: 'Soja',              short: 'Soja', emoji: '🫘' },
  { key: 'milk',        label: 'Mleko/laktoza',     short: 'Mleko', emoji: '🥛' },
  { key: 'nuts',        label: 'Orzechy',           short: 'Orzc', emoji: '🌰' },
  { key: 'celery',      label: 'Seler',             short: 'Sele', emoji: '🥬' },
  { key: 'mustard',     label: 'Gorczyca',          short: 'Gorc', emoji: '🌿' },
  { key: 'sesame',      label: 'Sezam',             short: 'Seza', emoji: '⚪' },
  { key: 'sulphites',   label: 'Dwutlenek siarki',  short: 'SO₂',  emoji: '🧪' },
  { key: 'lupin',       label: 'Łubin',             short: 'Łubi', emoji: '🌸' },
  { key: 'molluscs',    label: 'Mięczaki',          short: 'Mięc', emoji: '🐚' },
] as const

const CATEGORIES = [
  'Przystawki',
  'Zupy',
  'Dania główne',
  'Desery',
  'Napoje',
  'Inne',
]

const EMPTY_FORM: FormState = {
  dish_name: '',
  category: 'Inne',
  allergens: [],
  notes: '',
}

/* ─── component ──────────────────────────────────────────────────── */
export function AllergenRegister({ companyId, supabase }: Props) {
  const [records, setRecords]   = useState<AllergenRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing]   = useState<AllergenRecord | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [deletingId, setDeleting] = useState<string | null>(null)

  /* ── fetch ─────────────────────────────────────────────────────── */
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('allergen_records')
      .select('*')
      .eq('company_id', companyId)
      .order('dish_name')
    setRecords((data as AllergenRecord[]) || [])
    setLoading(false)
  }, [supabase, companyId])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  /* ── filtered rows ─────────────────────────────────────────────── */
  const filtered = records.filter(r =>
    r.dish_name.toLowerCase().includes(search.toLowerCase())
  )

  /* ── open modals ───────────────────────────────────────────────── */
  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal('add')
  }

  function openEdit(record: AllergenRecord) {
    setEditing(record)
    setForm({
      dish_name: record.dish_name,
      category:  record.category || 'Inne',
      allergens: record.allergens || [],
      notes:     record.notes || '',
    })
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  /* ── allergen toggle in form ───────────────────────────────────── */
  function toggleAllergen(key: string) {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(key)
        ? prev.allergens.filter(a => a !== key)
        : [...prev.allergens, key],
    }))
  }

  /* ── save ──────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!form.dish_name.trim()) return
    setSaving(true)
    const payload = {
      company_id: companyId,
      dish_name:  form.dish_name.trim(),
      category:   form.category,
      allergens:  form.allergens,
      notes:      form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    if (modal === 'edit' && editing) {
      await supabase.from('allergen_records').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('allergen_records').insert({ ...payload })
    }
    setSaving(false)
    closeModal()
    fetchRecords()
  }

  /* ── delete ────────────────────────────────────────────────────── */
  async function handleDelete(record: AllergenRecord) {
    if (!window.confirm(`Usunąć danie „${record.dish_name}" z rejestru?`)) return
    setDeleting(record.id)
    await supabase.from('allergen_records').delete().eq('id', record.id)
    setDeleting(null)
    fetchRecords()
  }

  /* ── print ─────────────────────────────────────────────────────── */
  function handlePrint() {
    window.print()
  }

  /* ── render ────────────────────────────────────────────────────── */
  return (
    <>
      {/* print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #allergen-print-table,
          #allergen-print-table * { visibility: visible !important; }
          #allergen-print-table {
            position: absolute; inset: 0;
            padding: 24px;
          }
          #allergen-print-title { display: block !important; }
        }
      `}</style>

      <div className="space-y-4 print:hidden">
        {/* ── header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">Rejestr alergenów</h1>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Zgodnie z Rozporządzeniem UE 1169/2011
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Drukuj / Eksport
            </button>
            <button
              onClick={openAdd}
              className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj danie
            </button>
          </div>
        </div>

        {/* ── search ─────────────────────────────────────────────── */}
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj dania…"
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/10"
          />
        </div>

        {/* ── content ────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
            <ShieldAlert className="w-10 h-10 text-[#9CA3AF]" />
            <p className="text-[13px] text-[#374151] font-medium">Brak dań w rejestrze.</p>
            <p className="text-[11px] text-[#9CA3AF]">Zacznij od dodania pierwszego dania.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse min-w-max">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap sticky left-0 bg-[#F9FAFB] z-10 min-w-[160px]">
                      Danie
                    </th>
                    {ALLERGENS.map(a => (
                      <th key={a.key} className="px-1.5 py-2 text-center text-[10px] font-semibold text-[#6B7280] whitespace-nowrap min-w-[42px]" title={a.label}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{a.emoji}</span>
                          <span>{a.short}</span>
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap min-w-[120px]">
                      Uwagi
                    </th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="text-center py-8 text-[13px] text-[#9CA3AF]">
                        Brak wyników dla „{search}"
                      </td>
                    </tr>
                  ) : (
                    filtered.map((record, idx) => (
                      <tr
                        key={record.id}
                        className={`border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}
                      >
                        {/* dish name + category */}
                        <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                          <span className="font-medium text-[#111827] block whitespace-nowrap">{record.dish_name}</span>
                          <span className="text-[10px] text-[#9CA3AF]">{record.category}</span>
                        </td>
                        {/* allergen cells */}
                        {ALLERGENS.map(a => {
                          const present = record.allergens?.includes(a.key)
                          return (
                            <td key={a.key} className="px-1.5 py-2 text-center">
                              {present ? (
                                <span className="text-green-600 font-bold text-[13px]">✓</span>
                              ) : (
                                <span className="text-[#D1D5DB]">—</span>
                              )}
                            </td>
                          )
                        })}
                        {/* notes */}
                        <td className="px-3 py-2 text-[11px] text-[#6B7280] max-w-[160px]">
                          <span className="line-clamp-2">{record.notes || '—'}</span>
                        </td>
                        {/* actions */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => openEdit(record)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
                              title="Edytuj"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(record)}
                              disabled={deletingId === record.id}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B7280] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                              title="Usuń"
                            >
                              {deletingId === record.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <span className="text-[11px] text-[#9CA3AF]">{filtered.length} {filtered.length === 1 ? 'danie' : 'dań'} · {ALLERGENS.length} alergenów UE</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── print table (always in DOM, visible only when printing) ── */}
      <div id="allergen-print-table" className="hidden">
        <div id="allergen-print-title" className="mb-4 hidden">
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Rejestr alergenów</h1>
          <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>
            Zgodnie z Rozporządzeniem UE 1169/2011 &nbsp;·&nbsp; Wydrukowano: {new Date().toLocaleDateString('pl-PL')}
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Danie</th>
              <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Kategoria</th>
              {ALLERGENS.map(a => (
                <th key={a.key} style={{ textAlign: 'center', padding: '4px 4px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  {a.emoji} {a.short}
                </th>
              ))}
              <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Uwagi</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} style={{ borderBottom: '1px solid #E5E7EB', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '4px 6px', fontWeight: 500 }}>{record.dish_name}</td>
                <td style={{ padding: '4px 6px', color: '#6B7280' }}>{record.category}</td>
                {ALLERGENS.map(a => (
                  <td key={a.key} style={{ textAlign: 'center', padding: '4px 4px' }}>
                    {record.allergens?.includes(a.key) ? '✓' : '—'}
                  </td>
                ))}
                <td style={{ padding: '4px 6px', color: '#6B7280' }}>{record.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] flex-shrink-0">
              <h2 className="text-[15px] font-semibold text-[#111827]">
                {modal === 'add' ? 'Dodaj danie' : 'Edytuj danie'}
              </h2>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                ✕
              </button>
            </div>

            {/* modal body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* dish name */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#374151]">
                  Nazwa dania <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.dish_name}
                  onChange={e => setForm(prev => ({ ...prev, dish_name: e.target.value }))}
                  placeholder="np. Żurek staropolski"
                  className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/10"
                />
              </div>

              {/* category */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#374151]">Kategoria</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/10"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* allergen checkboxes */}
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[#374151]">
                  Alergeny w daniu
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALLERGENS.map(a => {
                    const checked = form.allergens.includes(a.key)
                    return (
                      <label
                        key={a.key}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors text-[12px] ${
                          checked
                            ? 'border-[#111827] bg-[#111827]/5 text-[#111827]'
                            : 'border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAllergen(a.key)}
                          className="sr-only"
                        />
                        <span className="text-base leading-none">{a.emoji}</span>
                        <span className="font-medium">{a.label}</span>
                        {checked && <span className="ml-auto text-[#111827]">✓</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* notes */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#374151]">Uwagi (opcjonalnie)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="np. Może zawierać śladowe ilości orzechów…"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/10 resize-none"
                />
              </div>
            </div>

            {/* modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E5E7EB] flex-shrink-0">
              <button
                onClick={closeModal}
                className="h-8 px-4 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.dish_name.trim()}
                className="h-8 px-4 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
