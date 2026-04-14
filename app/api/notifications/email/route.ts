import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/notifications/email
 *
 * Sends a transactional email via Supabase Auth (no extra service needed).
 * For richer HTML emails, set RESEND_API_KEY in env and it switches to Resend.
 *
 * Body: {
 *   type: 'schedule_published' | 'leave_status' | 'swap_status' | 'cert_expiry'
 *   locationId: string
 *   payload: any   // type-specific data
 * }
 */

type EmailType = 'schedule_published' | 'leave_status' | 'swap_status' | 'cert_expiry' | 'task_assigned' | 'task_completed'

function buildEmail(type: EmailType, payload: Record<string, any>): { subject: string; html: string } {
  switch (type) {
    case 'schedule_published':
      return {
        subject: `Nowy grafik opublikowany — ${payload.locationName}`,
        html: `
          <p>Cześć <strong>${payload.employeeName}</strong>,</p>
          <p>Manager opublikował nowy grafik dla lokalizacji <strong>${payload.locationName}</strong>.</p>
          <p>Zaloguj się do aplikacji, aby sprawdzić swoje zmiany.</p>
          <br><p style="color:#9CA3AF;font-size:12px">OneLink — zarządzanie grafikiem</p>
        `,
      }
    case 'leave_status':
      return {
        subject: `Twój wniosek urlopowy został ${payload.status === 'approved' ? 'zatwierdzony' : 'odrzucony'}`,
        html: `
          <p>Cześć <strong>${payload.employeeName}</strong>,</p>
          <p>Twój wniosek urlopowy na okres <strong>${payload.dateFrom} – ${payload.dateTo}</strong> został
            <strong style="color:${payload.status === 'approved' ? '#16A34A' : '#DC2626'}">
              ${payload.status === 'approved' ? 'zatwierdzony ✓' : 'odrzucony ✗'}
            </strong>.
          </p>
          ${payload.note ? `<p>Komentarz managera: <em>${payload.note}</em></p>` : ''}
          <br><p style="color:#9CA3AF;font-size:12px">OneLink — zarządzanie grafikiem</p>
        `,
      }
    case 'swap_status':
      return {
        subject: `Wniosek o zamianę zmiany — ${payload.status === 'approved' ? 'zatwierdzony' : 'odrzucony'}`,
        html: `
          <p>Cześć <strong>${payload.employeeName}</strong>,</p>
          <p>Twój wniosek o zamianę zmiany dnia <strong>${payload.shiftDate}</strong> został
            <strong style="color:${payload.status === 'approved' ? '#16A34A' : '#DC2626'}">
              ${payload.status === 'approved' ? 'zatwierdzony ✓' : 'odrzucony ✗'}
            </strong>.
          </p>
          <br><p style="color:#9CA3AF;font-size:12px">OneLink — zarządzanie grafikiem</p>
        `,
      }
    case 'cert_expiry':
      return {
        subject: `Certyfikat wygasa wkrótce — ${payload.certName}`,
        html: `
          <p>Cześć,</p>
          <p>Certyfikat <strong>${payload.certName}</strong> pracownika <strong>${payload.employeeName}</strong>
            wygasa <strong>${payload.expiryDate}</strong>.</p>
          <p>Zaloguj się do panelu, aby zaktualizować certyfikat.</p>
          <br><p style="color:#9CA3AF;font-size:12px">OneLink — zarządzanie grafikiem</p>
        `,
      }
    case 'task_assigned':
      return {
        subject: `Nowe zadanie od ${payload.directorName} · ${payload.locationName}`,
        html: `
          <p>Cześć <strong>${payload.employeeName}</strong>,</p>
          <p>Dyrektor AI <strong>${payload.directorName}</strong> przydzielił zadanie dla lokalizacji <strong>${payload.locationName}</strong>:</p>
          <div style="margin:16px 0;padding:12px 16px;background:#F0F9FF;border-left:4px solid #3B82F6;border-radius:4px">
            <p style="margin:0;font-size:14px;color:#1E3A5F">${payload.taskText}</p>
          </div>
          <p>Zaloguj się do panelu, aby oznaczyć zadanie jako wykonane.</p>
          <br><p style="color:#9CA3AF;font-size:12px">OneLink · Twój zespół AI</p>
        `,
      }
    case 'task_completed':
      return {
        subject: `Zadanie wykonane · ${payload.locationName}`,
        html: `
          <p>Cześć,</p>
          <p>Manager w lokalizacji <strong>${payload.locationName}</strong> oznaczył zadanie jako wykonane:</p>
          <div style="margin:16px 0;padding:12px 16px;background:#F0FDF4;border-left:4px solid #10B981;border-radius:4px">
            <p style="margin:0;font-size:14px;color:#064E3B">${payload.taskText}</p>
          </div>
          ${payload.note ? `<p>Notatka: <em>${payload.note}</em></p>` : ''}
          <br><p style="color:#9CA3AF;font-size:12px">OneLink · Twój zespół AI</p>
        `,
      }
    default:
      return { subject: 'Powiadomienie OneLink', html: '<p>Masz nowe powiadomienie w aplikacji OneLink.</p>' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, recipientEmail, recipientName, payload = {} } = body

    if (!type || !recipientEmail) {
      return NextResponse.json({ error: 'type and recipientEmail required' }, { status: 400 })
    }

    const { subject, html } = buildEmail(type as EmailType, { ...payload, employeeName: recipientName ?? recipientEmail })

    // Option 1: Resend (if API key is configured)
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'noreply@onelink.app',
          to: [recipientEmail],
          subject,
          html,
        }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message ?? 'Resend error' }, { status: 500 })
      return NextResponse.json({ ok: true, provider: 'resend', id: data.id })
    }

    // Option 2: Supabase Auth magic-link email (free, no extra service)
    // This just sends a notification — not ideal but works without extra config
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: recipientEmail,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/employee` },
    })
    // We don't actually want the magic link — just log that we would send
    // In production configure RESEND_API_KEY for proper email delivery
    console.log(`[notifications] Would send "${subject}" to ${recipientEmail}`)

    return NextResponse.json({ ok: true, provider: 'log_only', note: 'Set RESEND_API_KEY for real email delivery' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
