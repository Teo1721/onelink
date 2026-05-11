/**
 * POST /api/ksef/sync          — manual trigger from UI (body: { companyId })
 * GET  /api/ksef/sync?secret=  — Vercel Cron (every 4h)
 *
 * Uses KSeF 2.0 API (api.ksef.mf.gov.pl/v2).
 */

export const runtime    = 'nodejs'   // must be Node.js for node:crypto (RSA encryption)
export const maxDuration = 300       // allow up to 5 minutes (Vercel Pro)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ksefGetAccessToken,
  ksefRevokeSession,
  ksefQueryInvoiceMetadata,
  ksefDownloadInvoice,
  parseKsefXml,
  type KsefCredentials,
} from '@/lib/ksef'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return syncAllCompanies()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { companyId } = body
  if (companyId) return syncOneCompany(companyId)
  return syncAllCompanies()
}

// ─── Sync all companies ───────────────────────────────────────────────────────

async function syncAllCompanies(): Promise<NextResponse> {
  const supabase = createAdminClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, ksef_nip, ksef_token, ksef_env')
    .not('ksef_nip', 'is', null)
    .not('ksef_token', 'is', null)

  if (!companies?.length) {
    return NextResponse.json({ ok: true, message: 'No companies with KSeF configured' })
  }

  const results = []
  for (const company of companies) {
    const result = await syncCompany(company)
    results.push({ company: company.name, ...result })
  }

  return NextResponse.json({ ok: true, results })
}

// ─── Sync one company (UI trigger) ───────────────────────────────────────────

async function syncOneCompany(companyId: string): Promise<NextResponse> {
  const supabase = createAdminClient()
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, ksef_nip, ksef_token, ksef_env')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }
  if (!company.ksef_nip || !company.ksef_token) {
    return NextResponse.json(
      { error: 'KSeF credentials not configured. Go to Admin → Ustawienia → Integracje.' },
      { status: 400 },
    )
  }

  // Route-level safety net: if syncCompany hangs for any reason, return after 4 minutes
  const result = await Promise.race([
    syncCompany(company),
    new Promise<{ imported: number; skipped: number; errors: number; errorDetails: string[] }>(resolve =>
      setTimeout(() => resolve({ imported: 0, skipped: 0, errors: 1, errorDetails: ['KSeF sync timed out — the KSeF server did not respond in time. Try again later.'] }), 240_000)
    ),
  ])
  return NextResponse.json({ ok: true, ...result })
}

// ─── Core sync per company ────────────────────────────────────────────────────

async function syncCompany(company: {
  id: string; name: string
  ksef_nip: string; ksef_token: string; ksef_env?: string
}) {
  const supabase = createAdminClient()

  const creds: KsefCredentials = {
    nip:   company.ksef_nip,
    token: company.ksef_token,
    env:   company.ksef_env || 'prod',
  }

  // Date range: from last sync (or 30 days ago) to now
  const { data: lastSync } = await supabase
    .from('ksef_sync_log')
    .select('synced_to')
    .eq('company_id', company.id)
    .order('synced_to', { ascending: false })
    .limit(1)
    .single()

  // Always look back at least 7 days so rate-limited invoices get retried
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const dateFrom = lastSync?.synced_to
    ? new Date(Math.min(new Date(lastSync.synced_to).getTime(), sevenDaysAgo)).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const dateTo = new Date().toISOString()

  let accessToken: string | null = null
  const imported: string[] = []
  const skipped:  string[] = []
  const errors:   string[] = []

  try {
    // Authenticate with KSeF 2.0 (RSA challenge/response)
    console.log(`[KSeF] Authenticating company ${company.name}…`)
    accessToken = await ksefGetAccessToken(creds)
    console.log(`[KSeF] Auth OK. Querying invoices from ${dateFrom} to ${dateTo}…`)

    let pageOffset = 0
    const pageSize  = 100

    while (true) {
      console.log(`[KSeF] Query page offset=${pageOffset}…`)
      const { items, hasMore } = await ksefQueryInvoiceMetadata(accessToken, creds, {
        dateFrom, dateTo, pageOffset, pageSize,
      })
      console.log(`[KSeF] Got ${items.length} items, hasMore=${hasMore}`)

      if (!items.length) break

      // Batch-check which refs are already in DB (one query per page instead of one per invoice)
      const refs = items.map(m => m.ksefReferenceNumber).filter(Boolean)
      console.log(`[KSeF] Checking DB for ${refs.length} refs…`)
      const { data: existing } = await supabase
        .from('ksef_invoices')
        .select('ksef_reference_number')
        .in('ksef_reference_number', refs.length ? refs : ['__none__'])
      const alreadyHave = new Set((existing ?? []).map((r: any) => r.ksef_reference_number))
      console.log(`[KSeF] ${alreadyHave.size} already in DB, ${refs.length - alreadyHave.size} new`)

      // Split into new vs already-have
      const toDownload: string[] = []
      for (const meta of items) {
        const ref = meta.ksefReferenceNumber
        if (!ref) continue
        if (alreadyHave.has(ref)) { skipped.push(ref); continue }
        toDownload.push(ref)
      }

      // Download 5 invoices in parallel to stay within KSeF rate limits
      const BATCH = 5
      for (let b = 0; b < toDownload.length; b += BATCH) {
        await Promise.all(toDownload.slice(b, b + BATCH).map(async (ref) => {
          try {
            console.log(`[KSeF] Downloading ${ref}…`)
            const xml    = await ksefDownloadInvoice(accessToken!, ref, creds)
            const parsed = parseKsefXml(xml, ref)

            await supabase.from('ksef_invoices').insert({
              company_id:            company.id,
              ksef_reference_number: ref,
              invoice_number:        parsed.invoiceNumber,
              supplier_name:         parsed.supplierName,
              supplier_nip:          parsed.supplierNip,
              issue_date:            parsed.issueDate,
              sale_date:             parsed.saleDate,
              total_net:             parsed.totalNet,
              total_vat:             parsed.totalVat,
              total_gross:           parsed.totalGross,
              currency:              parsed.currency,
              raw_xml:               xml,
              items_json:            parsed.items,
              status:                'pending_review',
            })
            imported.push(ref)
          } catch (e) {
            errors.push(`${ref}: ${(e as Error).message}`)
          }
        }))
      }

      if (!hasMore) break
      pageOffset += 1   // pageOffset is a page index (0, 1, 2…), not a record offset
    }

    // Only advance the cursor when at least something was processed successfully.
    // If every download was rate-limited (0 imported, 0 skipped) leave no log entry
    // so the next sync retries from the same dateFrom window.
    if (imported.length > 0 || skipped.length > 0) {
      await supabase.from('ksef_sync_log').insert({
        company_id:    company.id,
        synced_from:   dateFrom,
        synced_to:     dateTo,
        imported:      imported.length,
        skipped:       skipped.length,
        errors:        errors.length,
        error_details: errors.length ? errors : null,
      })
    }

    return { imported: imported.length, skipped: skipped.length, errors: errors.length, errorDetails: errors }

  } catch (err) {
    return { imported: 0, skipped: 0, errors: 1, errorDetails: [(err as Error).message] }
  } finally {
    // Fire-and-forget: never await revoke — it must NOT block the response
    if (accessToken) {
      ksefRevokeSession(accessToken, creds).catch(() => {})
    }
  }
}
