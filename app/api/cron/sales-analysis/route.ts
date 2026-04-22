import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

/**
 * GET /api/cron/sales-analysis
 * Vercel Cron: runs every day at 07:30 UTC (30 min after daily-analysis)
 * Also callable manually with ?secret=CRON_SECRET
 *
 * Sales Director monitors:
 * - Daily revenue vs same day last week (day-over-day comparison)
 * - Best and worst performing day of the week (rolling 4 weeks)
 * - Location performance ranking (if multi-location)
 * - Revenue growth/decline trend over 4 weeks
 * - Weekend vs weekday revenue split
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']

function today()          { return new Date().toLocaleDateString('sv-SE') }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE')
}

async function explainSalesAnomaly(type: string, context: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return context
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 130,
      messages: [
        {
          role: 'system',
          content: `Jesteś Zofią — Dyrektorem Sprzedaży AI dla restauracji. Piszesz po polsku, konkretnie i rzeczowo.
Format (2 zdania max):
Zdanie 1: co się dzieje z przychodami i jak to oceniasz.
Zdanie 2: jedno konkretne działanie właściciela, które może poprawić wynik TERAZ.`,
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
    .eq('director', 'sales')
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

      // Pull 28 days of sales data
      const { data: sales28 } = await admin
        .from('sales_daily')
        .select('date, net_revenue, gross_revenue, location_id')
        .in('location_id', locIds)
        .gte('date', daysAgo(28))
        .order('date', { ascending: false })

      if (!sales28?.length) continue

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

      // ── Aggregate total revenue per day ──────────────────────
      const revByDate: Record<string, number> = {}
      for (const row of sales28) {
        revByDate[row.date] = (revByDate[row.date] ?? 0) + (row.net_revenue || 0)
      }
      const sorted = Object.entries(revByDate).sort(([a],[b]) => a < b ? 1 : -1) // newest first
      const last7  = sorted.slice(0, 7)
      const prev7  = sorted.slice(7, 14)
      const last28 = sorted.slice(0, 28)

      const sum7  = last7.reduce((s,[,v])  => s + v, 0)
      const sum7p = prev7.reduce((s,[,v])  => s + v, 0)
      const sum28 = last28.reduce((s,[,v]) => s + v, 0)

      // ── Check 1: Week-over-week revenue change ───────────────
      if (sum7p > 0) {
        const changePct = (sum7 - sum7p) / sum7p
        if (changePct < -0.10) {
          // Decline > 10%
          const trendDays = await getTrendDays(admin, company.id, 'weekly_revenue_down')
          const sev: 'warning' | 'critical' = Math.abs(changePct) > 0.20 ? 'critical' : 'warning'
          const msg = await explainSalesAnomaly(
            'Spadek tygodniowych przychodów',
            `Tydzień bieżący: ${sum7.toFixed(0)} zł, poprzedni: ${sum7p.toFixed(0)} zł, zmiana: ${(changePct*100).toFixed(1)}%`
          )
          alerts.push({
            company_id: company.id, director: 'sales', alert_type: 'weekly_revenue_down',
            severity: sev, trend_days: trendDays,
            title: `Przychody –${Math.abs(changePct*100).toFixed(1)}% vs poprzedni tydzień`,
            message: msg,
            data: { this_week: sum7, last_week: sum7p, change_pct: changePct, drop_amount: sum7p - sum7, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        } else if (changePct > 0.10) {
          // Growth > 10% — positive alert
          const msg = await explainSalesAnomaly(
            'Wzrost tygodniowych przychodów',
            `Tydzień bieżący: ${sum7.toFixed(0)} zł, poprzedni: ${sum7p.toFixed(0)} zł, wzrost: +${(changePct*100).toFixed(1)}%`
          )
          alerts.push({
            company_id: company.id, director: 'sales', alert_type: 'weekly_revenue_up',
            severity: 'info', trend_days: 1,
            title: `Przychody +${(changePct*100).toFixed(1)}% vs poprzedni tydzień`,
            message: msg,
            data: { this_week: sum7, last_week: sum7p, change_pct: changePct, gain_amount: sum7 - sum7p },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 2: Best and worst days of the week ─────────────
      const byDow: Record<number, number[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] }
      for (const [dateStr, rev] of last28) {
        const dow = new Date(dateStr).getDay()
        byDow[dow].push(rev)
      }
      const avgByDow: Record<number, number> = {}
      for (const [dow, vals] of Object.entries(byDow)) {
        avgByDow[+dow] = vals.length ? vals.reduce((s,v) => s+v,0) / vals.length : 0
      }
      const validDows = Object.entries(avgByDow).filter(([,v]) => v > 0)
      if (validDows.length >= 5) {
        const best  = validDows.reduce((a,b) => a[1] > b[1] ? a : b)
        const worst = validDows.reduce((a,b) => a[1] < b[1] ? a : b)
        const bestDow   = DAYS_PL[+best[0]]
        const worstDow  = DAYS_PL[+worst[0]]
        const bestAvg   = best[1]
        const worstAvg  = worst[1]
        const gap       = bestAvg - worstAvg
        const gapPct    = bestAvg > 0 ? gap / bestAvg : 0

        if (gapPct > 0.40) {
          // Large gap between best and worst day — opportunity
          alerts.push({
            company_id: company.id, director: 'sales', alert_type: 'day_performance_gap',
            severity: 'info', trend_days: 1,
            title: `${bestDow} (${bestAvg.toFixed(0)} zł) vs ${worstDow} (${worstAvg.toFixed(0)} zł) — różnica ${(gapPct*100).toFixed(0)}%`,
            message: `${bestDow} to Twój najlepszy dzień (średnio ${bestAvg.toFixed(0)} zł), ${worstDow} najsłabszy (${worstAvg.toFixed(0)} zł). Rozważ promocje, eventowe menu lub zmniejszenie obsady na ${worstDow}.`,
            data: { best_day: bestDow, best_avg: bestAvg, worst_day: worstDow, worst_avg: worstAvg, gap_pct: gapPct, avg_by_dow: avgByDow },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 3: Location performance gap (multi-location) ───
      if ((locations?.length ?? 0) >= 2) {
        const revByLoc: Record<string, { name: string; rev: number }> = {}
        for (const loc of (locations ?? [])) {
          const locRevs = (sales28 ?? []).filter((r: any) => r.location_id === loc.id)
          revByLoc[loc.id] = { name: loc.name, rev: locRevs.reduce((s: number, r: any) => s + (r.net_revenue||0), 0) }
        }
        const locRanked = Object.values(revByLoc).sort((a,b) => b.rev - a.rev)
        if (locRanked.length >= 2 && locRanked[0].rev > 0) {
          const topRev  = locRanked[0].rev
          const botRev  = locRanked[locRanked.length-1].rev
          const botName = locRanked[locRanked.length-1].name
          const gapPct  = (topRev - botRev) / topRev

          if (gapPct > 0.35) {
            const trendDays = await getTrendDays(admin, company.id, 'location_underperforming')
            const msg = await explainSalesAnomaly(
              'Lokalizacja znacznie słabsza od lidera',
              `Lider: ${locRanked[0].name} ${topRev.toFixed(0)} zł (28d). Słabsza: ${botName} ${botRev.toFixed(0)} zł. Różnica: ${(gapPct*100).toFixed(0)}%.`
            )
            alerts.push({
              company_id: company.id, director: 'sales', alert_type: 'location_underperforming',
              severity: gapPct > 0.50 ? 'warning' : 'info', trend_days: trendDays,
              title: `${botName} o ${(gapPct*100).toFixed(0)}% słabsza od najlepszej lokalizacji`,
              message: msg,
              data: { top_location: locRanked[0].name, top_rev: topRev, bottom_location: botName, bottom_rev: botRev, gap_pct: gapPct, all_locations: locRanked, trend_days: trendDays },
              date: todayStr, resolved: false,
            })
          }
        }
      }

      // ── Check 4: Revenue declining 4-week trend ───────────────
      if (sorted.length >= 21) {
        const w1 = sorted.slice(0,7).reduce((s,[,v])  => s+v,0)
        const w2 = sorted.slice(7,14).reduce((s,[,v]) => s+v,0)
        const w3 = sorted.slice(14,21).reduce((s,[,v])=> s+v,0)
        if (w1 < w2 && w2 < w3 && w3 > 0) {
          // 3-week consecutive decline
          const total3wDrop = (w3 - w1) / w3
          const trendDays = await getTrendDays(admin, company.id, 'revenue_decline_trend')
          const msg = await explainSalesAnomaly(
            '3-tygodniowy trend spadkowy przychodów',
            `Tydzień 3 temu: ${w3.toFixed(0)} zł → 2 temu: ${w2.toFixed(0)} zł → bieżący: ${w1.toFixed(0)} zł. Spadek łączny: ${(total3wDrop*100).toFixed(1)}%.`
          )
          alerts.push({
            company_id: company.id, director: 'sales', alert_type: 'revenue_decline_trend',
            severity: 'critical', trend_days: trendDays,
            title: `3-tygodniowy trend spadkowy — łącznie –${(total3wDrop*100).toFixed(1)}%`,
            message: msg,
            data: { week1: w1, week2: w2, week3: w3, total_drop_pct: total3wDrop, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 5: Weekend vs weekday ratio ─────────────────────
      const weekendRevs = last28
        .filter(([d]) => { const dow = new Date(d).getDay(); return dow === 0 || dow === 6 })
        .reduce((s,[,v]) => s+v, 0)
      const weekdayRevs = last28
        .filter(([d]) => { const dow = new Date(d).getDay(); return dow > 0 && dow < 6 })
        .reduce((s,[,v]) => s+v, 0)
      const weekendDays = last28.filter(([d]) => { const dow = new Date(d).getDay(); return dow === 0 || dow === 6 }).length
      const weekdayDays = last28.filter(([d]) => { const dow = new Date(d).getDay(); return dow > 0 && dow < 6 }).length
      if (weekendDays > 0 && weekdayDays > 0) {
        const weekendAvg = weekendRevs / weekendDays
        const weekdayAvg = weekdayRevs / weekdayDays
        const wkdRatio   = weekendAvg / (weekdayAvg || 1)
        if (wkdRatio > 2.5) {
          alerts.push({
            company_id: company.id, director: 'sales', alert_type: 'weekend_dependent',
            severity: 'info', trend_days: 1,
            title: `Biznes silnie uzależniony od weekendu (${wkdRatio.toFixed(1)}× wyższe)`,
            message: `Weekend generuje ${wkdRatio.toFixed(1)}× więcej niż dzień powszedni. To szansa na zwiększenie przychodów w tygodniu przez menu lunchowe, katering lub delivery.`,
            data: { weekend_avg: weekendAvg, weekday_avg: weekdayAvg, ratio: wkdRatio },
            date: todayStr, resolved: false,
          })
        }
      }

      if (alerts.length > 0) {
        await admin.from('cfo_alerts').upsert(alerts, { onConflict: 'company_id,alert_type,date' })
        results.push(`${company.name}: ${alerts.length} sales alerts`)

        // Push critical alerts to owners/admins
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
                title: `Sprzedaż Alert — ${company.name}`,
                body: criticals[0].title,
                url: '/admin',
              }),
            }).catch(() => {})
          }
        }
      }
    } catch (err: any) {
      console.error(`[sales-analysis] ${company.id}:`, err?.message)
      results.push(`${company.name}: ERROR — ${err?.message}`)
    }
  }

  return NextResponse.json({ ok: true, companies: companies.length, results })
}
