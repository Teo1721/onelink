import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Nieprawidłowy adres e-mail' }, { status: 400 })
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const downloadUrl = `${siteUrl}/api/lead-capture/download`

    // Save lead to DB (best-effort — don't fail if table doesn't exist)
    try {
      const admin = createAdminClient()
      await admin.from('leads').upsert(
        { email, source: 'food_cost_calculator', created_at: new Date().toISOString() },
        { onConflict: 'email', ignoreDuplicates: true }
      )
    } catch { /* table might not exist yet */ }

    // Send email via Resend if configured
    if (process.env.RESEND_API_KEY) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px">Twój kalkulator food cost jest gotowy 🎉</h2>
          <p style="font-size:14px;color:#6B7280;margin:0 0 24px">Kliknij przycisk poniżej, aby pobrać arkusz Excel. Możesz go otworzyć w Google Sheets lub Microsoft Excel — bez rejestracji.</p>
          <a href="${downloadUrl}" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none">
            📥 Pobierz kalkulator food cost
          </a>
          <p style="font-size:12px;color:#9CA3AF;margin:24px 0 0">Jeśli przycisk nie działa, skopiuj ten link: ${downloadUrl}</p>
          <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
          <p style="font-size:11px;color:#9CA3AF;margin:0">OneLink · System zarządzania dla gastronomii · <a href="${siteUrl}" style="color:#9CA3AF">${siteUrl}</a></p>
        </div>
      `
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'OneLink <noreply@onelink.pl>',
          to: [email],
          subject: 'Twój bezpłatny kalkulator food cost 📊',
          html,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('[lead-capture] Resend error:', err)
      }
    } else {
      console.log(`[lead-capture] No RESEND_API_KEY — would send download link to ${email}: ${downloadUrl}`)
    }

    return NextResponse.json({ ok: true, downloadUrl })
  } catch (err: any) {
    console.error('[lead-capture]', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
