import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

export const runtime = 'nodejs'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function pad(n: number) { return String(n).padStart(2, '0') }
function addDays(base: Date, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return d }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function daysAgo(n: number) { return toISO(addDays(new Date(), -n)) }

const DAYS_PL = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota']

// Convert "HH:MM" to minutes since midnight
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
// Convert minutes since midnight to "HH:MM"
function fromMin(m: number): string {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

// Calculate shift slots given open/close times and shift length
function calcSlots(openTime: string, closeTime: string, shiftLen = 480 /* 8h in min */): { start: string; end: string; label: string }[] {
  const openMin  = toMin(openTime)
  const closeMin = toMin(closeTime)
  const totalMin = closeMin - openMin

  if (totalMin <= 0) return [{ start: openTime, end: closeTime, label: 'Zmiana' }]

  if (totalMin <= shiftLen) {
    // One shift covers everything
    return [{ start: openTime, end: closeTime, label: 'Zmiana' }]
  }

  if (totalMin <= shiftLen * 1.5) {
    // Two shifts, minimal overlap
    const slot1End   = fromMin(openMin + shiftLen)
    const slot2Start = fromMin(closeMin - shiftLen)
    return [
      { start: openTime,   end: slot1End,   label: 'Rano' },
      { start: slot2Start, end: closeTime,  label: 'Po południu' },
    ]
  }

  if (totalMin <= shiftLen * 2) {
    // Two 8h shifts covering the whole day
    const slot1End   = fromMin(openMin + shiftLen)
    const slot2Start = fromMin(closeMin - shiftLen)
    return [
      { start: openTime,   end: slot1End,   label: 'Rano' },
      { start: slot2Start, end: closeTime,  label: 'Wieczór' },
    ]
  }

  // Three shifts (24h or near-24h operation)
  const slot1End   = fromMin(openMin + shiftLen)
  const slot3Start = fromMin(closeMin - shiftLen)
  const slot2Start = fromMin(openMin + Math.floor(totalMin / 2) - shiftLen / 2)
  const slot2End   = fromMin(openMin + Math.floor(totalMin / 2) + shiftLen / 2)
  return [
    { start: openTime,    end: slot1End,    label: 'Rano' },
    { start: slot2Start,  end: slot2End,    label: 'Południe' },
    { start: slot3Start,  end: closeTime,   label: 'Wieczór' },
  ]
}

export async function POST(req: NextRequest) {
  const {
    locationId, weekStart,
    openTime = '07:00', closeTime = '15:00',
    staffPerDay, laborCostTarget = 0.30,
  } = await req.json()

  if (!locationId || !weekStart) return NextResponse.json({ error: 'locationId and weekStart required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch employees
  const { data: employees } = await admin.from('employees')
    .select('id, full_name, position, base_rate, status, user_id')
    .eq('location_id', locationId)
    .in('status', ['active', 'confirmed'])
    .order('full_name')

  if (!employees?.length) return NextResponse.json({ error: 'Brak aktywnych pracowników' }, { status: 400 })

  // Compute week dates
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    weekDates.push(toISO(addDays(new Date(weekStart + 'T12:00:00'), i)))
  }

  // Fetch availability: suggestions
  const { data: suggestions } = await admin.from('shift_suggestions')
    .select('employee_id, date, time_start, time_end, suggestion_type')
    .in('employee_id', employees.map((e: any) => e.id))
    .gte('date', weekDates[0]).lte('date', weekDates[6])
    .eq('status', 'pending')

  // Fetch approved leaves
  const { data: leaves } = await admin.from('leave_requests')
    .select('employee_id, date_from, date_to')
    .in('employee_id', employees.map((e: any) => e.id))
    .eq('status', 'approved')
    .lte('date_from', weekDates[6]).gte('date_to', weekDates[0])

  // Fetch revenue history
  const { data: salesHistory } = await admin.from('sales_daily')
    .select('date, net_revenue')
    .eq('location_id', locationId)
    .gte('date', daysAgo(56))

  // DOW average revenue
  const dowRevs: Record<number, number[]> = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]}
  for (const r of (salesHistory ?? [])) {
    const dow = new Date(r.date + 'T12:00:00').getDay()
    dowRevs[dow].push(r.net_revenue || 0)
  }
  const dowAvg: Record<number, number> = {}
  for (const [dow, vals] of Object.entries(dowRevs)) {
    dowAvg[+dow] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  }

  // Calculate shift slots from operating hours
  const slots = calcSlots(openTime, closeTime)
  const numSlots = slots.length

  // Build availability map
  type AvailInfo = { off: boolean; available: boolean; timeStart: string | null; timeEnd: string | null }
  const availMap: Record<string, Record<string, AvailInfo>> = {}
  for (const emp of employees) {
    availMap[emp.id] = {}
    for (const date of weekDates) {
      availMap[emp.id][date] = { off: false, available: true, timeStart: null, timeEnd: null }
    }
  }
  for (const leave of (leaves ?? [])) {
    for (const date of weekDates) {
      if (date >= leave.date_from && date <= leave.date_to) {
        if (availMap[leave.employee_id]?.[date]) {
          availMap[leave.employee_id][date].off = true
          availMap[leave.employee_id][date].available = false
        }
      }
    }
  }
  for (const sug of (suggestions ?? [])) {
    if (!availMap[sug.employee_id]?.[sug.date]) continue
    if (sug.suggestion_type === 'off') {
      availMap[sug.employee_id][sug.date].off = true
      availMap[sug.employee_id][sug.date].available = false
    } else if (sug.suggestion_type === 'available') {
      availMap[sug.employee_id][sug.date].available = true
    } else if (sug.suggestion_type === 'specific') {
      availMap[sug.employee_id][sug.date].available = true
      availMap[sug.employee_id][sug.date].timeStart = sug.time_start
      availMap[sug.employee_id][sug.date].timeEnd = sug.time_end
    }
  }

  // ── Schedule generation ───────────────────────────────────────
  type ProposedShift = {
    employee_id: string
    employee_name: string
    user_id: string | null
    position: string
    date: string
    day_name: string
    time_start: string
    time_end: string
    hours: number
    base_rate: number
    cost: number
    reason: string
    from_suggestion: boolean
    slot_label: string
  }

  const proposed: ProposedShift[] = []
  const empDaysCount:  Record<string, number> = {}
  const empShiftsCount: Record<string, number> = {}
  employees.forEach((e: any) => { empDaysCount[e.id] = 0; empShiftsCount[e.id] = 0 })

  const avgRateAll = employees.reduce((s: number, e: any) => s + (e.base_rate || 25), 0) / employees.length

  for (const date of weekDates) {
    const dow = new Date(date + 'T12:00:00').getDay()
    const avgRev = dowAvg[dow] ?? 0

    // Total staff needed for the day
    let neededTotal: number
    if (staffPerDay?.[date] !== undefined) {
      neededTotal = staffPerDay[date]
    } else if (avgRev > 0) {
      // Each shift slot is shift-length hours; use that for cost calc
      const slotHrs = (toMin(slots[0].end) - toMin(slots[0].start)) / 60
      const costPerStaff = avgRateAll * slotHrs
      neededTotal = Math.max(numSlots, Math.round((avgRev * laborCostTarget) / costPerStaff))
    } else {
      neededTotal = 0
    }

    if (neededTotal === 0) continue

    // Distribute staff across slots
    // If suggestions exist that specify a time, honour them first
    // Then fill remaining slots evenly

    // Base distribution: spread evenly, morning gets +1 if odd
    const perSlot: number[] = []
    const base = Math.floor(neededTotal / numSlots)
    const remainder = neededTotal % numSlots
    for (let si = 0; si < numSlots; si++) {
      perSlot.push(base + (si < remainder ? 1 : 0))
    }

    // Get available employees for this day, sorted by: has suggestion > least days assigned
    const availableEmpsSorted = employees
      .filter((e: any) => !availMap[e.id][date].off && availMap[e.id][date].available)
      .filter((e: any) => empDaysCount[e.id] < 5)
      .sort((a: any, b: any) => {
        // Employees who suggested a specific time get priority
        const aSug = availMap[a.id][date].timeStart ? 2 : 1
        const bSug = availMap[b.id][date].timeStart ? 2 : 1
        if (bSug !== aSug) return bSug - aSug
        return empDaysCount[a.id] - empDaysCount[b.id]
      })

    // Assign employees to slots
    let empIdx = 0
    for (let si = 0; si < numSlots; si++) {
      const slot = slots[si]
      const count = perSlot[si]

      for (let i = 0; i < count; i++) {
        if (empIdx >= availableEmpsSorted.length) break
        const emp = availableEmpsSorted[empIdx++]
        const avail = availMap[emp.id][date]

        // If employee has a specific suggestion, honour it; otherwise use the slot times
        let timeStart = slot.start
        let timeEnd   = slot.end

        if (avail.timeStart && avail.timeEnd) {
          // Check if their suggested time falls in this slot's range
          const sugStartMin = toMin(avail.timeStart)
          const slotStartMin = toMin(slot.start)
          const slotEndMin   = toMin(slot.end)
          const inSlot = sugStartMin >= slotStartMin - 120 && sugStartMin < slotEndMin
          if (inSlot || numSlots === 1) {
            timeStart = avail.timeStart
            timeEnd   = avail.timeEnd
          }
        }

        const startMin = toMin(timeStart)
        const endMin   = toMin(timeEnd)
        const hours    = Math.max(0, (endMin - startMin) / 60)
        const rate     = emp.base_rate || 25
        const cost     = hours * rate
        const fromSuggestion = avail.timeStart !== null && timeStart === avail.timeStart

        proposed.push({
          employee_id:   emp.id,
          employee_name: emp.full_name ?? '',
          user_id:       (emp as any).user_id ?? null,
          position:      emp.position || 'pracownik',
          date,
          day_name:      DAYS_PL[dow],
          time_start:    timeStart,
          time_end:      timeEnd,
          hours,
          base_rate:     rate,
          cost,
          slot_label:    slot.label,
          reason:        fromSuggestion
            ? `Zgłoszona dostępność: ${timeStart}–${timeEnd}`
            : `Zmiana ${slot.label.toLowerCase()} (${timeStart}–${timeEnd})`,
          from_suggestion: fromSuggestion,
        })

        empDaysCount[emp.id]++
        empShiftsCount[emp.id]++
      }
    }
  }

  // Stats
  const totalCost    = proposed.reduce((s, p) => s + p.cost, 0)
  const totalHours   = proposed.reduce((s, p) => s + p.hours, 0)
  const totalRevEst  = weekDates.reduce((s, d) => {
    const dow = new Date(d + 'T12:00:00').getDay()
    return s + (dowAvg[dow] ?? 0)
  }, 0)
  const laborPct     = totalRevEst > 0 ? totalCost / totalRevEst : 0
  const coveredDays  = [...new Set(proposed.map(p => p.date))].length
  const daysWithData = weekDates.filter(d => dowAvg[new Date(d + 'T12:00:00').getDay()] > 0).length

  // AI summary
  let aiSummary = ''
  if (process.env.OPENAI_API_KEY && proposed.length > 0) {
    const slotSummary = slots.map(s => `${s.label}: ${s.start}–${s.end}`).join(', ')
    const prompt = `Jesteś asystentem managera. Napisz 2-zdaniowe podsumowanie grafiku po polsku.

Grafik tydzień ${weekStart}: ${proposed.length} zmian, ${[...new Set(proposed.map(p=>p.employee_id))].length} pracowników.
Zmiany: ${slotSummary}. Koszt: ${totalCost.toFixed(0)} zł (${(laborPct*100).toFixed(1)}% przychodów). Cel: ${(laborCostTarget*100).toFixed(0)}%.

Podsumowanie:`

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120, temperature: 0.3,
      })
      aiSummary = res.choices[0]?.message?.content?.trim() ?? ''
    } catch { /* fallback */ }
  }

  if (!aiSummary) {
    aiSummary = `Wygenerowano ${proposed.length} zmian (${slots.map(s => `${s.label}: ${s.start}–${s.end}`).join(', ')}). Koszt pracy: ${totalCost.toFixed(0)} zł — ${(laborPct*100).toFixed(1)}% prognozowanych przychodów.`
  }

  return NextResponse.json({
    proposed,
    slots,
    stats: {
      totalShifts: proposed.length,
      totalHours: Math.round(totalHours * 10) / 10,
      totalCost: Math.round(totalCost),
      totalRevEst: Math.round(totalRevEst),
      laborPct: Math.round(laborPct * 1000) / 10,
      laborTarget: laborCostTarget * 100,
      coveredDays,
      daysWithData,
      onTarget: laborPct <= laborCostTarget,
    },
    weekDates,
    employees: employees.map((e: any) => ({ id: e.id, name: e.full_name, position: e.position, base_rate: e.base_rate || 25 })),
    aiSummary,
  })
}
