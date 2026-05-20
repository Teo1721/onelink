'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Thermometer, Plus, Download, Loader2, X, Check } from 'lucide-react'

interface HaccpLogProps {
  locationId: string
  locationName: string
  supabase: SupabaseClient
}

type Equipment = {
  name: string
  min: number
  max: number
}

type TempLog = {
  id: string
  location_id: string
  logged_date: string
  logged_time: string
  equipment_name: string
  temperature: number
  min_temp: number
  max_temp: number
  notes: string | null
  created_at: string
}

const DEFAULT_EQUIPMENT: Equipment[] = [
  { name: 'Lodówka 1',          min: 0,   max: 5  },
  { name: 'Lodówka 2',          min: 0,   max: 5  },
  { name: 'Zamrażarka',         min: -25, max: -18 },
  { name: 'Lada chłodnicza',    min: 0,   max: 8  },
  { name: 'Witryna cukiernicza', min: 2,  max: 8  },
]

function isOk(temp: number, min: number, max: number) {
  return temp >= min && temp <= max
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function HaccpLog({ locationId, locationName, supabase }: HaccpLogProps) {
  const today = new Date().toISOString().split('T')[0]

  const [viewDate, setViewDate]         = useState(today)
  const [logs, setLogs]                 = useState<TempLog[]>([])
  const [loading, setLoading]           = useState(false)

  // extra equipment added in this session
  const [extraEquip, setExtraEquip]     = useState<Equipment[]>([])

  // temperature inputs: equipment name → string value
  const [tempInputs, setTempInputs]     = useState<Record<string, string>>({})
  const [saving, setSaving]             = useState<Record<string, boolean>>({})

  // add-device form
  const [showAddForm, setShowAddForm]   = useState(false)
  const [newEquip, setNewEquip]         = useState({ name: '', min: '', max: '' })
  const [addingEquip, setAddingEquip]   = useState(false)

  const allEquipment: Equipment[] = [...DEFAULT_EQUIPMENT, ...extraEquip]

  // ── fetch logs for date ──────────────────────────────────────────
  const fetchLogs = async (d: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('temperature_logs')
      .select('*')
      .eq('location_id', locationId)
      .eq('logged_date', d)
      .order('logged_time', { ascending: true })
    setLogs((data as TempLog[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs(viewDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, locationId])

  // ── latest reading per equipment for the viewed date ────────────
  const latestPerEquip: Record<string, TempLog> = {}
  for (const log of logs) {
    if (
      !latestPerEquip[log.equipment_name] ||
      log.logged_time > latestPerEquip[log.equipment_name].logged_time
    ) {
      latestPerEquip[log.equipment_name] = log
    }
  }

  // ── save a reading ───────────────────────────────────────────────
  const saveReading = async (equip: Equipment) => {
    const raw = tempInputs[equip.name]
    if (raw === undefined || raw === '') {
      alert('Wpisz temperaturę')
      return
    }
    const temp = Number(raw)
    if (isNaN(temp)) { alert('Nieprawidłowa temperatura'); return }

    setSaving((prev) => ({ ...prev, [equip.name]: true }))

    const { error } = await supabase.from('temperature_logs').insert({
      location_id:    locationId,
      logged_date:    viewDate,
      logged_time:    nowTime(),
      equipment_name: equip.name,
      temperature:    temp,
      min_temp:       equip.min,
      max_temp:       equip.max,
    })

    if (error) {
      alert(`Błąd zapisu: ${error.message}`)
    } else {
      setTempInputs((prev) => ({ ...prev, [equip.name]: '' }))
      await fetchLogs(viewDate)
    }
    setSaving((prev) => ({ ...prev, [equip.name]: false }))
  }

  // ── add custom device ────────────────────────────────────────────
  const addDevice = () => {
    if (!newEquip.name.trim()) { alert('Podaj nazwę urządzenia'); return }
    const min = Number(newEquip.min)
    const max = Number(newEquip.max)
    if (isNaN(min) || isNaN(max) || min >= max) {
      alert('Podaj prawidłowy zakres temperatur (min < max)')
      return
    }
    setAddingEquip(true)
    setExtraEquip((prev) => [...prev, { name: newEquip.name.trim(), min, max }])
    setNewEquip({ name: '', min: '', max: '' })
    setShowAddForm(false)
    setAddingEquip(false)
  }

  // ── CSV export ───────────────────────────────────────────────────
  const exportCsv = () => {
    const BOM = '﻿'
    const headers = 'Data,Urządzenie,Temperatura,Min,Max,Status,Godzina'
    const rows = logs.map((l) => {
      const status = isOk(l.temperature, l.min_temp, l.max_temp) ? 'OK' : 'FAIL'
      return [
        l.logged_date,
        `"${l.equipment_name}"`,
        l.temperature,
        l.min_temp,
        l.max_temp,
        status,
        l.logged_time,
      ].join(',')
    })
    const csv = BOM + [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `haccp_${locationId}_${viewDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">
            Kontrola HACCP — {locationName}
          </h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Monitoring temperatur urządzeń chłodniczych
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
          />
          <button
            onClick={exportCsv}
            className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport CSV
          </button>
        </div>
      </div>

      {/* ── Equipment grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allEquipment.map((equip) => {
          const latest    = latestPerEquip[equip.name]
          const ok        = latest ? isOk(latest.temperature, equip.min, equip.max) : null
          const isSaving  = saving[equip.name] ?? false

          return (
            <div
              key={equip.name}
              className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3"
            >
              {/* card header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-[#6B7280]" />
                  <span className="text-[13px] font-semibold text-[#111827]">{equip.name}</span>
                </div>

                {latest && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      ok
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {ok
                      ? <Check className="w-3 h-3" />
                      : <X className="w-3 h-3" />}
                    {latest.temperature}°C
                  </span>
                )}
              </div>

              {/* temp range */}
              <p className="text-[11px] text-[#9CA3AF]">
                Zakres: {equip.min}°C – {equip.max}°C
              </p>

              {/* input + save */}
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Temperatura °C"
                  value={tempInputs[equip.name] ?? ''}
                  onChange={(e) =>
                    setTempInputs((prev) => ({ ...prev, [equip.name]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && saveReading(equip)}
                  className="h-9 px-3 text-[14px] font-semibold text-center border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 w-full tabular-nums"
                />
                <button
                  onClick={() => saveReading(equip)}
                  disabled={isSaving}
                  className="h-9 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 transition-colors"
                >
                  {isSaving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : null}
                  {isSaving ? 'Zapis…' : 'Zapisz'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add device button / form ─────────────────────────────── */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="h-8 px-3 text-[12px] font-medium rounded-lg border border-dashed border-[#E5E7EB] text-[#6B7280] hover:border-[#111827] hover:text-[#111827] flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          + Dodaj urządzenie
        </button>
      ) : (
        <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
            Nowe urządzenie
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <input
              type="text"
              placeholder="Nazwa urządzenia"
              value={newEquip.name}
              onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })}
              className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 flex-1 min-w-[160px]"
            />
            <input
              type="number"
              step="0.5"
              placeholder="Min °C"
              value={newEquip.min}
              onChange={(e) => setNewEquip({ ...newEquip, min: e.target.value })}
              className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 w-24"
            />
            <input
              type="number"
              step="0.5"
              placeholder="Max °C"
              value={newEquip.max}
              onChange={(e) => setNewEquip({ ...newEquip, max: e.target.value })}
              className="h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 w-24"
            />
            <div className="flex gap-1.5">
              <button
                onClick={addDevice}
                disabled={addingEquip}
                className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-60 transition-colors"
              >
                {addingEquip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Dodaj
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewEquip({ name: '', min: '', max: '' }) }}
                className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-white transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Today's / selected-date log table ───────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-[#111827]">
            Dziennik temperatur — {new Date(viewDate + 'T00:00:00').toLocaleDateString('pl-PL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </h2>
          <span className="text-[11px] text-[#9CA3AF]">{logs.length} pomiarów</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-[#9CA3AF]">Brak pomiarów na wybrany dzień.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  {['Urządzenie', 'Temperatura', 'Min', 'Max', 'Status', 'Godzina'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] bg-[#F9FAFB] ${i >= 1 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const ok = isOk(log.temperature, log.min_temp, log.max_temp)
                  return (
                    <tr key={log.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#111827]">
                        {log.equipment_name}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right tabular-nums font-semibold text-[#111827]">
                        {log.temperature}°C
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-[#6B7280]">
                        {log.min_temp}°C
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-[#6B7280]">
                        {log.max_temp}°C
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            ok
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {ok ? 'OK' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-[#374151]">
                        {log.logged_time}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
