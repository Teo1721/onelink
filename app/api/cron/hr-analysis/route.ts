import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

/**
 * GET /api/cron/hr-analysis
 * Vercel Cron: runs every day at 08:00 UTC
 * Also callable manually with ?secret=CRON_SECRET
 *
 * Marta (HR Director) monitors:
 * - Certifications expiring in next 30 days
 * - Pending leave requests piling up (>5 unreviewed)
 * - Uncovered / understaffed scheduled shifts
 * - High absenteeism (clock-ins vs scheduled shifts)
 * - Labor cost spike vs prior week (from sales_daily)
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function today()            { return new Date().toLocaleDateString('sv-SE') }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE')
}
function daysAhead(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

async function explainHRAnomaly(type: string, context: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return context
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 130,
      messages: [
        {
          role: 'system',
          content: `Jesteś Martą — Dyrektorem HR AI dla restauracji. Piszesz po polsku, konkretnie i rzeczowo.
Format (2 zdania max):
Zdanie 1: co się dzieje z zespołem i jak to oceniasz.
Zdanie 2: jedno konkretne działanie właściciela, które należy podjąć TERAZ.`,
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
    .eq('director', 'hr')
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

      // Fetch all employees for this company's locations
      const { data: employees } = await admin
        .from('employees')
        .select('id, full_name, location_id, status')
        .in('location_id', locIds)
        .eq('status', 'active')

      const empIds = (employees ?? []).map((e: any) => e.id)

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

      // ── Check 1: Certifications expiring soon ────────────────
      if (empIds.length > 0) {
        const { data: certs } = await admin
          .from('employee_certifications')
          .select('employee_id, cert_name, expiry_date, employees(full_name)')
          .in('employee_id', empIds)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', daysAhead(30))
          .order('expiry_date', { ascending: true })

        if (certs && certs.length > 0) {
          const critical30 = certs.filter((c: any) => {
            const diff = Math.round((new Date(c.expiry_date).getTime() - new Date().getTime()) / 86400000)
            return diff <= 7
          })
          const sev: 'info' | 'warning' | 'critical' = critical30.length > 0 ? 'critical' : 'warning'
          const certList = certs.slice(0, 5).map((c: any) =>
            `${(c.employees as any)?.full_name ?? 'Pracownik'} — ${c.cert_name} (${c.expiry_date})`
          )
          const msg = await explainHRAnomaly(
            'Certyfikaty wygasające w ciągu 30 dni',
            `${certs.length} certyfikat(ów) do odnowienia. ${critical30.length > 0 ? `Z czego ${critical30.length} wygasa w ciągu 7 dni!` : ''}`
          )
          const trendDays = await getTrendDays(admin, company.id, 'cert_expiry_warning')
          alerts.push({
            company_id: company.id, director: 'hr', alert_type: 'cert_expiry_warning',
            severity: sev, trend_days: trendDays,
            title: `${certs.length} certyfikat(ów) wygasa w ciągu 30 dni`,
            message: msg,
            data: { count: certs.length, critical: critical30.length, cert_list: certList, trend_days: trendDays },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 2: Pending leave requests piling up ────────────
      const { data: pendingLeaves } = await admin
        .from('leave_requests')
        .select('id, employee_id, start_date, end_date, leave_type, employees(full_name)')
        .in('employee_id', empIds.length > 0 ? empIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('status', 'pending')

      if ((pendingLeaves?.length ?? 0) >= 3) {
        const count = pendingLeaves!.length
        const sev: 'info' | 'warning' | 'critical' = count >= 8 ? 'critical' : count >= 5 ? 'warning' : 'info'
        const msg = await explainHRAnomaly(
          'Zaległe wnioski urlopowe',
          `${count} nierozpatrzonych wniosków urlopowych czeka na decyzję managera.`
        )
        const trendDays = await getTrendDays(admin, company.id, 'pending_leave_backlog')
        alerts.push({
          company_id: company.id, director: 'hr', alert_type: 'pending_leave_backlog',
          severity: sev, trend_days: trendDays,
          title: `${count} wniosków urlopowych czeka na rozpatrzenie`,
          message: msg,
          data: { count, trend_days: trendDays },
          date: todayStr, resolved: false,
        })
      }

      // ── Check 3: Low attendance ratio (shifts vs clock-ins) ──
      if (locIds.length > 0) {
        const weekAgo = daysAgo(7)
        const { data: shifts7d } = await admin
          .from('shifts')
          .select('id')
          .in('location_id', locIds)
          .gte('date', weekAgo)
          .lte('date', todayStr)

        const { data: clockIns7d } = await admin
          .from('shift_clock_ins')
          .select('id')
          .in('location_id', locIds)
          .gte('work_date', weekAgo)
          .not('clock_in_at', 'is', null)

        const totalShifts   = shifts7d?.length ?? 0
        const totalClockIns = clockIns7d?.length ?? 0

        if (totalShifts >= 10) {
          const attendanceRate = totalClockIns / totalShifts
          if (attendanceRate < 0.80) {
            const sev: 'warning' | 'critical' = attendanceRate < 0.65 ? 'critical' : 'warning'
            const msg = await explainHRAnomaly(
              'Niska frekwencja na zmianach',
              `Ostatnie 7 dni: ${totalShifts} zaplanowanych zmian, ${totalClockIns} rejestracji wejść. Frekwencja: ${(attendanceRate * 100).toFixed(0)}%.`
            )
            const trendDays = await getTrendDays(admin, company.id, 'low_attendance')
            alerts.push({
              company_id: company.id, director: 'hr', alert_type: 'low_attendance',
              severity: sev, trend_days: trendDays,
              title: `Frekwencja ${(attendanceRate * 100).toFixed(0)}% — ${totalShifts - totalClockIns} nieobecności w tygodniu`,
              message: msg,
              data: { shifts: totalShifts, clock_ins: totalClockIns, attendance_rate: attendanceRate, trend_days: trendDays },
              date: todayStr, resolved: false,
            })
          }
        }
      }

      // ── Check 4: Labor cost spike vs prior week ───────────────
      const { data: sales14 } = await admin
        .from('sales_daily')
        .select('date, net_revenue, total_labor_hours, avg_hourly_rate')
        .in('location_id', locIds)
        .gte('date', daysAgo(14))
        .order('date', { ascending: false })

      if ((sales14?.length ?? 0) >= 6) {
        const thisWeek = (sales14 ?? []).filter((r: any) => r.date >= daysAgo(7))
        const lastWeek = (sales14 ?? []).filter((r: any) => r.date < daysAgo(7))

        const laborCostThis = thisWeek.reduce((s: number, r: any) =>
          s + (r.total_labor_hours || 0) * (r.avg_hourly_rate || 0), 0)
        const revThis = thisWeek.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
        const laborCostLast = lastWeek.reduce((s: number, r: any) =>
          s + (r.total_labor_hours || 0) * (r.avg_hourly_rate || 0), 0)
        const revLast = lastWeek.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)

        const laborPctThis = revThis > 0 ? laborCostThis / revThis : 0
        const laborPctLast = revLast > 0 ? laborCostLast / revLast : 0

        if (laborPctThis > 0.35 && laborPctThis > laborPctLast * 1.05) {
          const sev: 'warning' | 'critical' = laborPctThis > 0.45 ? 'critical' : 'warning'
          const msg = await explainHRAnomaly(
            'Wzrost kosztów pracy powyżej normy',
            `Koszt pracy: ${(laborPctThis * 100).toFixed(1)}% przychodów (poprzedni tydzień: ${(laborPctLast * 100).toFixed(1)}%). Benchmark: <35%.`
          )
          const trendDays = await getTrendDays(admin, company.id, 'labor_cost_spike')
          alerts.push({
            company_id: company.id, director: 'hr', alert_type: 'labor_cost_spike',
            severity: sev, trend_days: trendDays,
            title: `Koszt pracy ${(laborPctThis * 100).toFixed(1)}% przychodów — powyżej normy 35%`,
            message: msg,
            data: {
              labor_pct_this: laborPctThis, labor_pct_last: laborPctLast,
              labor_cost_this: laborCostThis, revenue_this: revThis, trend_days: trendDays,
            },
            date: todayStr, resolved: false,
          })
        }
      }

      // ── Check 5: Team size vs revenue (understaffed signal) ──
      const totalEmp = (employees ?? []).length
      if (totalEmp > 0 && (sales14?.length ?? 0) >= 4) {
        const recentSales = (sales14 ?? []).slice(0, 7)
        const avgDailyRev = recentSales.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0) / (recentSales.length || 1)
        const revPerEmp   = avgDailyRev / totalEmp

        if (revPerEmp > 2500) {
          // Very high revenue per employee — possibly understaffed
          const msg = await explainHRAnomaly(
            'Wysoki przychód na pracownika — możliwe niedokadrowanie',
            `Średni dzienny przychód: ${avgDailyRev.toFixed(0)} zł przy ${totalEmp} pracownikach (${revPerEmp.toFixed(0)} zł/osoba). Benchmark gastronomiczny: <2000 zł/os./dzień.`
          )
          alerts.push({
            company_id: company.id, director: 'hr', alert_type: 'potential_understaffing',
            severity: 'info', trend_days: 1,
            title: `${revPerEmp.toFixed(0)} zł/pracownik/dzień — możliwe niedokadrowanie`,
            message: msg,
            data: { avg_daily_revenue: avgDailyRev, employee_count: totalEmp, revenue_per_emp: revPerEmp },
            date: todayStr, resolved: false,
          })
        }
      }

      if (alerts.length > 0) {
        await admin.from('cfo_alerts').upsert(alerts, { onConflict: 'company_id,alert_type,date' })
        results.push(`${company.name}: ${alerts.length} HR alerts`)
      }
    } catch (err: any) {
      console.error(`[hr-analysis] ${company.id}:`, err?.message)
      results.push(`${company.name}: ERROR — ${err?.message}`)
    }
  }

  return NextResponse.json({ ok: true, companies: companies.length, results })
}
