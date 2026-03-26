import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Body {
  name: string
  type: string
  currency: string
  country: string
  city: string
  address: string
  phone: string
  notes: string
  vat_default: number
  default_margin: number
  cost_method: string
  use_inventory: boolean
  use_recipes: boolean
  use_price_calculator: boolean
  use_daily_reports: boolean
}

export async function POST(req: NextRequest) {
  // 1. Authenticate via server (cookie) client
  const supabase = await createServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get company_id from user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Brak profilu użytkownika lub company_id' }, { status: 400 })
  }

  const companyId: string = profile.company_id
  const admin = createAdminClient()
  const body: Body = await req.json()
  const { name, type, currency, country, city, address, phone, notes,
          vat_default, default_margin, cost_method,
          use_inventory, use_recipes, use_price_calculator, use_daily_reports } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nazwa lokalizacji jest wymagana' }, { status: 400 })
  }

  // 3. Find or create brand for this company
  const { data: existingBrand } = await admin
    .from('brands')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()

  let brandId: string

  if (existingBrand?.id) {
    brandId = existingBrand.id as string
  } else {
    const { data: newBrand, error: brandErr } = await admin
      .from('brands')
      .insert({ company_id: companyId, name })
      .select('id')
      .single()

    if (brandErr || !newBrand?.id) {
      return NextResponse.json({ error: brandErr?.message ?? 'Nie udało się utworzyć marki' }, { status: 500 })
    }
    brandId = newBrand.id as string
  }

  // 4. Insert location — try full payload, fall back to minimal on schema error
  let locationId: string | null = null

  const fullPayload = {
    name, company_id: companyId, brand_id: brandId,
    type, currency, country, city, address, phone, notes,
    vat_default, default_margin, cost_method,
    use_inventory, use_recipes, use_price_calculator, use_daily_reports,
  }

  const { data: loc, error: locErr } = await admin
    .from('locations')
    .insert(fullPayload)
    .select('id')
    .single()

  if (!locErr && loc?.id) {
    locationId = loc.id as string
  } else {
    // Fallback: minimal insert (handles tables missing the extra columns)
    const { data: fallback, error: fallbackErr } = await admin
      .from('locations')
      .insert({ name, company_id: companyId, brand_id: brandId })
      .select('id')
      .single()

    if (fallbackErr || !fallback?.id) {
      return NextResponse.json(
        { error: fallbackErr?.message ?? 'Nie udało się utworzyć lokalizacji' },
        { status: 500 },
      )
    }
    locationId = fallback.id as string
  }

  // 5. Grant the user access to the location
  const { error: accessErr } = await admin
    .from('user_access')
    .insert({ user_id: user.id, location_id: locationId })

  if (accessErr) {
    // Location was created; access failed — surface as warning, not hard error
    return NextResponse.json({ ok: true, location_id: locationId, warning: accessErr.message })
  }

  return NextResponse.json({ ok: true, location_id: locationId })
}
