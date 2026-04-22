import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

/**
 * GET /api/cron/daily-analysis
 * Vercel Cron: runs every day at 07:00 UTC
 * Also callable manually with ?secret=CRON_SECRET
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Industry benchmarks (Polish food/hospitality) ───────────────
const BENCH = {
  food_cost:  { excellent: 0.28, good: 0.35, warn: 0.42, critical: 0.45 },
  labor_cost: { excellent: 0.22, good: 0.30, warn: 0.35, critical: 0.40 },
  revenue_drop: 0.15,
  pending_invoice_days: 14,
}

function benchLabel(pct: number, type: 'food_cost' | 'labor_cost') {
  const b = BENCH[type]
  if (pct <= b.excellent) return 'doskonały'
  if (pct <= b.good)      return 'dobry'
  if (pct <= b.warn)      return 'podwyższony'
  if (pct <= b.critical)  return 'wysoki'
  return 'krytyczny'
}

function today()          { return new Date().toLocaleDateString('sv-SE') }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE')
}

// ─── GPT explanation with benchmark context ──────────────────────
async function explainAnomaly(
  type: string,
  context: string,
  benchmarkContext: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return context
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content: `Jesteś Markiem — CFO AI dla restauracji w Polsce. Piszesz po polsku, konkretnie.

Format odpowiedzi (2 zdania max):
Zdanie 1: co się dzieje i jak to się ma do benchmarku branżowego.
Zdanie 2: jedno konkretne działanie właściciela TERAZ (z liczbami jeśli możliwe).

Benchmarki branżowe dla polskiej gastronomii:
${benchmarkContext}`,
        },
        { role: 'user', content: `Anomalia: ${type}\nDane: ${context}` },
      ],
    })
    return res.choices[0]?.message?.content?.trim() ?? context
  } catch { return context }
}

// ─── Count consecutive days the same alert was active ───────────
async function getTrendDays(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  alertType: string
): Promise<number> {
  // Check last 14 days for this alert type
  const { data } = await admin
    .from('cfo_alerts')
    .select('date')
    .eq('company_id', companyId)
    .eq('alert_type', alertType)
    .gte('date', daysAgo(14))
    .order('date', { ascending: false })

  if (!data?.length) return 1

  // Count consecutive days going back from yesterday
  let count = 1
  const dates = data.map((r: any) => r.date).sort().reverse()
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = new Date(dates[i])
    const prev = new Date(dates[i + 1])
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) count++
    else break
  }
  return count
}

// ─── Escalate severity based on trend ───────────────────────────
function escalateSeverity(
  base: 'info' | 'warning' | 'critical',
  trendDays: number
): 'info' | 'warning' | 'critical' {
  if (trendDays >= 3 && base === 'info')    return 'warning'
  if (trendDays >= 3 && base === 'warning') return 'critical'
  return base
}

export async function GET(req: NextRequest) {
  const secret   = req.nextUrl.searchParams.get('secret')
  const isVercel = req.headers.get('x-vercel-cron') === '1'
  if (!isVercel && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin        = createAdminClient()
  const todayStr     = today()
  const alertsCreated: string[] = []

  const { data: companies } = await admin.from('companies').select('id, name')
  if (!companies?.length) return NextResponse.json({ ok: true, companies: 0 })

  for (const company of companies) {
    try {
      const { data: locations } = await admin.from('locations').select('id').eq('company_id', company.id)
      const locIds = locations?.map((l: any) => l.id) ?? []
      if (!locIds.length) continue

      const [
        { data: sales14 },
        { data: invoices },
      ] = await Promise.all([
        admin.from('sales_daily')
          .select('date, net_revenue, gross_revenue, total_labor_hours, avg_hourly_rate, location_id')
          .in('location_id', locIds)
          .gte('date', daysAgo(14))
          .order('date', { ascending: false }),
        admin.from('invoices')
          .select('id, supplier_name, total_amount, invoice_type, service_date, status, created_at, location_id')
          .in('location_id', locIds)
          .gte('service_date', daysAgo(30))
          .order('service_date', { ascending: false }),
      ])

      const alerts: {
        company_id: string
        director: string
        alert_type: string
        severity: 'info' | 'warning' | 'critical'
        title: string
        message: string
        trend_days: number
        data: Record<string, any>
        date: string
        resolved: boolean
      }[] = []

      const approvedInvoices = (invoices ?? []).filter((i: any) => i.status === 'approved')
      const cosInvoices7d = approvedInvoices
        .filter((i: any) => i.invoice_type === 'COS' && i.service_date >= daysAgo(7))
      const recentSales7 = (sales14 ?? []).slice(0, 7)
      const totalRevenue7d = recentSales7.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
      const totalCOS7d = cosInvoices7d.reduce((s: number, i: any) => s + (i.total_amount || 0), 0)

      const benchCtx = `
- Food cost: <${(BENCH.food_cost.excellent*100).toFixed(0)}% doskonały, ${(BENCH.food_cost.excellent*100).toFixed(0)}-${(BENCH.food_cost.good*100).toFixed(0)}% dobry, ${(BENCH.food_cost.good*100).toFixed(0)}-${(BENCH.food_cost.warn*100).toFixed(0)}% podwyższony, >${(BENCH.food_cost.warn*100).toFixed(0)}% krytyczny
- Koszt pracy: <${(BENCH.labor_cost.excellent*100).toFixed(0)}% doskonały, ${(BENCH.labor_cost.excellent*100).toFixed(0)}-${(BENCH.labor_cost.good*100).toFixed(0)}% dobry, ${(BENCH.labor_cost.good*100).toFixed(0)}-${(BENCH.labor_cost.warn*100).toFixed(0)}% podwyższony, >${(BENCH.labor_cost.warn*100).toFixed(0)}% krytyczny
- Bezpieczny spadek przychodów tydzień do tygodnia: <${(BENCH.revenue_drop*100).toFixed(0)}%`.trim()

      // ── Check 1: Food Cost ──────────────────────────────────────
      if (totalRevenue7d > 0 && totalCOS7d > 0) {
        const fc = totalCOS7d / totalRevenue7d
        const label = benchLabel(fc, 'food_cost')
        if (fc > BENCH.food_cost.excellent) {
          const baseSev: 'warning' | 'critical' = fc > BENCH.food_cost.warn ? 'critical' : 'warning'
          const trendDays = await getTrendDays(admin, company.id, 'food_cost_high')
          const severity = escalateSeverity(baseSev, trendDays)
          const ctx = `Food cost ${(fc*100).toFixed(1)}% (${label}). Sprzedaż 7d: ${totalRevenue7d.toFixed(0)} zł, COS: ${totalCOS7d.toFixed(0)} zł. Trend: ${trendDays} dni z rzędu.`
          const msg = await explainAnomaly('Food cost powyżej benchmarku', ctx, benchCtx)
          alerts.push({
            company_id: company.id, director: 'cfo', alert_type: 'food_cost_high',
            severity, trend_days: trendDays,
            title: `Food cost ${(fc*100).toFixed(1)}% — ${label}${trendDays >= 3 ? ` (${trendDays} dni z rzędu)` : ''}`,
            message: msg,
            data: { food_cost_pct: fc, revenue_7d: totalRevenue7d, cos_7d: totalCOS7d, benchmark_good: BENCH.food_cost.good, benchmark_critical: BENCH.food_cost.critical, trend_days: trendDays, label },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 2: Labor Cost ─────────────────────────────────────
      const totalLaborCost7d = recentSales7.reduce((s: number, r: any) =>
        s + ((r.total_labor_hours || 0) * (r.avg_hourly_rate || 0)), 0)
      if (totalRevenue7d > 0 && totalLaborCost7d > 0) {
        const lc = totalLaborCost7d / totalRevenue7d
        if (lc > BENCH.labor_cost.good) {
          const trendDays = await getTrendDays(admin, company.id, 'labor_cost_high')
          const severity = escalateSeverity('warning', trendDays)
          const ctx = `Koszt pracy ${(lc*100).toFixed(1)}% (${benchLabel(lc,'labor_cost')}). Koszt pracy 7d: ${totalLaborCost7d.toFixed(0)} zł vs przychód ${totalRevenue7d.toFixed(0)} zł. Trend: ${trendDays} dni z rzędu.`
          const msg = await explainAnomaly('Wysoki koszt pracy', ctx, benchCtx)
          alerts.push({
            company_id: company.id, director: 'cfo', alert_type: 'labor_cost_high',
            severity, trend_days: trendDays,
            title: `Koszt pracy ${(lc*100).toFixed(1)}% — ${benchLabel(lc,'labor_cost')}${trendDays >= 3 ? ` (${trendDays} dni)` : ''}`,
            message: msg,
            data: { labor_cost_pct: lc, labor_7d: totalLaborCost7d, revenue_7d: totalRevenue7d, benchmark_good: BENCH.labor_cost.good, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 3: Revenue Drop ───────────────────────────────────
      if ((sales14 ?? []).length >= 7) {
        const thisWeek = (sales14 ?? []).slice(0, 7).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
        const lastWeek = (sales14 ?? []).slice(7, 14).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
        if (lastWeek > 0 && thisWeek < lastWeek * (1 - BENCH.revenue_drop)) {
          const dropPct = ((lastWeek - thisWeek) / lastWeek * 100)
          const trendDays = await getTrendDays(admin, company.id, 'revenue_drop')
          const severity = escalateSeverity('warning', trendDays)
          const ctx = `Przychody spadły o ${dropPct.toFixed(1)}%. Bieżący tydzień: ${thisWeek.toFixed(0)} zł, poprzedni: ${lastWeek.toFixed(0)} zł. Różnica: ${(lastWeek - thisWeek).toFixed(0)} zł.`
          const msg = await explainAnomaly('Spadek przychodów tydzień do tygodnia', ctx, benchCtx)
          alerts.push({
            company_id: company.id, director: 'cfo', alert_type: 'revenue_drop',
            severity, trend_days: trendDays,
            title: `Przychody –${dropPct.toFixed(1)}% vs poprzedni tydzień`,
            message: msg,
            data: { this_week: thisWeek, last_week: lastWeek, drop_pct: dropPct, drop_amount: lastWeek - thisWeek, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 4: Stale Pending Invoices ─────────────────────────
      const stale = (invoices ?? []).filter((i: any) => {
        if (i.status !== 'submitted') return false
        return (Date.now() - new Date(i.created_at).getTime()) / 86400000 > BENCH.pending_invoice_days
      })
      if (stale.length > 0) {
        const total = stale.reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
        const trendDays = await getTrendDays(admin, company.id, 'stale_invoices')
        alerts.push({
          company_id: company.id, director: 'cfo', alert_type: 'stale_invoices',
          severity: trendDays >= 7 ? 'warning' : 'info', trend_days: trendDays,
          title: `${stale.length} faktur nierozpatrzonych ponad ${BENCH.pending_invoice_days} dni`,
          message: `Faktury na ${total.toFixed(0)} zł czekają na zatwierdzenie. Niezatwierdzone faktury zaburzają obliczenia P&L i food cost. Otwórz moduł Faktury i zatwierdź lub odrzuć każdą z nich.`,
          data: { count: stale.length, total_amount: total, invoices: stale.slice(0,5).map((i: any) => ({ supplier: i.supplier_name, amount: i.total_amount })), trend_days: trendDays },
          date: todayStr, resolved: false,
        })
      }

      // ── Check 5: Missing Daily Report ───────────────────────────
      const yesterday = daysAgo(1)
      if (!(sales14 ?? []).some((s: any) => s.date === yesterday)) {
        alerts.push({
          company_id: company.id, director: 'cfo', alert_type: 'missing_daily_report',
          severity: 'warning', trend_days: 1,
          title: `Brak raportu dziennego za ${yesterday}`,
          message: `Raport za wczoraj (${yesterday}) nie został wprowadzony. Bez niego food cost i EBIT za ten dzień będą niepoprawne.`,
          data: { missing_date: yesterday },
          date: todayStr, resolved: false,
        })
      }

      // ── Check 6: Low EBIT margin ────────────────────────────────
      const semisInvoices7d = approvedInvoices
        .filter((i: any) => i.invoice_type === 'SEMIS' && i.service_date >= daysAgo(7))
        .reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
      if (totalRevenue7d > 0) {
        const ebit = totalRevenue7d - totalCOS7d - semisInvoices7d - totalLaborCost7d
        const ebitPct = ebit / totalRevenue7d
        if (ebitPct < 0.05 && ebitPct > -0.5 && totalCOS7d > 0) {
          const trendDays = await getTrendDays(admin, company.id, 'low_ebit')
          const severity = escalateSeverity(ebitPct < 0 ? 'critical' : 'warning', trendDays)
          const msg = await explainAnomaly(
            ebitPct < 0 ? 'Ujemny EBIT — strata operacyjna' : 'Niski EBIT poniżej 5%',
            `EBIT ${(ebitPct*100).toFixed(1)}% (${ebit.toFixed(0)} zł). Przychód: ${totalRevenue7d.toFixed(0)} zł, COS: ${totalCOS7d.toFixed(0)} zł, SEMIS: ${semisInvoices7d.toFixed(0)} zł, praca: ${totalLaborCost7d.toFixed(0)} zł.`,
            benchCtx + '\n- EBIT: >15% dobry, 5-15% akceptowalny, <5% krytyczny'
          )
          alerts.push({
            company_id: company.id, director: 'cfo', alert_type: 'low_ebit',
            severity, trend_days: trendDays,
            title: `EBIT ${(ebitPct*100).toFixed(1)}%${ebitPct < 0 ? ' — strata operacyjna' : ' — poniżej progu'}`,
            message: msg,
            data: { ebit, ebit_pct: ebitPct, revenue: totalRevenue7d, cos: totalCOS7d, semis: semisInvoices7d, labor: totalLaborCost7d, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        }
      }

      if (alerts.length > 0) {
        await admin.from('cfo_alerts').upsert(alerts, { onConflict: 'company_id,alert_type,date' })
        alertsCreated.push(`${company.name}: ${alerts.length} alerts`)

        // Push critical alerts to all subscribed owners/admins
        const criticals = alerts.filter(a => a.severity === 'critical')
        if (criticals.length > 0) {
          const { data: users } = await admin
            .from('user_profiles')
            .select('id')
            .eq('company_id', company.id)
            .in('role', ['owner', 'admin', 'superadmin'])

          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.onelink.restaurant'
          for (const u of (users ?? [])) {
            await fetch(`${appUrl}/api/push/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: u.id,
                title: `CFO Alert — ${company.name}`,
                body: criticals[0].title,
                url: '/admin',
              }),
            }).catch(() => {})
          }
        }
      }
    } catch (err: any) {
      console.error(`[daily-analysis] ${company.id}:`, err?.message)
    }
  }

  return NextResponse.json({ ok: true, companies: companies.length, alerts: alertsCreated })
}
