/**
 * GET /api/cron/daily-summary?secret=
 * Vercel Cron: runs daily at 08:00 UTC
 *
 * Sends a P&L summary email to every company owner with yesterday's numbers:
 * revenue, costs, gross profit, food cost %, and 7-day trend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CRON_SECRET  = process.env.CRON_SECRET  || ''
const RESEND_FROM  = process.env.RESEND_FROM_EMAIL ?? 'OneLink <noreply@onelink.pl>'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return runDailySummary()
}

export async function POST() {
  return runDailySummary()
}

function fmt(n: number) { return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function pct(n: number)  { return (n * 100).toFixed(1) + '%' }
function arrow(v: number, prev: number) { return v > prev ? '↑' : v < prev ? '↓' : '→' }

async function runDailySummary() {
  const supabase = createAdminClient()

  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
  const sevenDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 8); return d.toISOString().slice(0, 10) })()

  const { data: companies } = await supabase.from('companies').select('id, name')
  if (!companies?.length) return NextResponse.json({ ok: true, message: 'No companies' })

  const sent: string[] = []

  for (const company of companies) {
    // Get locations for this company
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name')
      .eq('company_id', company.id)
      .eq('active', true)

    if (!locations?.length) continue

    const locationIds = locations.map(l => l.id)

    // Yesterday's revenue
    const { data: salesYday } = await supabase
      .from('sales_daily')
      .select('net_revenue, location_id')
      .in('location_id', locationIds)
      .eq('date', yesterday)

    const revenueYday = (salesYday ?? []).reduce((s, r) => s + (r.net_revenue ?? 0), 0)
    if (revenueYday === 0) continue // no data — skip

    // Previous day revenue for trend
    const prevDay = (() => { const d = new Date(yesterday); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
    const { data: salesPrev } = await supabase
      .from('sales_daily')
      .select('net_revenue')
      .in('location_id', locationIds)
      .eq('date', prevDay)
    const revenuePrev = (salesPrev ?? []).reduce((s, r) => s + (r.net_revenue ?? 0), 0)

    // Yesterday's approved invoice costs
    const { data: invoicesYday } = await supabase
      .from('invoices')
      .select('total_gross, invoice_type')
      .in('location_id', locationIds)
      .eq('status', 'approved')
      .eq('service_date', yesterday)

    const costsYday  = (invoicesYday ?? []).reduce((s, i) => s + (i.total_gross ?? 0), 0)
    const cosCosts   = (invoicesYday ?? []).filter(i => i.invoice_type === 'COS').reduce((s, i) => s + (i.total_gross ?? 0), 0)
    const grossProfit = revenueYday - costsYday
    const foodCostPct = revenueYday > 0 ? cosCosts / revenueYday : 0

    // 7-day totals for context
    const { data: sales7d } = await supabase
      .from('sales_daily')
      .select('net_revenue')
      .in('location_id', locationIds)
      .gte('date', sevenDaysAgo)
      .lte('date', yesterday)
    const revenue7d = (sales7d ?? []).reduce((s, r) => s + (r.net_revenue ?? 0), 0)

    // Pending invoices
    const { data: pendingInv } = await supabase
      .from('invoices')
      .select('id')
      .in('location_id', locationIds)
      .eq('status', 'submitted')
    const pendingCount = pendingInv?.length ?? 0

    // Owner email
    const { data: owner } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('company_id', company.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (!owner?.email || !process.env.RESEND_API_KEY) continue

    const profitColor  = grossProfit >= 0 ? '#16A34A' : '#DC2626'
    const foodCostColor = foodCostPct <= 0.35 ? '#16A34A' : foodCostPct <= 0.42 ? '#D97706' : '#DC2626'
    const trendArrow   = revenuePrev > 0 ? arrow(revenueYday, revenuePrev) : ''

    const locationsHtml = locations.length > 1
      ? locations.map(l => {
          const rev = (salesYday ?? []).filter(s => s.location_id === l.id).reduce((s, r) => s + (r.net_revenue ?? 0), 0)
          return `<tr><td style="padding:4px 8px;color:#6B7280">${l.name}</td><td style="padding:4px 8px;text-align:right;font-weight:600">${fmt(rev)} zł</td></tr>`
        }).join('')
      : ''

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <div style="background:#1D4ED8;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#fff;font-size:18px">📊 Dzienny raport P&L</h1>
          <p style="margin:4px 0 0;color:#BFDBFE;font-size:13px">${company.name} · ${yesterday}</p>
        </div>

        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;padding:20px 24px">
          <p style="margin:0 0 16px;color:#6B7280;font-size:13px">Cześć <strong style="color:#111827">${owner.full_name ?? owner.email}</strong>, oto wczorajsze wyniki:</p>

          <!-- Main metrics -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr style="background:#fff;border-radius:8px">
              <td style="padding:12px;border:1px solid #E5E7EB;border-radius:8px 0 0 8px">
                <p style="margin:0;font-size:11px;color:#9CA3AF;text-transform:uppercase">Przychód netto ${trendArrow}</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827">${fmt(revenueYday)} zł</p>
              </td>
              <td style="padding:12px;border:1px solid #E5E7EB;border-left:none">
                <p style="margin:0;font-size:11px;color:#9CA3AF;text-transform:uppercase">Zysk brutto</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${profitColor}">${fmt(grossProfit)} zł</p>
              </td>
              <td style="padding:12px;border:1px solid #E5E7EB;border-left:none;border-radius:0 8px 8px 0">
                <p style="margin:0;font-size:11px;color:#9CA3AF;text-transform:uppercase">Food cost</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${foodCostColor}">${pct(foodCostPct)}</p>
              </td>
            </tr>
          </table>

          <!-- Secondary -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:${locations.length > 1 ? '16px' : '0'}">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#6B7280">Koszty ogółem</td>
              <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:600">${fmt(costsYday)} zł</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#6B7280">Przychód 7 dni</td>
              <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:600">${fmt(revenue7d)} zł</td>
            </tr>
            ${pendingCount > 0 ? `<tr>
              <td style="padding:8px 0;font-size:13px;color:#D97706">⏳ Faktury oczekujące</td>
              <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:600;color:#D97706">${pendingCount} szt.</td>
            </tr>` : ''}
          </table>

          <!-- Per-location breakdown -->
          ${locations.length > 1 ? `
          <p style="margin:0 0 8px;font-size:11px;color:#9CA3AF;text-transform:uppercase;font-weight:600">Lokale</p>
          <table style="width:100%;border-collapse:collapse">${locationsHtml}</table>` : ''}
        </div>

        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:16px 24px;border-radius:0 0 12px 12px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.onelink.pl'}/ops"
             style="display:inline-block;padding:10px 24px;background:#1D4ED8;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
            Otwórz panel →
          </a>
          <p style="margin:12px 0 0;font-size:11px;color:#9CA3AF">OneLink · Dzienny raport P&L</p>
        </div>
      </div>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [owner.email],
        subject: `📊 ${yesterday} · ${fmt(revenueYday)} zł przychodu · food cost ${pct(foodCostPct)} — ${company.name}`,
        html,
      }),
    }).catch(() => {})

    sent.push(`${company.name} → ${owner.email}`)
  }

  return NextResponse.json({ ok: true, sent })
}
