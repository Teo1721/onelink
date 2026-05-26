/**
 * POST /api/ai/pl-chat
 * Body: { message: string, companyId: string, history?: {role,content}[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
export const runtime = 'nodejs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

export async function POST(req: NextRequest) {
  try {
    const { message, companyId, history = [] } = await req.json()
    if (!message || !companyId) return NextResponse.json({ error: 'Missing message or companyId' }, { status: 400 })

    const supabase = createAdminClient()

    // ── Fetch context data ────────────────────────────────────────

    const [locationsRes, salesRes, invoicesRes, stockAlertsRes, pendingKsefRes] = await Promise.all([
      supabase.from('locations').select('id, name').eq('company_id', companyId).eq('active', true),
      supabase.from('sales_daily').select('date, net_revenue, location_id')
        .in('location_id',
          (await supabase.from('locations').select('id').eq('company_id', companyId).eq('active', true))
            .data?.map(l => l.id) ?? []
        )
        .gte('date', daysAgo(30))
        .order('date', { ascending: false }),
      supabase.from('invoices').select('supplier_name, invoice_type, total_gross, status, service_date, location_id')
        .eq('company_id', companyId)
        .gte('service_date', daysAgo(30))
        .order('service_date', { ascending: false }),
      supabase.from('cfo_alerts').select('title, description, severity, created_at')
        .eq('company_id', companyId).eq('resolved', false)
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('ksef_invoices').select('id').eq('company_id', companyId).eq('status', 'pending_review'),
    ])

    const locations   = locationsRes.data  ?? []
    const sales       = salesRes.data       ?? []
    const invoices    = invoicesRes.data    ?? []
    const activeAlerts = stockAlertsRes.data ?? []
    const pendingKsefCount = pendingKsefRes.data?.length ?? 0

    const locationMap: Record<string, string> = {}
    for (const l of locations) locationMap[l.id] = l.name

    // ── Build context summary ─────────────────────────────────────
    const totalRevenue30d = sales.reduce((s, r) => s + (r.net_revenue ?? 0), 0)
    const cosInvoices     = invoices.filter(i => i.invoice_type === 'COS' && i.status === 'approved')
    const totalCos30d     = cosInvoices.reduce((s, i) => s + (i.total_gross ?? 0), 0)
    const foodCost30d     = totalRevenue30d > 0 ? totalCos30d / totalRevenue30d : 0
    const pendingInvoices = invoices.filter(i => i.status === 'submitted')
    const pendingTotal    = pendingInvoices.reduce((s, i) => s + (i.total_gross ?? 0), 0)

    // Revenue by location (last 30d)
    const revByLocation: Record<string, number> = {}
    for (const s of sales) revByLocation[locationMap[s.location_id] ?? s.location_id] = (revByLocation[locationMap[s.location_id] ?? s.location_id] ?? 0) + (s.net_revenue ?? 0)

    // Last 7 days daily revenue trend
    const last7 = sales.filter(s => s.date >= daysAgo(7))
    const revByDay: Record<string, number> = {}
    for (const s of last7) revByDay[s.date] = (revByDay[s.date] ?? 0) + (s.net_revenue ?? 0)

    // Top suppliers by cost
    const costBySupplier: Record<string, number> = {}
    for (const i of cosInvoices) costBySupplier[i.supplier_name] = (costBySupplier[i.supplier_name] ?? 0) + (i.total_gross ?? 0)
    const topSuppliers = Object.entries(costBySupplier).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const contextBlock = `
=== DANE FINANSOWE (ostatnie 30 dni) ===
Lokale: ${locations.map(l => l.name).join(', ')}

Przychód netto łącznie: ${totalRevenue30d.toFixed(2)} zł
Food cost (COS / przychód): ${(foodCost30d * 100).toFixed(1)}%
Koszty COS łącznie: ${totalCos30d.toFixed(2)} zł

Przychód wg lokalu:
${Object.entries(revByLocation).map(([l, v]) => `  ${l}: ${v.toFixed(2)} zł`).join('\n')}

Trend dzienny (ostatnie 7 dni):
${Object.entries(revByDay).sort().map(([d, v]) => `  ${d}: ${v.toFixed(2)} zł`).join('\n')}

Top 5 dostawców (COS) wg kosztów:
${topSuppliers.map(([s, v]) => `  ${s}: ${v.toFixed(2)} zł`).join('\n')}

Faktury oczekujące na zatwierdzenie: ${pendingInvoices.length} szt. (${pendingTotal.toFixed(2)} zł łącznie)
Faktury KSeF do przeglądu: ${pendingKsefCount} szt.

Aktywne alerty:
${activeAlerts.length === 0 ? '  Brak aktywnych alertów' : activeAlerts.map(a => `  [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n')}
`

    // ── Build messages ────────────────────────────────────────────
    const systemPrompt = `Jesteś asystentem finansowym OneLink — analizujesz dane P&L polskich małych firm (restauracje, piekarnie, kawiarnie, itp.).

Masz dostęp do aktualnych danych finansowych firmy. Odpowiadaj po polsku, konkretnie i zwięźle.
Podawaj liczby z dokładnością do 2 miejsc po przecinku. Używaj terminów: przychód, food cost, zysk brutto, faktury, dostawcy.
Gdy widzisz problem (wysoki food cost, spadek przychodu, dużo oczekujących faktur) — sygnalizuj to i sugeruj działanie.

${contextBlock}`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...(history as { role: 'user' | 'assistant'; content: string }[]).map(h => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 600,
      temperature: 0.3,
    })

    const reply = res.choices[0]?.message?.content?.trim() ?? 'Brak odpowiedzi.'
    return NextResponse.json({ ok: true, reply })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
