import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "O nas — OneLink",
  description: "Poznaj zespół za OneLink — kompletny system dla restauratorów: P&L, ewidencja czasu pracy, HR, magazyn i faktury w jednym panelu.",
};

export default function AboutPage() {
  return (
    <div className="bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <Link href="/">
            <OneLinkLogo iconSize={24} textSize="text-[14px]" dark={false} />
          </Link>
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
            ← Powrót
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-20 w-full">
        {/* Header */}
        <div className="mb-16">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-4">O nas</p>
          <h1 className="text-[42px] font-black tracking-tight leading-tight mb-6 text-[#111827]">
            Zbudowaliśmy OneLink, bo sami widzieliśmy jak restauratorzy tracą na danych, których nie widzą.
          </h1>
          <p className="text-[17px] text-[#6B7280] leading-relaxed">
            Właściciele restauracji, piekarni i kawiarni są świetni w gotowaniu, obsłudze klientów i budowaniu miejsca, do którego chce się wracać. Ale zarządzanie liczbami — P&L, food cost, czas pracy pracowników, faktury, dokumenty HR — to osobna praca, która często spada na koniec listy albo ginie w arkuszach Excel.
          </p>
        </div>

        {/* Story */}
        <div className="space-y-8 text-[16px] text-[#4B5563] leading-relaxed">
          <p>
            Widzieliśmy z bliska jak właściciele dowiadują się o stratach dopiero na koniec miesiąca — kiedy jest już za późno, żeby zareagować. Jak managerowie wysyłają dane przez WhatsApp albo wpisują je do Excela, który nikt nie czyta. Jak <span className="text-[#111827] font-semibold">food cost wymyka się spod kontroli</span>, bo nikt nie porównuje zużycia teoretycznego z rzeczywistym.
          </p>
          <p>
            Odpowiedzią nie były kolejne moduły ERP za 500+ zł miesięcznie, których konfiguracja trwa miesiąc i wymaga konsultanta. Odpowiedzią był <span className="text-[#111827] font-semibold">kompletny, szybki panel właściciela</span> — P&L na żywo, kiosk PIN do rejestracji czasu pracy, pełny moduł HR, magazyn i faktury w jednym miejscu. Gotowy w 20 minut, dostępny z telefonu.
          </p>
          <p>
            OneLink to produkt <a href="https://innowacyjneai.pl/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors font-semibold">InnowacyjneAI</a> — agencji, która buduje inteligentne oprogramowanie dla małego i średniego biznesu w Polsce. Jesteśmy małym zespołem, który stawia na konkretne wyniki, nie na funkcje dla samych funkcji.
          </p>
        </div>

        {/* Values */}
        <div className="mt-16 grid sm:grid-cols-2 gap-4">
          {[
            { title: 'Prosto i szybko', desc: 'Konfiguracja w 20 minut. Żadnego działu IT, żadnych szkoleń. Kiosk PIN dla pracowników gotowy w kilka kliknięć.' },
            { title: 'Kompletny — nie tylko P&L', desc: 'Ewidencja czasu pracy, grafik, urlopy, dokumenty, certyfikaty, faktury, magazyn — wszystko w jednym systemie zamiast 5 osobnych narzędzi.' },
            { title: 'Dla właścicieli, nie księgowych', desc: 'Interfejs zaprojektowany dla osoby, która rano otwiera lokal i wieczorem chce wiedzieć czy zarobi na czynsz. Nie dla specjalisty finansowego.' },
            { title: 'Cena uczciwa', desc: 'Od 19,99 zł miesięcznie. Bez ukrytych opłat, bez długich umów. Możesz anulować kiedy chcesz.' },
          ].map(v => (
            <div key={v.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-[#111827] mb-2">{v.title}</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact / CTA */}
        <div className="mt-16 border-t border-[#E5E7EB] pt-12 text-center">
          <h2 className="text-[24px] font-black mb-3 text-[#111827]">Masz pytania? Napisz do nas.</h2>
          <p className="text-[14px] text-[#6B7280] mb-6">
            Jesteśmy małym zespołem — odpowiadamy szybko i nie przekierowujemy do bota.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
            >
              Skontaktuj się <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://innowacyjneai.pl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              innowacyjneai.pl →
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#9CA3AF]">© 2026 OneLink · InnowacyjneAI sp. z o.o.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">O nas</Link>
            <Link href="/contact" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Kontakt</Link>
            <Link href="/security" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Bezpieczeństwo</Link>
            <Link href="/privacy" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Polityka Prywatności</Link>
            <Link href="/terms" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Regulamin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
