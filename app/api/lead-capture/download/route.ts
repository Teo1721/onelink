import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const wb = XLSX.utils.book_new()

  /* ── Sheet 1: Food Cost Calculator ── */
  const calc = XLSX.utils.aoa_to_sheet([
    ['KALKULATOR FOOD COST — OneLink.app'],
    [],
    ['DANIE', 'SKŁADNIK', 'ILOŚĆ (g/ml)', 'CENA ZA KG/L (zł)', 'KOSZT SKŁADNIKA (zł)'],
    ['Burger klasyczny', 'Bułka', 120, 8.00, { f: 'C4/1000*D4' }],
    ['', 'Wołowina mielona', 180, 32.00, { f: 'C5/1000*D5' }],
    ['', 'Sałata', 20, 6.00, { f: 'C6/1000*D6' }],
    ['', 'Pomidor', 40, 7.00, { f: 'C7/1000*D7' }],
    ['', 'Sos', 30, 12.00, { f: 'C8/1000*D8' }],
    [],
    ['Pizza Margherita', 'Ciasto (mąka)', 200, 2.50, { f: 'C10/1000*D10' }],
    ['', 'Sos pomidorowy', 80, 5.00, { f: 'C11/1000*D11' }],
    ['', 'Mozzarella', 150, 28.00, { f: 'C12/1000*D12' }],
    ['', 'Bazylia', 5, 40.00, { f: 'C13/1000*D13' }],
    [],
    ['Pasta Carbonara', 'Makaron', 150, 4.00, { f: 'C15/1000*D15' }],
    ['', 'Boczek', 80, 24.00, { f: 'C16/1000*D16' }],
    ['', 'Jajka', 60, 8.00, { f: 'C17/1000*D17' }],
    ['', 'Parmezan', 30, 60.00, { f: 'C18/1000*D18' }],
    ['', 'Śmietana', 40, 8.00, { f: 'C19/1000*D19' }],
  ])
  calc['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 15 }, { wch: 20 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, calc, 'Składniki')

  /* ── Sheet 2: Summary per dish ── */
  const summary = XLSX.utils.aoa_to_sheet([
    ['PODSUMOWANIE FOOD COST PER DANIE'],
    [],
    ['DANIE', 'KOSZT SKŁADNIKÓW (zł)', 'CENA SPRZEDAŻY (zł)', 'FOOD COST %', 'MARŻA (zł)', 'STATUS'],
    ['Burger klasyczny', { f: "SUM(Składniki!E4:E8)" }, 32.00, { f: 'B4/C4*100' }, { f: 'C4-B4' }, { f: 'IF(D4<=30,"✅ OK",IF(D4<=35,"⚠️ Uwaga","❌ Za wysoki"))' }],
    ['Pizza Margherita',  { f: "SUM(Składniki!E10:E13)" }, 38.00, { f: 'B5/C5*100' }, { f: 'C5-B5' }, { f: 'IF(D5<=30,"✅ OK",IF(D5<=35,"⚠️ Uwaga","❌ Za wysoki"))' }],
    ['Pasta Carbonara',   { f: "SUM(Składniki!E15:E19)" }, 36.00, { f: 'B6/C6*100' }, { f: 'C6-B6' }, { f: 'IF(D6<=30,"✅ OK",IF(D6<=35,"⚠️ Uwaga","❌ Za wysoki"))' }],
    [],
    ['ŚREDNI FOOD COST:', '', '', { f: 'AVERAGE(D4:D6)' }, '', ''],
    [],
    ['💡 BENCHMARKI BRANŻOWE:'],
    ['Fast food / burger:', '28–32%'],
    ['Pizza:', '25–30%'],
    ['Fine dining:', '28–35%'],
    ['Bar / przekąski:', '20–28%'],
    [],
    ['🎯 CEL: Food cost poniżej 30% = zdrowa marża'],
    ['⚠️  Food cost 30–35% = do obserwacji'],
    ['❌  Food cost powyżej 35% = strata na daniu'],
  ])
  summary['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, summary, 'Podsumowanie')

  /* ── Sheet 3: How to use ── */
  const howto = XLSX.utils.aoa_to_sheet([
    ['JAK UŻYWAĆ KALKULATORA FOOD COST'],
    [],
    ['1. Zakładka "Składniki"'],
    ['   → Wpisz nazwę dania w kolumnie A'],
    ['   → Wpisz każdy składnik i jego ilość w gramach/ml'],
    ['   → Wpisz aktualną cenę zakupu za kg lub litr'],
    ['   → Kolumna E (Koszt) oblicza się automatycznie'],
    [],
    ['2. Zakładka "Podsumowanie"'],
    ['   → Wpisz cenę sprzedaży dania (ile klient płaci)'],
    ['   → Food cost % oblicza się automatycznie'],
    ['   → Kolumna "Status" sygnalizuje czy food cost jest OK'],
    [],
    ['3. Optymalizacja'],
    ['   → Dania z ❌ Za wysoki — zmień przepis, dostawcę lub cenę'],
    ['   → Dania z ⚠️ Uwaga — monitoruj i szukaj tańszych zamienników'],
    ['   → Dania z ✅ OK — zachowaj recepturę i marżę'],
    [],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],
    ['Chcesz obliczać food cost automatycznie z danych sprzedaży?'],
    ['Wypróbuj OneLink — 7 dni za darmo: https://onelink.app'],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],
  ])
  howto['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, howto, 'Jak używać')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="kalkulator-food-cost-onelink.xlsx"',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
