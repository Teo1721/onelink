import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    avgDailyRevenue, trend, trendPct, forecastTotal,
    forecastDays, forecastVsLastPeriod, lastActual,
    maxForecastDay, minForecastDay,
  } = body

  const trendLabel = trend === 'up' ? 'wzrostowy' : trend === 'down' ? 'spadkowy' : 'stabilny'
  const vsSign = Number(forecastVsLastPeriod) >= 0 ? '+' : ''
  const avgFmt = Number(avgDailyRevenue || 0).toFixed(0)
  const forecastFmt = Number(forecastTotal || 0).toFixed(0)

  let insight = `Średni dzienny przychód z ostatnich 90 dni wynosi ${avgFmt} zł, trend jest ${trendLabel} (${trendPct}%). `

  if (Number(forecastVsLastPeriod) > 5) {
    insight += `Prognoza na ${forecastDays} dni (${forecastFmt} zł) wskazuje na wzrost ${vsSign}${forecastVsLastPeriod}% względem poprzedniego okresu — korzystny sygnał. `
  } else if (Number(forecastVsLastPeriod) < -5) {
    insight += `Prognoza na ${forecastDays} dni (${forecastFmt} zł) wskazuje na spadek ${forecastVsLastPeriod}% — warto przeanalizować koszty i zaplanować działania promocyjne. `
  } else {
    insight += `Prognoza na ${forecastDays} dni (${forecastFmt} zł) jest stabilna (${vsSign}${forecastVsLastPeriod}% vs poprzedni okres). `
  }

  if (maxForecastDay) insight += `Najsilniejszy dzień: ${maxForecastDay}.`
  if (minForecastDay) insight += ` Najsłabszy dzień: ${minForecastDay}.`

  return NextResponse.json({ insight })
}
