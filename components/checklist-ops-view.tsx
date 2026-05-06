'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CheckCircle2, XCircle, Camera, Loader2, AlertCircle, RefreshCw, Send, ChevronDown, ChevronRight, Sun, Moon, X, Plus } from 'lucide-react'
import { CameraCapture } from '@/components/camera-capture'

type ChecklistType = 'opening' | 'closing' | 'both'

type ChecklistTemplate = {
  id: string
  title: string
  description?: string | null
  requires_photo: boolean
  sort_order: number
  type: ChecklistType
  category: string | null
}

type ChecklistEntry = {
  id: string
  template_id: string
  status: 'done' | 'not_done'
  photo_url?: string | null
  photo_urls?: string[]
  note?: string | null
}

type Props = {
  locationId: string
  locationName: string
  supabase: SupabaseClient
}

export function ChecklistOpsView({ locationId, locationName, supabase }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [templates, setTemplates]   = useState<ChecklistTemplate[]>([])
  const [entries, setEntries]       = useState<Record<string, ChecklistEntry>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<Record<string, boolean>>({})
  const [uploading, setUploading]   = useState<Record<string, boolean>>({})
  const [error, setError]           = useState<string | null>(null)
  const [submittedTypes, setSubmittedTypes] = useState<Set<'opening' | 'closing'>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [checklistType, setChecklistType] = useState<'opening' | 'closing'>('opening')
  const [closedCategories, setClosedCategories] = useState<Set<string>>(new Set())

  // Camera modal state
  const [cameraForTemplate, setCameraForTemplate] = useState<string | null>(null)
  const pendingTemplateRef = useRef<string | null>(null)

  // ── Fetch checklist data ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: tmpl, error: tmplErr } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (tmplErr) throw tmplErr
      setTemplates((tmpl as ChecklistTemplate[]) || [])

      const { data: ents, error: entsErr } = await supabase
        .from('checklist_entries')
        .select('*')
        .eq('location_id', locationId)
        .eq('date', today)
      if (entsErr) throw entsErr

      const map: Record<string, ChecklistEntry> = {}
      for (const e of (ents || []) as ChecklistEntry[]) {
        map[e.template_id] = e
      }
      setEntries(map)

      // Fetch submissions for both types
      const { data: subs } = await supabase
        .from('checklist_submissions')
        .select('type')
        .eq('location_id', locationId)
        .eq('date', today)

      const submitted = new Set<'opening' | 'closing'>()
      for (const s of (subs || []) as { type: string }[]) {
        if (s.type === 'opening' || s.type === 'closing') {
          submitted.add(s.type)
        }
      }
      setSubmittedTypes(submitted)
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd wczytywania checklisty')
    } finally {
      setLoading(false)
    }
  }, [supabase, locationId, today])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Upsert a checklist entry (appendPhotoUrl is added to the photos array) ──
  const upsertEntry = async (templateId: string, status: 'done' | 'not_done', appendPhotoUrl?: string) => {
    setSaving(prev => ({ ...prev, [templateId]: true }))
    try {
      const existing = entries[templateId]
      // Build the new photos array by appending (never replacing)
      const currentPhotos: string[] = existing?.photo_urls?.length
        ? existing.photo_urls
        : existing?.photo_url ? [existing.photo_url] : []
      const newPhotos = appendPhotoUrl ? [...currentPhotos, appendPhotoUrl] : currentPhotos

      if (existing) {
        const { data, error: err } = await supabase
          .from('checklist_entries')
          .update({
            status,
            photo_url:  newPhotos[0] ?? null,
            photo_urls: newPhotos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()
        if (err) throw err
        setEntries(prev => ({ ...prev, [templateId]: data as ChecklistEntry }))
      } else {
        const { data, error: err } = await supabase
          .from('checklist_entries')
          .insert({
            template_id: templateId,
            location_id: locationId,
            date: today,
            status,
            photo_url:  appendPhotoUrl ?? null,
            photo_urls: newPhotos,
          })
          .select()
          .single()
        if (err) throw err
        setEntries(prev => ({ ...prev, [templateId]: data as ChecklistEntry }))
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd zapisu')
    } finally {
      setSaving(prev => ({ ...prev, [templateId]: false }))
    }
  }

  // ── Remove a single photo from an entry ───────────────────────────
  const removePhoto = async (templateId: string, urlToRemove: string) => {
    const existing = entries[templateId]
    if (!existing) return
    setSaving(prev => ({ ...prev, [templateId]: true }))
    try {
      const currentPhotos: string[] = existing.photo_urls?.length
        ? existing.photo_urls
        : existing.photo_url ? [existing.photo_url] : []
      const newPhotos = currentPhotos.filter(u => u !== urlToRemove)
      const { data, error: err } = await supabase
        .from('checklist_entries')
        .update({
          photo_url:  newPhotos[0] ?? null,
          photo_urls: newPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (err) throw err
      setEntries(prev => ({ ...prev, [templateId]: data as ChecklistEntry }))
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd usuwania zdjęcia')
    } finally {
      setSaving(prev => ({ ...prev, [templateId]: false }))
    }
  }

  // ── Open camera to add a photo to any done item ───────────────────
  const openCameraForPhoto = (templateId: string) => {
    pendingTemplateRef.current = templateId
    setCameraForTemplate(templateId)
  }

  // ── Tap "done" ────────────────────────────────────────────────────
  const handleDone = (template: ChecklistTemplate) => {
    if (template.requires_photo) {
      pendingTemplateRef.current = template.id
      setCameraForTemplate(template.id)
    } else {
      upsertEntry(template.id, 'done')
    }
  }

  const handleNotDone = (templateId: string) => {
    upsertEntry(templateId, 'not_done')
  }

  // ── Camera captured a blob ────────────────────────────────────────
  const handleCameraCapture = async (blob: Blob) => {
    const templateId = pendingTemplateRef.current
    setCameraForTemplate(null)
    if (!templateId) return

    setUploading(prev => ({ ...prev, [templateId]: true }))
    try {
      const path = `checklist/${locationId}/${today}/${templateId}-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('checklist-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('checklist-photos').getPublicUrl(path)
      await upsertEntry(templateId, 'done', urlData.publicUrl)
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd przesyłania zdjęcia')
    } finally {
      setUploading(prev => ({ ...prev, [templateId]: false }))
      pendingTemplateRef.current = null
    }
  }

  // ── Submit checklist ────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const activeTemplates = templates.filter(t => t.type === checklistType || t.type === 'both')
      const doneCount    = activeTemplates.filter(t => entries[t.id]?.status === 'done').length
      const notDoneCount = activeTemplates.filter(t => entries[t.id]?.status === 'not_done').length
      await supabase.from('checklist_submissions').upsert({
        location_id:    locationId,
        date:           today,
        type:           checklistType,
        total_items:    activeTemplates.length,
        done_count:     doneCount,
        not_done_count: notDoneCount,
        submitted_at:   new Date().toISOString(),
      }, { onConflict: 'location_id,date,type' })
      setSubmittedTypes(prev => new Set([...prev, checklistType]))
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd wysyłki')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────
  const activeTemplates = templates.filter(t => t.type === checklistType || t.type === 'both')
  const submitted = submittedTypes.has(checklistType)

  const doneCount    = activeTemplates.filter(t => entries[t.id]?.status === 'done').length
  const notDoneCount = activeTemplates.filter(t => entries[t.id]?.status === 'not_done').length
  const filledCount  = doneCount + notDoneCount
  const allFilled    = activeTemplates.length > 0 && filledCount === activeTemplates.length

  // Group by category
  const grouped: Record<string, ChecklistTemplate[]> = {}
  for (const t of activeTemplates) {
    const cat = t.category || '__none__'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(t)
  }
  const sortedCats = Object.keys(grouped).sort((a, b) =>
    a === '__none__' ? 1 : b === '__none__' ? -1 : a.localeCompare(b, 'pl'))

  const toggleCategory = (cat: string) => {
    setClosedCategories(prev => {
      const n = new Set(prev)
      n.has(cat) ? n.delete(cat) : n.add(cat)
      return n
    })
  }

  // ── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  return (
    <>
      {/* Camera modal */}
      {cameraForTemplate && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => { setCameraForTemplate(null); pendingTemplateRef.current = null }}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[22px] font-bold text-[#111827]">Checklista dzienna</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">{locationName} · {today}</p>
        </div>

        {/* Opening / Closing tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setChecklistType('opening')}
            className={[
              'flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all',
              checklistType === 'opening'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-emerald-300 hover:text-emerald-600',
            ].join(' ')}
          >
            <Sun className="w-4 h-4" />
            Otwarcie
            {submittedTypes.has('opening') && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            onClick={() => setChecklistType('closing')}
            className={[
              'flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all',
              checklistType === 'closing'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-indigo-300 hover:text-indigo-600',
            ].join(' ')}
          >
            <Moon className="w-4 h-4" />
            Zamknięcie
            {submittedTypes.has('closing') && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-5 bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#374151]">
              {checklistType === 'opening' ? '🌅 Otwarcie' : '🌙 Zamknięcie'} — Postęp
            </span>
            <span className="text-[13px] text-[#6B7280]">{filledCount} / {activeTemplates.length}</span>
          </div>
          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all duration-300',
                checklistType === 'opening'
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  : 'bg-gradient-to-r from-indigo-400 to-indigo-600',
              ].join(' ')}
              style={{ width: activeTemplates.length > 0 ? `${(filledCount / activeTemplates.length) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-[12px] text-green-600 font-medium">✓ {doneCount} wykonane</span>
            <span className="text-[12px] text-red-500 font-medium">✕ {notDoneCount} niewykonane</span>
          </div>
        </div>

        {/* Submitted banner */}
        {submitted && (
          <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Checklista {checklistType === 'opening' ? 'otwarcia' : 'zamknięcia'} wysłana do admina
            <button onClick={fetchData} className="ml-auto text-green-500 hover:text-green-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Items grouped by category */}
        {activeTemplates.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-[14px]">
            Brak pozycji na checkliście.<br />
            <span className="text-[12px]">Admin może dodać pozycje w panelu administracyjnym.</span>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {sortedCats.map(cat => {
              const items = grouped[cat]
              const catLabel = cat === '__none__' ? null : cat
              const isClosed = closedCategories.has(cat)

              const catFilled = items.filter(t => entries[t.id] !== undefined).length
              const catDone   = items.filter(t => entries[t.id]?.status === 'done').length

              return (
                <div key={cat}>
                  {/* Category header (only when named category exists) */}
                  {catLabel && (
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center gap-2 mb-2 group"
                    >
                      <div className="flex items-center gap-1.5">
                        {isClosed
                          ? <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#374151] transition-colors" />
                          : <ChevronDown className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#374151] transition-colors" />
                        }
                        <span className="text-[13px] font-bold text-[#374151] group-hover:text-[#111827] transition-colors">
                          {catLabel}
                        </span>
                        <span className="text-[11px] text-[#9CA3AF]">({items.length})</span>
                      </div>
                      {/* Mini progress */}
                      <div className="ml-auto flex items-center gap-1.5">
                        {catFilled === items.length && (
                          <span className="text-[10px] font-semibold text-green-600">
                            {catDone === items.length ? '✓ Gotowe' : `${catDone}/${items.length}`}
                          </span>
                        )}
                        <div className="w-16 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className={[
                              'h-full rounded-full transition-all',
                              catFilled === items.length && catDone === items.length
                                ? 'bg-green-500'
                                : checklistType === 'opening' ? 'bg-emerald-400' : 'bg-indigo-400',
                            ].join(' ')}
                            style={{ width: items.length > 0 ? `${(catFilled / items.length) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] font-medium">
                          {catFilled}/{items.length}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Items */}
                  {!isClosed && (
                    <div className={['space-y-3', catLabel ? 'pl-5 border-l-2 border-[#F3F4F6]' : ''].join(' ')}>
                      {items.map(template => {
                        const entry     = entries[template.id]
                        const isSaving  = saving[template.id] || uploading[template.id]
                        const isDone    = entry?.status === 'done'
                        const isNotDone = entry?.status === 'not_done'

                        return (
                          <div
                            key={template.id}
                            className={[
                              'bg-white border rounded-2xl p-4 transition-all',
                              isDone    ? 'border-green-200 bg-green-50/40'
                              : isNotDone ? 'border-red-200 bg-red-50/30'
                              : 'border-[#E5E7EB]',
                            ].join(' ')}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-[#111827]">{template.title}</p>
                                {template.description && (
                                  <p className="text-[12px] text-[#6B7280] mt-0.5">{template.description}</p>
                                )}
                                {template.requires_photo && !isDone && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#2563EB] font-medium">
                                    <Camera className="w-3 h-3" />
                                    Zrób zdjęcie aparatem
                                  </span>
                                )}
                                {isDone && (() => {
                                  const photos: string[] = entry?.photo_urls?.length
                                    ? entry.photo_urls
                                    : entry?.photo_url ? [entry.photo_url] : []
                                  return (
                                    <div className="mt-2">
                                      {photos.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {photos.map((url, idx) => (
                                            <div key={idx} className="relative shrink-0">
                                              <a href={url} target="_blank" rel="noopener noreferrer">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={url}
                                                  alt={`Zdjęcie ${idx + 1}`}
                                                  className="h-16 w-16 object-cover rounded-xl border border-green-200 hover:opacity-80 transition-opacity"
                                                />
                                              </a>
                                              {!submitted && (
                                                <button
                                                  onClick={() => removePhoto(template.id, url)}
                                                  disabled={isSaving}
                                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-40 shadow-sm"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                          {!submitted && (
                                            <button
                                              onClick={() => openCameraForPhoto(template.id)}
                                              disabled={isSaving}
                                              className="h-16 w-16 rounded-xl border-2 border-dashed border-[#D1D5DB] flex flex-col items-center justify-center gap-1 text-[#9CA3AF] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50 transition-colors disabled:opacity-40 shrink-0"
                                            >
                                              <Plus className="w-4 h-4" />
                                              <span className="text-[9px] font-medium">Dodaj</span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                      {photos.length === 0 && !submitted && (
                                        <button
                                          onClick={() => openCameraForPhoto(template.id)}
                                          disabled={isSaving}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#D1D5DB] text-[11px] font-medium text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50 transition-colors disabled:opacity-40"
                                        >
                                          <Camera className="w-3.5 h-3.5" />
                                          Dodaj zdjęcie
                                        </button>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>

                              {/* Buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isSaving ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleDone(template)}
                                      disabled={submitted}
                                      className={[
                                        'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
                                        isDone
                                          ? 'bg-green-500 text-white shadow-md shadow-green-200'
                                          : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280] hover:bg-green-50 hover:border-green-300 hover:text-green-600',
                                        submitted ? 'opacity-50 cursor-not-allowed' : '',
                                      ].join(' ')}
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>

                                    <button
                                      onClick={() => handleNotDone(template.id)}
                                      disabled={submitted}
                                      className={[
                                        'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
                                        isNotDone
                                          ? 'bg-red-500 text-white shadow-md shadow-red-200'
                                          : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280] hover:bg-red-50 hover:border-red-300 hover:text-red-500',
                                        submitted ? 'opacity-50 cursor-not-allowed' : '',
                                      ].join(' ')}
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </>
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
            })}
          </div>
        )}

        {/* Submit */}
        {!submitted && activeTemplates.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
            className={[
              'w-full h-12 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2',
              allFilled
                ? checklistType === 'opening'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:opacity-90'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:opacity-90'
                : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed',
            ].join(' ')}
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Send className="w-4 h-4" />Wyślij {checklistType === 'opening' ? 'otwarcie' : 'zamknięcie'} do admina</>
            }
          </button>
        )}
      </div>
    </>
  )
}
