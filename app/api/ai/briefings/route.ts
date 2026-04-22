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
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE')
}
function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv-SE')
}
function nextWeekday(dow: number) {
  const d = new Date()
  const diff = (dow - d.getDay() + 7) % 7
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
  return d.toLocaleDateString('sv-SE')
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI nie jest skonfigurowane.' }, { status: 503 })

  const { director, question } = await req.json()
  if (!director || !question) return NextResponse.json({ error: 'Brakujące dane' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('company_id').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'Brak firmy' }, { status: 400 })

  const { data: locationsRaw } = await admin.from('locations').select('id, name').eq('company_id', profile.company_id)
  const locs = locationsRaw ?? []
  const locationIds = locs.map((l: any) => l.id)
  const locName = (id: string) => locs.find((l: any) => l.id === id)?.name ?? id

  const todayStr   = new Date().toLocaleDateString('sv-SE')
  const nextSatStr = nextWeekday(6)
  const nextSunStr = nextWeekday(0)
  const dateCtx    = `Dziś: ${todayStr} | Najbliższa sobota: ${nextSatStr} | Niedziela: ${nextSunStr}`

  let ctx = 'Brak danych.'
  let sys = ''

  /* ── HR ──────────────────────────────────────────────────────── */
  if (director === 'hr') {
    const [
      { data: employees },
      { data: shiftsUp },
      { data: clockToday },
      { data: leaves },
      { data: certs },
    ] = await Promise.all([
      admin.from('employees').select('id, full_name, position, status, location_id, base_rate').in('location_id', locationIds).neq('status', 'inactive'),
      admin.from('shifts').select('employee_id, date, start_time, end_time, location_id, employees(full_name, position)').in('location_id', locationIds).gte('date', todayStr).lte('date', daysFromNow(14)).order('date'),
      admin.from('shift_clock_ins').select('employee_id, clock_in_at, clock_out_at, location_id, employees(full_name)').in('location_id', locationIds).eq('work_date', todayStr),
      admin.from('leave_requests').select('employee_id, leave_type, date_from, date_to, status, employees(full_name)').in('location_id', locationIds).gte('date_to', todayStr).order('date_from').limit(20),
      admin.from('employee_certifications').select('cert_name, expiry_date, employees(full_name)').in('location_id', locationIds).lte('expiry_date', daysFromNow(60)).order('expiry_date'),
    ])

    // Build shift roster per location/date
    const roster: Record<string, Record<string, string[]>> = {}
    for (const s of (shiftsUp ?? [])) {
      const loc = locName(s.location_id); const date = s.date
      if (!roster[loc]) roster[loc] = {}
      if (!roster[loc][date]) roster[loc][date] = []
      roster[loc][date].push(`${(s.employees as any)?.full_name ?? '?'} ${s.start_time ?? ''}–${s.end_time ?? ''}`)
    }
    const rosterTxt = Object.entries(roster).map(([loc, dates]) =>
      `${loc}:\n` + Object.entries(dates).map(([d, e]) => `  ${d}: ${e.join(', ')}`).join('\n')
    ).join('\n') || 'Brak zaplanowanych zmian'

    ctx = `${dateCtx}

LOKALIZACJE: ${locs.map((l: any) => l.name).join(', ')}

PRACOWNICY:
${(employees ?? []).map((e: any) => `${e.full_name} | ${e.position ?? '—'} | ${locName(e.location_id)} | ${e.base_rate ?? '—'} zł/h`).join('\n') || 'brak'}

GRAFIK (dziś + 14 dni):
${rosterTxt}

OBECNOŚĆ DZIŚ (${todayStr}):
${(clockToday ?? []).map((c: any) => `${(c.employees as any)?.full_name ?? '?'} @ ${locName(c.location_id)}: wejście ${c.clock_in_at?.slice(11,16) ?? '?'}${c.clock_out_at ? ` wyjście ${c.clock_out_at.slice(11,16)}` : ' (aktywna zmiana)'}`).join('\n') || 'nikt jeszcze nie zarejestrował wejścia'}

URLOPY (nadchodzące):
${(leaves ?? []).map((l: any) => `${(l.employees as any)?.full_name ?? '?'}: ${l.leave_type} ${l.date_from}–${l.date_to} [${l.status}]`).join('\n') || 'brak'}

CERTYFIKATY WYGASAJĄCE (60 dni):
${(certs ?? []).map((c: any) => `${(c.employees as any)?.full_name ?? '?'}: ${c.cert_name} wygasa ${c.expiry_date}`).join('\n') || 'wszystkie aktualne'}`

    sys = `Jesteś Martą — Dyrektorem HR sieci restauracji. Masz dostęp do PEŁNYCH danych: grafiki, obecność, urlopy, certyfikaty.
REGUŁY: Odpowiadaj WYŁĄCZNIE na podstawie danych. NIGDY nie mów "nie mam dostępu" — jeśli grafik jest pusty dla danego dnia/lokalizacji, powiedz wprost że nie zaplanowano zmian. Podawaj imiona, lokalizacje, godziny. Po polsku. Max 4 zdania.`

  /* ── PROFIT ──────────────────────────────────────────────────── */
  } else if (director === 'profit') {
    const [{ data: sales }, { data: invoices }] = await Promise.all([
      admin.from('sales_daily').select('date, net_revenue, gross_revenue, food_cost_amount, total_labor_hours, avg_hourly_rate, transaction_count, status, location_id').in('location_id', locationIds).order('date', { ascending: false }).limit(28),
      admin.from('invoices').select('supplier_name, total_amount, status, invoice_type, service_date, location_id').in('location_id', locationIds).order('service_date', { ascending: false }).limit(20),
    ])
    const byLoc: Record<string, number> = {}
    for (const r of (sales ?? []).slice(0, 7)) { const n = locName(r.location_id); byLoc[n] = (byLoc[n] ?? 0) + (r.net_revenue || 0) }
    ctx = `${dateCtx}
LOKALIZACJE: ${locs.map((l: any) => l.name).join(', ')}
PRZYCHODY 7d WG LOKALIZACJI: ${Object.entries(byLoc).map(([n, v]) => `${n}: ${v.toFixed(0)} zł`).join(' | ') || 'brak'}
RAPORTY DZIENNE (28d):
${(sales ?? []).map((r: any) => `${r.date} | ${locName(r.location_id)} | netto: ${r.net_revenue?.toFixed(0)} zł | FC: ${r.food_cost_amount?.toFixed(0) ?? '—'} zł | praca: ${r.total_labor_hours?.toFixed(1) ?? '—'}h`).join('\n') || 'brak'}
FAKTURY:
${(invoices ?? []).map((i: any) => `${i.service_date} | ${locName(i.location_id)} | ${i.supplier_name} | ${i.invoice_type} | ${i.total_amount?.toFixed(0)} zł [${i.status}]`).join('\n') || 'brak'}`
    sys = `Jesteś Markiem — CFO sieci restauracji. Analizujesz P&L, food cost i faktury. Odpowiadaj konkretnie używając liczb z danych. Porównuj lokalizacje. Po polsku, max 4 zdania.`

  /* ── REVENUE ─────────────────────────────────────────────────── */
  } else if (director === 'revenue') {
    const [{ data: dishes }, { data: ingredients }, { data: sales }] = await Promise.all([
      admin.from('dishes').select('id, dish_name, menu_price_gross, food_cost_target, margin_target').eq('company_id', profile.company_id).eq('status', 'active').limit(30),
      admin.from('ingredients').select('name, last_price, base_unit').eq('company_id', profile.company_id).limit(40),
      admin.from('sales_daily').select('date, net_revenue, transaction_count, location_id').in('location_id', locationIds).order('date', { ascending: false }).limit(28),
    ])
    const dowMap: Record<number, { sum: number; cnt: number }> = {}
    for (const r of (sales ?? [])) { const dow = new Date(r.date).getDay(); if (!dowMap[dow]) dowMap[dow] = { sum: 0, cnt: 0 }; dowMap[dow].sum += r.net_revenue || 0; dowMap[dow].cnt++ }
    const DAYS = ['Nie','Pon','Wt','Śr','Czw','Pt','Sob']
    ctx = `${dateCtx}
SPRZEDAŻ WG DNIA TYGODNIA: ${Object.entries(dowMap).sort((a,b)=>+a[0]-+b[0]).map(([d,v]) => `${DAYS[+d]}: śr.${v.cnt > 0 ? (v.sum/v.cnt).toFixed(0) : '?'} zł`).join(' | ') || 'brak'}
SPRZEDAŻ 28d: ${(sales ?? []).map((r: any) => `${r.date} ${locName(r.location_id)} ${r.net_revenue?.toFixed(0)} zł ${r.transaction_count ?? '?'}tx`).join(' | ') || 'brak'}
MENU: ${(dishes ?? []).map((d: any) => `${d.dish_name} ${d.menu_price_gross ?? '?'} zł FC-cel:${d.food_cost_target ? (d.food_cost_target*100).toFixed(0) : '?'}%`).join(' | ') || 'brak'}
SKŁADNIKI: ${(ingredients ?? []).map((i: any) => `${i.name} ${i.last_price ?? '?'} zł/${i.base_unit}`).join(', ') || 'brak'}`
    sys = `Jesteś Zofią — Dyrektorem Sprzedaży. Analizujesz trendy, rentowność menu, szanse wzrostu. Konkretne liczby, rekomenduj działania. Po polsku, max 4 zdania.`

  /* ── INVENTORY ───────────────────────────────────────────────── */
  } else if (director === 'inventory') {
    const { data: jobs } = await admin.from('inventory_jobs').select('id, type, status, due_date, location_id').in('location_id', locationIds).order('due_date', { ascending: false }).limit(20)
    const overdue = (jobs ?? []).filter((j: any) => j.status !== 'completed' && j.due_date < todayStr)
    ctx = `${dateCtx}
LOKALIZACJE: ${locs.map((l: any) => l.name).join(', ')}
INWENTARYZACJE:
${(jobs ?? []).map((j: any) => `${j.due_date} | ${locName(j.location_id)} | ${j.type} [${j.status}]${j.due_date < todayStr && j.status !== 'completed' ? ' ⚠PRZETERMINOWANE' : ''}`).join('\n') || 'brak'}
Przeterminowane: ${overdue.length}`
    sys = `Jesteś Kubą — specjalistą ds. magazynu. Monitorujesz inwentaryzacje i odchylenia. Podawaj daty, lokalizacje, ostrzegaj o zaległościach. Po polsku, max 4 zdania.`

  /* ── INVESTOR ────────────────────────────────────────────────── */
  } else if (director === 'investor') {
    const [{ data: sales56 }, { data: pendingInv }] = await Promise.all([
      admin.from('sales_daily').select('date, net_revenue, total_labor_hours, avg_hourly_rate, food_cost_amount, transaction_count, location_id').in('location_id', locationIds).order('date', { ascending: false }).limit(56),
      admin.from('invoices').select('total_amount, invoice_type').in('location_id', locationIds).eq('status', 'submitted'),
    ])
    const s28 = (sales56 ?? []).slice(0, 28); const s56 = (sales56 ?? []).slice(28, 56)
    const rev28 = s28.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
    const rev56 = s56.reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
    const labor = s28.reduce((s: number, r: any) => s + ((r.total_labor_hours || 0) * (r.avg_hourly_rate || 0)), 0)
    const food  = s28.reduce((s: number, r: any) => s + (r.food_cost_amount || 0), 0)
    const txns  = s28.reduce((s: number, r: any) => s + (r.transaction_count || 0), 0)
    const ebitda = rev28 - labor - food
    const byLoc: Record<string, number> = {}
    for (const r of s28) { const n = locName(r.location_id); byLoc[n] = (byLoc[n] ?? 0) + (r.net_revenue || 0) }
    ctx = `${dateCtx}
LOKALIZACJE: ${locs.map((l: any) => l.name).join(', ')}
WYNIKI 28d: przychód ${rev28.toFixed(0)} zł | poprzednie 28d: ${rev56.toFixed(0)} zł | zmiana: ${rev56 > 0 ? ((rev28-rev56)/rev56*100).toFixed(1) : '?'}%
EBITDA: ${ebitda.toFixed(0)} zł (${rev28 > 0 ? (ebitda/rev28*100).toFixed(1) : '?'}%)
Koszt pracy: ${labor.toFixed(0)} zł (${rev28 > 0 ? (labor/rev28*100).toFixed(1) : '?'}%) | Food cost: ${food.toFixed(0)} zł (${rev28 > 0 ? (food/rev28*100).toFixed(1) : '?'}%)
Transakcje: ${txns} | Śr. paragon: ${txns > 0 ? (rev28/txns).toFixed(0) : '?'} zł
Ekspozycja: ${(pendingInv ?? []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0).toFixed(0)} zł
WG LOKALIZACJI (28d): ${Object.entries(byLoc).map(([n, v]) => `${n}: ${v.toFixed(0)} zł`).join(' | ') || 'brak'}`
    sys = `Jesteś Adamem — Dyrektorem Inwestorskim. Raportujesz jak CFO do zarządu: EBITDA, marże, wzrost, unit economics. Konkretne liczby. Po polsku, max 4 zdania.`
  }

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 350,
    messages: [
      { role: 'system', content: sys || 'Jesteś asystentem restauracji. Odpowiadaj po polsku.' },
      { role: 'user', content: `DANE:\n${ctx}\n\nPYTANIE: ${question}` },
    ],
  })

  return NextResponse.json({ answer: res.choices[0]?.message?.content ?? 'Brak odpowiedzi.' })
}

