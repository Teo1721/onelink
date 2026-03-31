// Meeus/Jones/Butcher Easter algorithm
function getEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function pad(n: number) { return String(n).padStart(2, '0') }
function iso(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

export function getPolishHolidays(year: number): Set<string> {
  const easter = getEaster(year)
  const y = String(year)
  return new Set([
    `${y}-01-01`, // Nowy Rok
    `${y}-01-06`, // Trzech Króli
    iso(easter),                    // Wielka Niedziela
    iso(addDays(easter, 1)),        // Poniedziałek Wielkanocny
    `${y}-05-01`, // Święto Pracy
    `${y}-05-03`, // Konstytucja 3 Maja
    iso(addDays(easter, 49)),       // Zesłanie Ducha Świętego
    iso(addDays(easter, 60)),       // Boże Ciało
    `${y}-08-15`, // Wniebowzięcie NMP
    `${y}-11-01`, // Wszystkich Świętych
    `${y}-11-11`, // Święto Niepodległości
    `${y}-12-25`, // Boże Narodzenie
    `${y}-12-26`, // Drugi dzień Bożego Narodzenia
  ])
}

export const HOLIDAY_NAMES: Record<string, string> = {
  '01-01': 'Nowy Rok',
  '01-06': 'Trzech Króli',
  '05-01': 'Święto Pracy',
  '05-03': 'Konstytucja 3 Maja',
  '08-15': 'Wniebowzięcie NMP',
  '11-01': 'Wszystkich Świętych',
  '11-11': 'Niepodległość',
  '12-25': 'Boże Narodzenie',
  '12-26': '2. dzień BN',
}

export function getHolidayName(iso: string, holidays: Set<string>): string | null {
  if (!holidays.has(iso)) return null
  const mmdd = iso.slice(5)
  return HOLIDAY_NAMES[mmdd] ?? 'Święto'
}
