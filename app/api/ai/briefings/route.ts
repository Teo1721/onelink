import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('sv-SE')
}

function getToday() {
  return new Date().toLocaleDateString('sv-SE')
}

type BriefingResult = {
  dzieje: string
  dlaczego: string
  wplyw: string
  zrob: string
  status: 'ok' | 'warning' | 'critical'
  metric: { label: string; value: string; delta: string }
}

async function generateProfitBriefing(admin: ReturnType<typeof createAdminClient>, locationIds: string[]): Promise<BriefingResult> {
  const yesterday = getYesterday()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [{ data: sales }, { data: pendingInvoices }, { data: salesTrend }] = await Promise.all([
    admin.from('sales_daily').select('net_revenue, gross_revenue, total_labor_hours, avg_hourly_rate, status').in('location_id', locationIds).eq('date', yesterday),
    admin.from('invoices').select('supplier_name, total_amount, invoice_type').in('location_id', locationIds).eq('status', 'submitted').limit(5),
    admin.from('sales_daily').select('date, net_revenue').in('location_id', locationIds).gte('date', sevenDaysAgo.toLocaleDateString('sv-SE')).order('date', { ascending: true }),
  ])

  const totalRevenue = sales?.reduce((s, r: any) => s + (r.net_revenue || 0), 0) ?? 0
  const pendingCount = pendingInvoices?.length ?? 0

  const context = `
Wczoraj (${yesterday}):
- Sprzedaż netto łącznie: ${totalRevenue.toFixed(0)} zł (${sales?.length || 0} lokalizacji)
- Raporty zatwierdzone: ${sales?.filter((s: any) => s.status === 'submitted').length || 0}
- Faktury oczekujące na zatwierdzenie: ${pendingCount}
${pendingInvoices?.slice(0, 3).map((inv: any) => `  • ${inv.supplier_name}: ${inv.total_amount} zł (${inv.invoice_type})`).join('\n') || ''}
Trend 7 dni: ${salesTrend?.map((s: any) => `${s.date}: ${s.net_revenue} zł`).join(', ') || 'brak'}
`.trim()

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 250,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś Markiem — analitykiem finansowym restauracji. Odpowiadasz po polsku, krótko i konkretnie.
Odpowiedz JSON z dokładnie tymi polami:
{
  "dzieje": "1 zdanie — co się faktycznie dzieje z liczbami",
  "dlaczego": "1 zdanie — konkretna przyczyna",
  "wplyw": "1 zdanie — co to oznacza dla biznesu",
  "zrob": "1 zdanie — dokładnie co właściciel ma zrobić TERAZ",
  "status": "ok|warning|critical"
}`,
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    dzieje:   parsed.dzieje   ?? 'Brak danych sprzedaży za wczoraj.',
    dlaczego: parsed.dlaczego ?? 'Raporty dzienne nie zostały zatwierdzone.',
    wplyw:    parsed.wplyw    ?? 'Nie można obliczyć marży i food cost.',
    zrob:     parsed.zrob     ?? 'Dodaj raport dzienny w module Raporty.',
    status:   parsed.status   ?? 'ok',
    metric: { label: 'Sprzedaż netto wczoraj', value: totalRevenue > 0 ? `${totalRevenue.toFixed(0)} zł` : '—', delta: `${pendingCount} faktur do zatwierdzenia` },
  }
}

async function generateHRBriefing(admin: ReturnType<typeof createAdminClient>, locationIds: string[]): Promise<BriefingResult> {
  const today = getToday()

  const [{ data: clockIns }, { count: totalEmployees }, { count: pendingLeaves }, { count: scheduledShifts }] = await Promise.all([
    admin.from('shift_clock_ins').select('clock_out_at').in('location_id', locationIds).eq('work_date', today),
    admin.from('employees').select('id', { count: 'exact', head: true }).in('location_id', locationIds).eq('status', 'active'),
    admin.from('leave_requests').select('id', { count: 'exact', head: true }).in('location_id', locationIds).eq('status', 'pending'),
    admin.from('shifts').select('id', { count: 'exact', head: true }).in('location_id', locationIds).eq('date', today),
  ])

  const clockedIn = clockIns?.filter((c: any) => !c.clock_out_at).length ?? 0
  const total = totalEmployees ?? 0

  const context = `
Dziś (${today}):
- Aktywni pracownicy: ${total}
- Zalogowani teraz (kiosk): ${clockedIn}
- Zakończone zmiany dziś: ${(clockIns?.length ?? 0) - clockedIn}
- Zaplanowane zmiany: ${scheduledShifts ?? 'brak danych'}
- Wnioski urlopowe oczekujące: ${pendingLeaves ?? 0}
`.trim()

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 250,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś Anią — specjalistką HR restauracji. Odpowiadasz po polsku, krótko i konkretnie.
Odpowiedz JSON z dokładnie tymi polami:
{
  "dzieje": "1 zdanie — stan obsadzenia zmiany dziś",
  "dlaczego": "1 zdanie — konkretna przyczyna problemu lub potwierdzenie że OK",
  "wplyw": "1 zdanie — co to oznacza dla operacji dziś",
  "zrob": "1 zdanie — dokładnie co właściciel ma zrobić TERAZ",
  "status": "ok|warning|critical"
}`,
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    dzieje:   parsed.dzieje   ?? 'Brak danych o obecności dziś.',
    dlaczego: parsed.dlaczego ?? 'Kiosk nie jest skonfigurowany lub nikt nie odbił.',
    wplyw:    parsed.wplyw    ?? 'Nie można śledzić czasu pracy pracowników.',
    zrob:     parsed.zrob     ?? 'Skonfiguruj kiosk PIN w ustawieniach.',
    status:   parsed.status   ?? 'ok',
    metric: { label: 'Na zmianie teraz', value: total > 0 ? `${clockedIn} / ${total}` : '—', delta: `${pendingLeaves ?? 0} wniosków urlopowych` },
  }
}

async function generateInventoryBriefing(admin: ReturnType<typeof createAdminClient>, locationIds: string[]): Promise<BriefingResult> {
  const today = getToday()

  const { data: recentJobs } = await admin
    .from('inventory_jobs')
    .select('id, type, status, due_date')
    .in('location_id', locationIds)
    .order('due_date', { ascending: false })
    .limit(6)

  const overdueCount = recentJobs?.filter((j: any) => j.status !== 'completed' && j.due_date && j.due_date < today).length ?? 0

  let varianceCount = 0
  if (recentJobs && recentJobs.length > 0) {
    const jobIds = recentJobs.slice(0, 2).map((j: any) => j.id)
    const { data: items } = await admin.from('inventory_job_items').select('expected_qty, counted_qty').in('job_id', jobIds).not('counted_qty', 'is', null)
    varianceCount = items?.filter((item: any) => item.counted_qty !== null && item.expected_qty !== null && Math.abs(item.counted_qty - item.expected_qty) > 0.5).length ?? 0
  }

  const context = `
Magazyn:
- Ostatnie inwentaryzacje: ${recentJobs?.length ?? 0}
- Przeterminowane/nieukończone: ${overdueCount}
- Odchylenia stanów w ostatnich 2 inwentaryzacjach: ${varianceCount} pozycji
- Status ostatniej: ${recentJobs?.[0]?.status ?? 'brak danych'}
`.trim()

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 250,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś Kubą — specjalistą ds. magazynu restauracji. Odpowiadasz po polsku, krótko i konkretnie.
Odpowiedz JSON z dokładnie tymi polami:
{
  "dzieje": "1 zdanie — aktualny stan magazynu i inwentaryzacji",
  "dlaczego": "1 zdanie — konkretna przyczyna odchyleń lub potwierdzenie że OK",
  "wplyw": "1 zdanie — co to oznacza dla kosztów lub operacji",
  "zrob": "1 zdanie — dokładnie co właściciel ma zrobić TERAZ",
  "status": "ok|warning|critical"
}`,
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    dzieje:   parsed.dzieje   ?? 'Brak danych magazynowych.',
    dlaczego: parsed.dlaczego ?? 'Inwentaryzacja nie została wykonana.',
    wplyw:    parsed.wplyw    ?? 'Nie można kontrolować food cost i stanów.',
    zrob:     parsed.zrob     ?? 'Wykonaj inwentaryzację w module Magazyn.',
    status:   parsed.status   ?? 'ok',
    metric: { label: 'Odchylenia stanów', value: `${varianceCount}`, delta: `${overdueCount} inwentaryzacji do wykonania` },
  }
}

async function generateRevenueBriefing(admin: ReturnType<typeof createAdminClient>, locationIds: string[], companyId: string): Promise<BriefingResult> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [{ data: dishes }, { data: salesTrend }, { data: recentInvoices }] = await Promise.all([
    // Get all active dishes with price + targets
    admin.from('dishes')
      .select('id, dish_name, menu_price_gross, menu_price_net, food_cost_target, margin_target')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(20),
    // 7-day revenue trend
    admin.from('sales_daily')
      .select('date, net_revenue, gross_revenue')
      .in('location_id', locationIds)
      .gte('date', sevenDaysAgo.toLocaleDateString('sv-SE'))
      .order('date', { ascending: false }),
    // Recent COS invoices (food cost indicator)
    admin.from('invoices')
      .select('supplier_name, total_amount, invoice_type, service_date')
      .in('location_id', locationIds)
      .eq('invoice_type', 'COS')
      .order('service_date', { ascending: false })
      .limit(5),
  ])

  // Calculate food costs per dish using the RPC
  const dishCosts: { name: string; price: number; cost: number; fc_pct: number; target: number }[] = []
  if (dishes && dishes.length > 0) {
    const costResults = await Promise.all(
      dishes.slice(0, 10).map(async (d: any) => {
        const { data: cost } = await admin.rpc('calculate_dish_foodcost', { dish_id_param: d.id })
        return { name: d.dish_name, price: d.menu_price_gross ?? 0, cost: cost ?? 0, target: (d.food_cost_target ?? 0.35) * 100 }
      })
    )
    for (const r of costResults) {
      if (r.price > 0) {
        dishCosts.push({ ...r, fc_pct: r.price > 0 ? Math.round((r.cost / r.price) * 100 * 10) / 10 : 0 })
      }
    }
  }

  const totalRevenue7d = salesTrend?.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0) ?? 0
  const totalCOSWeek = recentInvoices?.reduce((s: number, r: any) => s + (r.total_amount || 0), 0) ?? 0
  const overTargetDishes = dishCosts.filter(d => d.fc_pct > d.target)
  const underTargetDishes = dishCosts.filter(d => d.fc_pct > 0 && d.fc_pct <= d.target)

  const context = `
Dane menu (${dishes?.length ?? 0} aktywnych dań):
${dishCosts.slice(0, 8).map(d => `- ${d.name}: cena ${d.price} zł, koszt produkcji ${d.cost.toFixed(2)} zł, food cost ${d.fc_pct}% (cel: ${d.target}%)`).join('\n') || 'brak danych o daniach'}

Dania powyżej celu food cost (za drogie w produkcji): ${overTargetDishes.map(d => d.name).join(', ') || 'brak'}
Dania poniżej celu (dobra marża): ${underTargetDishes.map(d => d.name).join(', ') || 'brak'}

Przychód netto 7 dni: ${totalRevenue7d.toFixed(0)} zł
Faktury COS (żywność) ostatnio: ${totalCOSWeek.toFixed(0)} zł
`.trim()

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 250,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś Zofią — ekspertką od przychodów i menu restauracji. Odpowiadasz po polsku, krótko i konkretnie.
Odpowiedz JSON z dokładnie tymi polami:
{
  "dzieje": "1 zdanie — który element menu generuje problem z marżą",
  "dlaczego": "1 zdanie — konkretna przyczyna (wysoki food cost, niska cena, drogi składnik)",
  "wplyw": "1 zdanie — ile traci restauracja przez ten problem",
  "zrob": "1 zdanie — dokładnie co właściciel ma zrobić: podnieść cenę X o Y zł lub sprawdzić recepturę Z",
  "status": "ok|warning|critical"
}`,
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  const worstDish = dishCosts.sort((a, b) => b.fc_pct - a.fc_pct)[0]

  return {
    dzieje:   parsed.dzieje   ?? 'Brak danych o menu. Dodaj dania i receptury.',
    dlaczego: parsed.dlaczego ?? 'Receptury lub ceny nie zostały skonfigurowane.',
    wplyw:    parsed.wplyw    ?? 'Nie można ocenić rentowności poszczególnych dań.',
    zrob:     parsed.zrob     ?? 'Skonfiguruj menu i receptury w module Kalkulator.',
    status:   parsed.status   ?? 'ok',
    metric: {
      label: 'Najwyższy food cost',
      value: worstDish ? `${worstDish.fc_pct}%` : '—',
      delta: worstDish ? worstDish.name : 'brak danych',
    },
  }
}

/* ── GET: fetch today's briefings (cached or generate) ── */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI nie jest skonfigurowane.' }, { status: 503 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin.from('user_profiles').select('company_id').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'Brak firmy' }, { status: 400 })

  const companyId = profile.company_id
  const today = getToday()

  // Return cached briefings if already generated today (unless force=1)
  const force = req.nextUrl.searchParams.get('force') === '1'
  if (!force) {
    const { data: cached } = await admin.from('ai_briefings').select('*').eq('company_id', companyId).eq('date', today)
    if (cached && cached.length >= 4) {
      return NextResponse.json({ briefings: cached, cached: true })
    }
  }

  const { data: locations } = await admin.from('locations').select('id').eq('company_id', companyId)
  const locationIds = locations?.map((l: any) => l.id) ?? []

  if (locationIds.length === 0) {
    return NextResponse.json({ briefings: [], cached: false })
  }

  const fallback = (director: string): BriefingResult & { director: string } => ({
    director,
    dzieje:   'Brak danych do analizy.',
    dlaczego: 'Dane nie zostały jeszcze wprowadzone do systemu.',
    wplyw:    'Analiza niedostępna do czasu uzupełnienia danych.',
    zrob:     'Wprowadź dane w odpowiednim module, aby aktywować analizę.',
    status:   'ok',
    metric: { label: 'Status', value: '—', delta: 'brak danych' },
  })

  const [profitData, hrData, inventoryData, revenueData] = await Promise.all([
    generateProfitBriefing(admin, locationIds).catch(() => fallback('profit')),
    generateHRBriefing(admin, locationIds).catch(() => fallback('hr')),
    generateInventoryBriefing(admin, locationIds).catch(() => fallback('inventory')),
    generateRevenueBriefing(admin, locationIds, companyId).catch(() => fallback('revenue')),
  ])

  const rows = [
    { company_id: companyId, director: 'profit',    ...profitData,    date: today },
    { company_id: companyId, director: 'hr',         ...hrData,        date: today },
    { company_id: companyId, director: 'inventory',  ...inventoryData, date: today },
    { company_id: companyId, director: 'revenue',    ...revenueData,   date: today },
  ]

  await admin.from('ai_briefings').upsert(rows, { onConflict: 'company_id,director,date' })

  return NextResponse.json({ briefings: rows, cached: false })
}

/* ── POST: ask a question to a specific director ── */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI nie jest skonfigurowane.' }, { status: 503 })
  }

  const { director, question } = await req.json()
  if (!director || !question) return NextResponse.json({ error: 'Brakujące dane' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('company_id').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'Brak firmy' }, { status: 400 })

  const { data: locations } = await admin.from('locations').select('id').eq('company_id', profile.company_id)
  const locationIds = locations?.map((l: any) => l.id) ?? []

  let contextData = 'Brak danych.'

  if (director === 'profit') {
    const [{ data: sales }, { data: invoices }] = await Promise.all([
      admin.from('sales_daily').select('date, net_revenue, gross_revenue, status').in('location_id', locationIds).order('date', { ascending: false }).limit(14),
      admin.from('invoices').select('supplier_name, total_amount, status, invoice_type, service_date').in('location_id', locationIds).order('service_date', { ascending: false }).limit(10),
    ])
    contextData = `Sprzedaż (14 dni): ${JSON.stringify(sales)}\nFaktury (10 ostatnich): ${JSON.stringify(invoices)}`
  } else if (director === 'hr') {
    const [{ data: clockIns }, { data: employees }, { data: leaves }] = await Promise.all([
      admin.from('shift_clock_ins').select('employee_id, work_date, clock_in_at, clock_out_at').in('location_id', locationIds).order('work_date', { ascending: false }).limit(50),
      admin.from('employees').select('full_name, position, status').in('location_id', locationIds),
      admin.from('leave_requests').select('employee_id, leave_type, date_from, date_to, status').in('location_id', locationIds).order('created_at', { ascending: false }).limit(10),
    ])
    contextData = `Pracownicy: ${JSON.stringify(employees)}\nOdbicia (50 ostatnich): ${JSON.stringify(clockIns)}\nUrlopy: ${JSON.stringify(leaves)}`
  } else if (director === 'inventory') {
    const { data: jobs } = await admin.from('inventory_jobs').select('type, status, due_date').in('location_id', locationIds).order('due_date', { ascending: false }).limit(10)
    contextData = `Inwentaryzacje: ${JSON.stringify(jobs)}`
  } else if (director === 'revenue') {
    const [{ data: dishes }, { data: ingredients }, { data: sales }] = await Promise.all([
      admin.from('dishes').select('id, dish_name, menu_price_gross, food_cost_target, margin_target').eq('company_id', profile.company_id).eq('status', 'active').limit(20),
      admin.from('ingredients').select('name, last_price, base_unit').eq('company_id', profile.company_id).limit(30),
      admin.from('sales_daily').select('date, net_revenue').in('location_id', locationIds).order('date', { ascending: false }).limit(14),
    ])
    contextData = `Dania: ${JSON.stringify(dishes)}\nSkładniki z cenami: ${JSON.stringify(ingredients)}\nSprzedaż 14 dni: ${JSON.stringify(sales)}`
  } else if (director === 'investor') {
    const [{ data: sales56 }, { data: pendingInvoices }, { data: locations2 }] = await Promise.all([
      admin.from('sales_daily')
        .select('date, net_revenue, total_labor_hours, avg_hourly_rate, food_cost_amount, transaction_count')
        .in('location_id', locationIds)
        .order('date', { ascending: false }).limit(56),
      admin.from('invoices').select('total_amount, invoice_type').in('location_id', locationIds).eq('status', 'submitted'),
      admin.from('locations').select('id, name').eq('company_id', profile.company_id),
    ])
    const rev28  = (sales56 ?? []).slice(0, 28).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
    const rev56  = (sales56 ?? []).slice(28, 56).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
    const labor  = (sales56 ?? []).slice(0, 28).reduce((s: number, r: any) => s + (r.total_labor_hours || 0) * (r.avg_hourly_rate || 0), 0)
    const food   = (sales56 ?? []).slice(0, 28).reduce((s: number, r: any) => s + (r.food_cost_amount || 0), 0)
    const txns   = (sales56 ?? []).slice(0, 28).reduce((s: number, r: any) => s + (r.transaction_count || 0), 0)
    const ebitda = rev28 - labor - food
    const exposure = (pendingInvoices ?? []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
    contextData = `Lokalizacje: ${(locations2 ?? []).map((l: any) => l.name).join(', ')}
Przychody 28d: ${rev28.toFixed(0)} zł | Poprzednie 28d: ${rev56.toFixed(0)} zł | Zmiana: ${rev56 > 0 ? ((rev28 - rev56) / rev56 * 100).toFixed(1) : '?'}%
EBITDA 28d: ${ebitda.toFixed(0)} zł (${rev28 > 0 ? (ebitda / rev28 * 100).toFixed(1) : '?'}%)
Koszt pracy 28d: ${labor.toFixed(0)} zł | Food cost 28d: ${food.toFixed(0)} zł
Transakcje 28d: ${txns} | Śr. paragon: ${txns > 0 ? (rev28 / txns).toFixed(0) : '?'} zł
Ekspozycja faktur (niezatwierdzone): ${exposure.toFixed(0)} zł`
  }

  const SYSTEM: Record<string, string> = {
    profit:    'Jesteś Markiem — analitykiem finansowym restauracji. Odpowiadasz konkretnie po polsku na pytania finansowe, używając dostarczonych danych. Bądź bezpośredni i podawaj liczby.',
    hr:        'Jesteś Martą — Dyrektorem HR restauracji. Odpowiadasz konkretnie po polsku na pytania o zespół, czas pracy, certyfikaty i koszty, używając dostarczonych danych.',
    inventory: 'Jesteś Kubą — specjalistą ds. magazynu restauracji. Odpowiadasz konkretnie po polsku na pytania o magazyn, używając dostarczonych danych.',
    revenue:   'Jesteś Zofią — Dyrektorem Sprzedaży restauracji. Odpowiadasz konkretnie po polsku na pytania o przychody, trendy sprzedaży i rentowność dań, używając dostarczonych danych. Podawaj konkretne liczby i rekomendacje.',
    investor:  'Jesteś Markiem — Dyrektorem Inwestorskim restauracji. Odpowiadasz po polsku jak CFO raportujący do zarządu — konkretne liczby, marże, wzrost, unit economics. Używaj dostarczonych danych.',
  }

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [
      { role: 'system', content: SYSTEM[director] ?? SYSTEM.profit },
      { role: 'user', content: `Dane firmy:\n${contextData}\n\nPytanie: ${question}` },
    ],
  })

  return NextResponse.json({ answer: res.choices[0]?.message?.content ?? 'Brak odpowiedzi.' })
}
