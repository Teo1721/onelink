import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json()
    if (!subscription || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { endpoint, keys } = subscription
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'user_id,endpoint' }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
