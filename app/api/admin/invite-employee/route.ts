import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: invite employee by email, then link user_id to their employee record
export async function POST(req: NextRequest) {
  const { employee_id, email, name } = await req.json()
  if (!employee_id || !email) {
    return NextResponse.json({ error: 'employee_id and email are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/employee`,
    data: { full_name: name ?? '' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Link the new user_id to the employee record immediately
  const { error: updateErr } = await supabase
    .from('employees')
    .update({ user_id: data.user.id })
    .eq('id', employee_id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id: data.user.id })
}
