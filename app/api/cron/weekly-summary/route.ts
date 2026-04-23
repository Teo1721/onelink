import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

/**
 * GET /api/cron/weekly-summary
 *
 * Vercel Cron: runs every Monday at 08:00 UTC
 * Also callable manually with ?secret=CRON_SECRET
 *
 * For each company:
 *   1. Pulls last 7 days of operational data
 *   2. Generates GPT-4o weekly business summary
 *   3. Stores in cfo_weekly_summaries table
 *   4. Sends email to all owner/admin users via Resend
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE')
}

function today() { return new Date().toLocaleDateString('sv-SE') }

async function generateWeeklySummary(data: {
  companyName: string
  revenue7d: number
  revenue14d: number
  foodCostPct: number | null
  laborCostPct: number | null
  pendingInvoices: number
  pendingLeaves: number
  activeAlerts: string[]
  topCOSSuppliers: string[]
}) {
  const prompt = `
Firma: ${data.companyName}
Okres: ostatnie 7 dni

Wyniki:
- Przychód netto: ${data.revenue7d.toFixed(0)} zł (${data.revenue14d > 0 ? (((data.revenue7d - data.revenue14d) / data.revenue14d) * 100).toFixed(1) + '% vs poprzedni tydzień' : 'brak porównania'})
- Food cost: ${data.foodCostPct !== null ? (data.foodCostPct * 100).toFixed(1) + '%' : 'brak danych'}
- Koszt pracy: ${data.laborCostPct !== null ? (data.laborCostPct * 100).toFixed(1) + '% przychodów' : 'brak danych'}
- Faktury oczekujące na zatwierdzenie: ${data.pendingInvoices}
- Wnioski urlopowe do rozpatrzenia: ${data.pendingLeaves}
- Aktywne alerty CFO: ${data.activeAlerts.length > 0 ? data.activeAlerts.join('; ') : 'brak'}
- Główni dostawcy COS: ${data.topCOSSuppliers.join(', ') || 'brak'}
`.trim()

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: `Jesteś Markiem — CFO AI dla właścicieli restauracji. Piszesz tygodniowy briefing po polsku.
Format:
1. Jeden akapit (2-3 zdania) — podsumowanie tygodnia konkretnymi liczbami
2. 2-3 kluczowe obserwacje (jako lista z bulletami •)
3. 2 konkretne zalecenia na bieżący tydzień

Bądź konkretny, używaj liczb, pisz jak doświadczony dyrektor finansowy — nie jak bot. Nie używaj nagłówków.`,
      },
      { role: 'user', content: prompt },
    ],
  })

  return res.choices[0]?.message?.content ?? 'Brak danych do wygenerowania podsumowania.'
}

function buildWeeklyEmail(companyName: string, summary: string, dashboardUrl: string): string {
  const lines = summary.split('\n').filter(Boolean)
  const formattedSummary = lines.map(line => {
    if (line.startsWith('•')) return `<li style="margin-bottom:6px;color:#374151;">${line.slice(1).trim()}</li>`
    return `<p style="margin:0 0 12px;color:#374151;line-height:1.6;">${line}</p>`
  }).join('\n')

  const hasListItems = lines.some(l => l.startsWith('•'))

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0D1628 0%,#1E3A8A 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#3B82F6,#06B6D4);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:900;font-size:12px;">CFO</span>
        </div>
        <span style="color:white;font-weight:700;font-size:16px;">OneLink · Dyrektor Finansowy AI</span>
      </div>
      <h1 style="margin:0;color:white;font-size:22px;font-weight:900;line-height:1.2;">
        Tygodniowy briefing finansowy
      </h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">
        ${companyName} · ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>

    <!-- Summary -->
    <div style="background:white;border-radius:12px;border:1px solid #E5E7EB;padding:24px 28px;margin-bottom:16px;">
      ${hasListItems
    ? formattedSummary.replace(/<li/g, '<li style="margin-bottom:6px;color:#374151;"').replace(lines.filter(l => l.startsWith('•')).map(l => `<li style="margin-bottom:6px;color:#374151;">${l.slice(1).trim()}</li>`).join(''), `<ul style="margin:12px 0;padding-left:20px;">${lines.filter(l => l.startsWith('•')).map(l => `<li style="margin-bottom:6px;color:#374151;">${l.slice(1).trim()}</li>`).join('')}</ul>`)
    : formattedSummary}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#1D4ED8,#06B6D4);color:white;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
        Otwórz pełny dashboard →
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#9CA3AF;font-size:11px;margin:0;">
      OneLink — System zarządzania restauracją<br>
      <a href="${dashboardUrl}/admin" style="color:#9CA3AF;">Wyloguj z powiadomień</a>
    </p>
  </div>
</body>
</html>`.trim()
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const isVercel = req.headers.get('x-vercel-cron') === '1'
  if (!isVercel && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 503 })
  }

  const admin = createAdminClient()
  const todayStr = today()
  const results: string[] = []
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://onelink.pl'

  const { data: companies } = await admin.from('companies').select('id, name')
  if (!companies?.length) return NextResponse.json({ ok: true, companies: 0 })

  for (const company of companies) {
    try {
      const { data: locations } = await admin.from('locations').select('id').eq('company_id', company.id)
      const locIds = locations?.map((l: any) => l.id) ?? []
      if (!locIds.length) continue

      // Fetch all data in parallel
      const [
        { data: sales7 },
        { data: sales14 },
        { data: invoicesApproved },
        { data: pendingInvoices },
        { data: pendingLeaves },
        { data: activeAlerts },
      ] = await Promise.all([
        admin.from('sales_daily').select('net_revenue, total_labor_hours, avg_hourly_rate').in('location_id', locIds).gte('date', daysAgo(7)),
        admin.from('sales_daily').select('net_revenue').in('location_id', locIds).gte('date', daysAgo(14)).lt('date', daysAgo(7)),
        admin.from('invoices').select('invoice_type, total_amount, supplier_name').in('location_id', locIds).eq('status', 'approved').gte('service_date', daysAgo(7)),
        admin.from('invoices').select('id').in('location_id', locIds).eq('status', 'submitted'),
        admin.from('leave_requests').select('id').in('location_id', locIds).eq('status', 'pending'),
        admin.from('cfo_alerts').select('title').eq('company_id', company.id).eq('resolved', false).gte('date', daysAgo(7)),
      ])

      const revenue7d = (sales7 ?? []).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
      const revenue14d = (sales14 ?? []).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
      const laborCost7d = (sales7 ?? []).reduce((s: number, r: any) => s + ((r.total_labor_hours || 0) * (r.avg_hourly_rate || 0)), 0)
      const cos7d = (invoicesApproved ?? []).filter((i: any) => i.invoice_type === 'COS').reduce((s: number, i: any) => s + (i.total_amount || 0), 0)

      const topCOSSuppliers = Object.entries(
        (invoicesApproved ?? []).filter((i: any) => i.invoice_type === 'COS').reduce((acc: Record<string, number>, i: any) => {
          acc[i.supplier_name] = (acc[i.supplier_name] || 0) + i.total_amount
          return acc
        }, {})
      ).sort(([,a],[,b]) => b - a).slice(0, 3).map(([name]) => name)

      const summaryText = await generateWeeklySummary({
        companyName: company.name,
        revenue7d,
        revenue14d,
        foodCostPct: revenue7d > 0 && cos7d > 0 ? cos7d / revenue7d : null,
        laborCostPct: revenue7d > 0 && laborCost7d > 0 ? laborCost7d / revenue7d : null,
        pendingInvoices: pendingInvoices?.length ?? 0,
        pendingLeaves: pendingLeaves?.length ?? 0,
        activeAlerts: (activeAlerts ?? []).map((a: any) => a.title),
        topCOSSuppliers,
      })

      // Store summary
      await admin.from('cfo_weekly_summaries').upsert({
        company_id: company.id,
        week_start: daysAgo(7),
        week_end: todayStr,
        summary: summaryText,
        revenue_7d: revenue7d,
        food_cost_pct: revenue7d > 0 && cos7d > 0 ? cos7d / revenue7d : null,
        labor_cost_pct: revenue7d > 0 && laborCost7d > 0 ? laborCost7d / revenue7d : null,
        alerts_count: activeAlerts?.length ?? 0,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,week_start' })

      // Send email to all owner/admin users
      if (process.env.RESEND_API_KEY) {
        const { data: admins } = await admin
          .from('user_profiles')
          .select('id, full_name')
          .eq('company_id', company.id)
          .in('role', ['owner', 'admin'])

        for (const adminUser of (admins ?? [])) {
          const { data: authUser } = await admin.auth.admin.getUserById(adminUser.id)
          const email = authUser?.user?.email
          if (!email) continue

          const html = buildWeeklyEmail(
            company.name,
            summaryText,
            siteUrl
          )

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL ?? 'OneLink <noreply@onelink.pl>',
              to: [email],
              subject: `Tygodniowy briefing CFO · ${company.name}`,
              html,
            }),
          })
        }
      }

      results.push(`${company.name}: summary generated, email sent`)
    } catch (err: any) {
      console.error(`[weekly-summary] Error for ${company.id}:`, err?.message)
      results.push(`${company.name}: ERROR — ${err?.message}`)
    }
  }

  return NextResponse.json({ ok: true, companies: companies.length, results })
}
