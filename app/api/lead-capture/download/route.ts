import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'kalkulator-food-cost.xlsx')

  let buf: Buffer
  try {
    buf = readFileSync(filePath)
  } catch {
    return NextResponse.json({ error: 'Plik niedostępny' }, { status: 404 })
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="kalkulator-food-cost-onelink.xlsx"',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
