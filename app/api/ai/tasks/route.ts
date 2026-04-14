import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DIRECTOR_NAMES: Record<string, string> = {
  profit: 'Marek (Finanse)',
  hr: 'Ania (HR)',
  inventory: 'Kuba (Magazyn)',
  revenue: 'Zofia (Przychody)',
}

async function sendTaskEmail(type: 'task_assigned' | 'task_completed', payload: Record<string, any>) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, recipientEmail: payload.recipientEmail, recipientName: payload.recipientName, payload }),
    })
  } catch { /* non-critical */ }
}

/* ── GET: fetch tasks or locations list ── */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'Brak firmy' }, { status: 400 })

  // ?locations=1 → return company locations for the assign dropdown
  if (req.nextUrl.searchParams.get('locations') === '1') {
    const { data: locations } = await admin
      .from('locations')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .order('name')
    return NextResponse.json({ locations: locations ?? [] })
  }

  const completedOnly = req.nextUrl.searchParams.get('completed') === '1'

  // Owner sees all tasks for their company
  if (profile.role === 'owner') {
    let q = admin.from('director_tasks').select('*').eq('company_id', profile.company_id)
    if (completedOnly) q = q.eq('status', 'done')
    const { data: tasks } = await q.order('created_at', { ascending: false })
    return NextResponse.json({ tasks: tasks ?? [] })
  }

  // Manager/ops sees tasks for locations they have access to
  const { data: access } = await admin
    .from('user_access')
    .select('location_id')
    .eq('user_id', user.id)
  const locationIds = access?.map((a: any) => a.location_id) ?? []

  if (locationIds.length === 0) return NextResponse.json({ tasks: [] })

  let q = admin.from('director_tasks').select('*').in('location_id', locationIds)
  if (completedOnly) q = q.eq('status', 'done')
  const { data: tasks } = await q.order('created_at', { ascending: false })

  return NextResponse.json({ tasks: tasks ?? [] })
}

/* ── POST: create a task assigned to a location ── */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { director, task_text, location_id, location_name } = await req.json()
  if (!director || !task_text || !location_id) {
    return NextResponse.json({ error: 'Brakujące dane' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles').select('company_id, full_name').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'Brak firmy' }, { status: 400 })

  const { data: task, error } = await admin.from('director_tasks').insert({
    company_id:       profile.company_id,
    director,
    task_text,
    location_id,
    location_name:    location_name ?? null,
    assigned_by:      user.id,
    assigned_by_name: profile.full_name ?? null,
    status:           'pending',
    briefing_date:    new Date().toLocaleDateString('sv-SE'),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email to all managers at this location (fire-and-forget)
  const { data: managers } = await admin
    .from('user_access')
    .select('user_id, user_profiles(full_name, email)')
    .eq('location_id', location_id)

  const directorName = DIRECTOR_NAMES[director] ?? director
  for (const m of managers ?? []) {
    const p = (m as any).user_profiles
    if (p?.email) {
      sendTaskEmail('task_assigned', {
        recipientEmail: p.email,
        recipientName: p.full_name ?? p.email,
        directorName,
        locationName: location_name ?? '',
        taskText: task_text,
      })
    }
  }

  return NextResponse.json({ task })
}

/* ── PATCH: mark task as done ── */
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'Brakujące id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: task, error } = await admin
    .from('director_tasks')
    .update({ status: 'done', note: note ?? null, completed_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify owner that task was completed (fire-and-forget)
  if (task) {
    const { data: ownerProfile } = await admin
      .from('user_profiles')
      .select('email, full_name')
      .eq('company_id', task.company_id)
      .eq('role', 'owner')
      .maybeSingle()

    if (ownerProfile?.email) {
      sendTaskEmail('task_completed', {
        recipientEmail: ownerProfile.email,
        recipientName: ownerProfile.full_name ?? ownerProfile.email,
        locationName: task.location_name ?? '',
        taskText: task.task_text,
        note: task.note,
      })
    }
  }

  return NextResponse.json({ task })
}
