import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'

function hashPin(employeeId: string, pin: string): string {
  const secret = process.env.PIN_KIOSK_SECRET ?? 'onelink-kiosk-secret'
  return createHmac('sha256', secret).update(`${employeeId}:${pin}`).digest('hex')
}

/** POST /api/employees/set-pin
 *  Body: { employee_id, pin }  — pin = '' to clear
 *  Requires manager session with access to the employee's location.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employee_id, pin } = await req.json()
  if (!employee_id) return NextResponse.json({ error: 'employee_id wymagany' }, { status: 400 })

  const admin = createAdminClient()

  const { data: emp } = await admin
    .from('employees').select('id, location_id').eq('id', employee_id).maybeSingle()
  if (!emp) return NextResponse.json({ error: 'Pracownik nie znaleziony' }, { status: 404 })

  const { data: access } = await admin
    .from('user_access').select('location_id')
    .eq('user_id', user.id).eq('location_id', emp.location_id).maybeSingle()
  if (!access) return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })

  const pinHash = pin ? hashPin(employee_id, pin) : null
  const { error } = await admin.from('employees').update({ kiosk_pin_hash: pinHash }).eq('id', employee_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
