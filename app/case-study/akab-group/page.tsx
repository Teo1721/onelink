import Link from 'next/link'
import { ArrowRight, CheckCircle, TrendingDown, Clock, BarChart3, Users } from 'lucide-react'
import { OneLinkLogo } from '@/components/onelink-logo'

export const metadata = {
  title: 'Case study: AKAB Group — jak skrócili zamknięcie dnia z 2h do 18 min | OneLink',
  description: 'AKAB Group — sieć lokali gastronomicznych. Jak OneLink pomógł zredukować food cost o 4,2 pp, skrócić zamknięcie dnia z 2 godzin do 18 minut i odzyskać 97 minut dziennie na lokal.',
}

export default function AKABCaseStudy() {
  return (
    <div className="bg-white text-[#111827] min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
          <Link href="/">
            <OneLinkLogo iconSize={24} textSize="text-[14px]" dark={false} />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">← Powrót</Link>
            <Link href="/auth/sign-up" className="h-8 px-4 rounded-lg bg-[#111827] text-[13px] font-semibold text-white hover:bg-[#1F2937] transition-colors flex items-center">
              Zacznij za darmo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-5 border-b border-[#F3F4F6]" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #1E3A8A 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-4">Case study</p>
          <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-6">
            AKAB Group:<br />
            <span className="text-blue-300">z 2 godzin do 18 minut</span>
          </h1>
          <p className="text-[17px] text-white/60 leading-relaxed mb-10 max-w-xl">
            Jak sieć gastronomiczna skróciła zamknięcie dnia, zredukowała food cost o 4,2 pp i odzyskała 97 minut dziennie na każdy lokal — w ciągu 90 dni od wdrożenia OneLink.
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: '2h → 18 min', label: 'zamknięcie dnia' },
              { value: '−4,2 pp', label: 'food cost' },
              { value: '504 000 zł', label: 'przychód / mies.' },
              { value: '97 min', label: 'zysk czasu / lokal' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/10 border border-white/20 rounded-xl p-4 text-center">
                <p className="text-[22px] font-black text-white leading-none mb-1">{value}</p>
                <p className="text-[11px] text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-5 py-16">

        {/* Context */}
        <section className="mb-14">
          <h2 className="text-[22px] font-black mb-4">Kontekst</h2>
          <p className="text-[15px] text-[#4B5563] leading-relaxed mb-4">
            AKAB Group to sieć lokali gastronomicznych prowadzona przez Ewelinę Kowalską. Przed wdrożeniem OneLink firma zarządzała operacjami przez mieszankę arkuszy Excel, wiadomości WhatsApp i ręcznych raportów końca dnia. Każdy lokal zamykał dzień średnio przez 2 godziny — manager wpisywał utargi, koszty, stany magazynowe i obecność pracowników osobno, w różnych narzędziach.
          </p>
          <p className="text-[15px] text-[#4B5563] leading-relaxed">
            Ewelina, jako CEO, otrzymywała skonsolidowany widok dopiero następnego ranka — a często z błędami, które wymagały korekt i telefonów do managerów.
          </p>
        </section>

        {/* Problems */}
        <section className="mb-14">
          <h2 className="text-[22px] font-black mb-6">Problemy przed OneLink</h2>
          <div className="space-y-4">
            {[
              { icon: Clock, title: 'Zamknięcie dnia: ~2 godziny', desc: 'Każdy manager poświęcał 1,5–2 godziny wieczorem na ręczne wpisywanie danych do Excela. Błędy były normą, nie wyjątkiem.' },
              { icon: TrendingDown, title: 'Food cost niekontrolowany', desc: 'Firma nie miała bieżącego widoku na food cost per lokal. Anomalie wykrywano dopiero na koniec miesiąca, kiedy szkody były już nieodwracalne.' },
              { icon: BarChart3, title: 'Brak porównania między lokalami', desc: 'Poszczególne lokale działały w silosach — CEO nie miała jednego widoku porównawczego na marże, koszty pracy i wyniki sprzedaży.' },
              { icon: Users, title: 'Ewidencja czasu pracy w WhatsApp', desc: 'Pracownicy potwierdzali obecność przez wiadomości, a managerowie przepisywali to do Excela. System był podatny na manipulacje i błędy.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl bg-red-50 border border-red-100">
                <Icon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-bold text-[#111827] mb-1">{title}</h3>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section className="mb-14">
          <h2 className="text-[22px] font-black mb-4">Wdrożenie OneLink</h2>
          <p className="text-[15px] text-[#4B5563] leading-relaxed mb-6">
            Konfiguracja zajęła jeden dzień roboczy. Managerowie zostali zaproszeni do systemu przez e-mail, pracownicy otrzymali kody QR do kiosku PIN. Dane historyczne zostały zaimportowane przez CSV.
          </p>
          <div className="space-y-3">
            {[
              'Panel P&L na żywo — Ewelina widzi wyniki każdego lokalu o dowolnej porze dnia',
              'Kiosk PIN do rejestracji czasu — pracownicy logują się przez telefon, system robi zdjęcie',
              'AI CFO monitoruje food cost i alarmuje gdy przekroczy target',
              'Managerowie zamykają dzień przez telefon w 10–18 minut zamiast 2 godzin',
              'Faktury dostawców dodawane przez zdjęcie — OCR wyciąga dane automatycznie',
            ].map(item => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <p className="text-[14px] text-[#374151]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Results */}
        <section className="mb-14">
          <h2 className="text-[22px] font-black mb-6">Wyniki po 90 dniach</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { value: '2h → 18 min', label: 'czas zamknięcia dnia', detail: 'Managerowie odzyskują wieczór. Zamknięcie dnia to teraz 3 ekrany w telefonie.' },
              { value: '−4,2 pp', label: 'food cost', detail: 'AI CFO wykrył 3 kategorie produktów z odchyleniami powyżej 10%. Korekty przyniosły 4,2 pp oszczędności.' },
              { value: '97 min', label: 'zysk czasu dziennie / lokal', detail: 'Managerowie przeznaczają ten czas na zespół i gości zamiast na arkusze.' },
              { value: '504 000 zł', label: 'miesięczny przychód pod kontrolą', detail: 'Cały obrót sieci monitorowany w czasie rzeczywistym z jednego widoku CEO.' },
            ].map(({ value, label, detail }) => (
              <div key={label} className="p-6 rounded-xl bg-[#F0FDF4] border border-green-200">
                <p className="text-[28px] font-black text-[#10B981] leading-none mb-1">{value}</p>
                <p className="text-[13px] font-bold text-[#111827] mb-2">{label}</p>
                <p className="text-[12px] text-[#6B7280] leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quote */}
        <section className="mb-14">
          <blockquote className="border-l-4 border-[#1D4ED8] pl-6 py-2">
            <p className="text-[18px] font-bold text-[#111827] italic leading-relaxed mb-3">
              "Pierwszy raz w życiu wiem co się dzieje w moich lokalach bez dzwonienia do managerów. Koszt surowca spadł o 4 punkty procentowe w trzy miesiące. OneLink to nie system — to wirtualny CFO, który nigdy nie śpi."
            </p>
            <footer className="text-[13px] font-semibold text-[#374151]">
              Ewelina Kowalska — CEO, AKAB Group
            </footer>
          </blockquote>
        </section>

        {/* CTA */}
        <section className="p-10 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #1E3A8A 100%)' }}>
          <h2 className="text-[26px] font-black text-white mb-3">Chcesz takich samych wyników?</h2>
          <p className="text-[14px] text-white/60 mb-6 max-w-sm mx-auto">
            Zacznij za darmo. Konfiguracja w 20 minut. Pierwsze 7 dni bez opłat.
          </p>
          <Link href="/auth/sign-up"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-[15px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/30">
            Zacznij za darmo <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </article>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#9CA3AF]">© 2026 OneLink · InnowacyjneAI sp. z o.o.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">O nas</Link>
            <Link href="/contact" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Kontakt</Link>
            <Link href="/privacy" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
