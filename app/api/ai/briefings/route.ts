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

  let status: BriefingResult['status'] = 'ok'
  let dzieje: string
  let dlaczego: string
  let wplyw: string
  let zrob: string

  if (totalRevenue === 0) {
    status = 'critical'
    dzieje = 'Brak danych sprzedaży za wczoraj.'
    dlaczego = 'Raporty dzienne nie zostały zatwierdzone lub nie wprowadzono danych.'
    wplyw = 'Nie można obliczyć marży i food cost za ten dzień.'
    zrob = 'Dodaj raport dzienny w module Raporty.'
  } else if (pendingCount > 5) {
    status = 'warning'
    dzieje = `Sprzedaż netto wczoraj: ${totalRevenue.toFixed(0)} zł. Oczekuje ${pendingCount} faktur na zatwierdzenie.`
    dlaczego = `Zaległe faktury (${pendingCount} szt.) blokują pełny obraz kosztów.`
    wplyw = 'Nierozliczone faktury zawyżają rzeczywiste koszty i zaburzają obliczenia marży.'
    zrob = 'Zatwierdź oczekujące faktury w module Faktury.'
  } else {
    status = 'ok'
    dzieje = `Sprzedaż netto wczoraj: ${totalRevenue.toFixed(0)} zł z ${sales?.length || 0} lokalizacji.`
    dlaczego = pendingCount > 0 ? `${pendingCount} faktur nadal oczekuje na zatwierdzenie.` : 'Wszystkie faktury są zatwierdzone.'
    wplyw = 'Dane finansowe są kompletne i pozwalają na rzetelną analizę marży.'
    zrob = pendingCount > 0 ? 'Sprawdź i zatwierdź pozostałe faktury w module Faktury.' : 'Brak pilnych działań — monitoruj wyniki na bieżąco.'
  }

  return {
    dzieje,
    dlaczego,
    wplyw,
    zrob,
    status,
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
  const pendingLeavesCount = pendingLeaves ?? 0

  let hrStatus: BriefingResult['status'] = 'ok'
  let hrDzieje: string
  let hrDlaczego: string
  let hrWplyw: string
  let hrZrob: string

  if (clockedIn === 0 && total > 0) {
    hrStatus = 'warning'
    hrDzieje = `Żaden z ${total} aktywnych pracowników nie jest aktualnie zalogowany na zmianie.`
    hrDlaczego = 'Kiosk nie jest skonfigurowany lub pracownicy nie odbili wejścia.'
    hrWplyw = 'Nie można śledzić czasu pracy ani obecności na sali dziś.'
    hrZrob = 'Sprawdź konfigurację kiosku PIN lub przypomnij pracownikom o rejestracji wejść.'
  } else if (total === 0) {
    hrStatus = 'warning'
    hrDzieje = 'Brak aktywnych pracowników w systemie.'
    hrDlaczego = 'Nie dodano pracowników lub wszyscy mają status nieaktywny.'
    hrWplyw = 'Nie można zarządzać grafikiem ani śledzić obecności.'
    hrZrob = 'Dodaj pracowników w module HR.'
  } else {
    hrStatus = 'ok'
    hrDzieje = `Dziś zalogowanych na zmianie: ${clockedIn} z ${total} aktywnych pracowników.`
    hrDlaczego = pendingLeavesCount > 0 ? `Oczekuje ${pendingLeavesCount} wniosków urlopowych do rozpatrzenia.` : 'Wszystkie wnioski urlopowe są rozpatrzone.'
    hrWplyw = 'Obsada zmiany jest monitorowana na bieżąco.'
    hrZrob = pendingLeavesCount > 0 ? `Rozpatrz ${pendingLeavesCount} oczekujących wniosków urlopowych w module HR.` : 'Brak pilnych działań — obsada zmiany jest prawidłowa.'
  }

  return {
    dzieje:   hrDzieje,
    dlaczego: hrDlaczego,
    wplyw:    hrWplyw,
    zrob:     hrZrob,
    status:   hrStatus,
    metric: { label: 'Na zmianie teraz', value: total > 0 ? `${clockedIn} / ${total}` : '—', delta: `${pendingLeavesCount} wniosków urlopowych` },
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

  let invStatus: BriefingResult['status'] = 'ok'
  let invDzieje: string
  let invDlaczego: string
  let invWplyw: string
  let invZrob: string

  if (recentJobs?.length === 0 || recentJobs == null) {
    invStatus = 'warning'
    invDzieje = 'Brak danych o inwentaryzacjach w systemie.'
    invDlaczego = 'Nie przeprowadzono żadnej inwentaryzacji lub dane nie zostały wprowadzone.'
    invWplyw = 'Nie można kontrolować food cost ani stanów magazynowych.'
    invZrob = 'Wykonaj inwentaryzację w module Magazyn.'
  } else if (overdueCount >= 3) {
    invStatus = 'critical'
    invDzieje = `Krytyczne zaległości: ${overdueCount} inwentaryzacji przeterminowanych, ${varianceCount} odchyleń stanów.`
    invDlaczego = 'Inwentaryzacje nie są wykonywane zgodnie z harmonogramem.'
    invWplyw = 'Niekontrolowane odchylenia stanów powodują straty i błędy w kosztach żywności.'
    invZrob = `Natychmiast wykonaj ${overdueCount} zaległych inwentaryzacji w module Magazyn.`
  } else if (overdueCount > 0 || varianceCount > 0) {
    invStatus = 'warning'
    invDzieje = `Magazyn: ${overdueCount} przeterminowanych inwentaryzacji, ${varianceCount} odchyleń w ostatnich 2 inwentaryzacjach.`
    invDlaczego = varianceCount > 0 ? 'Stany magazynowe nie zgadzają się z oczekiwanymi ilościami.' : 'Część inwentaryzacji nie została ukończona w terminie.'
    invWplyw = 'Odchylenia mogą wskazywać na straty lub błędy w dostawach, co wpływa na food cost.'
    invZrob = overdueCount > 0 ? `Wykonaj ${overdueCount} zaległych inwentaryzacji i wyjaśnij odchylenia.` : 'Sprawdź i wyjaśnij odchylenia stanów w module Magazyn.'
  } else {
    invStatus = 'ok'
    invDzieje = `Magazyn w porządku: ${recentJobs.length} ostatnich inwentaryzacji, ${varianceCount} odchyleń stanów.`
    invDlaczego = 'Inwentaryzacje są wykonywane na bieżąco, stany zgadzają się z oczekiwanymi.'
    invWplyw = 'Kontrola food cost i stanów magazynowych działa prawidłowo.'
    invZrob = 'Brak pilnych działań — kontynuuj regularne inwentaryzacje.'
  }

  return {
    dzieje:   invDzieje,
    dlaczego: invDlaczego,
    wplyw:    invWplyw,
    zrob:     invZrob,
    status:   invStatus,
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

  const worstDish = dishCosts.slice().sort((a, b) => b.fc_pct - a.fc_pct)[0]

  let revStatus: BriefingResult['status'] = 'ok'
  let revDzieje: string
  let revDlaczego: string
  let revWplyw: string
  let revZrob: string

  if (dishCosts.length === 0) {
    revStatus = 'warning'
    revDzieje = 'Brak danych o menu — nie skonfigurowano dań ani receptur.'
    revDlaczego = 'Receptury lub ceny nie zostały wprowadzone do systemu.'
    revWplyw = 'Nie można ocenić rentowności poszczególnych dań ani kontrolować food cost.'
    revZrob = 'Skonfiguruj menu i receptury w module Kalkulator.'
  } else if (overTargetDishes.length > 0) {
    revStatus = 'warning'
    revDzieje = `${overTargetDishes.length} dań przekracza cel food cost: ${overTargetDishes.map(d => `${d.name} (${d.fc_pct}% vs cel ${d.target}%)`).slice(0, 3).join(', ')}.`
    revDlaczego = 'Koszt produkcji tych dań jest zbyt wysoki względem ceny sprzedaży.'
    revWplyw = totalRevenue7d > 0 ? `Przychód netto ostatnie 7 dni: ${totalRevenue7d.toFixed(0)} zł, ale marża na wybranych daniach jest poniżej celu.` : 'Obniżona marża na tych daniach zmniejsza ogólną rentowność.'
    revZrob = worstDish ? `Sprawdź recepturę lub podnieś cenę dania "${worstDish.name}" (food cost ${worstDish.fc_pct}%, cel ${worstDish.target}%) w module Kalkulator.` : 'Przejrzyj receptury dań z przekroczonym food cost w module Kalkulator.'
  } else {
    revStatus = 'ok'
    revDzieje = `Menu w porządku: ${dishCosts.length} dań z kontrolowanym food cost, ${underTargetDishes.length} poniżej celu (dobra marża).`
    revDlaczego = 'Koszty produkcji mieszczą się w docelowych wskaźnikach food cost.'
    revWplyw = totalRevenue7d > 0 ? `Przychód netto ostatnie 7 dni: ${totalRevenue7d.toFixed(0)} zł przy prawidłowej strukturze kosztów menu.` : 'Rentowność menu jest monitorowana i pod kontrolą.'
    revZrob = 'Brak pilnych działań — kontynuuj monitorowanie food cost w module Kalkulator.'
  }

  return {
    dzieje:   revDzieje,
    dlaczego: revDlaczego,
    wplyw:    revWplyw,
    zrob:     revZrob,
    status:   revStatus,
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

  if (ctx === 'Brak danych.' || !sys) {
    return NextResponse.json({ answer: 'Brak danych do analizy.' })
  }

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: `DANE:\n${ctx}\n\nPYTANIE: ${question}` },
    ],
    max_tokens: 400,
    temperature: 0.3,
  })

  const answer = res.choices[0]?.message?.content?.trim() ?? 'Brak odpowiedzi.'
  return NextResponse.json({ answer })
}

