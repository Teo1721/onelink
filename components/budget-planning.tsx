'use client'

import { useEffect, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, ChevronLeft, ChevronRight, Pencil, X, Save } from 'lucide-react'

/* ─── types ─────────────────────────────────────────────────────── */
interface Props {
  locationId: string
  locationName: string
  companyId: string
  supabase: SupabaseClient
}

interface BudgetPlan {
  id?: string
  location_id: string
  company_id: string
  month: string
  revenue_target: number | null
  cos_budget: number | null
  semis_budget: number | null
  notes: string | null
}

interface MonthActuals {
  revenue: number
  cos: number
  semis: number
}

interface TrendRow {
  month: string
  plan: BudgetPlan | null
  actuals: MonthActuals
}

/* ─── helpers ────────────────────────────────────────────────────── */
const PLN = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        maximumFractionDigits: 0,
      }).format(v)

function firstOfMonth(y: number, m: number): string {
  // returns YYYY-MM-DD (first day)
  return `${y}-${String(m + 1).padStart(2, '0')}-01`
}

function lastOfMonth(y: number, m: number): string {
  const d = new Date(y, m + 1, 0)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMonthLabel(isoMonth: string): string {
  const d = new Date(isoMonth + 'T00:00:00')
  const label = d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function pct(actual: number, target: number | null): number | null {
  if (!target || target === 0) return null
  return (actual / target) * 100
}

/* ─── progress bar ───────────────────────────────────────────────── */
function ProgressBar({
  value,
  max,
  inverted = false,
}: {
  value: number
  max: number | null
  inverted?: boolean
}) {
  if (!max || max === 0) return <div className="h-2 rounded-full bg-[#F3F4F6]" />

  const ratio = value / max
  const clampedWidth = Math.min(ratio * 100, 100)

  let color: string
  if (!inverted) {
    color = ratio >= 0.9 ? 'bg-emerald-500' : ratio >= 0.6 ? 'bg-amber-400' : 'bg-red-500'
  } else {
    color = ratio <= 0.9 ? 'bg-emerald-500' : ratio <= 1.0 ? 'bg-amber-400' : 'bg-red-500'
  }

  return (
    <div className="h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${clampedWidth}%` }}
      />
    </div>
  )
}

/* ─── food cost color helper ─────────────────────────────────────── */
function foodCostColor(fc: number | null): string {
  if (fc == null) return 'text-[#6B7280]'
  if (fc < 30) return 'text-emerald-600'
  if (fc < 38) return 'text-amber-600'
  return 'text-red-600'
}

/* ─── main component ─────────────────────────────────────────────── */
export function BudgetPlanning({ locationId, locationName, companyId, supabase }: Props) {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  const [plan, setPlan] = useState<BudgetPlan | null>(null)
  const [actuals, setActuals] = useState<MonthActuals>({ revenue: 0, cos: 0, semis: 0 })
  const [trend, setTrend] = useState<TrendRow[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const [form, setForm] = useState({
    revenue_target: '',
    cos_budget: '',
    semis_budget: '',
    notes: '',
  })

  /* ── navigate months ─────────────────────────────────────────── */
  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedYear(y => y - 1)
      setSelectedMonth(11)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedYear(y => y + 1)
      setSelectedMonth(0)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  /* ── fetch actuals for a given year/month ────────────────────── */
  const fetchActuals = useCallback(
    async (y: number, m: number): Promise<MonthActuals> => {
      const first = firstOfMonth(y, m)
      const last = lastOfMonth(y, m)

      const [revRes, cosRes, semisRes] = await Promise.all([
        supabase
          .from('sales_daily')
          .select('gross_revenue')
          .eq('location_id', locationId)
          .gte('date', first)
          .lte('date', last),
        supabase
          .from('invoices')
          .select('total_gross')
          .eq('location_id', locationId)
          .eq('invoice_type', 'COS')
          .in('status', ['submitted', 'approved'])
          .gte('service_date', first)
          .lte('service_date', last),
        supabase
          .from('invoices')
          .select('total_gross')
          .eq('location_id', locationId)
          .eq('invoice_type', 'SEMIS')
          .in('status', ['submitted', 'approved'])
          .gte('service_date', first)
          .lte('service_date', last),
      ])

      const revenue = (revRes.data ?? []).reduce(
        (s: number, r: any) => s + (Number(r.gross_revenue) || 0),
        0,
      )
      const cos = (cosRes.data ?? []).reduce(
        (s: number, r: any) => s + (Number(r.total_gross) || 0),
        0,
      )
      const semis = (semisRes.data ?? []).reduce(
        (s: number, r: any) => s + (Number(r.total_gross) || 0),
        0,
      )

      return { revenue, cos, semis }
    },
    [locationId, supabase],
  )

  /* ── fetch plan + actuals for selected month ─────────────────── */
  const fetchCurrent = useCallback(async () => {
    setLoading(true)
    try {
      const monthIso = firstOfMonth(selectedYear, selectedMonth)

      const [planRes, acts] = await Promise.all([
        supabase
          .from('budget_plans')
          .select('*')
          .eq('location_id', locationId)
          .eq('month', monthIso)
          .maybeSingle(),
        fetchActuals(selectedYear, selectedMonth),
      ])

      setPlan((planRes.data as BudgetPlan) ?? null)
      setActuals(acts)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth, locationId, supabase, fetchActuals])

  /* ── fetch 6-month trend ─────────────────────────────────────── */
  const fetchTrend = useCallback(async () => {
    // Build list of last 6 months (newest first)
    const months: { y: number; m: number }[] = []
    let ty = selectedYear
    let tm = selectedMonth
    for (let i = 0; i < 6; i++) {
      months.push({ y: ty, m: tm })
      if (tm === 0) {
        ty -= 1
        tm = 11
      } else {
        tm -= 1
      }
    }

    const isos = months.map(({ y, m }) => firstOfMonth(y, m))

    const { data: plans } = await supabase
      .from('budget_plans')
      .select('*')
      .eq('location_id', locationId)
      .in('month', isos)

    const actualsArr = await Promise.all(months.map(({ y, m }) => fetchActuals(y, m)))

    const rows: TrendRow[] = months.map(({ y, m }, i) => {
      const iso = firstOfMonth(y, m)
      const p = ((plans ?? []) as BudgetPlan[]).find(x => x.month.startsWith(iso)) ?? null
      return { month: iso, plan: p, actuals: actualsArr[i] }
    })

    setTrend(rows)
  }, [selectedYear, selectedMonth, locationId, supabase, fetchActuals])

  useEffect(() => {
    fetchCurrent()
    fetchTrend()
  }, [fetchCurrent, fetchTrend])

  /* ── open edit form ──────────────────────────────────────────── */
  function openEdit() {
    setForm({
      revenue_target: plan?.revenue_target != null ? String(plan.revenue_target) : '',
      cos_budget: plan?.cos_budget != null ? String(plan.cos_budget) : '',
      semis_budget: plan?.semis_budget != null ? String(plan.semis_budget) : '',
      notes: plan?.notes ?? '',
    })
    setEditing(true)
  }

  /* ── save budget plan ────────────────────────────────────────── */
  async function savePlan() {
    setSaving(true)
    try {
      const monthIso = firstOfMonth(selectedYear, selectedMonth)
      const payload: Omit<BudgetPlan, 'id'> = {
        location_id: locationId,
        company_id: companyId,
        month: monthIso,
        revenue_target: form.revenue_target !== '' ? Number(form.revenue_target) : null,
        cos_budget: form.cos_budget !== '' ? Number(form.cos_budget) : null,
        semis_budget: form.semis_budget !== '' ? Number(form.semis_budget) : null,
        notes: form.notes !== '' ? form.notes : null,
      }
      await supabase
        .from('budget_plans')
        .upsert(payload, { onConflict: 'location_id,month' })

      setEditing(false)
      await fetchCurrent()
      await fetchTrend()
    } finally {
      setSaving(false)
    }
  }

  /* ── derived values ──────────────────────────────────────────── */
  const foodCostPct =
    actuals.revenue > 0 ? (actuals.cos / actuals.revenue) * 100 : null

  const currentMonthIso = firstOfMonth(selectedYear, selectedMonth)
  const todayMonthIso = firstOfMonth(now.getFullYear(), now.getMonth())

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[22px] font-semibold text-[#111827]">
          Budżet — {locationName}
        </h2>

        <div className="flex items-center gap-2">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 shadow-sm">
            <button
              onClick={prevMonth}
              className="p-0.5 rounded hover:bg-[#F3F4F6] text-[#374151]"
              aria-label="Poprzedni miesiąc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-medium text-[#111827] min-w-[120px] text-center">
              {formatMonthLabel(currentMonthIso)}
            </span>
            <button
              onClick={nextMonth}
              className="p-0.5 rounded hover:bg-[#F3F4F6] text-[#374151]"
              aria-label="Następny miesiąc"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Edit button */}
          {!editing && (
            <button
              onClick={openEdit}
              className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edytuj budżet
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && (
        <>
          {/* Edit form */}
          {editing && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#111827]">
                  Edytuj budżet — {formatMonthLabel(currentMonthIso)}
                </span>
                <button
                  onClick={() => setEditing(false)}
                  className="text-[#9CA3AF] hover:text-[#374151]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                    Cel przychodu (zł)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="np. 150000"
                    value={form.revenue_target}
                    onChange={e => setForm(f => ({ ...f, revenue_target: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                    Budżet COS (zł)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="np. 45000"
                    value={form.cos_budget}
                    onChange={e => setForm(f => ({ ...f, cos_budget: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                    Budżet SEMIS (zł)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="np. 20000"
                    value={form.semis_budget}
                    onChange={e => setForm(f => ({ ...f, semis_budget: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                  Notatki
                </label>
                <textarea
                  rows={2}
                  placeholder="Dodatkowe uwagi do budżetu..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Anuluj
                </button>
                <button
                  onClick={savePlan}
                  disabled={saving}
                  className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Zapisz
                </button>
              </div>
            </div>
          )}

          {/* 4 metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Przychody */}
            <MetricCard
              label="Przychody"
              target={plan?.revenue_target ?? null}
              actual={actuals.revenue}
              inverted={false}
              suffix="cel"
            />

            {/* Koszty COS */}
            <MetricCard
              label="Koszty COS"
              target={plan?.cos_budget ?? null}
              actual={actuals.cos}
              inverted={true}
              suffix="budżet"
            />

            {/* Koszty SEMIS */}
            <MetricCard
              label="Koszty SEMIS"
              target={plan?.semis_budget ?? null}
              actual={actuals.semis}
              inverted={true}
              suffix="budżet"
            />

            {/* Food Cost % */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
              <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                Food Cost %
              </p>
              <div className="space-y-1.5">
                <p className={`text-[22px] font-bold leading-none ${foodCostColor(foodCostPct)}`}>
                  {foodCostPct != null ? `${foodCostPct.toFixed(1)}%` : '—'}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">Cel: &lt; 30%</p>
              </div>
              {/* Color band */}
              <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
                <div className="flex-1 bg-emerald-500 rounded-l-full" />
                <div className="flex-1 bg-amber-400" />
                <div className="flex-1 bg-red-500 rounded-r-full" />
              </div>
              <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                <span>&lt;30%</span>
                <span>30–38%</span>
                <span>&gt;38%</span>
              </div>
            </div>
          </div>

          {/* Monthly trend table */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-[13px] font-semibold text-[#111827]">Trend miesięczny (ostatnie 6 miesięcy)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">Miesiąc</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[#6B7280]">Przychody</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[#6B7280]">Budżet przychód</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[#6B7280]">% realizacji</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[#6B7280]">Koszty COS</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[#6B7280]">Food Cost%</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((row, i) => {
                    const isCurrentMonth = row.month === currentMonthIso
                    const isTodayMonth = row.month === todayMonthIso
                    const realisationPct = pct(row.actuals.revenue, row.plan?.revenue_target ?? null)
                    const fc =
                      row.actuals.revenue > 0
                        ? (row.actuals.cos / row.actuals.revenue) * 100
                        : null

                    let realisationColor = 'text-[#374151]'
                    if (realisationPct != null) {
                      if (realisationPct >= 90) realisationColor = 'text-emerald-600'
                      else if (realisationPct >= 60) realisationColor = 'text-amber-600'
                      else realisationColor = 'text-red-600'
                    }

                    return (
                      <tr
                        key={row.month}
                        className={[
                          'border-b border-[#F3F4F6] last:border-0',
                          isCurrentMonth ? 'bg-blue-50' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white',
                        ].join(' ')}
                      >
                        <td className="px-4 py-2.5 font-medium text-[#111827] whitespace-nowrap">
                          {formatMonthLabel(row.month)}
                          {isTodayMonth && (
                            <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                              bieżący
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#111827] font-medium whitespace-nowrap">
                          {PLN(row.actuals.revenue)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#374151] whitespace-nowrap">
                          {row.plan?.revenue_target != null ? PLN(row.plan.revenue_target) : '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${realisationColor}`}>
                          {realisationPct != null ? `${realisationPct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#374151] whitespace-nowrap">
                          {PLN(row.actuals.cos)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${foodCostColor(fc)}`}>
                          {fc != null ? `${fc.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {trend.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#9CA3AF] text-[12px]">
                        Brak danych
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── MetricCard sub-component ───────────────────────────────────── */
function MetricCard({
  label,
  target,
  actual,
  inverted,
  suffix,
}: {
  label: string
  target: number | null
  actual: number
  inverted: boolean
  suffix: string
}) {
  const ratio = target && target > 0 ? actual / target : null
  const p = ratio != null ? Math.round(ratio * 100) : null

  let pctColor = 'text-[#6B7280]'
  if (ratio != null) {
    if (!inverted) {
      pctColor = ratio >= 0.9 ? 'text-emerald-600' : ratio >= 0.6 ? 'text-amber-600' : 'text-red-600'
    } else {
      pctColor = ratio <= 0.9 ? 'text-emerald-600' : ratio <= 1.0 ? 'text-amber-600' : 'text-red-600'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
      <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">{label}</p>
      <div className="space-y-1">
        <p className="text-[22px] font-bold text-[#111827] leading-none">{PLN(actual)}</p>
        <p className="text-[11px] text-[#9CA3AF]">
          {target != null ? `${PLN(target)} ${suffix}` : `Brak ${suffix}u`}
        </p>
      </div>
      <ProgressBar value={actual} max={target} inverted={inverted} />
      <p className={`text-[12px] font-semibold ${pctColor}`}>
        {p != null ? `${p}% realizacji` : '—'}
      </p>
    </div>
  )
}
