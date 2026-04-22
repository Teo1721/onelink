import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'

function hashPin(employeeId: string, pin: string): string {
  const secret = process.env.PIN_KIOSK_SECRET ?? 'onelink-kiosk-secret'
  return createHmac('sha256', secret).update(`${employeeId}:${pin}`).digest('hex')
}

const BUCKET = 'clock-photos'

async function uploadPhoto(
  admin: ReturnType<typeof createAdminClient>,
  base64: string,
  path: string,
): Promise<string | null> {
  try {
    const b64 = base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(b64, 'base64')
    const { error: cbErr } = await admin.storage.createBucket(BUCKET, { public: true })
    if (cbErr && !cbErr.message.includes('already exists')) console.error('[uploadPhoto] createBucket error:', cbErr.message)
    const { error: ubErr } = await admin.storage.updateBucket(BUCKET, { public: true })
    if (ubErr) console.error('[uploadPhoto] updateBucket error:', ubErr.message)
    const { data: uploaded, error } = await admin.storage
      .from(BUCKET).upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
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
 * POST /api/clock/pin-action
 * Body: { employee_id, pin, action: 'in'|'out', photo_base64?, location_id }
 * Requires manager session — the company device must be logged in as a manager.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sesja wygasła. Zaloguj się ponownie.' }, { status: 401 })

  const { employee_id, pin, action, photo_base64, location_id } = await req.json()
  if (!employee_id || !pin || !location_id || !action) {
    return NextResponse.json({ error: 'Brakujące dane' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify manager has access to this location
  const { data: access } = await admin
    .from('user_access').select('location_id')
    .eq('user_id', user.id).eq('location_id', location_id).maybeSingle()
  if (!access) return NextResponse.json({ error: 'Brak dostępu do lokalizacji' }, { status: 403 })

  // Get employee with PIN hash — fall back if column doesn't exist yet
  let employee: any = null
  const { data: withPin, error: pinColErr } = await admin
    .from('employees')
    .select('id, full_name, position, user_id, location_id, kiosk_pin_hash')
    .eq('id', employee_id)
    .eq('location_id', location_id)
    .maybeSingle()
  if (!pinColErr) {
    employee = withPin
  } else {
    const { data: withoutPin } = await admin
      .from('employees')
      .select('id, full_name, position, user_id, location_id')
      .eq('id', employee_id)
      .eq('location_id', location_id)
      .maybeSingle()
    employee = withoutPin
  }

  if (!employee) return NextResponse.json({ error: 'Pracownik nie znaleziony' }, { status: 404 })
  if (!employee.kiosk_pin_hash) {
    return NextResponse.json({ error: 'PIN nie ustawiony. Skontaktuj się z managerem.' }, { status: 400 })
  }

  // Verify PIN
  if (hashPin(employee_id, pin) !== employee.kiosk_pin_hash) {
    return NextResponse.json({ error: 'Nieprawidłowy PIN' }, { status: 401 })
  }

  // Business day cutoff — shifts before 6 AM belong to the previous calendar day
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

  // Find existing record for today's business date
  let { data: record } = await admin
    .from('shift_clock_ins')
    .select('id, work_date, clock_in_at, clock_out_at, clock_in_photo_url, clock_out_photo_url')
    .eq('employee_id', employee_id)
    .eq('location_id', location_id)
    .eq('work_date', businessDate)
    .maybeSingle()

  // Fallback: look for any unclosed shift in the past 24 h (handles overnight edge cases)
  if (!record) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data: openShift } = await admin
      .from('shift_clock_ins')
      .select('id, work_date, clock_in_at, clock_out_at, clock_in_photo_url, clock_out_photo_url')
      .eq('employee_id', employee_id)
      .eq('location_id', location_id)
      .is('clock_out_at', null)
      .gte('clock_in_at', cutoff)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    record = openShift
  }

  // Upload photo
  let photoUrl: string | null = null
  if (photo_base64) {
    const ts = Date.now()
    const path = `${location_id}/${employee_id}/${businessDate}_${action}_${ts}.jpg`
    photoUrl = await uploadPhoto(admin, photo_base64, path)
  }

  if (action === 'in') {
    if (record?.clock_in_at) return NextResponse.json({ error: 'Zmiana już otwarta.' }, { status: 409 })
    const { data: newRecord, error } = await admin.from('shift_clock_ins').insert({
      employee_id: employee.id,
      user_id: employee.user_id ?? null,
      location_id,
      work_date: businessDate,
      clock_in_at: new Date().toISOString(),
      clock_in_photo_url: photoUrl,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      ok: true, record: newRecord, photo_url: photoUrl,
      employee: { full_name: employee.full_name, position: employee.position },
    })
  }

  if (action === 'out') {
    if (!record?.id) return NextResponse.json({ error: 'Brak otwartej zmiany.' }, { status: 409 })
    if (record.clock_out_at) return NextResponse.json({ error: 'Zmiana już zakończona.' }, { status: 409 })
    const { data: updated, error } = await admin.from('shift_clock_ins')
      .update({ clock_out_at: new Date().toISOString(), clock_out_photo_url: photoUrl })
      .eq('id', record.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      ok: true, record: updated, photo_url: photoUrl,
      employee: { full_name: employee.full_name, position: employee.position },
    })
  }

  return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 })
}
