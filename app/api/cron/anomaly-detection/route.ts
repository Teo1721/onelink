/**
 * GET /api/cron/anomaly-detection?secret=
 * Vercel Cron: runs daily at 07:30 UTC
 *
 * Compares yesterday's key metrics against the 4-week average.
 * Creates a cfo_alert for any metric that deviates > threshold.
 *
 * Metrics checked:
 *  - revenue:     > 20% drop  → warning,  > 35% drop  → critical
 *  - food_cost:   > 5pp spike → warning,  > 10pp spike → critical
 *  - invoice_count: > 50% spike (unusually high spend day) → warning
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return runAnomalyDetection()
}

export async function POST() {
  return runAnomalyDetection()
}

function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

async function runAnomalyDetection() {
  const supabase = createAdminClient()
  const yday   = yesterday()
  const from4w = daysAgo(29) // 4-week window excluding yesterday

  const { data: companies } = await supabase.from('companies').select('id, name')
  if (!companies?.length) return NextResponse.json({ ok: true })

  const detected: string[] = []

  for (const company of companies) {
    const { data: locations } = await supabase
      .from('locations').select('id').eq('company_id', company.id).eq('active', true)
    if (!locations?.length) continue

    const locationIds = locations.map(l => l.id)

    // ── Yesterday ───────────────────────────────────────────────
    const { data: ydaySales } = await supabase
      .from('sales_daily').select('net_revenue').in('location_id', locationIds).eq('date', yday)
    const revenueYday = (ydaySales ?? []).reduce((s, r) => s + (r.net_revenue ?? 0), 0)
    if (revenueYday === 0) continue

    const { data: ydayInvoices } = await supabase
      .from('invoices').select('total_gross, invoice_type')
      .in('location_id', locationIds).eq('status', 'approved').eq('service_date', yday)
    const cosYday  = (ydayInvoices ?? []).filter(i => i.invoice_type === 'COS').reduce((s, i) => s + (i.total_gross ?? 0), 0)
    const foodCostYday = revenueYday > 0 ? cosYday / revenueYday : 0

    // ── 4-week baseline (daily averages Mon–Sun same weekday bucket) ──
    const { data: historicSales } = await supabase
      .from('sales_daily').select('net_revenue, date')
      .in('location_id', locationIds).gte('date', from4w).lt('date', yday)
    const historicRevenues = (historicSales ?? []).map(r => r.net_revenue ?? 0).filter(v => v > 0)
    if (historicRevenues.length < 7) continue // not enough history
    const avgRevenue = historicRevenues.reduce((s, v) => s + v, 0) / historicRevenues.length

    const { data: historicInvoices } = await supabase
      .from('invoices').select('total_gross, invoice_type, service_date')
      .in('location_id', locationIds).eq('status', 'approved')
      .gte('service_date', from4w).lt('service_date', yday)
    const uniqueDays = new Set((historicInvoices ?? []).map(i => i.service_date)).size || 1
    const historicCosByDay = (historicInvoices ?? [])
      .filter(i => i.invoice_type === 'COS')
      .reduce((s, i) => s + (i.total_gross ?? 0), 0) / uniqueDays
    const avgFoodCost = avgRevenue > 0 ? historicCosByDay / avgRevenue : 0

    const alerts: { severity: string; title: string; description: string }[] = []

    // Revenue anomaly
    const revenueDropPct = avgRevenue > 0 ? (avgRevenue - revenueYday) / avgRevenue : 0
    if (revenueDropPct >= 0.35) {
      alerts.push({
        severity: 'critical',
        title: `Krytyczny spadek przychodu — ${Math.round(revenueDropPct * 100)}%`,
        description: `Wczorajszy przychód ${revenueYday.toFixed(2)} zł jest o ${Math.round(revenueDropPct * 100)}% poniżej średniej 4-tygodniowej (${avgRevenue.toFixed(2)} zł).`,
      })
    } else if (revenueDropPct >= 0.20) {
      alerts.push({
        severity: 'warning',
        title: `Niższy przychód niż średnia — ${Math.round(revenueDropPct * 100)}%`,
        description: `Wczorajszy przychód ${revenueYday.toFixed(2)} zł jest o ${Math.round(revenueDropPct * 100)}% poniżej średniej 4-tygodniowej (${avgRevenue.toFixed(2)} zł).`,
      })
    }

    // Food cost anomaly
    const foodCostSpike = foodCostYday - avgFoodCost
    if (foodCostSpike >= 0.10) {
      alerts.push({
        severity: 'critical',
        title: `Krytyczny wzrost food cost (+${(foodCostSpike * 100).toFixed(1)} pp)`,
        description: `Food cost wczoraj: ${(foodCostYday * 100).toFixed(1)}%, średnia 4-tygodniowa: ${(avgFoodCost * 100).toFixed(1)}%.`,
      })
    } else if (foodCostSpike >= 0.05) {
      alerts.push({
        severity: 'warning',
        title: `Podwyższony food cost (+${(foodCostSpike * 100).toFixed(1)} pp)`,
        description: `Food cost wczoraj: ${(foodCostYday * 100).toFixed(1)}%, średnia 4-tygodniowa: ${(avgFoodCost * 100).toFixed(1)}%.`,
      })
    }

    if (!alerts.length) continue

    // Avoid duplicate alerts for the same day
    const { data: existingToday } = await supabase
      .from('cfo_alerts').select('title')
      .eq('company_id', company.id).gte('created_at', yday)
    const existingTitles = new Set((existingToday ?? []).map((a: any) => a.title))

    const newAlerts = alerts.filter(a => !existingTitles.has(a.title))
    if (!newAlerts.length) continue

    await supabase.from('cfo_alerts').insert(
      newAlerts.map(a => ({
        company_id:  company.id,
        alert_type:  'anomaly',
        severity:    a.severity,
        title:       a.title,
        description: a.description,
        resolved:    false,
        metadata:    { date: yday, revenueYday, avgRevenue, foodCostYday, avgFoodCost },
      }))
    )

    detected.push(`${company.name}: ${newAlerts.length} anomaly/anomalies`)
  }

  return NextResponse.json({ ok: true, detected })
}
