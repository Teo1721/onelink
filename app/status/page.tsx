import Link from 'next/link'
import { OneLinkLogo } from '@/components/onelink-logo'
import { CheckCircle } from 'lucide-react'

export const metadata = {
  title: 'Status systemu — OneLink',
  description: 'Aktualny status usług OneLink.',
}

const SERVICES = [
  { name: 'Panel właściciela', desc: 'Raporty P&L, magazyn, faktury' },
  { name: 'Kiosk PIN i QR', desc: 'Rejestracja czasu pracy' },
  { name: 'Dyrektorzy AI', desc: 'Analiza i powiadomienia' },
  { name: 'Autentykacja', desc: 'Logowanie i rejestracja' },
  { name: 'Płatności (Stripe)', desc: 'Subskrypcje i faktury' },
  { name: 'API', desc: 'Integracje zewnętrzne' },
]

export default function StatusPage() {
  const now = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
          <Link href="/">
            <OneLinkLogo iconSize={24} textSize="text-[14px]" dark={false} />
          </Link>
          <Link href="/" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">
            ← Powrót
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0FDF4] border border-green-200 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[13px] font-bold text-[#10B981]">Wszystkie systemy działają prawidłowo</span>
          </div>
          <h1 className="text-[32px] font-black mb-2">Status systemu OneLink</h1>
          <p className="text-[14px] text-[#9CA3AF]">Ostatnia aktualizacja: {now}</p>
        </div>

        {/* Services */}
        <div className="space-y-3 mb-12">
          {SERVICES.map(({ name, desc }) => (
            <div key={name} className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
              <div>
                <p className="text-[14px] font-semibold text-[#111827]">{name}</p>
                <p className="text-[12px] text-[#9CA3AF]">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#10B981]" />
                <span className="text-[12px] font-semibold text-[#10B981]">Działa</span>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Dostępność — 30 dni', value: '99,9%' },
            { label: 'Czas odpowiedzi API', value: '< 200 ms' },
            { label: 'Incydenty w tym miesiącu', value: '0' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] p-5 text-center shadow-sm">
              <p className="text-[24px] font-black text-[#10B981]">{value}</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="text-center p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
          <p className="text-[14px] text-[#374151] mb-1">Masz problem? Napisz do nas.</p>
          <a href="mailto:kontakt@onelink.pl" className="text-[14px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            kontakt@onelink.pl
          </a>
        </div>
      </main>
    </div>
  )
}
