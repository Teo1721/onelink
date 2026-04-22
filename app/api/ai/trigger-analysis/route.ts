import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/ai/trigger-analysis
 * Requires an active manager/admin session.
 * Triggers the cron analysis routes server-side (no client-side secret needed).
 * Body: { director: 'cfo' | 'sales' | 'hr' | 'investor' | 'all' }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { director = 'all' } = await req.json().catch(() => ({ director: 'all' }))

  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })

  const base = new URL(req.url).origin

  const routes: Record<string, string> = {
    cfo:      `${base}/api/cron/daily-analysis`,
    sales:    `${base}/api/cron/sales-analysis`,
    hr:       `${base}/api/cron/hr-analysis`,
    investor: `${base}/api/cron/investor-analysis`,
    weekly:   `${base}/api/cron/weekly-summary`,
  }

  const toRun = director === 'all'
    ? Object.values(routes)
    : routes[director] ? [routes[director]] : []

  if (!toRun.length) return NextResponse.json({ error: 'Unknown director' }, { status: 400 })

  const results = await Promise.allSettled(
    toRun.map(url =>
      fetch(`${url}?secret=${secret}`, { method: 'GET' })
        .then(r => r.json())
        .catch(e => ({ error: String(e) }))
    )
  )

  const outcomes = results.map((r, i) => ({
    route: toRun[i],
    result: r.status === 'fulfilled' ? r.value : { error: String(r.reason) },
  }))

  const anyError = outcomes.some(o => o.result?.error)
  return NextResponse.json({ ok: !anyError, outcomes }, { status: anyError ? 207 : 200 })
}
