/**
 * POST /api/ksef/categorize
 * Body: { items: { name, quantity, unit, netValue, vatRate }[], supplierName: string }
 *
 * Uses keyword matching to suggest invoice_type (COS/SEMIS) and cos_category for each line item.
 */

import { NextRequest, NextResponse } from 'next/server'

const COS_KEYWORDS: Record<string, string[]> = {
  mieso:          ['mięso', 'wołowina', 'wieprzowina', 'kurczak', 'drób', 'karkówka', 'schab', 'filet', 'łopatka', 'wędlin', 'kiełbas', 'boczek', 'szynka', 'salami', 'pasztet'],
  nabiał:         ['mleko', 'śmietana', 'jogurt', 'kefir', 'twaróg', 'ser', 'masło', 'jaj', 'jaja', 'śmietanka', 'ricotta', 'mozzarella'],
  napoje:         ['woda', 'sok', 'napój', 'piwo', 'wino', 'alkohol', 'cola', 'pepsi', 'sprite', 'fanta', 'red bull', 'energy', 'herbata', 'syrop'],
  kawa:           ['kawa', 'espresso', 'cappuccino', 'latte', 'arabica', 'robusta'],
  warzywa_owoce:  ['ziemniak', 'marchew', 'cebula', 'pomidor', 'ogórek', 'sałat', 'kapust', 'papryka', 'czosnek', 'pieczark', 'grzyb', 'jabłko', 'banan', 'pomarańcz', 'cytryn', 'truskawk', 'malina', 'warzywa', 'owoce'],
  suche:          ['mąka', 'ryż', 'makaron', 'kasza', 'płatki', 'cukier', 'sól', 'olej', 'oliwa', 'ocet', 'przypraw', 'pieprz', 'oregano', 'bazylia', 'pieczywo', 'chleb', 'bułk', 'drożdże', 'proszek', 'skrobia', 'groch', 'fasola', 'soczewic'],
  opakowania:     ['opakow', 'torba', 'worek', 'kubek', 'talerz', 'sztućce', 'serwetka', 'folia', 'tacka', 'pojemnik', 'karton'],
  chemia:         ['detergent', 'płyn do naczyń', 'środek czyszczący', 'mop', 'gąbka', 'papier toaletowy', 'ręcznik papierowy', 'worki na śmieci', 'chlor', 'dezynfek'],
}

const SEMIS_KEYWORDS: Record<string, string[]> = {
  czynsz:             ['czynsz', 'najem', 'dzierżawa', 'wynajem lokalu'],
  media:              ['prąd', 'energia', 'gaz', 'woda', 'ścieki', 'internet', 'telefon', 'łącze'],
  transport:          ['transport', 'dostawa', 'kurier', 'przewóz', 'logistyk', 'przesyłka'],
  marketing:          ['reklama', 'marketing', 'kampania', 'ulotk', 'banner', 'strona www', 'social media', 'google ads', 'facebook ads', 'pozycjonowanie'],
  serwis_naprawy:     ['serwis', 'naprawa', 'konserwacja', 'przegląd', 'usługa techniczna', 'instalacja'],
  ubezpieczenia:      ['ubezpieczenie', 'polisa', 'oc', 'ac'],
  it_software:        ['oprogramowanie', 'licencja', 'subskrypcja', 'software', 'platforma', 'system', 'aplikacja', 'it', 'hosting', 'chmura'],
  czystosc_higiena:   ['sprzątanie', 'czyszczenie', 'dezynfekcja', 'higiena', 'pranie', 'pralnia', 'pest control', 'ddd'],
  administracja:      ['księgowość', 'biuro rachunkowe', 'prawnik', 'notariusz', 'opłata', 'licencja sanepid', 'zus', 'podatek'],
}

function categorizeItem(name: string): { invoiceType: 'COS' | 'SEMIS'; category: string } {
  const lower = name.toLowerCase()

  for (const [category, keywords] of Object.entries(SEMIS_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return { invoiceType: 'SEMIS', category }
    }
  }

  for (const [category, keywords] of Object.entries(COS_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return { invoiceType: 'COS', category }
    }
  }

  return { invoiceType: 'COS', category: 'inne_cos' }
}

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json()
    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 })

    const categorized = (items as any[]).map((item: any, index: number) => {
      const { invoiceType, category } = categorizeItem(item.name || '')
      return { index, category, invoiceType }
    })

    const cosItems = categorized.filter(i => i.invoiceType === 'COS')
    const semisItems = categorized.filter(i => i.invoiceType === 'SEMIS')
    const invoiceType = cosItems.length >= semisItems.length ? 'COS' : 'SEMIS'

    return NextResponse.json({
      ok: true,
      invoiceType,
      items: categorized.map(({ index, category }) => ({ index, category })),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
