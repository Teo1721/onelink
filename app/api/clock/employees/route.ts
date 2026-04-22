import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateClockToken } from '@/lib/clock-token'

/**
 * GET /api/clock/employees?token=<token>
 *
 * No session auth required — token proves physical presence.
 * Returns active employees for the location + today's clock status for each.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token wymagany' }, { status: 400 })

  const locationId = validateClockToken(token)
  if (!locationId) {
    return NextResponse.json(
      { error: 'Kod QR wygasł. Poproś managera o odświeżenie.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const [{ data: location }, { data: employees }, { data: records }] = await Promise.all([
    admin.from('locations').select('id, name').eq('id', locationId).single(),
    admin.from('employees')
      .select('id, full_name, position')
      .eq('location_id', locationId)
      .neq('status', 'inactive')
      .order('full_name'),
    admin.from('shift_clock_ins')
      .select('id, employee_id, clock_in_at, clock_out_at')
      .eq('location_id', locationId)
      .eq('work_date', new Date().toLocaleDateString('sv-SE')),
  ])

  const result = (employees ?? []).map(emp => {
    const rec = (records ?? []).find(r => r.employee_id === emp.id) ?? null
    return { ...emp, record: rec }
  })

  return NextResponse.json({ location, employees: result })
}
