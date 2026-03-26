import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: resolve + backfill location data for the currently-authenticated employee.
// Uses admin client to bypass RLS — safe because we verify the session first.
export async function GET() {
  const userClient = await createClient()
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find the employee record by user_id (admin bypasses RLS)
  let employee: { id: string; location_id: string | null; email: string | null } | null = null

  const { data: byUserId } = await admin
    .from('employees')
    .select('id, location_id, email')
    .eq('user_id', user.id)
    .maybeSingle()
  employee = byUserId ?? null

  // Fallback: match by email and backfill user_id
  if (!employee && user.email) {
    const { data: byEmail } = await admin
      .from('employees')
      .select('id, location_id, email')
      .eq('email', user.email)
      .maybeSingle()
    if (byEmail) {
      employee = byEmail
      await admin.from('employees').update({ user_id: user.id }).eq('id', byEmail.id)
    }
  }

  if (!employee) {
    return NextResponse.json({ location_id: null })
  }

  let locationId: string | null = employee.location_id ?? null

  // Try user_access
  if (!locationId) {
    const { data: access } = await admin
      .from('user_access')
      .select('location_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (access?.location_id) locationId = access.location_id
  }

  // Try past shift_suggestions — they always store location_id
  if (!locationId) {
    const { data: sugg } = await admin
      .from('shift_suggestions')
      .select('location_id')
      .eq('user_id', user.id)
      .not('location_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (sugg?.location_id) locationId = sugg.location_id
  }

  // Try past shifts
  if (!locationId) {
    const { data: shift } = await admin
      .from('shifts')
      .select('location_id')
      .or(`user_id.eq.${user.id},employee_id.eq.${employee.id}`)
      .not('location_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (shift?.location_id) locationId = (shift as any).location_id
  }

  // Backfill everything once we have a location
  if (locationId) {
    const { data: loc } = await admin
      .from('locations')
      .select('company_id')
      .eq('id', locationId)
      .maybeSingle()
    const companyId = loc?.company_id ?? null

    if (!employee.location_id) {
      await admin.from('employees').update({ location_id: locationId }).eq('id', employee.id)
    }
    if (companyId) {
      await admin.from('user_profiles').update({ company_id: companyId }).eq('id', user.id).is('company_id', null)
    }
    await admin.from('user_access').upsert(
      { user_id: user.id, location_id: locationId },
      { onConflict: 'user_id,location_id', ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ location_id: locationId, employee_id: employee.id })
}
