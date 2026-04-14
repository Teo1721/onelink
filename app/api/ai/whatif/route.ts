import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Brak pytania' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles').select('company_id, full_name').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'Brak firmy' }, { status: 400 })

  const { data: locations } = await admin
    .from('locations').select('id, name').eq('company_id', profile.company_id)
  const locationIds = (locations ?? []).map((l: any) => l.id)

  // Load business context
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const daysAgoStr = sevenDaysAgo.toLocaleDateString('sv-SE')

  const [
    { data: recentSales },
    { data: employees },
    { data: dishes },
    { data: pendingInvoices },
  ] = await Promise.all([
    locationIds.length > 0
      ? admin.from('sales_daily')
          .select('date, location_id, gross_revenue, net_revenue, total_labor_hours, avg_hourly_rate, transaction_count')
          .in('location_id', locationIds)
          .gte('date', daysAgoStr)
          .order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
    locationIds.length > 0
      ? admin.from('employees')
          .select('full_name, position, base_rate, real_hour_cost, status')
          .in('location_id', locationIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    admin.from('dishes')
      .select('name, price, active')
      .eq('company_id', profile.company_id)
      .eq('active', true)
      .limit(20),
    locationIds.length > 0
      ? admin.from('invoices')
          .select('supplier_name, total_amount, invoice_type')
          .in('location_id', locationIds)
          .eq('status', 'submitted')
          .limit(10)
      : Promise.resolve({ data: [] }),
  ])

  const totalRevenue7d = (recentSales ?? []).reduce((s: number, r: any) => s + (r.gross_revenue || 0), 0)
  const avgDailyRevenue = recentSales && recentSales.length > 0 ? totalRevenue7d / recentSales.length : 0
  const avgLaborHours = recentSales && recentSales.length > 0
    ? (recentSales as any[]).reduce((s, r) => s + (r.total_labor_hours || 0), 0) / recentSales.length
    : 0
  const avgRate = recentSales && recentSales.length > 0
    ? (recentSales as any[]).reduce((s, r) => s + (r.avg_hourly_rate || 0), 0) / recentSales.length
    : 0
  const employeeCount = (employees ?? []).length
  const monthlyLaborCost = avgLaborHours * avgRate * 22

  const context = `
Dane firmy (ostatnie 7 dni):
- Lokalizacje: ${(locations ?? []).map((l: any) => l.name).join(', ')}
- Średni dzienny przychód brutto: ${avgDailyRevenue.toFixed(0)} zł
- Przychód brutto (7 dni): ${totalRevenue7d.toFixed(0)} zł
- Liczba transakcji dziennie (avg): ${recentSales && recentSales.length > 0 ? ((recentSales as any[]).reduce((s, r) => s + (r.transaction_count || 0), 0) / recentSales.length).toFixed(0) : 'brak'}
- Aktywnych pracowników: ${employeeCount}
- Średnie godziny pracy dziennie: ${avgLaborHours.toFixed(1)} h
- Średnia stawka godzinowa: ${avgRate.toFixed(0)} zł/h
- Szacowany miesięczny koszt pracy: ${monthlyLaborCost.toFixed(0)} zł
- Aktywne dania w menu: ${(dishes ?? []).map((d: any) => `${d.name} (${d.price} zł)`).join(', ')}
- Oczekujące faktury: ${(pendingInvoices ?? []).length} (wartość: ${(pendingInvoices ?? []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0).toFixed(0)} zł)
`.trim()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Jesteś analitykiem biznesowym dla restauracji/gastronomii. Odpowiadasz na pytania "co jeśli" bazując na rzeczywistych danych firmy.
Bądź konkretny: podawaj szacunkowe liczby (zł, %), porównuj scenariusze, wskazuj ryzyka i szanse.
Odpowiadaj po polsku, zwięźle (3-5 zdań lub krótka lista). Format: najpierw bezpośrednia odpowiedź, potem 2-3 kluczowe liczby/wnioski.`,
      },
      {
        role: 'user',
        content: `${context}\n\nPytanie: ${question}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.7,
  })

  const answer = completion.choices[0]?.message?.content ?? 'Brak odpowiedzi.'
  return NextResponse.json({ answer })
}
