import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

export const runtime = 'nodejs'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
const DAYS_SHORT = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']

function pad(n: number) { return String(n).padStart(2, '0') }
function addDays(base: Date, n: number) {
  const d = new Date(base); d.setDate(d.getDate() + n); return d
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
function daysAgo(n: number) {
  return toISO(addDays(new Date(), -n))
}

export async function GET(req: NextRequest) {
  const companyId  = req.nextUrl.searchParams.get('companyId')
  const locationId = req.nextUrl.searchParams.get('locationId') // optional: single location
  if (!companyId && !locationId) return NextResponse.json({ error: 'companyId or locationId required' }, { status: 400 })

  const admin = createAdminClient()

  // Get location(s)
  let locQuery = admin.from('locations').select('id, name')
  if (locationId) {
    locQuery = locQuery.eq('id', locationId) as typeof locQuery
  } else {
    locQuery = locQuery.eq('company_id', companyId!) as typeof locQuery
  }
  const { data: locations } = await locQuery
  const locIds = (locations ?? []).map((l: any) => l.id)
  if (!locIds.length) return NextResponse.json({ error: 'Brak lokalizacji — upewnij się, że masz skonfigurowane lokale.' }, { status: 400 })

  // Pull 56 days of sales (8 weeks of history)
  const { data: sales } = await admin.from('sales_daily')
    .select('date, net_revenue, total_labor_hours, location_id')
    .in('location_id', locIds)
    .gte('date', daysAgo(56))
    .order('date')

  // Pull pending invoices (working capital exposure)
  const { data: pendingInv } = await admin.from('invoices')
    .select('total_amount, supplier_name, invoice_type')
    .in('location_id', locIds).eq('status', 'submitted')

  // Pull approved COS invoices last 28d (top suppliers)
  const { data: cosInv } = await admin.from('invoices')
    .select('supplier_name, total_amount')
    .in('location_id', locIds).eq('status', 'approved').eq('invoice_type', 'COS')
    .gte('service_date', daysAgo(28))

  // Pull shift counts last 28d grouped by day of week
  const { data: shifts } = await admin.from('shifts')
    .select('date, employee_id')
    .in('location_id', locIds)
    .gte('date', daysAgo(28))

  // ── Build DOW (day-of-week) stats ─────────────────────────────
  // Aggregate daily revenue totals (sum across locations)
  const revByDate: Record<string, number> = {}
  const laborByDate: Record<string, number> = {}
  for (const r of (sales ?? [])) {
    revByDate[r.date] = (revByDate[r.date] ?? 0) + (r.net_revenue || 0)
    laborByDate[r.date] = (laborByDate[r.date] ?? 0) + (r.total_labor_hours || 0)
  }

  // Stats per DOW: revenues, labor hours
  const dowRevs: Record<number, number[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] }
  const dowLabor: Record<number, number[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] }
  for (const [dateStr, rev] of Object.entries(revByDate)) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    dowRevs[dow].push(rev)
    if (laborByDate[dateStr]) dowLabor[dow].push(laborByDate[dateStr])
  }

  // Shifts count per DOW
  const dowShifts: Record<number, number[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] }
  const shiftsByDate: Record<string, number> = {}
  for (const s of (shifts ?? [])) {
    shiftsByDate[s.date] = (shiftsByDate[s.date] ?? 0) + 1
  }
  for (const [dateStr, cnt] of Object.entries(shiftsByDate)) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    dowShifts[dow].push(cnt)
  }

  // Trend: compare last 28d average vs prior 28d
  const sorted = Object.entries(revByDate).sort(([a],[b]) => a < b ? 1 : -1)
  const recent28 = sorted.slice(0, 28).reduce((s,[,v]) => s+v, 0) / Math.max(sorted.slice(0,28).length, 1)
  const prior28  = sorted.slice(28).reduce((s,[,v]) => s+v, 0) / Math.max(sorted.slice(28).length, 1)
  const trendFactor = prior28 > 0 ? recent28 / prior28 : 1

  // Top suppliers
  const supplierTotals: Record<string, number> = {}
  for (const i of (cosInv ?? [])) {
    supplierTotals[i.supplier_name] = (supplierTotals[i.supplier_name] ?? 0) + (i.total_amount || 0)
  }
  const topSuppliers = Object.entries(supplierTotals)
    .sort(([,a],[,b]) => b-a).slice(0, 5).map(([name, total]) => ({ name, total }))

  // ── Generate 7-day plan ───────────────────────────────────────
  const today = new Date()
  const days = []

  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i)
    const dow = d.getDay()
    const iso = toISO(d)

    const revSamples = dowRevs[dow]
    const mean = revSamples.length
      ? revSamples.reduce((s,v) => s+v, 0) / revSamples.length * trendFactor
      : 0
    const stdDev = revSamples.length >= 2
      ? Math.sqrt(revSamples.reduce((s,v) => s + (v-mean/trendFactor)**2, 0) / revSamples.length) * trendFactor
      : mean * 0.15

    const revLow  = Math.max(0, Math.round(mean - stdDev))
    const revHigh = Math.round(mean + stdDev)
    const revMid  = Math.round(mean)

    // Historical avg for same DOW (without trend)
    const rawMean = revSamples.length
      ? revSamples.reduce((s,v) => s+v, 0) / revSamples.length
      : 0
    const vsAvg = rawMean > 0 ? ((mean - rawMean) / rawMean) * 100 : 0

    // Staff recommendation
    const staffSamples = dowShifts[dow]
    const staffBaseline = staffSamples.length
      ? Math.round(staffSamples.reduce((s,v) => s+v, 0) / staffSamples.length)
      : 0
    let staffRec = staffBaseline
    if (mean > rawMean * 1.1) staffRec = staffBaseline + 1
    else if (mean < rawMean * 0.85) staffRec = Math.max(1, staffBaseline - 1)

    // Confidence
    const confidence: 'high' | 'medium' | 'low' =
      revSamples.length >= 6 ? 'high' : revSamples.length >= 3 ? 'medium' : 'low'

    // Ordering recs: if predicted revenue significantly above avg → order more
    const orderRecs: string[] = []
    if (mean > rawMean * 1.15 && topSuppliers.length > 0) {
      orderRecs.push(`Zwiększ zamówienie: ${topSuppliers[0].name} (+15-20%)`)
    }
    if (dow === 3 || dow === 4) { // Wed/Thu — order for weekend
      if (topSuppliers[0]) orderRecs.push(`Przygotuj zaopatrzenie weekendowe`)
    }

    // Should run promotion
    const shouldPromote = mean < rawMean * 0.85 && mean > 0

    days.push({
      date: iso,
      dayName: DAYS_PL[dow],
      dayShort: DAYS_SHORT[dow],
      dow,
      revLow, revHigh, revMid,
      vsAvg: Math.round(vsAvg * 10) / 10,
      confidence,
      staffRec,
      staffBaseline,
      orderRecs,
      shouldPromote,
    })
  }

  // ── AI narrative ──────────────────────────────────────────────
  let narrative = ''
  const bestDay = [...days].sort((a,b) => b.revMid - a.revMid)[0]
  const worstDay = [...days].sort((a,b) => a.revMid - b.revMid)[0]
  const weekTotal = days.reduce((s,d) => s+d.revMid, 0)
  const promoDays = days.filter(d => d.shouldPromote)
  const overstaff = days.filter(d => d.staffRec > d.staffBaseline)

  if (process.env.OPENAI_API_KEY) {
    const prompt = `Jesteś doradcą biznesowym dla polskiej restauracji/stołówki. Na podstawie prognoz wygeneruj 3-zdaniowy komentarz po polsku (bez markdown, zwykły tekst).

Prognoza na tydzień (${days[0].date} – ${days[6].date}):
- Łączny prognozowany przychód: ${weekTotal.toFixed(0)} zł
- Najlepszy dzień: ${bestDay.dayName} (~${bestDay.revMid.toFixed(0)} zł)
- Najsłabszy dzień: ${worstDay.dayName} (~${worstDay.revMid.toFixed(0)} zł)
- Dni poniżej średniej: ${promoDays.map(d=>d.dayName).join(', ') || 'brak'}
- Trend ogólny: ${trendFactor > 1.05 ? 'rosnący' : trendFactor < 0.95 ? 'malejący' : 'stabilny'}

Napisz 3 konkretne zdania z liczbamiTwoja analiza:`

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200, temperature: 0.4,
      })
      narrative = res.choices[0]?.message?.content?.trim() ?? ''
    } catch { /* fallback below */ }
  }

  if (!narrative) {
    narrative = `Prognoza na nadchodzący tydzień: łączny przychód ${weekTotal.toFixed(0)} zł. Najlepszy dzień to ${bestDay.dayName} (${bestDay.revMid.toFixed(0)} zł), a najsłabszy ${worstDay.dayName} (${worstDay.revMid.toFixed(0)} zł). ${promoDays.length > 0 ? `Rozważ akcję promocyjną w ${promoDays.map(d=>d.dayName).join(' i ')}.` : 'Wszystkie dni prognozowane powyżej lub w okolicach średniej.'}`
  }

  return NextResponse.json({
    days,
    weekTotal,
    bestDay: bestDay.dayName,
    worstDay: worstDay.dayName,
    narrative,
    topSuppliers,
    pendingInvoices: pendingInv?.length ?? 0,
    pendingTotal: (pendingInv ?? []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0),
    trendFactor,
    locations: locations ?? [],
  })
}
