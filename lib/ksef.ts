/**
 * KSeF 2.0 API client
 * Production: https://api.ksef.mf.gov.pl/v2
 * Test:       https://api-test.ksef.mf.gov.pl/v2
 *
 * Auth flow (token-based):
 *  1. GET  /security/public-key-certificates → MF RSA public key
 *  2. POST /auth/challenge                   → challenge + timestamp (ms)
 *  3. RSA-OAEP-SHA256 encrypt "{token}|{timestamp}" with MF public key
 *  4. POST /auth/ksef-token                  → authenticationToken + referenceNumber
 *  5. GET  /auth/{referenceNumber}           → poll until code 200
 *  6. POST /auth/token/redeem                → accessToken (JWT, ~15 min)
 *  7. Use  Authorization: Bearer {accessToken} on all subsequent calls
 *  8. DELETE /auth/sessions/current          → revoke when done
 */

import { createPublicKey, publicEncrypt, constants } from 'node:crypto'
import https from 'node:https'
import { URL as NodeURL } from 'node:url'

// ─── Base URL ─────────────────────────────────────────────────────────────────

function getBase(env?: string | null): string {
  if (env === 'test') return 'https://api-test.ksef.mf.gov.pl/v2'
  return 'https://api.ksef.mf.gov.pl/v2'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
}

type KsefResponse = { status: number; ok: boolean; headers: Headers; text: string }

/**
 * Low-level HTTP request using node:https directly — bypasses Next.js's patched global
 * fetch.  Uses THREE layers of timeout to guarantee the promise always settles:
 *   1. req.on('socket') → socket.setTimeout  (fires when no bytes arrive for timeoutMs)
 *   2. A hard setTimeout + req.destroy()     (absolute wall-clock deadline)
 *   3. req.on('error') + res.on('error')     (network-level errors)
 */
function ksefFetch(urlStr: string, init: RequestInit, timeoutMs = 20_000): Promise<KsefResponse> {
  return new Promise((resolve, reject) => {
    const parsed  = new NodeURL(urlStr)
    const method  = ((init.method ?? 'GET') as string).toUpperCase()
    const bodyBuf = typeof init.body === 'string' ? Buffer.from(init.body, 'utf8') : null
    const rawHdrs = (init.headers ?? {}) as Record<string, string>

    const endpointName = parsed.pathname.split('/').pop() ?? 'unknown'
    console.log(`[KSeF] → ${method} ${endpointName} timeout=${timeoutMs}ms`)

    const reqHeaders: Record<string, string> = { ...rawHdrs }
    if (bodyBuf) reqHeaders['Content-Length'] = String(bodyBuf.length)

    let done = false
    let hardTimer: ReturnType<typeof setTimeout> | undefined
    let activeSocket: import('net').Socket | null = null
    let socketTimeoutCb: (() => void) | null = null

    const finish = (label: string, fn: () => void) => {
      if (!done) {
        done = true
        if (hardTimer) clearTimeout(hardTimer)
        // Disable socket timeout AND remove the listener to prevent stale firings
        if (activeSocket && socketTimeoutCb) {
          try {
            activeSocket.setTimeout(0)
            activeSocket.removeListener('timeout', socketTimeoutCb)
          } catch (_) { /* ignore */ }
          socketTimeoutCb = null
        }
        console.log(`[KSeF] ← ${endpointName} settled via ${label}`)
        fn()
      }
    }

    const req = https.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || 443,
        path:     parsed.pathname + parsed.search,
        method,
        headers:  reqHeaders,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data',  (c: Buffer) => chunks.push(c))
        res.on('end',   () => finish('response', () => {
          const text   = Buffer.concat(chunks).toString('utf8')
          const status = res.statusCode ?? 0
          resolve({ status, ok: status >= 200 && status < 300, headers: new Headers(res.headers as any), text })
        }))
        res.on('error', (e: Error) => finish('res-error', () => reject(e)))
      },
    )

    // Layer 1: socket-level idle timeout — keep a reference so we can remove it on completion
    req.on('socket', (socket) => {
      activeSocket = socket
      socketTimeoutCb = () => {
        console.log(`[KSeF] socket timeout ${endpointName}, destroying`)
        req.destroy(new Error(`KSeF request timed out after ${timeoutMs / 1000}s (${endpointName})`))
      }
      socket.setTimeout(timeoutMs, socketTimeoutCb)
    })

    // Layer 2: hard wall-clock deadline
    hardTimer = setTimeout(() => {
      console.log(`[KSeF] hard timeout ${endpointName}, destroying`)
      try { req.destroy() } catch (_) { /* ignore */ }
      finish('hard-timeout', () => reject(new Error(`KSeF request timed out after ${timeoutMs / 1000}s (${endpointName})`)))
    }, timeoutMs + 2_000)   // 2s grace after socket timeout

    req.on('error', (e: Error) => finish('req-error', () => reject(e)))

    if (bodyBuf) req.write(bodyBuf)
    req.end()
  })
}

function parseJson({ status, text }: KsefResponse, label: string): any {
  try { return JSON.parse(text) } catch {
    throw new Error(`KSeF ${label}: non-JSON response (HTTP ${status}): ${text.slice(0, 400).replace(/\s+/g, ' ')}`)
  }
}

/** Extract a human-readable message from a KSeF error response body. */
function ksefErrorMessage(text: string): string {
  try {
    const body = JSON.parse(text)
    const details: string[] = body?.status?.details ?? body?.details ?? []
    if (details.length) return details.join(' ')
    const desc: string = body?.status?.description ?? body?.description ?? ''
    if (desc) return desc
  } catch { /* ignore */ }
  return text.slice(0, 300)
}

/**
 * Performs a KSeF request, throws on non-2xx.
 * Retries ONCE on 429 only when Retry-After < 60s (per-second rate limit).
 * Fails immediately for long Retry-After values (per-hour quota exhausted).
 */
async function ksefRequest(url: string, init: RequestInit, label: string): Promise<any> {
  let r = await ksefFetch(url, init)
  console.log(`[KSeF] ${label} → HTTP ${r.status}`)
  if (r.status === 429) {
    const retryAfterSec = parseInt(r.headers.get('Retry-After') ?? '2', 10) || 2
    console.log(`[KSeF] 429 on ${label}, Retry-After=${retryAfterSec}s`)
    if (retryAfterSec < 60) {
      // Per-second burst limit — short wait then retry once
      await new Promise(res => setTimeout(res, (retryAfterSec + 1) * 1000))
      r = await ksefFetch(url, init)
      console.log(`[KSeF] ${label} retry → HTTP ${r.status}`)
    }
    // else: per-hour quota — fall through to !r.ok which throws the user-friendly message
  }
  if (!r.ok) throw new Error(`KSeF ${label} failed (HTTP ${r.status}): ${ksefErrorMessage(r.text)}`)
  return parseJson(r, label)
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/** Fetch the Ministry of Finance's RSA public key for token encryption. */
async function fetchMfPublicKey(base: string): Promise<string> {
  const certs: Array<{ certificate: string; usage?: string[] }> = await ksefRequest(
    `${base}/security/public-key-certificates`,
    { headers: { 'Accept': 'application/json' } },
    'public-key-certificates',
  )
  const enc = certs.find(c => c.usage?.includes('KsefTokenEncryption'))
  if (!enc) throw new Error('KSeF: no KsefTokenEncryption certificate in response')
  return enc.certificate
}

/** Encrypt "{token}|{timestampMs}" with RSA-OAEP-SHA256 using the MF public key. */
function encryptKsefToken(base64DerCert: string, token: string, timestampMs: number): string {
  const lines = base64DerCert.match(/.{1,64}/g) ?? []
  const pem   = ['-----BEGIN CERTIFICATE-----', ...lines, '-----END CERTIFICATE-----'].join('\n')
  const pubKey = createPublicKey(pem)
  const plain  = Buffer.from(`${token}|${timestampMs}`, 'utf8')
  const enc    = publicEncrypt(
    { key: pubKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    plain,
  )
  return enc.toString('base64')
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type KsefCredentials = {
  nip:   string
  token: string
  env?:  string | null
}

export type KsefV2InvoiceMetadata = {
  ksefReferenceNumber: string
  invoicingDate?:      string
  [key: string]:       any
}

// ─── Auth: get access token ───────────────────────────────────────────────────

export async function ksefGetAccessToken(creds: KsefCredentials): Promise<string> {
  const base = getBase(creds.env)

  // 1 — fetch MF public key
  const certBase64 = await fetchMfPublicKey(base)

  // 2 — get challenge
  const challengeData = await ksefRequest(`${base}/auth/challenge`, { method: 'POST', headers: JSON_HEADERS }, 'challenge')
  // Response: { challenge, timestamp (ISO string), timestampMs (Unix ms number), clientIp }
  const { challenge, timestampMs } = challengeData
  if (!challenge || timestampMs == null) {
    throw new Error(`KSeF challenge: unexpected response — ${JSON.stringify(challengeData).slice(0, 200)}`)
  }

  // 3 — encrypt "{token}|{timestampMs}" with RSA-OAEP-SHA256
  const encryptedToken = encryptKsefToken(certBase64, creds.token, timestampMs)

  // 4 — submit auth request
  const authData = await ksefRequest(`${base}/auth/ksef-token`, {
    method:  'POST',
    headers: JSON_HEADERS,
    body:    JSON.stringify({ challenge, contextIdentifier: { type: 'nip', value: creds.nip }, encryptedToken }),
  }, 'ksef-token')
  const referenceNumber = authData?.referenceNumber
  // authenticationToken is an object: { token: "eyJ...", validUntil: "..." }
  const authToken: string = authData?.authenticationToken?.token ?? authData?.authenticationToken
  if (!authToken || !referenceNumber) {
    throw new Error(`KSeF ksef-token: unexpected response — ${JSON.stringify(authData).slice(0, 300)}`)
  }

  // 5 — check authentication status
  // Status is typically available immediately; first check has no delay.
  // If still processing (code 100), retry up to 10× with 1s intervals.
  for (let i = 0; i < 10; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000))
    const r = await ksefFetch(`${base}/auth/${referenceNumber}`, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
    })
    if (!r.ok) throw new Error(`KSeF auth status check failed (HTTP ${r.status}): ${r.text.slice(0, 200)}`)
    const s = parseJson(r, 'auth-status')
    const code    = s?.status?.code ?? s?.code
    const desc    = s?.status?.description ?? ''
    const details = (s?.status?.details ?? []).join('; ')
    if (code === 200) break  // authenticated — proceed to redeem
    if (code != null && code !== 100) {
      throw new Error(`KSeF authentication failed (code ${code}): ${desc}${details ? ' — ' + details : ''}`)
    }
    // code 100 = still processing, wait and retry
  }

  // 6 — redeem access token
  const redeemData = await ksefRequest(`${base}/auth/token/redeem`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
  }, 'token/redeem')
  // accessToken may be an object { token: "eyJ...", validUntil: "..." } — extract .token if so
  const accessTokenRaw = redeemData?.accessToken ?? redeemData?.access_token
  const accessToken: string = typeof accessTokenRaw === 'string' ? accessTokenRaw : accessTokenRaw?.token
  if (!accessToken) {
    throw new Error(`KSeF redeem: no accessToken in response — ${JSON.stringify(redeemData).slice(0, 200)}`)
  }
  return accessToken
}

// ─── Revoke session ───────────────────────────────────────────────────────────

export async function ksefRevokeSession(accessToken: string, creds: KsefCredentials): Promise<void> {
  const base = getBase(creds.env)
  await ksefFetch(`${base}/auth/sessions/current`, {
    method:  'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  }).catch(() => {})
}

// ─── Query received invoices ──────────────────────────────────────────────────

export async function ksefQueryInvoiceMetadata(
  accessToken: string,
  creds: KsefCredentials,
  opts: {
    dateFrom:    string   // ISO datetime
    dateTo:      string
    pageOffset?: number
    pageSize?:   number
  },
): Promise<{ items: KsefV2InvoiceMetadata[]; hasMore: boolean }> {
  const base       = getBase(creds.env)
  const pageOffset = opts.pageOffset ?? 0
  const pageSize   = opts.pageSize   ?? 100  // API max is 250, min is 10

  // pageOffset and pageSize are query parameters (not body fields)
  const url = `${base}/invoices/query/metadata?pageOffset=${pageOffset}&pageSize=${pageSize}`

  const data = await ksefRequest(
    url,
    {
      method:  'POST',
      headers: { ...JSON_HEADERS, 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({
        subjectType: 'Subject2',           // camelCase — we are the buyer
        dateRange: {
          dateType: 'Invoicing',           // date accepted by KSeF; use 'PermanentStorage' for incremental sync
          from: opts.dateFrom,             // camelCase
          to:   opts.dateTo,              // camelCase
        },
      }),
    },
    'invoices/query/metadata',
  )

  // Response: { invoices: InvoiceMetadata[], hasMore: boolean, isTruncated: boolean }
  // Each InvoiceMetadata has ksefNumber (not ksefReferenceNumber) — normalise for internal use
  const raw: any[] = data?.invoices ?? []
  const items: KsefV2InvoiceMetadata[] = raw.map(inv => ({
    ...inv,
    ksefReferenceNumber: inv.ksefNumber ?? inv.ksefReferenceNumber,
  }))
  const hasMore: boolean = data?.hasMore ?? false
  return { items, hasMore }
}

// ─── Download single invoice XML ──────────────────────────────────────────────

export async function ksefDownloadInvoice(
  accessToken: string,
  ksefReferenceNumber: string,
  creds: KsefCredentials,
): Promise<string> {
  const base = getBase(creds.env)
  // ksefRequest handles 429 retry automatically; returns raw text for XML
  const r = await ksefFetch(
    `${base}/invoices/ksef/${encodeURIComponent(ksefReferenceNumber)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } },
  )
  if (r.status === 429) {
    const retryAfterSec = parseInt(r.headers.get('Retry-After') ?? '2', 10) || 2
    if (retryAfterSec >= 60) {
      // Per-hour quota — fail immediately so the caller can skip this invoice
      throw new Error(`KSeF invoice download rate-limited (Retry-After ${retryAfterSec}s): ${ksefErrorMessage(r.text)}`)
    }
    await new Promise(res => setTimeout(res, (retryAfterSec + 1) * 1000))
    const r2 = await ksefFetch(`${base}/invoices/ksef/${encodeURIComponent(ksefReferenceNumber)}`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
    if (!r2.ok) throw new Error(`KSeF invoice download failed (HTTP ${r2.status}): ${ksefErrorMessage(r2.text)}`)
    return r2.text
  }
  if (!r.ok) throw new Error(`KSeF invoice download failed (HTTP ${r.status}): ${ksefErrorMessage(r.text)}`)
  return r.text   // FA(2) or FA(3) XML
}

// ─── Parse FA(2) / FA(3) XML ─────────────────────────────────────────────────

export type ParsedKsefInvoice = {
  ksefReferenceNumber: string
  invoiceNumber:       string
  supplierName:        string
  supplierNip:         string
  buyerNip:            string
  issueDate:           string   // YYYY-MM-DD
  saleDate:            string   // YYYY-MM-DD
  totalNet:            number
  totalVat:            number
  totalGross:          number
  currency:            string
  items: {
    name:       string
    quantity:   number
    unit:       string
    netPrice:   number
    vatRate:    number
    netValue:   number
    grossValue: number
  }[]
}

export function parseKsefXml(xml: string, ksefRef: string): ParsedKsefInvoice {
  const tag  = (t: string) => new RegExp(`<${t}[^>]*>([^<]*)<\/${t}>`, 'i')
  const get  = (t: string) => xml.match(tag(t))?.[1]?.trim() ?? ''
  const getN = (t: string) => parseFloat(get(t)) || 0

  const supplierName = get('NazwaSprzedawcy') || get('Nazwa') || ''
  const supplierNip  = xml.match(/<NIP>(\d+)<\/NIP>/)?.[1] ?? ''
  const buyerNip     = xml.match(/<NIP>(\d+)<\/NIP>/g)?.[1]?.replace(/<\/?NIP>/g, '') ?? ''

  const issueDate = get('DataWystawienia') || get('P_1') || ''
  const saleDate  = get('DataSprzedazy')   || get('P_6') || issueDate

  const totalNet   = getN('P_15')
  const totalVat   = getN('P_16') || getN('P_17') || getN('P_18') || getN('P_19')
  const totalGross = totalNet + totalVat

  const invoiceNumber = get('P_2') || get('NumerFaktury') || ksefRef

  const itemBlocks = [...xml.matchAll(/<FaWiersz>([\s\S]*?)<\/FaWiersz>/g)]
  const items = itemBlocks.map(m => {
    const block = m[1]
    const iget  = (t: string) => block.match(tag(t))?.[1]?.trim() ?? ''
    const igetN = (t: string) => parseFloat(iget(t)) || 0
    const vatRate  = parseFloat(iget('P_12') || iget('StawkaVAT') || '0.08') || 0.08
    const netPrice = igetN('P_9A') || igetN('CenaJedNetto')
    const netValue = igetN('P_11') || igetN('WartoscNetto')
    const qty      = igetN('P_8A') || igetN('Ilosc') || 1
    return {
      name:       iget('P_7') || iget('NazwaTowaru') || iget('NazwaUslugi') || 'Pozycja',
      quantity:   qty,
      unit:       iget('P_8B') || iget('JednMiary') || 'szt',
      netPrice,
      vatRate:    vatRate > 1 ? vatRate / 100 : vatRate,
      netValue,
      grossValue: netValue * (1 + (vatRate > 1 ? vatRate / 100 : vatRate)),
    }
  })

  return {
    ksefReferenceNumber: ksefRef,
    invoiceNumber,
    supplierName,
    supplierNip,
    buyerNip,
    issueDate: issueDate.slice(0, 10),
    saleDate:  saleDate.slice(0, 10),
    totalNet,
    totalVat,
    totalGross,
    currency: get('KodWaluty') || 'PLN',
    items,
  }
}
