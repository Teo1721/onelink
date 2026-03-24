import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { ShieldCheck, Lock, Server, Eye, RefreshCw, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Bezpieczeństwo danych — OneLink",
  description: "Jak OneLink chroni Twoje dane biznesowe — szyfrowanie, infrastruktura EU, polityka backupów i standardy bezpieczeństwa.",
};

export default function SecurityPage() {
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
        <div className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 border border-green-200 mb-6">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-[40px] font-black tracking-tight mb-4 text-[#111827]">Bezpieczeństwo danych</h1>
          <p className="text-[16px] text-[#6B7280] max-w-xl mx-auto leading-relaxed">
            Powierzasz nam dane swojego biznesu — P&L, koszty, faktury. Traktujemy to poważnie. Oto jak chronimy Twoje dane.
          </p>
        </div>

        {/* Security pillars */}
        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {[
            {
              icon: Lock,
              color: '#10B981',
              bgColor: 'bg-green-50',
              borderColor: 'border-green-200',
              title: 'Szyfrowanie danych',
              desc: 'Wszystkie dane przesyłane między Twoją przeglądarką a naszymi serwerami są szyfrowane przez TLS 1.3. Dane w bazie danych są szyfrowane w stanie spoczynku (AES-256).',
            },
            {
              icon: Server,
              color: '#3B82F6',
              bgColor: 'bg-blue-50',
              borderColor: 'border-blue-200',
              title: 'Infrastruktura w Unii Europejskiej',
              desc: 'Dane aplikacji przechowywane są na serwerach Supabase zlokalizowanych w Unii Europejskiej, co zapewnia pełną zgodność z RODO i wymogami dotyczącymi lokalizacji danych.',
            },
            {
              icon: Eye,
              color: '#8B5CF6',
              bgColor: 'bg-purple-50',
              borderColor: 'border-purple-200',
              title: 'Kontrola dostępu',
              desc: 'Każdy użytkownik widzi tylko dane swojej firmy — izolacja na poziomie bazy danych (Row Level Security). Pracownicy i managerowie mają ograniczone role i uprawnienia.',
            },
            {
              icon: RefreshCw,
              color: '#1D4ED8',
              bgColor: 'bg-blue-50',
              borderColor: 'border-blue-200',
              title: 'Kopie zapasowe',
              desc: 'Automatyczne backupy bazy danych wykonywane codziennie. Dane po anulowaniu konta są przechowywane przez 30 dni, po czym trwale usuwane.',
            },
          ].map(p => (
            <div key={p.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${p.bgColor} border ${p.borderColor}`}>
                <p.icon className="w-5 h-5" style={{ color: p.color }} />
              </div>
              <h3 className="text-[15px] font-bold text-[#111827] mb-2">{p.title}</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Payments */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#111827] mb-1">Płatności — Stripe PCI DSS Level 1</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">
                Wszystkie płatności obsługuje <strong className="text-[#111827]">Stripe</strong> — jeden z najbardziej zaufanych procesorów płatności na świecie, certyfikowany na poziomie PCI DSS Level 1. <strong className="text-[#111827]">Nie przechowujemy numerów kart ani żadnych pełnych danych płatniczych</strong> na naszych serwerach. Dane kart są tokenizowane i zarządzane wyłącznie przez Stripe.
              </p>
            </div>
          </div>
        </div>

        {/* GDPR */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-16 shadow-sm">
          <h3 className="text-[15px] font-bold text-[#111827] mb-4">Zgodność z RODO</h3>
          <div className="space-y-3">
            {[
              'Dane przetwarzane wyłącznie na podstawie umowy i uzasadnionego interesu administratora (art. 6 RODO)',
              'Dane nie są przekazywane poza Europejski Obszar Gospodarczy',
              'Pełne prawo do dostępu, sprostowania, usunięcia i przenoszenia danych',
              'Kontakt w sprawach danych: kontakt@onelink.pl — odpowiedź do 30 dni',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#4B5563] leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Questions CTA */}
        <div className="text-center border-t border-[#E5E7EB] pt-12">
          <h2 className="text-[22px] font-black mb-3 text-[#111827]">Masz pytania dotyczące bezpieczeństwa?</h2>
          <p className="text-[14px] text-[#6B7280] mb-6">
            Napisz do nas — chętnie wyjaśnimy szczegóły lub umówimy się na rozmowę.
          </p>
          <a
            href="mailto:kontakt@onelink.pl?subject=Bezpieczeństwo danych OneLink"
            className="inline-flex items-center gap-2 h-11 px-7 rounded-xl border border-[#E5E7EB] bg-white text-[14px] font-semibold text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB] shadow-sm transition-all"
          >
            kontakt@onelink.pl
          </a>
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
