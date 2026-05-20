'use client'

import { useEffect, useState, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, PiggyBank } from 'lucide-react'

/* ─── types ──────────────────────────────────────────────────────── */
interface Props {
  locationId: string
  locationName: string
  supabase: SupabaseClient
}

interface SalesRow {
  date: string
  cash_reported: number | null
  cash_physical: number | null
  cash_diff_explanation: string | null
  gross_revenue: number | null
  closing_person_name: string | null
}

interface AuditRow extends SalesRow {
  diff: number
}

type Range = 30 | 60 | 90

/* ─── helpers ────────────────────────────────────────────────────── */
const PLN = (v: number) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function cutoffDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

/* ─── sparkline bar ──────────────────────────────────────────────── */
function SparkBar({
  diff,
  maxAbs,
  date,
}: {
  diff: number
  maxAbs: number
  date: string
}) {
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(diff) / maxAbs) * 100) : 0
  const color =
    diff > 0.01
      ? 'bg-emerald-500'
      : diff < -0.01
      ? 'bg-red-400'
      : 'bg-gray-300'
  const sign = diff > 0.01 ? '+' : ''
  const label = `${formatDate(date)}: ${sign}${PLN(diff)}`

  return (
    <div
      className="group relative flex flex-col justify-end items-center h-16 w-full"
      title={label}
    >
      <div
        className={`w-full rounded-sm ${color} transition-opacity group-hover:opacity-80`}
        style={{ height: `${Math.max(pct, 2)}%` }}
      />
      {/* tooltip */}
      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex whitespace-nowrap bg-[#111827] text-white text-[10px] rounded px-1.5 py-0.5 z-10 pointer-events-none shadow">
        {label}
      </div>
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────── */
export function CashAudit({ locationId, locationName, supabase }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>(30)

  /* fetch */
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('sales_daily')
        .select(
          'date, cash_reported, cash_physical, cash_diff_explanation, gross_revenue, closing_person_name'
        )
        .eq('location_id', locationId)
        .not('cash_physical', 'is', null)
        .order('date', { ascending: false })
        .limit(90)

      if (cancelled) return

      if (error) {
        console.error('[CashAudit] fetch error', error)
        setRows([])
      } else {
        const mapped: AuditRow[] = ((data as SalesRow[]) || []).map((r) => ({
          ...r,
          diff: (r.cash_physical ?? 0) - (r.cash_reported ?? 0),
        }))
        setRows(mapped)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [locationId, supabase])

  /* filter by range */
  const cutoff = useMemo(() => cutoffDate(range), [range])
  const filtered = useMemo(
    () => rows.filter((r) => r.date >= cutoff),
    [rows, cutoff]
  )

  /* summary stats */
  const stats = useMemo(() => {
    let discrepancyDays = 0
    let totalSurplus = 0
    let totalShortage = 0
    let maxAbsDiff = 0
    let maxAbsDate = ''

    for (const r of filtered) {
      const abs = Math.abs(r.diff)
      if (abs > 0.01) discrepancyDays++
      if (r.diff > 0.01) totalSurplus += r.diff
      if (r.diff < -0.01) totalShortage += r.diff
      if (abs > maxAbsDiff) {
        maxAbsDiff = abs
        maxAbsDate = r.date
      }
    }

    return { discrepancyDays, totalSurplus, totalShortage, maxAbsDiff, maxAbsDate }
  }, [filtered])

  /* sparkline — last 30 calendar days from today, filled from rows */
  const sparkData = useMemo(() => {
    const byDate: Record<string, number> = {}
    for (const r of rows) byDate[r.date] = r.diff

    const result: { date: string; diff: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      result.push({ date: key, diff: byDate[key] ?? 0 })
    }
    return result
  }, [rows])

  const sparkMax = useMemo(
    () => Math.max(...sparkData.map((s) => Math.abs(s.diff)), 0.01),
    [sparkData]
  )

  /* ── render ── */
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-[#111827]">
          Kontrola kasy — {locationName}
        </h1>

        {/* range pills */}
        <div className="flex items-center gap-1.5">
          {([30, 60, 90] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-8 px-3 text-[12px] font-medium rounded-lg transition-colors ${
                range === r
                  ? 'bg-[#111827] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'
              }`}
            >
              {r} dni
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        /* empty state */
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
          <PiggyBank className="w-10 h-10 text-[#9CA3AF]" />
          <p className="text-[13px] text-[#6B7280]">
            Brak danych o kontroli kasy. Uzupełnij raport dzienny.
          </p>
        </div>
      ) : (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1 */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
              <p className="text-[11px] text-[#9CA3AF] mb-1">Dni z rozbieżnością</p>
              <p className="text-[22px] font-bold text-[#111827]">
                {stats.discrepancyDays}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">z {filtered.length} dni</p>
            </div>

            {/* 2 */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
              <p className="text-[11px] text-[#9CA3AF] mb-1">Łączna nadwyżka</p>
              <p className="text-[22px] font-bold text-emerald-600">
                {stats.totalSurplus > 0 ? `+${PLN(stats.totalSurplus)}` : '—'}
              </p>
            </div>

            {/* 3 */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
              <p className="text-[11px] text-[#9CA3AF] mb-1">Łączny niedobór</p>
              <p className="text-[22px] font-bold text-red-600">
                {stats.totalShortage < 0 ? PLN(stats.totalShortage) : '—'}
              </p>
            </div>

            {/* 4 */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
              <p className="text-[11px] text-[#9CA3AF] mb-1">Największa rozbieżność</p>
              {stats.maxAbsDiff > 0.01 ? (
                <>
                  <p className="text-[22px] font-bold text-[#111827]">
                    {PLN(stats.maxAbsDiff)}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    {formatDate(stats.maxAbsDate)}
                  </p>
                </>
              ) : (
                <p className="text-[22px] font-bold text-[#9CA3AF]">—</p>
              )}
            </div>
          </div>

          {/* sparkline */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-[11px] text-[#9CA3AF] mb-3">Ostatnie 30 dni</p>
            <div className="flex items-end gap-0.5 h-16">
              {sparkData.map((s) => (
                <div key={s.date} className="flex-1">
                  <SparkBar diff={s.diff} maxAbs={sparkMax} date={s.date} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#9CA3AF]">
                {formatDate(sparkData[0].date)}
              </span>
              <span className="text-[10px] text-[#9CA3AF]">
                {formatDate(sparkData[sparkData.length - 1].date)}
              </span>
            </div>
          </div>

          {/* table */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
                      Data
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
                      Kasjer
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
                      Stan oczekiwany
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
                      Stan fizyczny
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
                      Różnica
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6B7280]">
                      Wyjaśnienie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const bigFlag = Math.abs(row.diff) > 20
                    const explanation = row.cash_diff_explanation?.trim() ?? ''
                    const shortExpl =
                      explanation.length > 60
                        ? explanation.slice(0, 60) + '…'
                        : explanation

                    return (
                      <tr
                        key={row.date}
                        className={`border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors ${
                          bigFlag ? 'border-l-4 border-amber-400' : ''
                        }`}
                      >
                        {/* Data */}
                        <td className="px-4 py-3 text-[#374151] whitespace-nowrap font-medium">
                          {formatDate(row.date)}
                        </td>

                        {/* Kasjer */}
                        <td className="px-4 py-3 text-[#374151] whitespace-nowrap">
                          {row.closing_person_name || (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* Stan oczekiwany */}
                        <td className="px-4 py-3 text-right text-[#374151] whitespace-nowrap tabular-nums">
                          {row.cash_reported != null ? PLN(row.cash_reported) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* Stan fizyczny */}
                        <td className="px-4 py-3 text-right text-[#374151] whitespace-nowrap tabular-nums">
                          {row.cash_physical != null ? PLN(row.cash_physical) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* Różnica */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {Math.abs(row.diff) <= 0.01 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                              OK
                            </span>
                          ) : row.diff > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                              nadwyżka +{PLN(row.diff)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700">
                              niedobór {PLN(row.diff)}
                            </span>
                          )}
                        </td>

                        {/* Wyjaśnienie */}
                        <td className="px-4 py-3 max-w-xs">
                          {explanation ? (
                            <span
                              className="text-[#374151] cursor-default"
                              title={explanation}
                            >
                              {shortExpl}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] italic">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
