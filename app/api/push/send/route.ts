import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    webpush.setVapidDetails(
      'mailto:admin@onelink.app',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    const { userId, title, body, url } = await req.json()
    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/employee' })
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    // Remove expired/invalid subscriptions (410 Gone)
    const expired = subs.filter((_, i) => {
      const r = results[i]
      return r.status === 'rejected' && (r as any).reason?.statusCode === 410
    })
    if (expired.length > 0) {
      await supabase.from('push_subscriptions')
        .delete().eq('user_id', userId)
        .in('endpoint', expired.map(s => s.endpoint))
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ sent })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
