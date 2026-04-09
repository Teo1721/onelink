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
  summary: string
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
    max_tokens: 150,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Jesteś Profit Directorem restauracji. Briefing poranny: 2-3 zdania, konkretne liczby, po polsku. Wskaż najważniejszy insight i co zrobić. Odpowiedz JSON: {"summary":"...","status":"ok|warning|critical"}',
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    summary: parsed.summary ?? 'Brak wystarczających danych. Dodaj raporty dzienne, aby aktywować analizę.',
    status: parsed.status ?? 'ok',
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
    max_tokens: 150,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Jesteś HR Directorem restauracji. Briefing poranny o zespole: 2-3 zdania, konkretne liczby, po polsku. Wskaż obsadzenie zmiany i ewentualne problemy. Odpowiedz JSON: {"summary":"...","status":"ok|warning|critical"}',
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    summary: parsed.summary ?? 'Brak danych o czasie pracy. Skonfiguruj kiosk, aby aktywować analizę HR.',
    status: parsed.status ?? 'ok',
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
    max_tokens: 150,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Jesteś Inventory Directorem restauracji. Briefing poranny: 2-3 zdania, konkretne, po polsku. Wskaż odchylenia i co zamówić. Odpowiedz JSON: {"summary":"...","status":"ok|warning|critical"}',
      },
      { role: 'user', content: context },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    summary: parsed.summary ?? 'Brak danych magazynowych. Wykonaj pierwszą inwentaryzację, aby aktywować analizę.',
    status: parsed.status ?? 'ok',
    metric: { label: 'Odchylenia stanów', value: `${varianceCount}`, delta: `${overdueCount} inwentaryzacji do wykonania` },
  }
}

/* ── GET: fetch today's briefings (cached or generate) ── */
export async function GET() {
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

  // Return cached briefings if already generated today
  const { data: cached } = await admin.from('ai_briefings').select('*').eq('company_id', companyId).eq('date', today)
  if (cached && cached.length >= 3) {
    return NextResponse.json({ briefings: cached, cached: true })
  }

  const { data: locations } = await admin.from('locations').select('id').eq('company_id', companyId)
  const locationIds = locations?.map((l: any) => l.id) ?? []

  if (locationIds.length === 0) {
    return NextResponse.json({ briefings: [], cached: false })
  }

  const fallback = (director: string, msg: string): BriefingResult & { director: string } => ({
    director,
    summary: msg,
    status: 'ok',
    metric: { label: 'Status', value: '—', delta: 'brak danych' },
  })

  const [profitData, hrData, inventoryData] = await Promise.all([
    generateProfitBriefing(admin, locationIds).catch(() => fallback('profit', 'Brak danych sprzedaży. Dodaj raporty dzienne, aby aktywować analizę.')),
    generateHRBriefing(admin, locationIds).catch(() => fallback('hr', 'Brak danych o czasie pracy. Skonfiguruj kiosk, aby aktywować analizę HR.')),
    generateInventoryBriefing(admin, locationIds).catch(() => fallback('inventory', 'Brak danych magazynowych. Wykonaj pierwszą inwentaryzację.')),
  ])

  const rows = [
    { company_id: companyId, director: 'profit',    ...profitData,    date: today },
    { company_id: companyId, director: 'hr',         ...hrData,        date: today },
    { company_id: companyId, director: 'inventory',  ...inventoryData, date: today },
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
  }

  const SYSTEM: Record<string, string> = {
    profit:    'Jesteś Profit Directorem restauracji. Odpowiadasz konkretnie po polsku na pytania finansowe, używając dostarczonych danych. Bądź bezpośredni i podawaj liczby.',
    hr:        'Jesteś HR Directorem restauracji. Odpowiadasz konkretnie po polsku na pytania o zespół i czas pracy, używając dostarczonych danych.',
    inventory: 'Jesteś Inventory Directorem restauracji. Odpowiadasz konkretnie po polsku na pytania o magazyn, używając dostarczonych danych.',
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
