import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: resolve + backfill location data for the currently-authenticated employee.
// Uses admin client to bypass RLS — safe because we verify the session first.
export async function GET() {
  // Verify session server-side
  const userClient = await createClient()
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find the employee record (admin client bypasses RLS)
  const { data: emp } = await admin
    .from('employees')
    .select('id, location_id, email')
    .eq('user_id', user.id)
    .maybeSingle()

  // If no match by user_id, try by email and backfill user_id
  let employee = emp
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

  // If employee has no location_id, try to find it via user_access
  if (!locationId) {
    const { data: access } = await admin
      .from('user_access')
      .select('location_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (access?.location_id) locationId = access.location_id
  }

  // Backfill everything if we have a location
  if (locationId) {
    // Get company_id from the location
    const { data: loc } = await admin
      .from('locations')
      .select('company_id')
      .eq('id', locationId)
      .maybeSingle()
    const companyId = loc?.company_id ?? null

    // Backfill employee.location_id
    if (!employee.location_id) {
      await admin.from('employees').update({ location_id: locationId }).eq('id', employee.id)
    }

    // Backfill user_profiles.company_id if missing
    if (companyId) {
      await admin.from('user_profiles').update({ company_id: companyId }).eq('id', user.id).is('company_id', null)
    }

    // Ensure user_access record exists
    await admin.from('user_access').upsert(
      { user_id: user.id, location_id: locationId },
      { onConflict: 'user_id,location_id', ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ location_id: locationId, employee_id: employee.id })
}
