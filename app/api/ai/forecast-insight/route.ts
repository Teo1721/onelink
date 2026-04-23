import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient as createServerClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

  const prompt = `
Analiza prognozy przychodów restauracji:
- Średni dzienny przychód (historia 90 dni): ${avgDailyRevenue} zł
- Trend historyczny: ${trend === 'up' ? 'wzrostowy' : trend === 'down' ? 'spadkowy' : 'stabilny'} (${trendPct}%)
- Ostatni znany dzień: ${lastActual} zł
- Prognoza na ${forecastDays} dni łącznie: ${forecastTotal} zł
- Prognoza vs poprzedni okres: ${forecastVsLastPeriod}%
- Najsilniejszy dzień prognozy: ${maxForecastDay}
- Najsłabszy dzień prognozy: ${minForecastDay}
`.trim()

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 350,
    messages: [
      {
        role: 'system',
        content: `Jesteś dyrektorem finansowym AI restauracji. Piszesz po polsku.
Dano Ci dane prognozy przychodów wygenerowanej przez model statystyczny.
Napisz krótką (3-4 zdania) analizę:
1. Oceń prognozę i jej wiarygodność
2. Wskaż kluczowy ryzyko lub szansę
3. Podaj 1-2 konkretne zalecenia operacyjne na nadchodzący okres
Używaj liczb. Pisz jak doświadczony CFO, nie jak bot.`,
      },
      { role: 'user', content: prompt },
    ],
  })

  return NextResponse.json({ insight: res.choices[0]?.message?.content ?? '' })
}
