import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateClockToken } from '@/lib/clock-token'

type Action = 'status' | 'in' | 'out'

const BUCKET = 'clock-photos'

/** Upload a base64 JPEG to Supabase Storage. Returns public URL or null. */
async function uploadPhoto(
  admin: ReturnType<typeof createAdminClient>,
  base64: string,
  path: string,
): Promise<string | null> {
  try {
    // Strip data-URL prefix if present
    const b64 = base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(b64, 'base64')

    // Ensure bucket exists and is public
    const { error: cbErr } = await admin.storage.createBucket(BUCKET, { public: true })
    if (cbErr && !cbErr.message.includes('already exists')) console.error('[uploadPhoto] createBucket error:', cbErr.message)
    const { error: ubErr } = await admin.storage.updateBucket(BUCKET, { public: true })
    if (ubErr) console.error('[uploadPhoto] updateBucket error:', ubErr.message)

    const { data: uploaded, error } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

    if (error) { console.error('[uploadPhoto] storage error:', error.message); return null }
    if (!uploaded?.path) { console.error('[uploadPhoto] no path returned'); return null }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(uploaded.path)
    return urlData?.publicUrl ?? null
  } catch (e) {
    console.error('[uploadPhoto] exception:', e)
    return null
  }
}

/**
 * POST /api/clock/action
 * Body: { token, employee_id, action: 'status'|'in'|'out', photo_base64?: string }
 *
 * No session auth — the QR token proves physical presence.
 */
export async function POST(req: NextRequest) {
  const body: { token?: string; employee_id?: string; action?: Action; photo_base64?: string } =
    await req.json()
  const { token, employee_id, action = 'status', photo_base64 } = body

  if (!token)       return NextResponse.json({ error: 'Token wymagany' }, { status: 400 })
  if (!employee_id) return NextResponse.json({ error: 'employee_id wymagany' }, { status: 400 })

  const locationId = validateClockToken(token)
  if (!locationId) {
    return NextResponse.json(
      { error: 'Kod QR wygasł lub jest nieprawidłowy. Poproś managera o odświeżenie.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // Verify employee belongs to this location
  const { data: employee } = await admin
    .from('employees')
    .select('id, full_name, position, user_id, location_id')
    .eq('id', employee_id)
    .maybeSingle()

  if (!employee || employee.location_id !== locationId) {
    return NextResponse.json({ error: 'Pracownik nie należy do tej lokalizacji.' }, { status: 403 })
  }

  const { data: location } = await admin
    .from('locations').select('name').eq('id', locationId).single()

  // Business day: before 6 AM belongs to the previous day's shift
  // e.g. restaurant closes at 3 AM — clock-out at 2:30 AM is still Monday's shift
  const BUSINESS_DAY_CUTOFF = 6
  const now = new Date()
  const businessDate = (() => {
    if (now.getHours() < BUSINESS_DAY_CUTOFF) {
      const prev = new Date(now)
      prev.setDate(prev.getDate() - 1)
      return prev.toLocaleDateString('sv-SE')
    }
    return now.toLocaleDateString('sv-SE')
  })()

  // Look for an open shift on today's business date.
  // Also fall back to an unclosed shift from yesterday to handle cross-day edge cases.
  let { data: record } = await admin
    .from('shift_clock_ins')
    .select('id, work_date, clock_in_at, clock_out_at, clock_in_photo_url, clock_out_photo_url')
    .eq('employee_id', employee_id)
    .eq('location_id', locationId)
    .eq('work_date', businessDate)
    .maybeSingle()

  // If no record found on business date, look for any unclosed shift in the past 24 h
  if (!record) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data: openShift } = await admin
      .from('shift_clock_ins')
      .select('id, work_date, clock_in_at, clock_out_at, clock_in_photo_url, clock_out_photo_url')
      .eq('employee_id', employee_id)
      .eq('location_id', locationId)
      .is('clock_out_at', null)
      .gte('clock_in_at', cutoff)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    record = openShift
  }

  const today = businessDate

  if (action === 'status') {
    return NextResponse.json({
      ok: true,
      location: { id: locationId, name: location?.name },
      employee: { id: employee.id, full_name: employee.full_name, position: employee.position },
      record: record ?? null,
      today,
    })
  }

  // Upload photo if provided
  let photoUrl: string | null = null
  if (photo_base64) {
    const ts   = Date.now()
    const path = `${locationId}/${employee_id}/${today}_${action}_${ts}.jpg`
    photoUrl   = await uploadPhoto(admin, photo_base64, path)
  }

  if (action === 'in') {
    if (record?.clock_in_at) {
      return NextResponse.json({ error: 'Zmiana już otwarta.' }, { status: 409 })
    }
    const { data: newRecord, error } = await admin
      .from('shift_clock_ins')
      .insert({
        employee_id: employee.id,
        user_id: employee.user_id ?? null,
        location_id: locationId,
        work_date: today,
        clock_in_at: new Date().toISOString(),
        clock_in_photo_url: photoUrl,
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, record: newRecord, photo_url: photoUrl })
  }

  if (action === 'out') {
    if (!record?.id)         return NextResponse.json({ error: 'Brak otwartej zmiany.' }, { status: 409 })
    if (record.clock_out_at) return NextResponse.json({ error: 'Zmiana już zakończona.' }, { status: 409 })

    const { data: updated, error } = await admin
      .from('shift_clock_ins')
      .update({
        clock_out_at: new Date().toISOString(),
        clock_out_photo_url: photoUrl,
      })
      .eq('id', record.id)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, record: updated, photo_url: photoUrl })
  }

  return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 })
}
