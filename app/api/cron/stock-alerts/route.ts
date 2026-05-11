/**
 * GET /api/cron/stock-alerts?secret=
 * Vercel Cron: runs daily at 07:15 UTC (after daily-analysis)
 *
 * Checks every ingredient across all active warehouses against its min_threshold.
 * Creates a cfo_alert (severity: warning or critical) for each breach and
 * sends a push notification to the company owner.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return runStockAlerts()
}

export async function POST(req: NextRequest) {
  return runStockAlerts()
}

async function runStockAlerts() {
  const supabase = createAdminClient()

  // Get all companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  if (!companies?.length) return NextResponse.json({ ok: true, message: 'No companies' })

  const allAlerts: string[] = []

  for (const company of companies) {
    // Get all ingredients with a min_threshold set
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('id, name, category, base_unit, min_threshold')
      .eq('company_id', company.id)
      .not('min_threshold', 'is', null)
      .gt('min_threshold', 0)

    if (!ingredients?.length) continue

    // Get current stock for these ingredients across all warehouses
    const ingredientIds = ingredients.map(i => i.id)
    const { data: stocks } = await supabase
      .from('central_warehouse_stock')
      .select('ingredient_id, quantity')
      .in('ingredient_id', ingredientIds)

    // Sum quantities per ingredient (may span multiple warehouses)
    const stockMap: Record<string, number> = {}
    for (const s of stocks ?? []) {
      stockMap[s.ingredient_id] = (stockMap[s.ingredient_id] ?? 0) + (s.quantity ?? 0)
    }

    // Find breaches
    const breaches: { ingredient: typeof ingredients[0]; current: number; pct: number }[] = []
    for (const ing of ingredients) {
      const current = stockMap[ing.id] ?? 0
      if (current < ing.min_threshold) {
        breaches.push({ ingredient: ing, current, pct: current / ing.min_threshold })
      }
    }

    if (!breaches.length) continue

    // Deduplicate: skip if we already created an alert for this ingredient today
    const today = new Date().toISOString().slice(0, 10)
    const { data: existingAlerts } = await supabase
      .from('cfo_alerts')
      .select('metadata')
      .eq('company_id', company.id)
      .gte('created_at', today)
      .like('alert_type', 'low_stock%')

    const alreadyAlerted = new Set(
      (existingAlerts ?? []).map((a: any) => a.metadata?.ingredient_id).filter(Boolean)
    )

    const newBreaches = breaches.filter(b => !alreadyAlerted.has(b.ingredient.id))
    if (!newBreaches.length) continue

    // Insert cfo_alerts
    const alertRows = newBreaches.map(b => ({
      company_id:  company.id,
      alert_type:  'low_stock',
      severity:    b.pct === 0 ? 'critical' : 'warning',
      title:       `Niski stan: ${b.ingredient.name}`,
      description: `Aktualny stan: ${b.current.toFixed(2)} ${b.ingredient.base_unit} (minimum: ${b.ingredient.min_threshold} ${b.ingredient.base_unit})`,
      metadata:    { ingredient_id: b.ingredient.id, current: b.current, threshold: b.ingredient.min_threshold },
      resolved:    false,
    }))
    await supabase.from('cfo_alerts').insert(alertRows)

    // Send push notification to company owner
    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('company_id', company.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (ownerProfile) {
      const { data: pushSubs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', ownerProfile.id)

      if (pushSubs?.length) {
        const criticalCount = newBreaches.filter(b => b.pct === 0).length
        const body = criticalCount > 0
          ? `${criticalCount} składnik(ów) całkowicie brak w magazynie!`
          : `${newBreaches.length} składnik(ów) poniżej minimum.`

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: ownerProfile.id,
            title: `⚠️ Niski stan magazynu — ${company.name}`,
            body,
            url: '/ops',
          }),
        }).catch(() => {})
      }
    }

    allAlerts.push(`${company.name}: ${newBreaches.length} alert(s)`)
  }

  return NextResponse.json({ ok: true, results: allAlerts })
}
