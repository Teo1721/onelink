'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CheckCircle2, XCircle, Camera, Loader2, AlertCircle, RefreshCw, Send } from 'lucide-react'
import { CameraCapture } from '@/components/camera-capture'

type ChecklistTemplate = {
  id: string
  title: string
  description?: string | null
  requires_photo: boolean
  sort_order: number
}

type ChecklistEntry = {
  id: string
  template_id: string
  status: 'done' | 'not_done'
  photo_url?: string | null
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
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

      const { data: sub } = await supabase
        .from('checklist_submissions')
        .select('id')
        .eq('location_id', locationId)
        .eq('date', today)
        .single()
      setSubmitted(!!sub)
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd wczytywania checklisty')
    } finally {
      setLoading(false)
    }
  }, [supabase, locationId, today])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Upsert a checklist entry ──────────────────────────────────────
  const upsertEntry = async (templateId: string, status: 'done' | 'not_done', photoUrl?: string) => {
    setSaving(prev => ({ ...prev, [templateId]: true }))
    try {
      const existing = entries[templateId]
      if (existing) {
        const { data, error: err } = await supabase
          .from('checklist_entries')
          .update({
            status,
            photo_url: photoUrl ?? existing.photo_url ?? null,
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
            photo_url: photoUrl ?? null,
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

  // ── Tap "done" ────────────────────────────────────────────────────
  const handleDone = (template: ChecklistTemplate) => {
    if (template.requires_photo) {
      // Open real-time camera modal — no gallery access possible
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

  // ── Submit checklist to admin ────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const doneCount    = templates.filter(t => entries[t.id]?.status === 'done').length
      const notDoneCount = templates.filter(t => entries[t.id]?.status === 'not_done').length
      await supabase.from('checklist_submissions').upsert({
        location_id:    locationId,
        date:           today,
        total_items:    templates.length,
        done_count:     doneCount,
        not_done_count: notDoneCount,
        submitted_at:   new Date().toISOString(),
      }, { onConflict: 'location_id,date' })
      setSubmitted(true)
    } catch (e: unknown) {
      setError((e as Error).message || 'Błąd wysyłki')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived counts ────────────────────────────────────────────────
  const doneCount    = templates.filter(t => entries[t.id]?.status === 'done').length
  const notDoneCount = templates.filter(t => entries[t.id]?.status === 'not_done').length
  const filledCount  = doneCount + notDoneCount
  const allFilled    = templates.length > 0 && filledCount === templates.length

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
      {/* Camera modal — full-screen, real-time only, no gallery */}
      {cameraForTemplate && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => { setCameraForTemplate(null); pendingTemplateRef.current = null }}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-[#111827]">Checklista dzienna</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">{locationName} · {today}</p>
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
            <span className="text-[13px] font-semibold text-[#374151]">Postęp</span>
            <span className="text-[13px] text-[#6B7280]">{filledCount} / {templates.length}</span>
          </div>
          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] rounded-full transition-all duration-300"
              style={{ width: templates.length > 0 ? `${(filledCount / templates.length) * 100}%` : '0%' }}
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
            Checklista wysłana do admina
            <button onClick={fetchData} className="ml-auto text-green-500 hover:text-green-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Items */}
        {templates.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-[14px]">
            Brak pozycji na checkliście.<br />
            <span className="text-[12px]">Admin może dodać pozycje w panelu administracyjnym.</span>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {templates.map(template => {
              const entry      = entries[template.id]
              const isSaving   = saving[template.id] || uploading[template.id]
              const isDone     = entry?.status === 'done'
              const isNotDone  = entry?.status === 'not_done'

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
                      {/* Photo thumbnail */}
                      {isDone && entry?.photo_url && (
                        <a href={entry.photo_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.photo_url}
                            alt="Zdjęcie"
                            className="h-16 w-24 object-cover rounded-lg border border-green-200"
                          />
                        </a>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                      ) : (
                        <>
                          {/* ✓ Done */}
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

                          {/* ✕ Not done */}
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

        {/* Submit */}
        {!submitted && templates.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
            className={[
              'w-full h-12 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2',
              allFilled
                ? 'bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white shadow-lg shadow-blue-500/20 hover:opacity-90'
                : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed',
            ].join(' ')}
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Send className="w-4 h-4" />Wyślij checklistę do admina</>
            }
          </button>
        )}
      </div>
    </>
  )
}
