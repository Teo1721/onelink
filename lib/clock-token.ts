/**
 * HMAC-based time-windowed tokens for QR clock-in.
 * Server-side only — never import in client components.
 *
 * Token format (before base64url encoding):
 *   `<locationId>:<windowIndex>:<hmac16>`
 *
 * Window = 5 minutes.  We accept current OR previous window, so
 * a token is valid for up to 10 minutes (gives employee time to scan).
 */

import crypto from 'crypto'

const WINDOW_MS  = 5 * 60 * 1000 // 5 minutes
const HMAC_LEN   = 16            // first 16 hex chars of SHA-256

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CLOCK_SECRET || 'onelink-clock-secret'
}

function currentWindow() {
  return Math.floor(Date.now() / WINDOW_MS)
}

function makeHmac(locationId: string, w: number) {
  return crypto
    .createHmac('sha256', secret())
    .update(`${locationId}:${w}`)
    .digest('hex')
    .slice(0, HMAC_LEN)
}

/** Generate a fresh token for the given location. */
export function generateClockToken(locationId: string): string {
  const w = currentWindow()
  const raw = `${locationId}:${w}:${makeHmac(locationId, w)}`
  return Buffer.from(raw).toString('base64url')
}

/**
 * Validate a token.
 * Returns the locationId if valid, null otherwise.
 */
export function validateClockToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length < 3) return null

    const hmac      = parts[parts.length - 1]
    const w         = parseInt(parts[parts.length - 2], 10)
    const locationId = parts.slice(0, -2).join(':') // safe if UUID (no colons)

    if (isNaN(w)) return null

    const current = currentWindow()
    // Accept current window or the previous one (up to ~10 min grace)
    if (current - w > 1 || w > current) return null

    if (makeHmac(locationId, w) !== hmac) return null

    return locationId
  } catch {
    return null
  }
}

/** Seconds until the token's window expires. */
export function tokenSecondsLeft(token: string): number {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts   = decoded.split(':')
    const w       = parseInt(parts[parts.length - 2], 10)
    return Math.max(0, Math.round(((w + 1) * WINDOW_MS - Date.now()) / 1000))
  } catch {
    return 0
  }
}
