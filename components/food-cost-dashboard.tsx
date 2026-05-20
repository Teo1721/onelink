'use client'

import { useEffect, useState, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, UtensilsCrossed } from 'lucide-react'

const PLN = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0)
const PCT = (v: number) => `${v.toFixed(1)}%`

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  const names = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`
}

type LocationRow = { id: string; name: string }
type Period = '1m' | '3m' | '6m' | 'ytd'

interface Props {
  companyId: string
  supabase: SupabaseClient
  locations: LocationRow[]
}

interface MonthBucket {
  label: string
  revenue: number
  foodCost: number
  waste: number
}

interface CategoryBucket {
  name: string
  amount: number
}

interface LocationBucket {
  id: string
  name: string
  revenue: number
  foodCost: number
  waste: number
}

const FC_TARGET = 30 // % default target

function dateRange(period: Period): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const to = fmt(now)

  if (period === '1m') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: fmt(from), to }
  }
  if (period === '3m') {
    const from = new Date(now)
    from.setMonth(from.getMonth() - 2)
    from.setDate(1)
    return { from: fmt(from), to }
  }
  if (period === '6m') {
    const from = new Date(now)
    from.setMonth(from.getMonth() - 5)
    from.setDate(1)
    return { from: fmt(from), to }
  }
  // ytd
  return { from: `${now.getFullYear()}-01-01`, to }
}

export function FoodCostDashboard({ companyId, supabase, locations }: Props) {
  const [period, setPeriod] = useState<Period>('3m')
  const [locFilter, setLocFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalFoodCost, setTotalFoodCost] = useState(0)
  const [totalWaste, setTotalWaste] = useState(0)
  const [months, setMonths] = useState<Record<string, MonthBucket>>({})
  const [categories, setCategories] = useState<CategoryBucket[]>([])
  const [byLocation, setByLocation] = useState<LocationBucket[]>([])

  const locationIds = useMemo(() => {
    if (locFilter === 'all') return locations.map(l => l.id)
    return [locFilter]
  }, [locFilter, locations])

  useEffect(() => { fetchAll() }, [period, locFilter, locations])

  async function fetchAll() {
    if (!locationIds.length) return
    setLoading(true)
    setError(null)

    const { from, to } = dateRange(period)

    try {
      const [invoiceRes, salesRes, wasteRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, location_id, service_date, total_net, invoice_items(cos_category, net_price)')
          .in('location_id', locationIds)
          .eq('invoice_type', 'COS')
          .eq('status', 'approved')
          .gte('service_date', from)
          .lte('service_date', to),

        supabase
          .from('sales_daily')
          .select('location_id, date, net_revenue')
          .in('location_id', locationIds)
          .gte('date', from)
          .lte('date', to),

        supabase
          .from('waste_logs')
          .select('location_id, logged_date, quantity, unit_cost')
          .in('location_id', locationIds)
          .gte('logged_date', from)
          .lte('logged_date', to),
      ])

      if (invoiceRes.error) throw invoiceRes.error
      if (salesRes.error) throw salesRes.error
      // waste is optional — ignore error

      const invoices = (invoiceRes.data ?? []) as Array<{
        id: string
        location_id: string
        service_date: string
        total_net: number
        invoice_items: Array<{ cos_category: string | null; net_price: number }>
      }>

      const sales = (salesRes.data ?? []) as Array<{
        location_id: string
        date: string
        net_revenue: number | null
      }>

      const wastes = ((wasteRes.data ?? []) as Array<{
        location_id: string
        logged_date: string
        quantity: number | null
        unit_cost: number | null
      }>)

      // ── Aggregate totals ──────────────────────────────────────────
      let rev = 0, fc = 0, wst = 0
      for (const s of sales) rev += Number(s.net_revenue || 0)
      for (const inv of invoices) fc += Number(inv.total_net || 0)
      for (const w of wastes) wst += Number(w.quantity || 0) * Number(w.unit_cost || 0)

      setTotalRevenue(rev)
      setTotalFoodCost(fc)
      setTotalWaste(wst)

      // ── Monthly buckets ───────────────────────────────────────────
      const mBuckets: Record<string, MonthBucket> = {}
      const ensureMonth = (ym: string) => {
        if (!mBuckets[ym]) mBuckets[ym] = { label: monthLabel(ym), revenue: 0, foodCost: 0, waste: 0 }
      }

      for (const s of sales) {
        const ym = s.date.slice(0, 7)
        ensureMonth(ym)
        mBuckets[ym].revenue += Number(s.net_revenue || 0)
      }
      for (const inv of invoices) {
        const ym = inv.service_date.slice(0, 7)
        ensureMonth(ym)
        mBuckets[ym].foodCost += Number(inv.total_net || 0)
      }
      for (const w of wastes) {
        const ym = w.logged_date.slice(0, 7)
        ensureMonth(ym)
        mBuckets[ym].waste += Number(w.quantity || 0) * Number(w.unit_cost || 0)
      }
      setMonths(mBuckets)

      // ── Category breakdown ────────────────────────────────────────
      const catMap: Record<string, number> = {}
      for (const inv of invoices) {
        for (const item of inv.invoice_items ?? []) {
          const cat = item.cos_category?.trim() || 'Inne'
          catMap[cat] = (catMap[cat] || 0) + Number(item.net_price || 0)
        }
      }
      const catArr = Object.entries(catMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
      setCategories(catArr)

      // ── By location ───────────────────────────────────────────────
      const locMap: Record<string, LocationBucket> = {}
      for (const loc of locations) {
        if (locFilter !== 'all' && loc.id !== locFilter) continue
        locMap[loc.id] = { id: loc.id, name: loc.name, revenue: 0, foodCost: 0, waste: 0 }
      }
      for (const s of sales) {
        if (locMap[s.location_id]) locMap[s.location_id].revenue += Number(s.net_revenue || 0)
      }
      for (const inv of invoices) {
        if (locMap[inv.location_id]) locMap[inv.location_id].foodCost += Number(inv.total_net || 0)
      }
      for (const w of wastes) {
        if (locMap[w.location_id]) locMap[w.location_id].waste += Number(w.quantity || 0) * Number(w.unit_cost || 0)
      }
      setByLocation(Object.values(locMap).filter(l => l.revenue > 0 || l.foodCost > 0))
    } catch (e: any) {
      setError(e?.message ?? 'Błąd pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  const fcPct = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0
  const fcColor = fcPct === 0 ? '#9CA3AF' : fcPct < 28 ? '#10B981' : fcPct < 35 ? '#F59E0B' : '#EF4444'
  const fcBg   = fcPct === 0 ? '#F9FAFB' : fcPct < 28 ? '#ECFDF5' : fcPct < 35 ? '#FFFBEB' : '#FEF2F2'

  const sortedMonths = useMemo(() =>
    Object.entries(months).sort(([a], [b]) => a.localeCompare(b)),
    [months]
  )

  const maxMonthRev = useMemo(() =>
    Math.max(...sortedMonths.map(([, m]) => m.revenue), 1),
    [sortedMonths]
  )

  const catTotal = categories.reduce((s, c) => s + c.amount, 0)

  const PERIODS: { key: Period; label: string }[] = [
    { key: '1m', label: 'Ten miesiąc' },
    { key: '3m', label: '3 miesiące' },
    { key: '6m', label: '6 miesięcy' },
    { key: 'ytd', label: 'Od początku roku' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Koszt surowców (FC%)</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Rzeczywisty food cost na podstawie zatwierdzonych faktur COS i przychodów
          </p>
        </div>
        {/* Location filter */}
        {locations.length > 1 && (
          <select
            value={locFilter}
            onChange={e => setLocFilter(e.target.value)}
            className="text-[13px] border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Wszystkie lokale</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 w-fit">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              period === p.key
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* FC% card */}
            <div className="lg:col-span-1 rounded-xl border border-[#E5E7EB] shadow-sm p-4" style={{ background: fcBg }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Food Cost %</p>
                {fcPct > 0 && (
                  fcPct < FC_TARGET
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-[30px] font-black leading-none" style={{ color: fcColor }}>
                {fcPct > 0 ? PCT(fcPct) : '—'}
              </p>
              <p className="text-[11px] mt-1" style={{ color: fcColor }}>
                {fcPct === 0 ? 'Brak danych' : fcPct < FC_TARGET ? `✓ Poniżej celu (${FC_TARGET}%)` : `↑ Powyżej celu (${FC_TARGET}%)`}
              </p>
            </div>

            {/* Purchases */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] mb-1">Zakupy COS</p>
              <p className="text-[22px] font-black text-[#111827]">{PLN(totalFoodCost)}</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">Faktury zatwierdzone</p>
            </div>

            {/* Revenue */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] mb-1">Przychody netto</p>
              <p className="text-[22px] font-black text-[#111827]">{PLN(totalRevenue)}</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">Z raportów dziennych</p>
            </div>

            {/* Waste */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] mb-1">Odpady</p>
              <p className="text-[22px] font-black text-[#111827]">{totalWaste > 0 ? PLN(totalWaste) : '—'}</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                {totalWaste > 0 && totalRevenue > 0
                  ? `${PCT((totalWaste / totalRevenue) * 100)} przychodu`
                  : 'Brak wpisów odpadów'}
              </p>
            </div>
          </div>

          {/* Monthly trend */}
          {sortedMonths.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <p className="text-[14px] font-bold text-[#111827] mb-4">Trend miesięczny</p>
              <div className="space-y-3">
                {sortedMonths.map(([ym, m]) => {
                  const monthFcPct = m.revenue > 0 ? (m.foodCost / m.revenue) * 100 : 0
                  const revenueBar = maxMonthRev > 0 ? (m.revenue / maxMonthRev) * 100 : 0
                  const barColor = monthFcPct === 0 ? '#93C5FD' : monthFcPct < 28 ? '#10B981' : monthFcPct < 35 ? '#F59E0B' : '#EF4444'

                  return (
                    <div key={ym} className="flex items-center gap-3">
                      <span className="text-[11px] text-[#9CA3AF] w-14 shrink-0 text-right font-medium">
                        {m.label}
                      </span>
                      <div className="flex-1 h-7 bg-[#F3F4F6] rounded-md overflow-hidden relative">
                        <div
                          className="h-full rounded-md transition-all duration-500 opacity-20"
                          style={{ width: `${revenueBar}%`, background: '#3B82F6' }}
                        />
                        <div
                          className="absolute top-0 left-0 h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${Math.min(revenueBar * (monthFcPct / 100), 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <div className="w-24 shrink-0 flex items-center justify-end gap-2">
                        <span className="text-[12px] font-bold" style={{ color: barColor }}>
                          {monthFcPct > 0 ? PCT(monthFcPct) : '—'}
                        </span>
                        <span className="text-[11px] text-[#9CA3AF]">
                          {PLN(m.revenue)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#F3F4F6]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-200" />
                  <span className="text-[11px] text-[#9CA3AF]">Przychód</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                  <span className="text-[11px] text-[#9CA3AF]">FC% &lt; 28%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-amber-400" />
                  <span className="text-[11px] text-[#9CA3AF]">28–35%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-400" />
                  <span className="text-[11px] text-[#9CA3AF]">&gt; 35%</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom row: categories + by location */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category breakdown */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <p className="text-[14px] font-bold text-[#111827] mb-4">Podział wg kategorii</p>
              {categories.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF] text-center py-6">Brak pozycji w fakturach COS</p>
              ) : (
                <div className="space-y-3">
                  {categories.map(cat => {
                    const pct = catTotal > 0 ? (cat.amount / catTotal) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[12px] font-medium text-[#374151] truncate max-w-[60%]">
                            {cat.name}
                          </span>
                          <span className="text-[12px] text-[#6B7280]">
                            {PLN(cat.amount)} <span className="text-[#9CA3AF]">· {PCT(pct)}</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* By location */}
            {byLocation.length > 1 && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
                <p className="text-[14px] font-bold text-[#111827] mb-4">Porównanie lokali</p>
                <div className="space-y-0 -mx-1">
                  {byLocation
                    .sort((a, b) => {
                      const aP = a.revenue > 0 ? a.foodCost / a.revenue : 0
                      const bP = b.revenue > 0 ? b.foodCost / b.revenue : 0
                      return bP - aP
                    })
                    .map(loc => {
                      const pct = loc.revenue > 0 ? (loc.foodCost / loc.revenue) * 100 : 0
                      const color = pct === 0 ? '#9CA3AF' : pct < 28 ? '#10B981' : pct < 35 ? '#F59E0B' : '#EF4444'
                      return (
                        <div key={loc.id} className="flex items-center gap-3 px-1 py-2.5 border-b border-[#F3F4F6] last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#111827] truncate">{loc.name}</p>
                            <p className="text-[11px] text-[#9CA3AF]">
                              {PLN(loc.foodCost)} / {PLN(loc.revenue)}
                            </p>
                          </div>
                          <span className="text-[15px] font-black shrink-0" style={{ color }}>
                            {pct > 0 ? PCT(pct) : '—'}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* If only 1 location, show top products instead */}
            {byLocation.length <= 1 && categories.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
                <p className="text-[14px] font-bold text-[#111827] mb-2">Podsumowanie okresu</p>
                <div className="space-y-2 mt-3">
                  {[
                    { label: 'Zakupy COS', value: PLN(totalFoodCost) },
                    { label: 'Przychody netto', value: PLN(totalRevenue) },
                    { label: 'Food Cost %', value: fcPct > 0 ? PCT(fcPct) : '—' },
                    { label: 'Cel FC%', value: `${FC_TARGET}%` },
                    { label: 'Różnica vs cel', value: fcPct > 0 ? `${(fcPct - FC_TARGET) > 0 ? '+' : ''}${(fcPct - FC_TARGET).toFixed(1)} pp` : '—' },
                    { label: 'Odpady', value: totalWaste > 0 ? PLN(totalWaste) : '—' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-1.5 border-b border-[#F9FAFB] last:border-0">
                      <span className="text-[12px] text-[#6B7280]">{row.label}</span>
                      <span className="text-[13px] font-semibold text-[#111827]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {totalRevenue === 0 && totalFoodCost === 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-12 text-center">
              <UtensilsCrossed className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak danych w wybranym okresie</p>
              <p className="text-[13px] text-[#9CA3AF]">
                Upewnij się, że faktury COS są zatwierdzone, a raporty dzienne uzupełnione.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
