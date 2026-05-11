/**
 * GET /api/onboarding/status?companyId=
 * Returns completion status of each onboarding step for a company.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  const supabase = createAdminClient()

  const [
    locationsRes,
    invoicesRes,
    ksefRes,
    employeesRes,
    salesRes,
    ingredientsRes,
  ] = await Promise.all([
    supabase.from('locations').select('id').eq('company_id', companyId).limit(1),
    supabase.from('invoices').select('id').eq('company_id', companyId).limit(1),
    supabase.from('companies').select('ksef_nip, ksef_token').eq('id', companyId).single(),
    supabase.from('user_profiles').select('id').eq('company_id', companyId).neq('role', 'owner').limit(1),
    supabase.from('sales_daily').select('id')
      .in('location_id',
        (await supabase.from('locations').select('id').eq('company_id', companyId)).data?.map(l => l.id) ?? ['__none__']
      ).limit(1),
    supabase.from('ingredients').select('id').eq('company_id', companyId).limit(1),
  ])

  const steps = [
    { id: 'account',     label: 'Konto założone',              done: true,   url: null },
    { id: 'location',    label: 'Dodaj pierwszy lokal',         done: (locationsRes.data?.length ?? 0) > 0,   url: '/admin/setup' },
    { id: 'invoice',     label: 'Prześlij pierwszą fakturę',    done: (invoicesRes.data?.length ?? 0) > 0,    url: '/ops' },
    { id: 'ksef',        label: 'Skonfiguruj KSeF',             done: !!(ksefRes.data?.ksef_nip && ksefRes.data?.ksef_token), url: '/admin/settings' },
    { id: 'employee',    label: 'Zaproś pracownika / managera', done: (employeesRes.data?.length ?? 0) > 0,   url: '/ops' },
    { id: 'sales',       label: 'Wprowadź pierwszą sprzedaż',   done: (salesRes.data?.length ?? 0) > 0,      url: '/ops' },
    { id: 'ingredients', label: 'Dodaj składniki do magazynu',  done: (ingredientsRes.data?.length ?? 0) > 0, url: '/ops' },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  return NextResponse.json({ steps, completedCount, total: steps.length, allDone })
}
