'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

type TipEntry = {
  id: string
  date: string
  total_amount: number
  note: string | null
  created_at: string
  distributions: { employee_id: string; amount: number; employees?: { full_name: string } | null }[]
}

export function TipsView({
  locationId,
  locationName,
  supabase,
}: {
  locationId: string
  locationName: string
  supabase: any
}) {
  const [entries,   setEntries]   = useState<TipEntry[]>([])
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [month,     setMonth]     = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Add form
  const [form, setForm] = useState({ date: new Date().toLocaleDateString('sv-SE'), total_amount: '', note: '' })
  const [distribution, setDistribution] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const start = `${month}-01`, end = `${month}-${String(lastDay).padStart(2, '0')}`

    const [{ data: emps }, { data: tips }] = await Promise.all([
      supabase.from('employees').select('id, full_name').eq('location_id', locationId)
        .in('status', ['active', 'confirmed']).order('full_name'),
      supabase.from('tips_log')
        .select('*, distributions:tips_distribution(employee_id, amount, employees(full_name))')
        .eq('location_id', locationId).gte('date', start).lte('date', end)
        .order('date', { ascending: false }),
    ])
    setEmployees(emps ?? [])
    setEntries((tips ?? []) as TipEntry[])
    setLoading(false)
  }, [locationId, month, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-distribute equally when total changes
  function autoDistribute(total: string, emps: typeof employees) {
    if (!total || emps.length === 0) return
    const perPerson = (parseFloat(total) / emps.length).toFixed(2)
    const dist: Record<string, string> = {}
    emps.forEach(e => { dist[e.id] = perPerson })
    setDistribution(dist)
  }

  async function submitAdd() {
    if (!form.date || !form.total_amount) return
    setSaving(true)
    const { data: tip, error } = await supabase.from('tips_log').insert({
      location_id: locationId, date: form.date,
      total_amount: parseFloat(form.total_amount), note: form.note || null,
    }).select().single()
    if (error || !tip) { setSaving(false); return }

    const rows = Object.entries(distribution)
      .filter(([, amt]) => parseFloat(amt) > 0)
      .map(([employee_id, amount]) => ({ tips_log_id: tip.id, employee_id, amount: parseFloat(amount) }))
    if (rows.length > 0) await supabase.from('tips_distribution').insert(rows)

    setShowAdd(false)
    setForm({ date: new Date().toLocaleDateString('sv-SE'), total_amount: '', note: '' })
    setDistribution({})
    setSaving(false); fetchData()
  }

  async function deleteEntry(id: string) {
    if (!confirm('Usunąć wpis napiwków?')) return
    await supabase.from('tips_log').delete().eq('id', id); fetchData()
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    const [y, m] = month.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })

    // Summary per employee
    const empTotals: Record<string, number> = {}
    entries.forEach(e => e.distributions.forEach(d => {
      const name = d.employees?.full_name ?? d.employee_id
      empTotals[name] = (empTotals[name] ?? 0) + d.amount
    }))
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`Napiwki — ${locationName} — ${label}`], [],
      ['Pracownik', 'Łączne napiwki'],
      ...Object.entries(empTotals).map(([name, total]) => [name, `${total.toFixed(2)} zł`]),
      [],
      ['RAZEM', `${entries.reduce((s, e) => s + e.total_amount, 0).toFixed(2)} zł`],
    ])
    ws1['!cols'] = [{ wch: 26 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Podsumowanie')

    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Data', 'Łącznie', 'Pracownik', 'Kwota', 'Notatka'],
      ...entries.flatMap(e =>
        e.distributions.length > 0
          ? e.distributions.map((d, i) => [
              i === 0 ? e.date : '', i === 0 ? `${e.total_amount.toFixed(2)} zł` : '',
              d.employees?.full_name ?? '—', `${d.amount.toFixed(2)} zł`,
              i === 0 ? (e.note ?? '') : '',
            ])
          : [[e.date, `${e.total_amount.toFixed(2)} zł`, '—', '—', e.note ?? '']]
      ),
    ])
    ws2['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Szczegóły')

    XLSX.writeFile(wb, `napiwki-${locationName.replace(/\s+/g, '-')}-${month}.xlsx`)
  }

  const totalMonth = entries.reduce((s, e) => s + e.total_amount, 0)
  const [y, m] = month.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Napiwki — {locationName}</h2>
          <p className="text-[13px] text-[#9CA3AF]">Rejestruj napiwki i ich podział między pracowników</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => { setShowAdd(true); autoDistribute(form.total_amount, employees) }}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#1D4ED8] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj wpis
          </button>
        </div>
      </div>

      {/* Month total */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-widest">Napiwki łącznie — {monthLabel}</p>
          <p className="text-[28px] font-bold text-[#111827]">{totalMonth.toFixed(2)} zł</p>
        </div>
        <div className="text-[13px] text-[#6B7280]">{entries.length} wpisów</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF]">
          <p className="text-[14px]">Brak wpisów w tym miesiącu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                <div>
                  <p className="font-semibold text-[14px] text-[#111827]">{entry.date}</p>
                  {entry.note && <p className="text-[12px] text-[#6B7280] italic">{entry.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[16px] font-bold text-emerald-600">{entry.total_amount.toFixed(2)} zł</p>
                  <button onClick={() => deleteEntry(entry.id)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {entry.distributions.length > 0 && (
                <div className="divide-y divide-[#F3F4F6]">
                  {entry.distributions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 text-[13px]">
                      <span className="text-[#374151]">{d.employees?.full_name ?? '—'}</span>
                      <span className="font-semibold text-[#111827]">{d.amount.toFixed(2)} zł</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-[16px] text-[#111827] mb-4">Dodaj napiwki</h3>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1">Data *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1">Kwota łączna (zł) *</label>
                  <input type="number" min="0" step="0.01" value={form.total_amount}
                    onChange={e => { setForm(f => ({ ...f, total_amount: e.target.value })); autoDistribute(e.target.value, employees) }}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">Notatka</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {employees.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-semibold text-[#374151]">Podział między pracowników</label>
                  <button onClick={() => autoDistribute(form.total_amount, employees)}
                    className="text-[11px] text-blue-600 hover:underline">Podziel równo</button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-3">
                      <span className="flex-1 text-[13px] text-[#374151]">{emp.full_name}</span>
                      <input type="number" min="0" step="0.01"
                        value={distribution[emp.id] ?? ''}
                        onChange={e => setDistribution(d => ({ ...d, [emp.id]: e.target.value }))}
                        placeholder="0.00"
                        className="w-24 px-2 py-1.5 rounded-lg border border-[#E5E7EB] text-[13px] text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <span className="text-[12px] text-[#9CA3AF] w-4">zł</span>
                    </div>
                  ))}
                </div>
                {form.total_amount && (
                  <p className={`text-[11px] mt-2 font-medium ${
                    Math.abs(Object.values(distribution).reduce((s, v) => s + (parseFloat(v) || 0), 0) - parseFloat(form.total_amount)) < 0.01
                      ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    Przydzielono: {Object.values(distribution).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)} / {parseFloat(form.total_amount).toFixed(2)} zł
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">Anuluj</button>
              <button onClick={submitAdd} disabled={saving || !form.date || !form.total_amount}
                className="flex-[2] py-2.5 rounded-xl bg-[#1D4ED8] text-white font-bold text-[14px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
