import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Page 1: extract header + items
const PAGE1_PROMPT = `Jesteś ekspertem od polskich faktur VAT. Przeanalizuj stronę 1 faktury.

Wyodrębnij:
1. Dane nagłówkowe (dostawca, numer faktury, daty)
2. WSZYSTKIE pozycje widoczne na tej stronie — każdą bez wyjątku

Zasady kategoryzacji:
- Produkty spożywcze, napoje, słodycze, przekąski → invoice_type: "COS", category: suche/napoje/kawa/mieso/nabiał/warzywa_owoce/opakowania/chemia/inne_cos
- Usługi, czynsz, media, transport → invoice_type: "SEMIS", category: czynsz/media/marketing/serwis_naprawy/ubezpieczenia/it_software/transport/czystosc_higiena/administracja/inne_semis
- Usługa transportowa na fakturze spożywczej → SEMIS, transport

vatRate: 0=0%, 0.05=5%, 0.08=8%, 0.23=23%
unit: kg, szt, l, opak, but, kart, g, ml

Zwróć TYLKO JSON:
{
  "supplier": "...",
  "invoiceNumber": "...",
  "saleDate": "YYYY-MM-DD",
  "receiptDate": "YYYY-MM-DD lub puste",
  "invoiceType": "COS lub SEMIS",
  "items": [
    { "name": "...", "quantity": "...", "unit": "szt", "unitPrice": "...", "vatRate": "0.05", "category": "..." }
  ]
}`

// Page 2+: extract items only
const PAGE_N_PROMPT = `Jesteś ekspertem od polskich faktur VAT. To jest kolejna strona faktury.

Wyodrębnij WSZYSTKIE pozycje widoczne na tej stronie — każdą bez wyjątku. Nie pomijaj żadnej.
Ignoruj podsumowania, stopki, opisy płatności — tylko pozycje towarów/usług.

vatRate: 0=0%, 0.05=5%, 0.08=8%, 0.23=23%
unit: kg, szt, l, opak, but, kart, g, ml

Zasady kategoryzacji:
- Produkty spożywcze, słodycze, napoje, przekąski → category: suche/napoje/kawa/mieso/nabiał/warzywa_owoce/opakowania/chemia/inne_cos
- Usługi (np. usługa transportowa) → category: transport/inne_semis

Zwróć TYLKO JSON:
{
  "items": [
    { "name": "...", "quantity": "...", "unit": "szt", "unitPrice": "...", "vatRate": "0.05", "category": "..." }
  ]
}`

type AiItem = {
  name: string; quantity: string; unit: string
  unitPrice: string; vatRate: string; category: string
}

async function extractPage(
  base64: string,
  mime: string,
  isFirstPage: boolean,
): Promise<{ header?: Record<string, string>; items: AiItem[] }> {
  const prompt = isFirstPage ? PAGE1_PROMPT : PAGE_N_PROMPT
  const dataUrl = `data:${mime};base64,${base64}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          { type: 'text', text: 'Wyodrębnij wszystkie pozycje z tej strony faktury.' },
        ],
      },
    ],
    max_tokens: 8000,
    temperature: 0,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content?.trim() || '{}'
  try {
    return JSON.parse(raw)
  } catch {
    return { items: [] }
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = (form as any).getAll('file') as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    // Process each page individually in parallel
    const pagePromises = files.map(async (file, idx) => {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const mime = file.type || 'image/jpeg'
      const base64 = buffer.toString('base64')
      return extractPage(base64, mime, idx === 0)
    })

    const pageResults = await Promise.all(pagePromises)

    // Merge: header from page 1, items from all pages
    const first = pageResults[0]
    const allItems: AiItem[] = pageResults.flatMap(r => r.items || [])

    // Determine invoice type: if any item looks like a service and rest are food → COS with SEMIS transport
    // Use whatever page 1 detected, or default to COS
    const invoiceType = (first as Record<string, unknown>).invoiceType as string || 'COS'

    const result = {
      supplier:     (first as Record<string, unknown>).supplier     || '',
      invoiceNumber:(first as Record<string, unknown>).invoiceNumber || '',
      saleDate:     (first as Record<string, unknown>).saleDate     || '',
      receiptDate:  (first as Record<string, unknown>).receiptDate  || '',
      invoiceType,
      items: allItems,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Błąd serwera'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
