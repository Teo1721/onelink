'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Circle, X, ChevronDown, ChevronUp, Rocket } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type CheckItem = {
  key: string
  label: string
  description: string
  done: boolean
}

type Props = {
  supabase: SupabaseClient
  companyId: string
  onNavigate: (view: string) => void
}

const STORAGE_KEY = 'onelink_checklist_dismissed'

export function WelcomeChecklist({ supabase, companyId, onNavigate }: Props) {
  const [items, setItems] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
    }
  }, [])

  useEffect(() => {
    if (dismissed) return
    fetchProgress()
    // eslint-disable-next-line
  }, [dismissed, companyId])

  async function fetchProgress() {
    setLoading(true)
    try {
      const [
        { data: locs },
        { data: emps },
        { data: reports },
        { data: invoices },
        { data: schedule },
        { data: monthclose },
      ] = await Promise.all([
        supabase.from('locations').select('id').eq('company_id', companyId).limit(1),
        supabase.from('employees').select('id').eq('company_id', companyId).limit(1),
        supabase.from('sales_daily').select('id').eq('company_id', companyId).limit(1),
        supabase.from('invoices').select('id').eq('company_id', companyId).eq('status', 'approved').limit(1),
        supabase.from('shifts').select('id').limit(1),
        supabase.from('closed_months').select('id').limit(1),
      ])

      setItems([
        {
          key: 'location',
          label: 'Dodaj pierwszą lokalizację',
          description: 'Utwórz lokal restauracji — to baza dla raportów, pracowników i grafiku.',
          done: (locs?.length ?? 0) > 0,
        },
        {
          key: 'employee',
          label: 'Dodaj pracownika',
          description: 'Dodaj pierwszego pracownika — imię, stanowisko i stawka godzinowa.',
          done: (emps?.length ?? 0) > 0,
        },
        {
          key: 'daily_report',
          label: 'Prześlij pierwszy raport dzienny',
          description: 'Menedżer wypełnia raport z wynikami sprzedaży po zamknięciu dnia.',
          done: (reports?.length ?? 0) > 0,
        },
        {
          key: 'invoice',
          label: 'Zatwierdź pierwszą fakturę',
          description: 'Wprowadź i zatwierdź fakturę od dostawcy, aby śledzić koszty.',
          done: (invoices?.length ?? 0) > 0,
        },
        {
          key: 'schedule',
          label: 'Ustaw grafik pracowników',
          description: 'Zaplanuj zmiany w zakładce Grafik, aby generować koszty pracy.',
          done: (schedule?.length ?? 0) > 0,
        },
        {
          key: 'monthclose',
          label: 'Zamknij pierwszy miesiąc',
          description: 'Zamknięcie miesiąca finalizuje P&L i blokuje edycję danych.',
          done: (monthclose?.length ?? 0) > 0,
        },
      ])
    } catch (_) {
      // silently fail — checklist is non-critical
    }
    setLoading(false)
  }

  function dismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  const VIEW_MAP: Record<string, string> = {
    location: 'account',
    employee: 'employees',
    daily_report: 'daily_reports',
    invoice: 'approvals',
    schedule: 'schedule',
    monthclose: 'monthclose',
  }

  if (dismissed || loading) return null

  const doneCount = items.filter(i => i.done).length
  const total = items.length
  const allDone = doneCount === total
  const pct = Math.round((doneCount / total) * 100)

  if (allDone) return null // hide once everything is done

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Pierwsze kroki w OneLink</p>
            <p className="text-[12px] text-[#6B7280]">{doneCount} z {total} zadań ukończonych</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress pill */}
          <span className="text-[12px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {pct}%
          </span>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#F3F4F6]">
        <div
          className="h-1 bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="divide-y divide-[#F9FAFB]">
          {items.map(item => (
            <div
              key={item.key}
              className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
                item.done ? 'opacity-50' : 'hover:bg-[#F9FAFB] cursor-pointer'
              }`}
              onClick={() => !item.done && onNavigate(VIEW_MAP[item.key])}
            >
              <div className="mt-0.5 shrink-0">
                {item.done
                  ? <CheckCircle className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5 text-[#D1D5DB]" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium ${item.done ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'}`}>
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-[12px] text-[#6B7280] mt-0.5">{item.description}</p>
                )}
              </div>
              {!item.done && (
                <span className="text-[11px] text-blue-600 font-medium shrink-0 mt-0.5">
                  Przejdź →
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
