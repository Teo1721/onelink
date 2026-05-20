'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Trash2, Loader2, ClipboardList, Plus } from 'lucide-react'

type Shift = 'morning' | 'evening' | 'night'

type HandoverNote = {
  id: string
  location_id: string
  note_date: string
  shift: Shift
  content: string
  author_name: string
  author_id: string | null
  created_at: string
}

const SHIFT_LABELS: Record<Shift, string> = {
  morning: 'Rano',
  evening: 'Wieczór',
  night: 'Noc',
}

const SHIFT_BADGE: Record<Shift, string> = {
  morning: 'bg-green-100 text-green-700',
  evening: 'bg-blue-100 text-blue-700',
  night: 'bg-purple-100 text-purple-700',
}

const SHIFT_PILL_ACTIVE: Record<Shift, string> = {
  morning: 'bg-green-600 text-white',
  evening: 'bg-blue-600 text-white',
  night: 'bg-purple-600 text-white',
}

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function HandoverNotes({
  locationId,
  locationName,
  supabase,
  userFullName,
}: {
  locationId: string
  locationName: string
  supabase: SupabaseClient
  userFullName?: string
}) {
  const [notes, setNotes] = useState<HandoverNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [selectedShift, setSelectedShift] = useState<Shift>('morning')
  const [content, setContent] = useState('')

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const daysAgoStr = thirtyDaysAgo.toLocaleDateString('sv-SE')

    const { data } = await supabase
      .from('handover_notes')
      .select('*')
      .eq('location_id', locationId)
      .gte('note_date', daysAgoStr)
      .order('created_at', { ascending: false })

    setNotes((data ?? []) as HandoverNote[])
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const todayNotes = notes.filter(n => n.note_date === todayStr())
  const mostRecentToday = todayNotes[0] ?? null

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    const { error } = await supabase.from('handover_notes').insert({
      location_id: locationId,
      note_date: todayStr(),
      shift: selectedShift,
      content: content.trim(),
      author_name: userFullName ?? 'Manager',
    })
    if (!error) {
      setContent('')
      await fetchNotes()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Czy na pewno chcesz usunąć tę notatkę?')
    if (!confirmed) return
    setDeleting(id)
    await supabase.from('handover_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-[22px] font-semibold text-[#111827]">
          Notatki przekazania zmiany — {locationName}
        </h2>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          Przekazuj informacje między zmianami i przeglądaj historię ostatnich 30 dni.
        </p>
      </div>

      {/* Today's note box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-2">
          Dzisiejsza notatka ({todayStr()})
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            Ładowanie...
          </div>
        ) : mostRecentToday ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SHIFT_BADGE[mostRecentToday.shift]}`}>
                {SHIFT_LABELS[mostRecentToday.shift]}
              </span>
              <span className="text-[11px] text-[#9CA3AF]">{mostRecentToday.author_name}</span>
            </div>
            <p className="text-[13px] text-[#374151] whitespace-pre-wrap">{mostRecentToday.content}</p>
          </div>
        ) : (
          <p className="text-[13px] text-[#9CA3AF] italic">Brak notatek na dziś</p>
        )}
      </div>

      {/* New note form */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
        <p className="text-[13px] font-semibold text-[#111827]">Dodaj nową notatkę</p>

        {/* Shift selector */}
        <div className="flex gap-2">
          {(['morning', 'evening', 'night'] as Shift[]).map(shift => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                selectedShift === shift
                  ? SHIFT_PILL_ACTIVE[shift] + ' border-transparent'
                  : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {SHIFT_LABELS[shift]}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Napisz notatkę przekazania zmiany..."
          rows={4}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Zapisz notatkę
          </button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-[#111827]">Historia (ostatnie 30 dni)</p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ClipboardList className="w-8 h-8 text-[#9CA3AF] mb-2" />
            <p className="text-[13px] text-[#9CA3AF]">Brak notatek w ostatnich 30 dniach.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium text-[#6B7280]">
                    {formatDate(note.note_date)}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SHIFT_BADGE[note.shift]}`}>
                    {SHIFT_LABELS[note.shift]}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">{note.author_name}</span>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={deleting === note.id}
                  className="shrink-0 p-1 rounded text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Usuń notatkę"
                >
                  {deleting === note.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
              <p className="text-[13px] text-[#374151] mt-2 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
