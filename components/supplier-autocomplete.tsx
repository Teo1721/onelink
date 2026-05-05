'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

type Props = {
  value: string
  onChange: (v: string) => void
  supabase: SupabaseClient
  companyId?: string | null
  /** Placeholder text */
  placeholder?: string
  /** Extra class names on the outer wrapper */
  className?: string
  hasError?: boolean
}

/**
 * Text input with dropdown suggestions pulled from past supplier names.
 * Queries `invoices.supplier_name` (and `warehouse_deliveries.supplier_name`)
 * filtered by company_id so suggestions are company-specific.
 */
export function SupplierAutocomplete({
  value,
  onChange,
  supabase,
  companyId,
  placeholder = 'np. Hurtownia ABC',
  className = '',
  hasError = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const fetchSuggestions = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        // Query invoices table
        let query = supabase
          .from('invoices')
          .select('supplier_name')
          .neq('supplier_name', '')
          .limit(40)

        if (companyId) query = query.eq('company_id', companyId)
        if (q.trim()) query = query.ilike('supplier_name', `%${q.trim()}%`)

        const { data } = await query

        // Also query warehouse deliveries if available
        let wdQuery = supabase
          .from('warehouse_deliveries')
          .select('supplier_name')
          .neq('supplier_name', '')
          .limit(20)

        if (companyId) wdQuery = wdQuery.eq('company_id', companyId)
        if (q.trim()) wdQuery = wdQuery.ilike('supplier_name', `%${q.trim()}%`)

        const { data: wdData } = await wdQuery

        // Merge + deduplicate
        const names = new Set<string>()
        for (const row of (data || []) as { supplier_name: string }[]) {
          if (row.supplier_name) names.add(row.supplier_name.trim())
        }
        for (const row of (wdData || []) as { supplier_name: string }[]) {
          if (row.supplier_name) names.add(row.supplier_name.trim())
        }

        const sorted = Array.from(names).sort((a, b) => a.localeCompare(b, 'pl'))
        setSuggestions(sorted.slice(0, 10))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    },
    [supabase, companyId]
  )

  // On focus with empty value — show all recent suppliers
  const handleFocus = () => {
    fetchSuggestions(value)
    if (suggestions.length > 0) setOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(v)
      setOpen(true)
    }, 180)
  }

  const handleSelect = (name: string) => {
    onChange(name)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={[
          'w-full h-10 px-3 rounded-md border text-[14px] text-[#111827] bg-white',
          'focus:outline-none focus:ring-1',
          hasError
            ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
            : 'border-[#E5E7EB] focus:border-[#2563EB] focus:ring-[#DBEAFE]',
        ].join(' ')}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((name) => (
            <li
              key={name}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(name) }}
              className="px-3 py-2.5 text-[13px] text-[#111827] hover:bg-[#EFF6FF] hover:text-[#2563EB] cursor-pointer transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
