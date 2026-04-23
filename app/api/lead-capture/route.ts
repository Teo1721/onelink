import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SALES_ALERT_THRESHOLD = 6 // location count >= this triggers a sales alert

function isLargeAccount(locationCount: string): boolean {
  return locationCount === '6-20' || locationCount === '20+'
}

export async function POST(req: NextRequest) {
  try {
    const {
      email, name, businessType, locationCount, newsletterConsent,
      pageUrl, utmSource, utmMedium, utmCampaign,
    } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Nieprawidłowy adres e-mail' }, { status: 400 })
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const downloadUrl = `${siteUrl}/api/lead-capture/download`

    // Save lead to DB (best-effort)
    try {
      const admin = createAdminClient()
      await admin.from('leads').upsert(
        {
          email,
          name: name ?? null,
          business_type: businessType ?? null,
          location_count: locationCount ?? null,
          newsletter_consent: newsletterConsent ?? false,
          source: 'food_cost_calculator',
          page_url: pageUrl ?? null,
          utm_source: utmSource ?? null,
          utm_medium: utmMedium ?? null,
          utm_campaign: utmCampaign ?? null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )
    } catch { /* table might not exist yet */ }

    // Always send the file via Resend
    if (process.env.RESEND_API_KEY) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px">Twój kalkulator food cost jest gotowy 🎉</h2>
          ${name ? `<p style="font-size:14px;color:#6B7280;margin:0 0 8px">Cześć ${name.split(' ')[0]},</p>` : ''}
          <p style="font-size:14px;color:#6B7280;margin:0 0 24px">Kliknij przycisk poniżej, aby pobrać arkusz Excel. Możesz go otworzyć w Google Sheets lub Microsoft Excel — bez rejestracji.</p>
          <a href="${downloadUrl}" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none">
            📥 Pobierz kalkulator food cost
          </a>
          <p style="font-size:12px;color:#9CA3AF;margin:24px 0 0">Jeśli przycisk nie działa, skopiuj ten link: ${downloadUrl}</p>
          <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
          <p style="font-size:11px;color:#9CA3AF;margin:0">OneLink · System zarządzania dla gastronomii · <a href="${siteUrl}" style="color:#9CA3AF">${siteUrl}</a></p>
          ${!newsletterConsent ? `<p style="font-size:10px;color:#D1D5DB;margin:8px 0 0">Wysyłamy plik bez zapisu do listy mailingowej — nie wyraziłeś/aś zgody marketingowej.</p>` : ''}
        </div>
      `

      const emailRes = await fetch('https://api.resend.com/emails', {
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
      if (!emailRes.ok) {
        const err = await emailRes.json()
        console.error('[lead-capture] Resend error:', err)
      }

      // Sales alert for large accounts
      if (isLargeAccount(locationCount ?? '') && process.env.SALES_ALERT_EMAIL) {
        const alertHtml = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 16px">🔔 Nowy lead — duże konto</h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:6px 0;color:#6B7280;width:120px">Email</td><td style="font-weight:600;color:#111827">${email}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Imię</td><td style="font-weight:600;color:#111827">${name ?? '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Typ</td><td style="font-weight:600;color:#111827">${businessType ?? '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Lokale</td><td style="font-weight:600;color:#DC2626">${locationCount}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Zgoda mkt</td><td style="font-weight:600;color:#111827">${newsletterConsent ? 'TAK' : 'NIE'}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Źródło</td><td style="color:#6B7280">${utmSource ?? '—'} / ${utmMedium ?? '—'} / ${utmCampaign ?? '—'}</td></tr>
            </table>
          </div>
        `
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? 'OneLink <noreply@onelink.pl>',
            to: [process.env.SALES_ALERT_EMAIL],
            subject: `🔔 Nowy lead ${locationCount} lokali — ${email}`,
            html: alertHtml,
          }),
        }).catch(err => console.error('[lead-capture] Sales alert error:', err))
      }

      // Add to mailing list if consent given
      if (newsletterConsent) {
        await addToMailingList({ email, name, businessType, locationCount }).catch(
          err => console.error('[lead-capture] Mailing list error:', err)
        )
      }
    } else {
      console.log(`[lead-capture] No RESEND_API_KEY — would send download link to ${email}: ${downloadUrl}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[lead-capture]', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// Pluggable mailing list integration — swap provider by setting env vars
async function addToMailingList(lead: {
  email: string; name?: string; businessType?: string; locationCount?: string
}) {
  // MailerLite
  if (process.env.MAILERLITE_API_KEY && process.env.MAILERLITE_GROUP_ID) {
    const firstName = lead.name?.split(' ')[0] ?? ''
    const lastName = lead.name?.split(' ').slice(1).join(' ') ?? ''
    await fetch(`https://connect.mailerlite.com/api/subscribers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: lead.email,
        fields: { name: firstName, last_name: lastName, business_type: lead.businessType, location_count: lead.locationCount },
        groups: [process.env.MAILERLITE_GROUP_ID],
      }),
    })
    return
  }

  // Klaviyo
  if (process.env.KLAVIYO_API_KEY && process.env.KLAVIYO_LIST_ID) {
    await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
        'Content-Type': 'application/json',
        revision: '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            profiles: {
              data: [{
                type: 'profile',
                attributes: {
                  email: lead.email,
                  first_name: lead.name?.split(' ')[0] ?? '',
                  last_name: lead.name?.split(' ').slice(1).join(' ') ?? '',
                  properties: { business_type: lead.businessType, location_count: lead.locationCount },
                  subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
                },
              }],
            },
            historical_import: false,
          },
          relationships: { list: { data: { type: 'list', id: process.env.KLAVIYO_LIST_ID } } },
        },
      }),
    })
    return
  }

  console.log(`[lead-capture] No mailing list provider configured — skipping for ${lead.email}`)
}
