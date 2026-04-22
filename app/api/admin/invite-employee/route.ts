import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: invite employee by email, then link user_id to their employee record
export async function POST(req: NextRequest) {
  const { employee_id, email, name } = await req.json()
  if (!employee_id || !email) {
    return NextResponse.json({ error: 'employee_id and email are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get('origin') ?? 'http://localhost:3000').replace(/\/$/, '')

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm`,
    data: { full_name: name ?? '' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Auto-confirm the email so the employee can log in with a temp password even if
  // they never click the invite link (invite may expire or go to spam)
  await supabase.auth.admin.updateUserById(data.user.id, { email_confirm: true })

  // Fetch the employee record to get location_id and company info
  const { data: empRow } = await supabase
    .from('employees')
    .select('location_id, locations(company_id)')
    .eq('id', employee_id)
    .maybeSingle()

  const locationId = empRow?.location_id ?? null
  const companyId = (empRow?.locations as any)?.company_id ?? null

  // Link the new user_id to the employee record immediately
  const { error: updateErr } = await supabase
    .from('employees')
    .update({ user_id: data.user.id })
    .eq('id', employee_id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Create user_profiles row with employee role, company_id so login redirects correctly
  await supabase
    .from('user_profiles')
    .upsert(
      { id: data.user.id, role: 'employee', full_name: name ?? '', company_id: companyId },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  // Grant location access so the employee can submit suggestions etc.
  if (locationId) {
    await supabase
      .from('user_access')
      .upsert(
        { user_id: data.user.id, location_id: locationId },
        { onConflict: 'user_id,location_id', ignoreDuplicates: true }
      )
  }

  return NextResponse.json({ ok: true, user_id: data.user.id })
}
