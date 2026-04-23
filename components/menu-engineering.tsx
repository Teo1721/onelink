'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { Star, TrendingUp, AlertTriangle, Trash2, Loader2, RefreshCw, Info } from 'lucide-react'

/* ─── types ─────────────────────────────────────────── */
interface Dish {
  id: string
  dish_name: string
  menu_price_net: number | null
  food_cost_target: number | null   // % as decimal e.g. 0.30 = 30%
  category: string | null
  popularity: number    // manual or from dish_sales; 0–100
}

type EngCategory = 'star' | 'plowhorse' | 'puzzle' | 'dog'

interface EngineeringDish extends Dish {
  contribution: number      // menu_price_net * (1 - food_cost_target)
  engCategory: EngCategory
}

/* ─── helpers ─────────────────────────────────────────── */
const PLN = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(v)
const PCT = (v: number) => (v * 100).toFixed(1) + '%'

const ENG_CFG: Record<EngCategory, { label: string; color: string; bg: string; border: string; desc: string; icon: any }> = {
  star:      { label: 'Gwiazda',     color: '#16A34A', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Wysoka marża + wysoka popularność. Promuj i chroń.',     icon: Star        },
  plowhorse: { label: 'Koń roboczy', color: '#D97706', bg: 'bg-amber-50',   border: 'border-amber-200',   desc: 'Niska marża + wysoka popularność. Optymalizuj koszty.',  icon: TrendingUp  },
  puzzle:    { label: 'Zagadka',     color: '#2563EB', bg: 'bg-blue-50',    border: 'border-blue-200',    desc: 'Wysoka marża + niska popularność. Zwiększ ekspozycję.',   icon: Info        },
  dog:       { label: 'Pies',        color: '#DC2626', bg: 'bg-red-50',     border: 'border-red-200',     desc: 'Niska marża + niska popularność. Rozważ usunięcie.',      icon: Trash2      },
}

const ENG_COLORS: Record<EngCategory, string> = {
  star: '#16A34A', plowhorse: '#D97706', puzzle: '#2563EB', dog: '#DC2626',
}

function categorize(dish: Dish, avgContrib: number, avgPop: number): EngCategory {
  const contrib = (dish.menu_price_net ?? 0) * (1 - (dish.food_cost_target ?? 0.3))
  const highMargin = contrib >= avgContrib
  const highPop = dish.popularity >= avgPop
  if (highMargin && highPop) return 'star'
  if (!highMargin && highPop) return 'plowhorse'
  if (highMargin && !highPop) return 'puzzle'
  return 'dog'
}

/* ─── scatter tooltip ─────────────────────────────────── */
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as EngineeringDish
  const cfg = ENG_CFG[d.engCategory]
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-3 text-[12px] max-w-[200px]">
      <p className="font-bold text-[#111827] mb-1">{d.dish_name}</p>
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold mb-2 ${cfg.bg} ${cfg.border} border`} style={{ color: cfg.color }}>
        {d.engCategory.charAt(0).toUpperCase() + d.engCategory.slice(1)}
      </div>
      <p className="text-[#6B7280]">Cena netto: <strong>{PLN(d.menu_price_net ?? 0)}</strong></p>
      <p className="text-[#6B7280]">Food cost: <strong>{PCT(d.food_cost_target ?? 0)}</strong></p>
      <p className="text-[#6B7280]">Marża jednostkowa: <strong>{PLN(d.contribution)}</strong></p>
      <p className="text-[#6B7280]">Popularność: <strong>{d.popularity}%</strong></p>
    </div>
  )
}

/* ─── main component ──────────────────────────────────── */
interface Props {
  supabase: SupabaseClient
  companyId: string
  locationId?: string
}

export function MenuEngineering({ supabase, companyId, locationId }: Props) {
  const [dishes, setDishes] = useState<EngineeringDish[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EngCategory | 'all'>('all')
  const [editPopularity, setEditPopularity] = useState<Record<string, number>>({})

  useEffect(() => { loadDishes() }, [companyId, locationId])

  async function loadDishes() {
    setLoading(true)

    // dishes has company_id; join recipes for category
    let q = supabase
      .from('dishes')
      .select('id,dish_name,menu_price_net,food_cost_target,location_id,recipes(category)')
      .eq('company_id', companyId)
    if (locationId) q = q.eq('location_id', locationId)

    const { data, error: dbErr } = await q.order('dish_name')
    if (dbErr) console.error('[menu-engineering] query error:', dbErr.message)

    // Try to load popularity from dish_sales if it exists
    let popularityMap: Record<string, number> = {}
    try {
      const { data: sales } = await supabase
        .from('dish_sales')
        .select('dish_id, count')
        .eq('company_id', companyId)
      if (sales?.length) {
        const maxCount = Math.max(...sales.map((s: any) => s.count || 0))
        sales.forEach((s: any) => {
          popularityMap[s.dish_id] = maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 50
        })
      }
    } catch { /* table may not exist — use manual */ }

    const rawDishes: Dish[] = (data ?? []).map((d: any) => ({
      id: d.id,
      dish_name: d.dish_name,
      menu_price_net: d.menu_price_net,
      food_cost_target: d.food_cost_target,
      category: d.recipes?.category ?? null,
      popularity: editPopularity[d.id] ?? popularityMap[d.id] ?? 50,
    }))

    // Calculate averages
    const avgContrib = rawDishes.length
      ? rawDishes.reduce((s, d) => s + (d.menu_price_net ?? 0) * (1 - (d.food_cost_target ?? 0.3)), 0) / rawDishes.length
      : 0
    const avgPop = rawDishes.length
      ? rawDishes.reduce((s, d) => s + d.popularity, 0) / rawDishes.length
      : 50

    setDishes(rawDishes.map(d => ({
      ...d,
      contribution: (d.menu_price_net ?? 0) * (1 - (d.food_cost_target ?? 0.3)),
      engCategory: categorize(d, avgContrib, avgPop),
    })))
    setLoading(false)
  }

  function updatePopularity(id: string, val: number) {
    setEditPopularity(p => ({ ...p, [id]: val }))
  }

  // Recalculate when popup changes
  useEffect(() => {
    if (dishes.length === 0) return
    const updated = dishes.map(d => ({
      ...d,
      popularity: editPopularity[d.id] ?? d.popularity,
    }))
    const avgContrib = updated.reduce((s, d) => s + d.contribution, 0) / updated.length
    const avgPop = updated.reduce((s, d) => s + d.popularity, 0) / updated.length
    setDishes(updated.map(d => ({ ...d, engCategory: categorize(d, avgContrib, avgPop) })))
  }, [editPopularity])

  const visible = filter === 'all' ? dishes : dishes.filter(d => d.engCategory === filter)

  const counts = Object.fromEntries(
    (['star', 'plowhorse', 'puzzle', 'dog'] as EngCategory[])
      .map(k => [k, dishes.filter(d => d.engCategory === k).length])
  ) as Record<EngCategory, number>

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
    </div>
  )

  if (dishes.length === 0) return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Inżynieria menu</h1>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 text-center">
        <Star className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak dań w bazie</p>
        <p className="text-[13px] text-[#9CA3AF]">Dodaj dania w zakładce Receptury, aby zobaczyć analizę menu.</p>
      </div>
    </div>
  )

  const scatterData = dishes.map(d => ({
    ...d,
    x: d.contribution,
    y: d.popularity,
  }))

  const avgContrib = dishes.reduce((s, d) => s + d.contribution, 0) / dishes.length
  const avgPop     = dishes.reduce((s, d) => s + d.popularity, 0) / dishes.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Inżynieria menu</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Macierz BCG dań: marża jednostkowa vs popularność</p>
        </div>
        <button onClick={loadDishes} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Odśwież
        </button>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {(['star', 'plowhorse', 'puzzle', 'dog'] as EngCategory[]).map(cat => {
          const cfg = ENG_CFG[cat]
          const Icon = cfg.icon
          return (
            <button key={cat} onClick={() => setFilter(filter === cat ? 'all' : cat)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                filter === cat ? `${cfg.border} ${cfg.bg}` : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label.toUpperCase()}</span>
              </div>
              <p className="text-[24px] font-black text-[#111827]">{counts[cat]}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5 leading-snug">{cfg.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Matrix chart */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
        <p className="text-[14px] font-bold text-[#111827] mb-1">Macierz menu</p>
        <p className="text-[12px] text-[#9CA3AF] mb-4">X = marża jednostkowa (zł) · Y = popularność (%)</p>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="x" type="number" name="Marża" tickFormatter={v => PLN(v).replace(' zł', '')} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="y" type="number" name="Popularność" tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ScatterTooltip />} />
            <ReferenceLine x={avgContrib} stroke="#E5E7EB" strokeDasharray="4 2" />
            <ReferenceLine y={avgPop} stroke="#E5E7EB" strokeDasharray="4 2" />
            <Scatter data={scatterData} fill="#8884d8">
              {scatterData.map((d, i) => (
                <Cell key={i} fill={ENG_COLORS[d.engCategory]} fillOpacity={0.85} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <p className="text-[14px] font-bold text-[#111827]">
            Lista dań {filter !== 'all' && `— ${ENG_CFG[filter].label}`}
          </p>
          <span className="text-[12px] text-[#9CA3AF]">{visible.length} dań</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Danie</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Kategoria</th>
                <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Cena netto</th>
                <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Food cost</th>
                <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Marża jdn.</th>
                <th className="text-center py-3 px-4 text-[#9CA3AF] font-semibold">Popularność</th>
                <th className="text-center py-3 px-4 text-[#9CA3AF] font-semibold">Klasyfikacja</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(dish => {
                const cfg = ENG_CFG[dish.engCategory]
                return (
                  <tr key={dish.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#111827]">{dish.dish_name}</td>
                    <td className="py-3 px-4 text-[#6B7280]">{dish.category ?? '—'}</td>
                    <td className="py-3 px-4 text-right">{PLN(dish.menu_price_net ?? 0)}</td>
                    <td className="py-3 px-4 text-right">{PCT(dish.food_cost_target ?? 0)}</td>
                    <td className="py-3 px-4 text-right font-bold" style={{ color: dish.contribution > avgContrib ? '#16A34A' : '#DC2626' }}>
                      {PLN(dish.contribution)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="range" min={0} max={100}
                          value={editPopularity[dish.id] ?? dish.popularity}
                          onChange={e => updatePopularity(dish.id, +e.target.value)}
                          className="w-20 accent-blue-600"
                        />
                        <span className="w-8 text-[#374151] font-semibold">{editPopularity[dish.id] ?? dish.popularity}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${cfg.bg} ${cfg.border}`} style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-2 gap-4">
        {(['star', 'plowhorse', 'puzzle', 'dog'] as EngCategory[]).map(cat => {
          const items = dishes.filter(d => d.engCategory === cat)
          if (!items.length) return null
          const cfg = ENG_CFG[cat]
          const Icon = cfg.icon
          return (
            <div key={cat} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                <p className="text-[12px] font-bold" style={{ color: cfg.color }}>{cfg.label.toUpperCase()} ({items.length})</p>
              </div>
              <p className="text-[11px] text-[#6B7280] mb-2">{cfg.desc}</p>
              <ul className="space-y-0.5">
                {items.slice(0, 4).map(d => (
                  <li key={d.id} className="text-[11px] text-[#374151] font-medium">· {d.dish_name}</li>
                ))}
                {items.length > 4 && <li className="text-[11px] text-[#9CA3AF]">+{items.length - 4} więcej…</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
