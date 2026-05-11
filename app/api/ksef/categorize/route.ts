/**
 * POST /api/ksef/categorize
 * Body: { items: { name, quantity, unit, netValue, vatRate }[], supplierName: string }
 *
 * Uses OpenAI to suggest invoice_type (COS/SEMIS) and cos_category for each line item.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś ekspertem od polskich faktur VAT w branży gastronomicznej.
Przypisz każdej pozycji faktury typ i kategorię.

Zasady:
- Produkty spożywcze, napoje, kawa, mięso, nabiał, warzywa, owoce, słodycze, opakowania → invoice_type: "COS"
  categories COS: suche | napoje | kawa | mieso | nabiał | warzywa_owoce | opakowania | chemia | inne_cos
- Usługi, czynsz, media, transport, marketing, IT, serwis → invoice_type: "SEMIS"
  categories SEMIS: czynsz | media | marketing | serwis_naprawy | ubezpieczenia | it_software | transport | czystosc_higiena | administracja | inne_semis
- Mieszana faktura → użyj dominującego typu (> 50% wartości netto)

Odpowiedz TYLKO JSON, bez żadnego tekstu poza strukturą:
{
  "invoiceType": "COS" | "SEMIS",
  "items": [
    { "index": 0, "category": "suche" }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { items, supplierName } = await req.json()
    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 })

    const itemsText = items.map((it: any, i: number) =>
      `${i}. ${it.name} (qty: ${it.quantity} ${it.unit}, netto: ${it.netValue} PLN, VAT: ${Math.round((it.vatRate || 0) * 100)}%)`
    ).join('\n')

    const userMsg = `Dostawca: ${supplierName || 'Nieznany'}\n\nPozycje faktury:\n${itemsText}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMsg },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json({ ok: true, invoiceType: parsed.invoiceType ?? 'COS', items: parsed.items ?? [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
