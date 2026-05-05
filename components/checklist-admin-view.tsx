'use client'

import { useEffect, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Plus, Trash2, GripVertical, CheckCircle2, XCircle, Camera,
  Loader2, AlertCircle, ChevronDown, ChevronUp, Calendar, MapPin,
  Eye, RefreshCw,
} from 'lucide-react'

/* ─────────────────── Types ─────────────────── */
type Template = {
  id: string
  title: string
  description?: string | null
  requires_photo: boolean
  sort_order: number
  active: boolean
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
function ManageTab({ supabase }: { supabase: SupabaseClient }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPhoto, setNewPhoto] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

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
    })
    if (err) { setError(err.message) } else {
      setNewTitle(''); setNewDesc(''); setNewPhoto(false)
      await fetchTemplates()
    }
    setAdding(false)
  }

  const toggleActive = async (t: Template) => {
    const { error: err } = await supabase
      .from('checklist_templates')
      .update({ active: !t.active })
      .eq('id', t.id)
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
    const idx = templates.findIndex(t => t.id === id)
    if (idx < 0) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= templates.length) return
    const a = templates[idx]
    const b = templates[swapIdx]
    await Promise.all([
      supabase.from('checklist_templates').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('checklist_templates').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchTemplates()
  }

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Add new item */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 mb-5">
        <p className="text-[13px] font-semibold text-[#111827] mb-3">Dodaj pozycję</p>
        <div className="space-y-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Nazwa pozycji np. Temperatura lodówki"
            className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Opis (opcjonalnie)"
            className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPhoto}
                onChange={e => setNewPhoto(e.target.checked)}
                className="w-4 h-4 rounded border-[#E5E7EB] text-[#2563EB]"
              />
              <span className="text-[13px] text-[#374151] flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                Wymagaj zdjęcia przy zaznaczeniu +
              </span>
            </label>
            <button
              onClick={addTemplate}
              disabled={!newTitle.trim() || adding}
              className="ml-auto flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Dodaj
            </button>
          </div>
        </div>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF] text-[14px]">Brak pozycji. Dodaj pierwszą powyżej.</div>
      ) : (
        <div className="space-y-2">
          {templates.map((t, idx) => (
            <div
              key={t.id}
              className={[
                'bg-white border rounded-2xl p-4 flex items-center gap-3 transition-all',
                t.active ? 'border-[#E5E7EB]' : 'border-[#E5E7EB] opacity-50',
              ].join(' ')}
            >
              <GripVertical className="w-4 h-4 text-[#D1D5DB] shrink-0" />

              {/* Up/Down */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(t.id, 'up')} disabled={idx === 0} className="text-[#9CA3AF] hover:text-[#374151] disabled:opacity-30">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(t.id, 'down')} disabled={idx === templates.length - 1} className="text-[#9CA3AF] hover:text-[#374151] disabled:opacity-30">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#111827]">{t.title}</p>
                {t.description && <p className="text-[12px] text-[#6B7280]">{t.description}</p>}
                {t.requires_photo && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] font-medium mt-0.5">
                    <Camera className="w-3 h-3" />Wymaga zdjęcia
                  </span>
                )}
              </div>

              {/* Active toggle */}
              <button
                onClick={() => toggleActive(t)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  t.active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]'
                }`}
              >
                {t.active ? 'Aktywna' : 'Ukryta'}
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteTemplate(t.id)}
                disabled={deleting[t.id]}
                className="text-[#D1D5DB] hover:text-red-500 transition-colors"
              >
                {deleting[t.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
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
