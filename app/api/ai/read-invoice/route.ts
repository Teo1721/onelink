import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś ekspertem od czytania polskich faktur VAT.
Twoim zadaniem jest wyodrębnić wszystkie dane z faktury i zwrócić je jako JSON.

Zasady kategoryzacji pozycji:
- Jeśli faktura zawiera produkty spożywcze, napoje, opakowania, ingredienty → invoice_type: "COS"
- Jeśli faktura zawiera usługi, czynsz, media, marketing, serwis, IT, transport → invoice_type: "SEMIS"
- Jeśli są oba typy → użyj przeważającego

Dla COS category użyj jednej z: mieso, ryby, nabiał, warzywa_owoce, suche, napoje, kawa, opakowania, chemia, inne_cos
Dla SEMIS category użyj jednej z: czynsz, media, marketing, serwis_naprawy, ubezpieczenia, it_software, transport, czystosc_higiena, administracja, inne_semis

Dla vatRate użyj wartości dziesiętnej: 0 dla 0%, 0.05 dla 5%, 0.08 dla 8%, 0.23 dla 23%
Dla unit użyj: kg, szt, l, opak, but, kart, g, ml, porcja

WAŻNE: Zwróć TYLKO poprawny JSON, bez żadnych komentarzy ani markdown. Format:
{
  "supplier": "nazwa dostawcy",
  "invoiceNumber": "numer faktury",
  "saleDate": "YYYY-MM-DD",
  "receiptDate": "YYYY-MM-DD lub puste",
  "invoiceType": "COS lub SEMIS",
  "items": [
    {
      "name": "nazwa produktu/usługi",
      "quantity": "liczba jako string",
      "unit": "jednostka",
      "unitPrice": "cena netto za jednostkę jako string",
      "vatRate": "stawka VAT dziesiętnie jako string",
      "category": "kategoria"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = (form as any).get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mime = file.type || 'image/jpeg'

    // At this point the client always sends an image (PDFs are pre-converted to JPEG by pdf.js)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mime};base64,${base64}`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          { type: 'text', text: 'Odczytaj tę fakturę i zwróć dane w formacie JSON.' },
        ],
      },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 2000,
      temperature: 0,
    })

    const raw = response.choices[0]?.message?.content?.trim() || ''
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'AI nie zwróciło poprawnego JSON. Spróbuj ponownie.', raw }, { status: 422 })
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Błąd serwera'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
