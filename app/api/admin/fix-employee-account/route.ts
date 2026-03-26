import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: given an employee_id, backfill user_access + user_profiles.company_id
// Called by the ops manager after editing/saving an employee.
export async function POST(req: NextRequest) {
  const { employee_id } = await req.json()
  if (!employee_id) return NextResponse.json({ error: 'employee_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Get the employee with their location + company
  const { data: emp } = await admin
    .from('employees')
    .select('id, user_id, location_id, locations(company_id)')
    .eq('id', employee_id)
    .maybeSingle()

  if (!emp?.user_id || !emp?.location_id) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const userId = emp.user_id
  const locationId = emp.location_id
  const companyId = (emp.locations as any)?.company_id ?? null

  // Ensure user_access record exists
  await admin.from('user_access').upsert(
    { user_id: userId, location_id: locationId },
    { onConflict: 'user_id,location_id', ignoreDuplicates: true }
  )

  // Backfill user_profiles.company_id
  if (companyId) {
    await admin.from('user_profiles').update({ company_id: companyId }).eq('id', userId)
  }

  return NextResponse.json({ ok: true, user_id: userId, location_id: locationId, company_id: companyId })
}
