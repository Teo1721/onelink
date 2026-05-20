'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Trash2, Plus, Loader2 } from 'lucide-react'

interface WasteLogProps {
  locationId: string
  locationName: string
  supabase: SupabaseClient
}

type WasteEntry = {
  id: string
  location_id: string
  logged_date: string
  ingredient_name: string
  quantity: number
  unit: string
  unit_cost: number | null
  reason: string
  logged_by: string | null
  created_at: string
}

type HistoryRow = {
  date: string
  count: number
  total: number
}

const UNITS = ['kg', 'szt', 'l', 'porcja'] as const
const REASONS = [
  'Przeterminowanie',
  'Uszkodzenie',
  'Przepełnienie',
  'Błąd przygotowania',
  'Inne',
] as const

const REASON_COLORS: Record<string, string> = {
  Przeterminowanie:    'bg-red-50 text-red-700',
  Uszkodzenie:         'bg-orange-50 text-orange-700',
  Przepełnienie:       'bg-yellow-50 text-yellow-700',
  'Błąd przygotowania': 'bg-purple-50 text-purple-700',
  Inne:                'bg-gray-100 text-gray-600',
}

export function WasteLog({ locationId, locationName, supabase }: WasteLogProps) {
  const today = new Date().toISOString().split('T')[0]

  const [tab, setTab]           = useState<'today' | 'history'>('today')
  const [date, setDate]         = useState(today)
  const [entries, setEntries]   = useState<WasteEntry[]>([])
  const [history, setHistory]   = useState<HistoryRow[]>([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    ingredient_name: '',
    quantity: '',
    unit: 'kg' as typeof UNITS[number],
    unit_cost: '',
    reason: 'Przeterminowanie' as typeof REASONS[number],
  })

  // ── fetch entries for selected date ──────────────────────────────
  const fetchEntries = async (d: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('waste_logs')
      .select('*')
      .eq('location_id', locationId)
      .eq('logged_date', d)
      .order('created_at', { ascending: false })
    setEntries((data as WasteEntry[]) || [])
    setLoading(false)
  }

  // ── fetch 30-day history ─────────────────────────────────────────
  const fetchHistory = async () => {
    setLoading(true)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const { data } = await supabase
      .from('waste_logs')
      .select('logged_date, unit_cost, quantity')
      .eq('location_id', locationId)
      .gte('logged_date', thirtyDaysAgo)
      .order('logged_date', { ascending: false })

    if (!data) { setHistory([]); setLoading(false); return }

    const grouped: Record<string, { count: number; total: number }> = {}
    for (const row of data as { logged_date: string; unit_cost: number | null; quantity: number }[]) {
      if (!grouped[row.logged_date]) grouped[row.logged_date] = { count: 0, total: 0 }
      grouped[row.logged_date].count += 1
      if (row.unit_cost != null) {
        grouped[row.logged_date].total += Number(row.quantity) * Number(row.unit_cost)
      }
    }

    const rows: HistoryRow[] = Object.entries(grouped)
      .map(([date, v]) => ({ date, count: v.count, total: v.total }))
      .sort((a, b) => b.date.localeCompare(a.date))

    setHistory(rows)
    setLoading(false)
  }

  useEffect(() => {
    if (tab === 'today') fetchEntries(date)
    else fetchHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date, locationId])

  // ── add entry ────────────────────────────────────────────────────
  const addEntry = async () => {
    if (!form.ingredient_name.trim()) {
      alert('Podaj nazwę składnika / produktu')
      return
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      alert('Podaj prawidłową ilość')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('waste_logs').insert({
      location_id:     locationId,
      logged_date:     date,
      ingredient_name: form.ingredient_name.trim(),
      quantity:        Number(form.quantity),
      unit:            form.unit,
      unit_cost:       form.unit_cost ? Number(form.unit_cost) : null,
      reason:          form.reason,
    })
    if (error) {
      alert(`Błąd zapisu: ${error.message}`)
      setSaving(false)
      return
    }
    setForm({ ingredient_name: '', quantity: '', unit: 'kg', unit_cost: '', reason: 'Przeterminowanie' })
    await fetchEntries(date)
    setSaving(false)
  }

  // ── delete entry ─────────────────────────────────────────────────
  const deleteEntry = async (id: string) => {
    if (!confirm('Usunąć wpis?')) return
    setDeleting(id)
    await supabase.from('waste_logs').delete().eq('id', id)
    await fetchEntries(date)
    setDeleting(null)
  }

  // ── computed total ───────────────────────────────────────────────
  const totalCost = entries.reduce((sum, e) => {
    if (e.unit_cost == null) return sum
    return sum + Number(e.quantity) * Number(e.unit_cost)
  }, 0)

  return (
    <div className="space-y-4">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">Dziennik strat</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">{locationName}</p>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[#E5E7EB]">
        {(['today', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-[#111827] text-[#111827]'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {t === 'today' ? 'Dzisiaj' : 'Historia'}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: DZISIAJ ══════════════════════════════ */}
      {tab === 'today' && (
        <div className="space-y-4">

          {/* date picker */}
          <div className="flex items-center gap-3">
            <label className="text-[13px] text-[#374151] font-medium">Data:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
            />
          </div>

          {/* ── Add entry form ─────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
              Nowy wpis straty
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {/* ingredient name */}
              <input
                type="text"
                placeholder="Nazwa składnika / produktu"
                value={form.ingredient_name}
                onChange={(e) => setForm({ ...form, ingredient_name: e.target.value })}
                className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              />

              {/* quantity + unit row */}
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Ilość"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 w-full"
                />
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value as typeof UNITS[number] })}
                  className="h-8 px-2 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* unit cost */}
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Koszt jedn. (zł)"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              />

              {/* reason */}
              <select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value as typeof REASONS[number] })}
                className="h-8 px-2 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 sm:col-span-2 lg:col-span-1"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              {/* submit */}
              <button
                onClick={addEntry}
                disabled={saving}
                className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-60 transition-colors"
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />}
                {saving ? 'Dodawanie…' : '+ Dodaj'}
              </button>
            </div>
          </div>

          {/* ── Entries list ───────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-8 text-center">
              <p className="text-[13px] text-[#9CA3AF]">Brak wpisów na wybrany dzień.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const entryCost =
                  entry.unit_cost != null
                    ? Number(entry.quantity) * Number(entry.unit_cost)
                    : null
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#111827] truncate">
                        {entry.ingredient_name}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {entry.quantity}&nbsp;{entry.unit}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${REASON_COLORS[entry.reason] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {entry.reason}
                    </span>

                    {entryCost != null && entryCost > 0 ? (
                      <span className="text-[13px] font-semibold text-red-600 tabular-nums whitespace-nowrap">
                        −{entryCost.toFixed(2)} zł
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF]">brak kosztu</span>
                    )}

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={deleting === entry.id}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {deleting === entry.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Footer total ──────────────────────────────────── */}
          {entries.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#374151]">
                Suma strat ({entries.length}&nbsp;{entries.length === 1 ? 'wpis' : 'wpisy/wpisów'}):
              </span>
              <span
                className={`text-[14px] font-bold tabular-nums ${
                  totalCost > 0 ? 'text-red-600' : 'text-[#9CA3AF]'
                }`}
              >
                {totalCost > 0 ? `−${totalCost.toFixed(2)} zł` : '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: HISTORIA ═════════════════════════════ */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-[#9CA3AF]">Brak danych z ostatnich 30 dni.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    {['Data', 'Liczba wpisów', 'Suma strat'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] bg-[#F9FAFB] ${i > 0 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.date} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#111827]">
                        {new Date(row.date + 'T00:00:00').toLocaleDateString('pl-PL', {
                          weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-[#374151]">
                        {row.count}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right tabular-nums font-semibold">
                        <span className={row.total > 0 ? 'text-red-600' : 'text-[#9CA3AF]'}>
                          {row.total > 0 ? `${row.total.toFixed(2)} zł` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
