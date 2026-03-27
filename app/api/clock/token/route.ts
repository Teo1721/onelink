import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateClockToken, tokenSecondsLeft } from '@/lib/clock-token'

/**
 * GET /api/clock/token?locationId=<uuid>
 *
 * Returns a fresh QR token for the given location.
 * Caller must be authenticated (ops manager or admin).
 */
export async function GET(req: NextRequest) {
  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = req.nextUrl.searchParams.get('locationId')
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

  // Verify the caller has access to this location
  const { data: access } = await supabase
    .from('user_access')
    .select('location_id')
    .eq('user_id', user.id)
    .eq('location_id', locationId)
    .maybeSingle()

  if (!access) return NextResponse.json({ error: 'Brak dostępu do tej lokalizacji' }, { status: 403 })

  const token      = generateClockToken(locationId)
  const expiresIn  = tokenSecondsLeft(token)
  const origin     = req.headers.get('origin') || req.nextUrl.origin
  const clockUrl   = `${origin}/clock?token=${encodeURIComponent(token)}`

  return NextResponse.json({ token, clockUrl, expiresIn })
}
