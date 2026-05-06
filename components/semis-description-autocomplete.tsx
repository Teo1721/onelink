"use client"

import React, { useEffect, useState, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Input } from './ui/input'

type Props = {
  value: string
  onChange: (v: string) => void
  supabase: SupabaseClient
  locationId?: string
  companyId?: string
  className?: string
}

// Static common SEMIS descriptions per category
const COMMON_DESCRIPTIONS: string[] = [
  'Czynsz za lokal', 'Czynsz + media', 'Najem lokalu',
  'Prąd', 'Energia elektryczna', 'Gaz', 'Woda i ścieki', 'Ogrzewanie',
  'Internet', 'Telefon', 'Telefon + internet',
  'Reklama Facebook', 'Google Ads', 'Materiały marketingowe', 'Ulotki',
  'Serwis urządzeń', 'Naprawa sprzętu', 'Przegląd techniczny',
  'Ubezpieczenie lokalu', 'Ubezpieczenie OC',
  'Oprogramowanie POS', 'Licencja systemu', 'Hosting',
  'Transport', 'Dostawa', 'Koszty wysyłki',
  'Środki czystości', 'Chemia gospodarcza', 'Artykuły higieniczne',
  'Opłaty bankowe', 'Opłaty administracyjne', 'Księgowość',
]

export default function SemisDescriptionAutocomplete({ value, onChange, supabase, locationId, companyId, className }: Props) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [pastDescriptions, setPastDescriptions] = useState<string[]>([])
  const timer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Load past SEMIS descriptions once on mount
  useEffect(() => {
    if (!locationId && !companyId) return
    const fetch = async () => {
      let q = supabase.from('invoices')
        .select('description')
        .eq('invoice_type', 'SEMIS')
        .not('description', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (locationId) q = q.eq('location_id', locationId)
      const { data } = await q
      if (!data) return
      // Parse concatenated descriptions: "item1: 100.00 zł | item2: 200.00 zł"
      const extracted = new Set<string>()
      for (const row of data) {
        if (!row.description) continue
        const parts = String(row.description).split(' | ')
        for (const part of parts) {
          // Strip trailing ": 123.45 zł" and qty "(2×)"
          const cleaned = part.replace(/\s*\(\d+×\)\s*$/, '').replace(/\s*:\s*[\d.,]+\s*zł\s*$/, '').trim()
          if (cleaned.length > 1 && cleaned.length < 80) extracted.add(cleaned)
        }
      }
      setPastDescriptions([...extracted])
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, companyId])

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!query || query.trim().length < 1) { setSuggestions([]); return }
    timer.current = window.setTimeout(() => {
      const q = query.toLowerCase().trim()
      const all = [...new Set([...pastDescriptions, ...COMMON_DESCRIPTIONS])]
      const matches = all.filter(s => s.toLowerCase().includes(q)).slice(0, 10)
      setSuggestions(matches)
      setOpen(matches.length > 0)
    }, 150)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [query, pastDescriptions])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const select = (s: string) => { setQuery(s); onChange(s); setOpen(false) }

  return (
    <div className={`relative ${className || ''}`} ref={rootRef}>
      <Input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value) }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        placeholder="Opis pozycji…"
        className="h-9 text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 bg-white border border-slate-200 w-full mt-1 max-h-48 overflow-auto shadow-lg rounded-lg text-sm">
          {suggestions.map((s, idx) => (
            <li key={idx}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-[13px] text-slate-700"
              onMouseDown={e => { e.preventDefault(); select(s) }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
