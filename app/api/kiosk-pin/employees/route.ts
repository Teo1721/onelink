import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/kiosk-pin/employees?locationId=<id>
 * Requires manager session.
 * Returns active employees + today's clock status + whether they have a PIN set.
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = req.nextUrl.searchParams.get('locationId')
  if (!locationId) return NextResponse.json({ error: 'locationId wymagany' }, { status: 400 })

  const admin = createAdminClient()

  // Verify manager has access to this location
  const { data: access } = await admin
    .from('user_access').select('location_id')
    .eq('user_id', user.id).eq('location_id', locationId).maybeSingle()
  if (!access) return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })

  const BUSINESS_DAY_CUTOFF = 6
  const TIMEZONE = 'Europe/Warsaw'
  const now = new Date()
  const nowInWarsaw = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }))
  const warsawHour = nowInWarsaw.getHours()
  const todayWarsaw = new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(now)
  const yesterdayWarsaw = new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date(now.getTime() - 86_400_000))
  const businessDate = warsawHour < BUSINESS_DAY_CUTOFF ? yesterdayWarsaw : todayWarsaw

  const [{ data: location }, { data: records }] = await Promise.all([
    admin.from('locations').select('id, name').eq('id', locationId).single(),
    admin.from('shift_clock_ins')
      .select('id, employee_id, clock_in_at, clock_out_at')
      .eq('location_id', locationId)
      .eq('work_date', businessDate),
  ])

  // Try to fetch with kiosk_pin_hash; fall back if the column doesn't exist yet
  let employees: any[] | null = null
  const { data: withPin, error: pinErr } = await admin.from('employees')
    .select('id, full_name, position, kiosk_pin_hash')
    .eq('location_id', locationId)
    .neq('status', 'inactive')
    .order('full_name')
  if (!pinErr) {
    employees = withPin
  } else {
    const { data: withoutPin } = await admin.from('employees')
      .select('id, full_name, position')
      .eq('location_id', locationId)
      .neq('status', 'inactive')
      .order('full_name')
    employees = withoutPin
  }

  const result = (employees ?? []).map((emp: any) => {
    const rec = (records ?? []).find(r => r.employee_id === emp.id) ?? null
    return {
      id: emp.id,
      full_name: emp.full_name,
      position: emp.position,
      has_pin: !!emp.kiosk_pin_hash,
      record: rec ? { clock_in_at: rec.clock_in_at, clock_out_at: rec.clock_out_at } : null,
    }
  })

  return NextResponse.json({ location, employees: result })
}
