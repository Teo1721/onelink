'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Loader2, RefreshCw, Brain,
  AlertTriangle, ChevronUp, ChevronDown, Minus, Calendar,
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────────── */
const PLN = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(v || 0)

function dateLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

/** Simple weighted moving average — recent days have more weight */
function weightedMA(values: number[], weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0)
  return values.reduce((s, v, i) => s + v * weights[i], 0) / total
}

/** Linear regression over (x, y) pairs — returns {slope, intercept} */
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumY / n }
  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

/** Day-of-week multipliers from history */
function dowMultipliers(rows: { date: string; net_revenue: number }[]): number[] {
  const sums  = Array(7).fill(0)
  const counts = Array(7).fill(0)
  rows.forEach(r => {
    const dow = new Date(r.date).getDay()
    sums[dow]  += r.net_revenue
    counts[dow] += 1
  })
  const avgs = sums.map((s, i) => counts[i] > 0 ? s / counts[i] : null)
  const defined = avgs.filter(Boolean) as number[]
  const overall = defined.length ? defined.reduce((a, b) => a + b) / defined.length : 1
  return avgs.map(a => (a !== null ? a / overall : 1))
}

/* ─── types ──────────────────────────────────────────────── */
interface DataPoint {
  date: string
  label: string
  actual?: number
  forecast?: number
  lower?: number
  upper?: number
  isForecast: boolean
}

interface Props {
  supabase: SupabaseClient
  companyId: string
  locationId?: string
}

/* ─── tooltip ────────────────────────────────────────────── */
function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as DataPoint
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-3 text-[12px]">
      <p className="font-bold text-[#111827] mb-1">{p.label}</p>
      {p.actual   !== undefined && <p className="text-[#374151]">Rzeczywisty: <strong>{PLN(p.actual)}</strong></p>}
      {p.forecast !== undefined && (
        <p className={p.isForecast ? 'text-blue-600' : 'text-[#374151]'}>
          {p.isForecast ? 'Prognoza' : 'Trend'}: <strong>{PLN(p.forecast)}</strong>
        </p>
      )}
      {p.lower !== undefined && p.upper !== undefined && (
        <p className="text-[#9CA3AF]">Przedział: {PLN(p.lower)} – {PLN(p.upper)}</p>
      )}
    </div>
  )
}

/* ─── main component ─────────────────────────────────────── */
export function RevenueForecast({ supabase, companyId, locationId }: Props) {
  const [loading, setLoading]     = useState(true)
  const [points, setPoints]       = useState<DataPoint[]>([])
  const [insight, setInsight]     = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [horizon, setHorizon]     = useState<7 | 14 | 30>(14)
  const [stats, setStats]         = useState<{
    avgRev: number
    trend: 'up' | 'down' | 'flat'
    trendPct: number
    forecastTotal: number
    forecastVsLastPeriod: number
  } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => { buildForecast() }, [companyId, locationId, horizon])

  async function buildForecast() {
    setLoading(true)
    setError(null)
    try {
      // Fetch 90 days of history
      const since = addDays(new Date().toLocaleDateString('sv-SE'), -90)
      let query = supabase
        .from('sales_daily')
        .select('date, net_revenue')
        .gte('date', since)
        .order('date')
      if (locationId) {
        query = query.eq('location_id', locationId)
      } else {
        // aggregate by date for all locations in company
        const { data: locs } = await supabase.from('locations').select('id').eq('company_id', companyId)
        const locIds = locs?.map((l: any) => l.id) ?? []
        if (locIds.length) query = query.in('location_id', locIds)
      }

      const { data: rows, error: dbErr } = await query
      if (dbErr) throw dbErr

      if (!rows || rows.length < 7) {
        setError('Za mało danych do prognozy. Wprowadź co najmniej 7 dni sprzedaży.')
        setLoading(false)
        return
      }

      // Aggregate by date (sum multiple locations)
      const byDate: Record<string, number> = {}
      for (const r of rows) {
        byDate[r.date] = (byDate[r.date] ?? 0) + (r.net_revenue || 0)
      }
      const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
      const historical = sorted.map(([date, net_revenue]) => ({ date, net_revenue }))

      // Linear regression on historical data
      const reg = linearRegression(
        historical.map((r, i) => ({ x: i, y: r.net_revenue }))
      )
      const n = historical.length
      const recentSlice = historical.slice(-14)

      // Standard deviation for confidence band
      const residuals = historical.map((r, i) => r.net_revenue - (reg.slope * i + reg.intercept))
      const variance  = residuals.reduce((s, r) => s + r * r, 0) / residuals.length
      const stdDev    = Math.sqrt(variance)

      // DoW multipliers
      const multipliers = dowMultipliers(historical)

      // Build chart points — historical
      const chartPoints: DataPoint[] = historical.map((r, i) => ({
        date: r.date,
        label: dateLabel(r.date),
        actual: r.net_revenue,
        forecast: Math.max(0, reg.slope * i + reg.intercept),
        isForecast: false,
      }))

      // Last actual date
      const lastDate = historical[historical.length - 1].date

      // Weighted MA of last 21 days as base level
      const window = historical.slice(-21)
      const weights = window.map((_, i) => i + 1)
      const baseLevel = weightedMA(window.map(r => r.net_revenue), weights)

      // Build forecast points
      for (let d = 1; d <= horizon; d++) {
        const futureDate = addDays(lastDate, d)
        const dow = new Date(futureDate).getDay()
        const trendAdj = reg.slope * (n + d - 1) + reg.intercept
        const dowMult  = multipliers[dow]
        const forecastRaw = Math.max(0, (trendAdj * 0.5 + baseLevel * 0.5) * dowMult)
        const lower  = Math.max(0, forecastRaw - 1.5 * stdDev)
        const upper  = forecastRaw + 1.5 * stdDev
        chartPoints.push({
          date: futureDate,
          label: dateLabel(futureDate),
          forecast: forecastRaw,
          lower,
          upper,
          isForecast: true,
        })
      }

      setPoints(chartPoints)

      // Stats
      const lastPeriod = historical.slice(-horizon).reduce((s, r) => s + r.net_revenue, 0)
      const forecastTotal = chartPoints.filter(p => p.isForecast).reduce((s, p) => s + (p.forecast ?? 0), 0)
      const avgRev  = historical.reduce((s, r) => s + r.net_revenue, 0) / historical.length
      const firstHalf = historical.slice(0, Math.floor(n / 2)).reduce((s, r) => s + r.net_revenue, 0)
      const secHalf  = historical.slice(Math.floor(n / 2)).reduce((s, r) => s + r.net_revenue, 0)
      const trendPct = firstHalf > 0 ? ((secHalf - firstHalf) / firstHalf) * 100 : 0
      setStats({
        avgRev,
        trend: Math.abs(trendPct) < 3 ? 'flat' : trendPct > 0 ? 'up' : 'down',
        trendPct: Math.abs(trendPct),
        forecastTotal,
        forecastVsLastPeriod: lastPeriod > 0 ? ((forecastTotal - lastPeriod) / lastPeriod) * 100 : 0,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Błąd pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  async function generateInsight() {
    if (!stats || !points.length) return
    setInsightLoading(true)
    setInsight('')
    try {
      const historical = points.filter(p => !p.isForecast)
      const forecast   = points.filter(p => p.isForecast)
      const payload = {
        avgDailyRevenue: stats.avgRev.toFixed(0),
        trend: stats.trend,
        trendPct: stats.trendPct.toFixed(1),
        forecastTotal: stats.forecastTotal.toFixed(0),
        forecastDays: horizon,
        forecastVsLastPeriod: stats.forecastVsLastPeriod.toFixed(1),
        lastActual: historical.at(-1)?.actual?.toFixed(0),
        maxForecastDay: forecast.reduce((a, b) => (b.forecast ?? 0) > (a.forecast ?? 0) ? b : a).label,
        minForecastDay: forecast.reduce((a, b) => (b.forecast ?? 0) < (a.forecast ?? 0) ? b : a).label,
      }

      const res = await fetch('/api/ai/forecast-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setInsight(json.insight ?? '')
    } catch {
      setInsight('Nie udało się wygenerować analizy AI. Spróbuj ponownie.')
    } finally {
      setInsightLoading(false)
    }
  }

  const TrendIcon = stats?.trend === 'up' ? ChevronUp : stats?.trend === 'down' ? ChevronDown : Minus
  const trendColor = stats?.trend === 'up' ? 'text-emerald-600' : stats?.trend === 'down' ? 'text-red-500' : 'text-[#6B7280]'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Prognoza przychodów</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Model oparty na regresji liniowej + sezonowości tygodniowej</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Horizon selector */}
          <div className="flex bg-white rounded-lg border border-[#E5E7EB] p-0.5">
            {([7, 14, 30] as const).map(h => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-colors ${
                  horizon === h ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {h}d
              </button>
            ))}
          </div>
          <button onClick={buildForecast}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Odśwież
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800">{error}</p>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">Śr. dzienny (hist.)</p>
              <p className="text-[22px] font-black text-[#111827]">{PLN(stats.avgRev)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">Trend 90 dni</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[22px] font-black text-[#111827]">{stats.trendPct.toFixed(1)}%</p>
                <TrendIcon className={`w-5 h-5 ${trendColor}`} />
              </div>
            </div>
            <div className={`rounded-2xl border p-5 ${
              stats.forecastVsLastPeriod >= 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">
                Prognoza {horizon}d / poprzedni okres
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-[22px] font-black text-[#111827]">{PLN(stats.forecastTotal)}</p>
                <span className={`text-[13px] font-bold ${stats.forecastVsLastPeriod >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {stats.forecastVsLastPeriod >= 0 ? '+' : ''}{stats.forecastVsLastPeriod.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <p className="text-[14px] font-bold text-[#111827] mb-4">
              Historia + prognoza {horizon} dni
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={points} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(points.length / 10)}
                />
                <YAxis
                  tickFormatter={v => PLN(v).replace(' zł', 'k').replace(/\s\d+$/, '')}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<ForecastTooltip />} />
                {/* Confidence band */}
                <Area dataKey="upper" fill="url(#forecastGrad)" stroke="none" name="Górny przedział" />
                <Area dataKey="lower" fill="#F7F8FA" stroke="none" name="Dolny przedział" />
                {/* Actual */}
                <Line
                  dataKey="actual"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Rzeczywisty"
                  connectNulls
                />
                {/* Forecast */}
                <Line
                  dataKey="forecast"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Prognoza"
                  connectNulls
                />
                {/* Divider */}
                <ReferenceLine
                  x={points.find(p => p.isForecast)?.label}
                  stroke="#E5E7EB"
                  strokeDasharray="4 2"
                  label={{ value: 'Dziś', position: 'top', fontSize: 10, fill: '#9CA3AF' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-3 justify-center">
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                <div className="w-5 h-0.5 bg-blue-500 rounded" />
                Rzeczywisty
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                <div className="w-5 h-0.5 bg-violet-500 rounded border-dashed" style={{ borderTop: '2px dashed #8B5CF6', background: 'none' }} />
                Prognoza
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                <div className="w-5 h-3 rounded bg-violet-100" />
                Przedział ufności
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-600" />
                <p className="text-[14px] font-bold text-[#111827]">Analiza AI</p>
              </div>
              <button
                onClick={generateInsight}
                disabled={insightLoading}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {insightLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                Generuj analizę
              </button>
            </div>

            {!insight && !insightLoading && (
              <div className="flex flex-col items-center py-8 text-center">
                <Brain className="w-8 h-8 text-[#D1D5DB] mb-3" />
                <p className="text-[13px] text-[#9CA3AF]">Kliknij „Generuj analizę" aby otrzymać komentarz AI do prognozy</p>
              </div>
            )}

            {insightLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-[13px] text-[#9CA3AF]">
                <Loader2 className="w-4 h-4 animate-spin" /> Analizuję dane…
              </div>
            )}

            {insight && !insightLoading && (
              <div className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-line">
                {insight}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
