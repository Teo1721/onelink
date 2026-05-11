/**
 * POST /api/ksef/import
 * Body: { ksefInvoiceId: string, locationId: string, invoiceType: 'COS' | 'SEMIS' }
 *
 * Promotes a staged ksef_invoices row into the main invoices table
 * (same structure as a manually entered invoice), marks it as ksef_imported.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { ksefInvoiceId, locationId, invoiceType, force } = await req.json()
    if (!ksefInvoiceId || !locationId || !invoiceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch staged invoice
    const { data: staged, error: fetchErr } = await supabase
      .from('ksef_invoices')
      .select('*')
      .eq('id', ksefInvoiceId)
      .single()

    if (fetchErr || !staged) {
      return NextResponse.json({ error: 'Staged invoice not found' }, { status: 404 })
    }

    if (staged.status === 'imported') {
      return NextResponse.json({ error: 'Already imported' }, { status: 409 })
    }

    // Duplicate detection — check if this invoice already exists in the main invoices table
    const { data: existingByRef } = await supabase
      .from('invoices')
      .select('id, invoice_number, supplier_name')
      .eq('ksef_reference', staged.ksef_reference_number)
      .maybeSingle()

    if (existingByRef) {
      return NextResponse.json(
        { error: `Duplikat: ta faktura (${staged.invoice_number}) została już zaimportowana.`, duplicate: true },
        { status: 409 },
      )
    }

    // Secondary check — same supplier + invoice number (catches manual duplicates)
    // Allow override with force=true
    if (!force) {
      const { data: existingByNumber } = await supabase
        .from('invoices')
        .select('id')
        .eq('supplier_name', staged.supplier_name)
        .eq('invoice_number', staged.invoice_number)
        .maybeSingle()

      if (existingByNumber) {
        return NextResponse.json(
          { error: `Możliwy duplikat: faktura ${staged.invoice_number} od ${staged.supplier_name} już istnieje. Importować mimo to?`, duplicate: true, duplicateWarning: true },
          { status: 409 },
        )
      }
    }

    // Get location's company_id
    const { data: location } = await supabase
      .from('locations')
      .select('company_id')
      .eq('id', locationId)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const items = (staged.items_json as any[]) || []
    const totalNet   = staged.total_net   || 0
    const totalGross = staged.total_gross || 0
    const totalVat   = staged.total_vat   || totalGross - totalNet

    // Insert into main invoices table
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        location_id:    locationId,
        company_id:     location.company_id,
        invoice_type:   invoiceType,
        supplier_name:  staged.supplier_name,
        invoice_number: staged.invoice_number,
        service_date:   staged.sale_date,
        receipt_date:   staged.issue_date,
        total_net:      totalNet,
        total_vat:      totalVat,
        total_gross:    totalGross,
        payment_method: 'przelew',
        status:         'submitted',
        ksef_reference: staged.ksef_reference_number,
      })
      .select('id')
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: invErr?.message || 'Insert failed' }, { status: 500 })
    }

    // Insert line items
    if (items.length > 0) {
      const lineItems = items.map((it: any, idx: number) => ({
        invoice_id:   invoice.id,
        line_number:  idx + 1,
        product_name: it.name        || 'Pozycja',
        cos_category: invoiceType === 'COS' ? (it.category || 'inne_cos') : null,
        quantity:     it.quantity    || 1,
        unit:         it.unit        || 'szt',
        net_price:    it.netPrice    || 0,
        net_value:    it.netValue    || 0,
        vat_rate:     it.vatRate     || 0.08,
        gross_value:  it.grossValue  || 0,
      }))
      await supabase.from('invoice_items').insert(lineItems)
    }

    // Mark staged invoice as imported
    await supabase
      .from('ksef_invoices')
      .update({ status: 'imported', imported_invoice_id: invoice.id, imported_at: new Date().toISOString() })
      .eq('id', ksefInvoiceId)

    return NextResponse.json({ ok: true, invoiceId: invoice.id })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
