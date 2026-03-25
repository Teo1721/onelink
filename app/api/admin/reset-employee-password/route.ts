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

  return NextResponse.json({ ok: true, tempPassword })
}
