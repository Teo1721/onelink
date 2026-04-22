import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

/**
 * GET /api/cron/investor-analysis
 * Vercel Cron: runs every Monday at 09:00 UTC (weekly investor metrics)
 * Also callable manually with ?secret=CRON_SECRET
 *
 * Marek (Investor Director) monitors:
 * - Revenue growth MoM and YoY trend
 * - EBITDA margin (revenue - food cost - labor cost)
 * - Revenue per transaction trend (avg ticket)
 * - Pending invoice exposure (working capital risk)
 * - Unit economics per location (28-day)
 * - 4-week revenue trajectory (accelerating vs decelerating)
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function today()            { return new Date().toLocaleDateString('sv-SE') }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE')
}

async function explainInvestorAnomaly(type: string, context: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return context
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 140,
      messages: [
        {
          role: 'system',
          content: `Jesteś Markiem — Dyrektorem Inwestorskim AI dla restauracji. Piszesz po polsku, jak CFO raportujący do zarządu.
Format (2 zdania max):
Zdanie 1: ocena sytuacji finansowej z perspektywy inwestorskiej.
Zdanie 2: jedna konkretna rekomendacja dla właściciela dotycząca wzrostu wartości biznesu.`,
        },
        { role: 'user', content: `Sytuacja: ${type}\nDane: ${context}` },
      ],
    })
    return res.choices[0]?.message?.content?.trim() ?? context
  } catch { return context }
}

async function getTrendDays(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  alertType: string
): Promise<number> {
  const { data } = await admin
    .from('cfo_alerts')
    .select('date')
    .eq('company_id', companyId)
    .eq('director', 'investor')
    .eq('alert_type', alertType)
    .gte('date', daysAgo(14))
    .order('date', { ascending: false })

  if (!data?.length) return 1
  let count = 1
  const dates = data.map((r: any) => r.date).sort().reverse()
  for (let i = 0; i < dates.length - 1; i++) {
    const diff = Math.round((new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) / 86400000)
    if (diff === 1) count++
    else break
  }
  return count
}

export async function GET(req: NextRequest) {
  const secret   = req.nextUrl.searchParams.get('secret')
  const isVercel = req.headers.get('x-vercel-cron') === '1'
  if (!isVercel && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin    = createAdminClient()
  const todayStr = today()
  const results: string[] = []

  const { data: companies } = await admin.from('companies').select('id, name')
  if (!companies?.length) return NextResponse.json({ ok: true, companies: 0 })

  for (const company of companies) {
    try {
      const { data: locations } = await admin.from('locations').select('id, name').eq('company_id', company.id)
      const locIds = locations?.map((l: any) => l.id) ?? []
      if (!locIds.length) continue

      // Pull 56 days of sales for MoM comparison
      const { data: sales56 } = await admin
        .from('sales_daily')
        .select('date, net_revenue, gross_revenue, location_id, total_labor_hours, avg_hourly_rate, food_cost_amount, transaction_count')
        .in('location_id', locIds)
        .gte('date', daysAgo(56))
        .order('date', { ascending: false })

      if (!sales56?.length) continue

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

      // Aggregate by day
      const revByDate: Record<string, { net: number; gross: number; labor: number; food: number; txns: number }> = {}
      for (const row of sales56) {
        if (!revByDate[row.date]) revByDate[row.date] = { net: 0, gross: 0, labor: 0, food: 0, txns: 0 }
        revByDate[row.date].net   += row.net_revenue || 0
        revByDate[row.date].gross += row.gross_revenue || 0
        revByDate[row.date].labor += (row.total_labor_hours || 0) * (row.avg_hourly_rate || 0)
        revByDate[row.date].food  += row.food_cost_amount || 0
        revByDate[row.date].txns  += row.transaction_count || 0
      }

      const sorted = Object.entries(revByDate).sort(([a], [b]) => a < b ? 1 : -1)
      const d28  = sorted.slice(0, 28)
      const d29to56 = sorted.slice(28, 56)

      const sum28net  = d28.reduce((s, [, v]) => s + v.net, 0)
      const sum56net  = d29to56.reduce((s, [, v]) => s + v.net, 0)
      const sum28lab  = d28.reduce((s, [, v]) => s + v.labor, 0)
      const sum28food = d28.reduce((s, [, v]) => s + v.food, 0)
      const sum28txns = d28.reduce((s, [, v]) => s + v.txns, 0)
      const dayCount  = d28.length || 1

      // ── Check 1: Revenue growth (28d vs prior 28d) ───────────
      if (sum56net > 0) {
        const growthPct = (sum28net - sum56net) / sum56net
        if (Math.abs(growthPct) > 0.08) {
          const isGrowth = growthPct > 0
          const msg = await explainInvestorAnomaly(
            isGrowth ? 'Silny wzrost przychodów MoM' : 'Spadek przychodów MoM',
            `Ostatnie 28 dni: ${sum28net.toFixed(0)} zł vs poprzednie 28 dni: ${sum56net.toFixed(0)} zł. Zmiana: ${(growthPct * 100).toFixed(1)}%.`
          )
          const trendDays = isGrowth ? 1 : await getTrendDays(admin, company.id, 'revenue_growth_decline')
          alerts.push({
            company_id: company.id, director: 'investor',
            alert_type: isGrowth ? 'revenue_growth_acceleration' : 'revenue_growth_decline',
            severity: isGrowth ? 'info' : (growthPct < -0.20 ? 'critical' : 'warning'),
            trend_days: trendDays,
            title: `Przychody ${isGrowth ? '+' : ''}${(growthPct * 100).toFixed(1)}% MoM (28d vs 28d)`,
            message: msg,
            data: {
              current_28d: sum28net, prior_28d: sum56net,
              growth_pct: growthPct, trend_days: trendDays,
            },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 2: EBITDA margin ────────────────────────────────
      const ebitda = sum28net - sum28lab - sum28food
      const ebitdaMargin = sum28net > 0 ? ebitda / sum28net : 0

      if (sum28net > 0) {
        const sev: 'info' | 'warning' | 'critical' =
          ebitdaMargin < 0.05 ? 'critical' :
          ebitdaMargin < 0.12 ? 'warning' : 'info'

        if (ebitdaMargin < 0.20) {
          const msg = await explainInvestorAnomaly(
            'Marża EBITDA',
            `EBITDA: ${ebitda.toFixed(0)} zł (${(ebitdaMargin * 100).toFixed(1)}% przychodów). Przychody: ${sum28net.toFixed(0)} zł. Koszty pracy: ${sum28lab.toFixed(0)} zł, food cost: ${sum28food.toFixed(0)} zł.`
          )
          const trendDays = await getTrendDays(admin, company.id, 'ebitda_margin_low')
          alerts.push({
            company_id: company.id, director: 'investor', alert_type: 'ebitda_margin_low',
            severity: sev, trend_days: trendDays,
            title: `Marża EBITDA ${(ebitdaMargin * 100).toFixed(1)}% — ${ebitdaMargin < 0.12 ? 'poniżej minimum' : 'do poprawy'}`,
            message: msg,
            data: {
              ebitda, ebitda_margin: ebitdaMargin,
              revenue: sum28net, labor: sum28lab, food: sum28food, trend_days: trendDays,
            },
            date: todayStr, resolved: false,
          })
        } else {
          // Healthy EBITDA — positive signal
          const msg = await explainInvestorAnomaly(
            'Zdrowa marża EBITDA',
            `EBITDA ${(ebitdaMargin * 100).toFixed(1)}% — powyżej branżowego benchmarku 15-20% dla gastronomii.`
          )
          alerts.push({
            company_id: company.id, director: 'investor', alert_type: 'ebitda_healthy',
            severity: 'info', trend_days: 1,
            title: `Marża EBITDA ${(ebitdaMargin * 100).toFixed(1)}% — zdrowa rentowność`,
            message: msg,
            data: { ebitda, ebitda_margin: ebitdaMargin, revenue: sum28net, labor: sum28lab, food: sum28food },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 3: Avg ticket trend ────────────────────────────
      if (sum28txns > 0) {
        const avgTicket28  = sum28net / sum28txns
        const txnsPrior    = d29to56.reduce((s, [, v]) => s + v.txns, 0)
        const netPrior     = d29to56.reduce((s, [, v]) => s + v.net, 0)
        const avgTicketPrior = txnsPrior > 0 ? netPrior / txnsPrior : 0

        if (avgTicketPrior > 0) {
          const ticketChange = (avgTicket28 - avgTicketPrior) / avgTicketPrior
          if (Math.abs(ticketChange) > 0.08) {
            const isUp = ticketChange > 0
            const msg = await explainInvestorAnomaly(
              isUp ? 'Wzrost średniej wartości transakcji' : 'Spadek średniej wartości transakcji',
              `Śr. paragon: ${avgTicket28.toFixed(0)} zł (poprzednio ${avgTicketPrior.toFixed(0)} zł). Zmiana: ${(ticketChange * 100).toFixed(1)}%.`
            )
            alerts.push({
              company_id: company.id, director: 'investor',
              alert_type: isUp ? 'avg_ticket_up' : 'avg_ticket_down',
              severity: isUp ? 'info' : 'warning', trend_days: 1,
              title: `Śr. paragon ${isUp ? '+' : ''}${(ticketChange * 100).toFixed(1)}% → ${avgTicket28.toFixed(0)} zł`,
              message: msg,
              data: {
                avg_ticket: avgTicket28, avg_ticket_prior: avgTicketPrior,
                change_pct: ticketChange, transactions: sum28txns,
              },
              date: todayStr, resolved: false,
            })
          }
        }
      }

      // ── Check 4: Pending invoice exposure ───────────────────
      const { data: pendingInvoices } = await admin
        .from('invoices')
        .select('total_amount, invoice_type')
        .in('location_id', locIds)
        .eq('status', 'submitted')

      if (pendingInvoices && pendingInvoices.length > 0) {
        const totalExposure = pendingInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
        const avgDailyRev   = sum28net / dayCount
        const exposureDays  = avgDailyRev > 0 ? totalExposure / avgDailyRev : 0

        if (exposureDays > 5) {
          const sev: 'warning' | 'critical' = exposureDays > 14 ? 'critical' : 'warning'
          const msg = await explainInvestorAnomaly(
            'Wysoka ekspozycja na niezatwierdzone faktury',
            `${pendingInvoices.length} faktur na łączną kwotę ${totalExposure.toFixed(0)} zł czeka na zatwierdzenie. To odpowiednik ${exposureDays.toFixed(1)} dni przychodów.`
          )
          const trendDays = await getTrendDays(admin, company.id, 'invoice_exposure')
          alerts.push({
            company_id: company.id, director: 'investor', alert_type: 'invoice_exposure',
            severity: sev, trend_days: trendDays,
            title: `${totalExposure.toFixed(0)} zł w niezatwierdzonych fakturach (${exposureDays.toFixed(1)} dni przychodów)`,
            message: msg,
            data: {
              invoice_count: pendingInvoices.length, total_exposure: totalExposure,
              exposure_days: exposureDays, avg_daily_revenue: avgDailyRev, trend_days: trendDays,
            },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 5: Unit economics per location ─────────────────
      if ((locations?.length ?? 0) >= 2) {
        const byLoc: Record<string, { name: string; net: number; labor: number; food: number }> = {}
        for (const loc of (locations ?? [])) {
          const locRows = (sales56 ?? []).filter((r: any) => r.location_id === loc.id && r.date >= daysAgo(28))
          byLoc[loc.id] = {
            name: loc.name,
            net:   locRows.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0),
            labor: locRows.reduce((s: number, r: any) => s + (r.total_labor_hours || 0) * (r.avg_hourly_rate || 0), 0),
            food:  locRows.reduce((s: number, r: any) => s + (r.food_cost_amount || 0), 0),
          }
        }
        const locArr = Object.values(byLoc).map(l => ({
          ...l,
          ebitda: l.net - l.labor - l.food,
          ebitdaMargin: l.net > 0 ? (l.net - l.labor - l.food) / l.net : 0,
        })).sort((a, b) => b.ebitdaMargin - a.ebitdaMargin)

        const worst = locArr[locArr.length - 1]
        if (worst.ebitdaMargin < 0.05 && worst.net > 0) {
          const msg = await explainInvestorAnomaly(
            'Lokalizacja z ujemną lub bliską zero marżą EBITDA',
            `${worst.name}: przychody ${worst.net.toFixed(0)} zł, EBITDA ${worst.ebitda.toFixed(0)} zł (${(worst.ebitdaMargin * 100).toFixed(1)}%) w ostatnich 28 dniach.`
          )
          const trendDays = await getTrendDays(admin, company.id, 'location_low_ebitda')
          alerts.push({
            company_id: company.id, director: 'investor', alert_type: 'location_low_ebitda',
            severity: worst.ebitdaMargin < 0 ? 'critical' : 'warning', trend_days: trendDays,
            title: `${worst.name}: EBITDA ${(worst.ebitdaMargin * 100).toFixed(1)}% — poniżej progu rentowności`,
            message: msg,
            data: { location_name: worst.name, ebitda: worst.ebitda, ebitda_margin: worst.ebitdaMargin, all_locations: locArr, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        }
      }

      if (alerts.length > 0) {
        await admin.from('cfo_alerts').upsert(alerts, { onConflict: 'company_id,alert_type,date' })
        results.push(`${company.name}: ${alerts.length} investor alerts`)
      }
    } catch (err: any) {
      console.error(`[investor-analysis] ${company.id}:`, err?.message)
      results.push(`${company.name}: ERROR — ${err?.message}`)
    }
  }

  return NextResponse.json({ ok: true, companies: companies.length, results })
}
