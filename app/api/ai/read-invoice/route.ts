import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś systemem OCR do faktur dla polskich firm gastronomicznych.
Przeanalizuj obraz faktury i zwróć dane w formacie JSON.

WAŻNE ZASADY:
- invoiceType = "COS" jeśli faktura dotyczy żywności, napojów, opakowań, surowców gastronomicznych
- invoiceType = "SEMIS" jeśli faktura dotyczy czynszu, mediów, usług, marketingu, napraw, IT, ubezpieczeń
- Daty w formacie YYYY-MM-DD
- quantity i unitPrice jako liczby (np. "2.5", "12.50") — bez jednostek w tych polach
- vatRate jako ułamek dziesiętny: 0, 0.05, 0.08, lub 0.23

Kategorie COS: mieso, ryby, nabiał, warzywa_owoce, suche, napoje, kawa, opakowania, chemia, inne_cos
Kategorie SEMIS: czynsz, media, marketing, serwis_naprawy, ubezpieczenia, it_software, transport, czystosc_higiena, administracja, inne_semis

Zwróć TYLKO czysty JSON, bez żadnego dodatkowego tekstu:
{
  "supplier": "nazwa dostawcy",
  "invoiceNumber": "numer faktury",
  "saleDate": "YYYY-MM-DD",
  "receiptDate": "YYYY-MM-DD",
  "invoiceType": "COS" lub "SEMIS",
  "items": [
    {
      "name": "nazwa produktu/usługi",
      "quantity": "1",
      "unit": "szt",
      "unitPrice": "10.00",
      "vatRate": "0.08",
      "category": "kategoria"
    }
  ]
}`

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll('file') as unknown as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    // Build image content blocks (support multi-page PDFs converted to images)
    const imageBlocks: OpenAI.Chat.ChatCompletionContentPart[] = []
    for (const file of files.slice(0, 4)) { // max 4 pages
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'
      imageBlocks.push({
        type: 'image_url',
        image_url: { url: `data:${mediaType};base64,${base64}`, detail: 'high' },
      })
    }

    imageBlocks.push({
      type: 'text',
      text: 'Odczytaj tę fakturę i zwróć dane w wymaganym formacie JSON.',
    })

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: imageBlocks },
      ],
      max_tokens: 1500,
      temperature: 0,
    })

    let raw = res.choices[0]?.message?.content?.trim() ?? ''
    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)

  } catch (err: any) {
    console.error('[read-invoice]', err?.message)
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Nie udało się odczytać faktury. Spróbuj wyraźniejsze zdjęcie.' }, { status: 422 })
    }
    return NextResponse.json({ error: err?.message ?? 'Błąd odczytu faktury' }, { status: 500 })
  }
}
