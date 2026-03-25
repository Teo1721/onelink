import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const supabase = createAdminClient()

  // Generate the recovery link server-side — no email sending by Supabase
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${origin}/auth/confirm?next=/auth/update-password` },
  })

  if (error) {
    // If user doesn't exist, still return success (security: don't reveal if email exists)
    if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('user')) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resetLink = data.properties?.action_link
  if (!resetLink) return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })

  // Send via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'OneLink <onboarding@resend.dev>',
      to: [email],
      subject: 'Resetuj hasło — OneLink',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:22px;font-weight:700;color:#111827;margin-bottom:8px">Resetowanie hasła</h2>
          <p style="color:#6B7280;font-size:14px;line-height:1.6;margin-bottom:24px">
            Kliknij poniższy przycisk, aby ustawić nowe hasło. Link jest ważny przez 1 godzinę.
          </p>
          <a href="${resetLink}"
            style="display:inline-block;background:linear-gradient(to right,#1D4ED8,#06B6D4);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px">
            Ustaw nowe hasło
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px">
            Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
          </p>
        </div>
      `,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.json()
    return NextResponse.json({ error: err?.message ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
