import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  // Generate a random 10-char temporary password
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(user_id, { password: tempPassword })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Backfill location data so employee can send suggestions after logging in
  const { data: empRow } = await supabase
    .from('employees')
    .select('id, location_id, locations(company_id)')
    .eq('user_id', user_id)
    .maybeSingle()

  if (empRow) {
    const locationId = empRow.location_id ?? null
    const companyId = (empRow.locations as any)?.company_id ?? null

    // Ensure user_profiles has company_id set
    if (companyId) {
      await supabase
        .from('user_profiles')
        .update({ company_id: companyId })
        .eq('id', user_id)
        .is('company_id', null)
    }

    // Ensure user_access record exists so employee can use location-gated features
    if (locationId) {
      await supabase
        .from('user_access')
        .upsert(
          { user_id, location_id: locationId },
          { onConflict: 'user_id,location_id', ignoreDuplicates: true }
        )
    }
  }

  return NextResponse.json({ ok: true, tempPassword })
}
