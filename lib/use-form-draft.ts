'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase-backed form draft auto-save hook.
 *
 * - Auto-saves (debounced 1.5 s) whenever `data` changes
 * - On mount checks if a draft exists and sets `hasDraft = true`
 * - Caller must call `loadDraft()` to get the saved data and apply it
 * - Caller must call `clearDraft()` after a successful form submit
 */
export function useFormDraft<T extends object>({
  supabase,
  formType,
  locationId,
  date,
  data,
  enabled = true,
}: {
  supabase: SupabaseClient
  formType: string
  locationId: string | null
  date: string
  data: T
  enabled?: boolean
}) {
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [saving, setSaving] = useState(false)

  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef       = useRef(false)
  const lastSerialRef    = useRef('')
  const canSave          = enabled && !!locationId && !!date

  // ── Check for an existing draft on relevant prop changes ──────────
  const checkDraft = useCallback(async () => {
    if (!canSave) return
    const { data: row } = await supabase
      .from('form_drafts')
      .select('saved_at')
      .eq('location_id', locationId!)
      .eq('form_type', formType)
      .eq('date', date)
      .single()
    if (row) {
      setHasDraft(true)
      setSavedAt(row.saved_at as string)
    } else {
      setHasDraft(false)
      setSavedAt(null)
    }
  }, [supabase, locationId, formType, date, canSave])

  useEffect(() => { checkDraft() }, [checkDraft])

  // ── Restore: returns saved data so caller can spread it into state ─
  const loadDraft = useCallback(async (): Promise<T | null> => {
    if (!canSave) return null
    const { data: row } = await supabase
      .from('form_drafts')
      .select('data, saved_at')
      .eq('location_id', locationId!)
      .eq('form_type', formType)
      .eq('date', date)
      .single()
    if (!row) return null
    // Mark last serialized so the auto-save doesn't re-save the same data
    lastSerialRef.current = JSON.stringify(row.data)
    setSavedAt(row.saved_at as string)
    setHasDraft(true)
    return row.data as T
  }, [supabase, locationId, formType, date, canSave])

  // ── Delete draft ──────────────────────────────────────────────────
  const clearDraft = useCallback(async () => {
    if (!locationId || !date) return
    await supabase
      .from('form_drafts')
      .delete()
      .eq('location_id', locationId)
      .eq('form_type', formType)
      .eq('date', date)
    setSavedAt(null)
    setHasDraft(false)
    lastSerialRef.current = ''
  }, [supabase, locationId, formType, date])

  // ── Auto-save (debounced) on every data change ───────────────────
  // Serialise data to detect real changes and avoid unnecessary upserts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const serialized = JSON.stringify(data)

  useEffect(() => {
    if (!canSave) return

    // Skip the very first render (data is the initial/empty state)
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    // Skip if nothing actually changed
    if (serialized === lastSerialRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      const now = new Date().toISOString()
      const { error } = await supabase.from('form_drafts').upsert(
        {
          location_id: locationId!,
          form_type: formType,
          date,
          data,
          saved_at: now,
        },
        { onConflict: 'location_id,form_type,date' }
      )
      if (!error) {
        lastSerialRef.current = serialized
        setSavedAt(now)
        setHasDraft(true)
      }
      setSaving(false)
    }, 1500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // We intentionally depend on the serialized string, not the object reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, canSave])

  return { savedAt, hasDraft, saving, loadDraft, clearDraft }
}
