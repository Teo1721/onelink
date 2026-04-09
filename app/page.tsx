"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  TrendingUp, BarChart3, Package, Receipt, ShieldCheck,
  ChevronRight, Check, ArrowRight, Zap, Star,
  Clock, PieChart, FileText, ChevronDown, CheckCircle, Users, Calendar,
} from "lucide-react";

/* ── tiny helpers ── */
const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
    {children}
  </span>
);

const GradientText = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] bg-clip-text text-transparent">
    {children}
  </span>
);

/* ── data ── */
const STATS = [
  { value: "+4,2 pp", label: "Wzrost marży w 3 miesiące", color: "#10B981" },
  { value: "–70%", label: "Czas zamknięcia dnia", color: "#3B82F6" },
  { value: "12+", label: "Wykryte odchylenia / miesiąc", color: "#8B5CF6" },
  { value: "2 400 zł", label: "Oszczędności na food cost", color: "#06B6D4" },
];

const FEATURES = [
  {
    icon: BarChart3,
    color: "#3B82F6",
    title: "Dashboard P&L w czasie rzeczywistym",
    desc: "Widzisz sprzedaż, koszty i EBIT każdego dnia — nie czekasz na koniec miesiąca, żeby wiedzieć czy zarabiasz.",
    items: ["Sprzedaż netto i brutto", "Koszt pracy i food cost %", "EBIT i marża netto", "Alertuj przy odchyleniu"],
  },
  {
    icon: Clock,
    color: "#F59E0B",
    title: "Ewidencja czasu pracy i Kiosk",
    desc: "Pracownicy rejestrują wejście i wyjście przez PIN lub QR na firmowym urządzeniu — system robi zdjęcie automatycznie przy każdym odbiciu.",
    items: ["Kiosk PIN na urządzeniu firmowym", "Kiosk QR — skanowanie osobistego kodu", "Automatyczne zdjęcie przy każdym odbiciu", "Raport godzin i kosztów pracy w czasie rzeczywistym"],
  },
  {
    icon: Users,
    color: "#EC4899",
    title: "Pełny moduł HR",
    desc: "Grafik zmian, urlopy, zamiany, dokumenty pracownicze i certyfikaty — wszystko zarządzane z jednego panelu z alertami wygasania.",
    items: ["Grafik tygodniowy i miesięczny", "Wnioski urlopowe i zamiany zmian", "Dokumenty i certyfikaty z alertami wygasania", "Onboarding i certyfikacje nowych pracowników"],
  },
  {
    icon: Package,
    color: "#8B5CF6",
    title: "Magazyn i odchylenia składników",
    desc: "Śledzisz stany, zamawiasz dostawy i widzisz gdzie znika towar — porównując zużycie teoretyczne z rzeczywistym.",
    items: ["Stany magazynowe w czasie rzeczywistym", "Transfery między lokalami", "Wykrywanie odchyleń food cost", "Historia dostaw"],
  },
  {
    icon: TrendingUp,
    color: "#06B6D4",
    title: "Kalkulator i symulator cen menu",
    desc: "Sprawdzasz food cost każdego dania i symulujesz co się stanie z marżą, kiedy zmieni się cena składnika.",
    items: ["Koszt produkcji per danie", "Symulacja zmiany cen surowców", "Status marży (OK / Uwaga / Krytyczny)", "Porównanie z targetem"],
  },
  {
    icon: Receipt,
    color: "#10B981",
    title: "Faktury i zatwierdzenia",
    desc: "Managerowie przesyłają faktury COS i SEMIS, Ty je zatwierdzasz jednym kliknięciem — pełna historia i eksport do księgowości.",
    items: ["Faktury COS (żywność) i SEMIS (koszty stałe)", "Workflow zatwierdzania z historią", "Powiadomienia w czasie rzeczywistym", "Eksport do księgowości"],
  },
];

const TESTIMONIALS = [
  { name: "Marek W.", role: "właściciel — Fabryka Pączków (2 lokale)", text: "Pierwszy raz w życiu wiem co się dzieje w moich lokalach bez dzwonienia do managerów. Koszt surowca spadł o 4 punkty procentowe w trzy miesiące." },
  { name: "Agnieszka K.", role: "CEO — Piekarnia Matusik (sieć 4 punktów)", text: "Zamknięcie dnia zajmuje teraz 10 minut zamiast godziny. Managerowie wpisują dane przez telefon, ja rano widzę pełny raport. Nie wiem jak funkcjonowałam bez tego." },
  { name: "Tomasz R.", role: "właściciel — Swojska Spiżarnia (delikatesy + dostawa)", text: "Wykryłem że jeden składnik regularnie znikał ze stanu. Bez OneLink nigdy bym tego nie zauważył. Odbiłem 1 800 zł miesięcznie tylko na tym." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Załóż konto — 3 minuty", desc: "Rejestrujesz się, dodajesz lokalizację, zapraszasz managera i ustawiasz kiosk do rejestracji czasu pracy — wszystko z jednego panelu, bez IT." },
  { step: "02", title: "Pracownicy rejestrują czas przez kiosk", desc: "Na firmowym telefonie lub tablecie wpisują PIN lub skanują QR. System robi zdjęcie automatycznie — pełna ewidencja bez żadnych arkuszy." },
  { step: "03", title: "Managerowie wpisują dane z telefonu", desc: "Sprzedaż, faktury COS i SEMIS, stany magazynu, grafik — managerowie wpisują przez prosty formularz na telefonie. Żadnych Exceli." },
  { step: "04", title: "Ty widzisz wszystko — P&L, HR i alerty na żywo", desc: "Marże, koszty pracy, odchylenia, wygasające dokumenty pracowników — jeden panel, dostępny 24/7. Reagujesz zanim problem stanie się stratą." },
];

/* ── FAQ data ── */
const FAQ_ITEMS = [
  { q: "Ile kosztuje OneLink po zakończeniu bezpłatnego trialu?", a: "Plany zaczynają się od 19,99 zł miesięcznie netto (+ VAT). Szczegóły wszystkich planów znajdziesz na stronie /pricing. Możesz anulować w dowolnym momencie — bez okresu wypowiedzenia." },
  { q: "Czy muszę podawać kartę kredytową przy rejestracji?", a: "Tak, przy rejestracji prosimy o dane karty przez Stripe. Nie pobieramy żadnej opłaty przez 7 dni trialu. Karta jest potrzebna do aktywacji konta — możesz anulować w dowolnym momencie przed upływem 7 dni i nie zostanie pobrana żadna opłata." },
  { q: "Jak długo trwa wdrożenie i konfiguracja systemu?", a: "Pierwsze konto jest gotowe w około 3 minuty. Pełna konfiguracja z zaproszeniem managerów i połączeniem danych zajmuje do 20 minut. Nie potrzebujesz działu IT ani technicznej wiedzy." },
  { q: "Jak działa kontrola food cost w OneLink?", a: "OneLink śledzi zużycie teoretyczne składników (na podstawie receptur i sprzedaży) i porównuje je z rzeczywistymi stanami magazynowymi. Odchylenia są automatycznie wykrywane i sygnalizowane alertem. Dzięki temu wiesz, gdzie znika towar — zanim zorientujesz się na koniec miesiąca." },
  { q: "Czy mogę zarządzać kilkoma lokalami z jednego konta?", a: "Tak. OneLink jest zaprojektowany do zarządzania wieloma lokalizacjami z jednego panelu właściciela. Możesz porównywać wyniki, transferować stany między lokalami i zatwierdzać faktury z każdego z nich." },
  { q: "Czy moje dane są bezpieczne?", a: "Tak. Dane są szyfrowane i przechowywane na serwerach w UE (Supabase). Płatności obsługuje Stripe — jeden z najbardziej zaufanych procesorów płatności na świecie. Danych kart nie przechowujemy — Stripe ma PCI DSS Level 1. Nie udostępniamy danych podmiotom trzecim." },
  { q: "Co się stanie z moimi danymi po anulowaniu subskrypcji?", a: "Twoje dane są przechowywane przez 30 dni po anulowaniu. W tym czasie możesz je wyeksportować. Po upływie 30 dni dane są trwale usuwane z naszych serwerów." },
  { q: "Jak działa ewidencja czasu pracy i kiosk PIN?", a: "Na firmowym telefonie lub tablecie otwierasz adres kiosku. Pracownicy wybierają swoje imię i wpisują 4-cyfrowy PIN — system automatycznie robi zdjęcie aparatem urządzenia jako dowód obecności. Możesz też użyć kiosku QR, gdzie pracownik skanuje swój osobisty kod. Wszystkie odbicia trafiają do ewidencji w czasie rzeczywistym." },
  { q: "Czy pracownicy mają własny dostęp do systemu?", a: "Tak. Każdy pracownik może zalogować się do aplikacji pracowniczej (/workspace) gdzie widzi swój grafik, może złożyć wniosek urlopowy, zgłosić zamianę zmian i zobaczyć swoje godziny pracy. Nie ma dostępu do danych finansowych." },
  { q: "Jak OneLink porównuje się do arkuszy Excel?", a: "Excel wymaga ręcznego wprowadzania danych, formuł i nie daje alertów w czasie rzeczywistym. OneLink automatyzuje zbieranie danych od managerów, oblicza P&L na bieżąco, prowadzi ewidencję czasu pracy i alarmuje przy odchyleniach — bez żadnych formuł. Zamknięcie dnia trwa 10 minut zamiast godziny." },
];

/* ── Lead Capture ── */
function LeadCapture() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  return (
    <section className="relative max-w-2xl mx-auto px-6 pb-20">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-green-50 p-8 text-center shadow-sm">
        {done ? (
          <>
            <p className="text-[22px] font-bold text-[#111827] mb-2">Dziękujemy! 🎉</p>
            <p className="text-[14px] text-[#6B7280]">Wyślemy Ci praktyczny poradnik wkrótce.</p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-3">Nie gotowy na trial?</p>
            <h2 className="text-[22px] font-black text-[#111827] mb-2 leading-tight">
              Pobierz bezpłatny kalkulator food cost
            </h2>
            <p className="text-[14px] text-[#6B7280] mb-6 leading-relaxed">
              Arkusz Excel gotowy do użycia — oblicz food cost każdego dania i znajdź gdzie tracisz marżę. Bez rejestracji.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Twój adres e-mail"
                className="flex-1 h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 shadow-sm transition-all"
              />
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-[13px] font-bold text-white hover:from-blue-500 hover:to-blue-400 transition-all whitespace-nowrap shadow-sm"
              >
                Wyślij mi arkusz
              </button>
            </form>
            <p className="text-[11px] text-[#9CA3AF] mt-3">Bez spamu. Jeden e-mail z arkuszem.</p>
          </>
        )}
      </div>
    </section>
  );
}

/* ── FAQ Section component ── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative max-w-3xl mx-auto px-6 pb-24">
      <div className="text-center mb-14">
        <h2 className="text-[36px] md:text-[46px] font-black tracking-tight mb-4 text-[#111827]">
          Często zadawane pytania
        </h2>
        <p className="text-[16px] text-[#6B7280]">Wszystko co chcesz wiedzieć przed startem trialu</p>
      </div>

      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className={`border rounded-2xl overflow-hidden transition-all ${openIndex === i ? 'border-[#D1D5DB] bg-white shadow-sm' : 'border-[#E5E7EB] bg-white hover:shadow-sm'}`}
          >
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
            >
              <span className="text-[15px] font-semibold text-[#111827] leading-snug">{item.q}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`} />
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: openIndex === i ? '400px' : '0px' }}
            >
              <p className="px-6 pb-5 text-[14px] text-[#6B7280] leading-relaxed">{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Sticky CTA (mobile bottom bar + desktop top bar) ── */
function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const faqEl = document.getElementById('faq');
      const footerEl = document.querySelector('footer');

      if (scrollY < 400) { setVisible(false); return; }

      if (faqEl || footerEl) {
        const el = faqEl || footerEl;
        const threshold = el!.getBoundingClientRect().top + window.scrollY - 200;
        setVisible(scrollY < threshold);
      } else {
        setVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Mobile bottom bar */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <Link
            href="/auth/sign-up"
            className="flex flex-col items-center justify-center py-4 bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] active:opacity-80 transition-all"
          >
            <span className="text-[15px] font-bold text-white">Zacznij za darmo — 7 dni bez opłat</span>
            <span className="text-[11px] text-white/75 mt-0.5">🔒 Bezpieczna płatność Stripe</span>
          </Link>
        </div>
      </div>

      {/* Desktop floating CTA bar */}
      <div
        className={`hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border border-[#E5E7EB] bg-white/95 backdrop-blur-md shadow-xl shadow-black/10">
          <div className="flex items-center gap-2">
            {['#06B6D4','#3B82F6','#8B5CF6'].map((c,i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }} />
            ))}
            <span className="text-[12px] text-[#6B7280] ml-1">50+ firm używa naszego systemu</span>
          </div>
          <div className="w-px h-5 bg-[#E5E7EB]" />
          <Link
            href="/auth/sign-up"
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-1.5"
          >
            Zacznij bezpłatny trial
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
}

/* ── Dashboard Mockup ── */
function DashboardMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/12 shadow-2xl" style={{ background: '#0D1628' }}>
      {/* Browser bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 mx-4 h-6 rounded-md bg-white/8 flex items-center px-3">
          <div className="w-2 h-2 rounded-full bg-[#10B981] mr-2" />
          <span className="text-[10px] text-white/30 font-mono">onelink.pl/console</span>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="flex" style={{ minHeight: 440 }}>
        {/* Sidebar */}
        <div className="w-[150px] border-r border-white/8 p-3 flex flex-col gap-0.5 shrink-0">
          <div className="h-8 px-2 mb-2 flex items-center">
            <span className="text-[12px] font-bold text-white">OneLink</span>
          </div>
          {[
            { icon: BarChart3, label: "Dashboard", active: true },
            { icon: PieChart,  label: "P&L" },
            { icon: Clock,     label: "Czas pracy", badge: '3' },
            { icon: Users,     label: "HR", badge: '!' },
            { icon: Calendar,  label: "Grafik" },
            { icon: Receipt,   label: "Faktury" },
            { icon: Package,   label: "Magazyn" },
            { icon: FileText,  label: "Raporty" },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 h-7 px-2.5 rounded-lg text-[10px] font-medium ${item.active ? 'bg-[#1E3A8A] text-[#93C5FD]' : 'text-white/30'}`}>
              <item.icon className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded-sm leading-none ${item.badge === '!' ? 'bg-amber-500/25 text-amber-400' : 'bg-blue-500/25 text-blue-300'}`}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Sprzedaż netto', val: '18 340 zł', sub: 'Plan: 18 000 zł', color: '#fff' },
              { label: 'Pracownicy dziś', val: '3 / 8',    sub: 'Kiosk PIN aktywny', color: '#F59E0B' },
              { label: 'Food cost',       val: '31,2%',    sub: 'Cel: 35%',          color: '#10B981' },
              { label: 'EBIT',            val: '4 210 zł', sub: 'Marża: 22,9%',      color: '#10B981' },
            ].map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-[8px] font-semibold uppercase tracking-widest text-white/35 mb-1">{t.label}</p>
                <p className="text-[16px] font-black leading-none mb-1" style={{ color: t.color }}>{t.val}</p>
                <p className="text-[8px] text-white/25">{t.sub}</p>
              </div>
            ))}
          </div>

          {/* Chart + donut row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Area chart mockup */}
            <div className="col-span-2 bg-white/5 border border-white/8 rounded-xl p-3">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-white/35 mb-3">Trend sprzedaży — 7 dni</p>
              <div className="relative h-[80px]">
                <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0,60 C 30,55 50,40 70,45 S 110,30 130,25 S 170,10 200,20 L 200,80 L 0,80 Z" fill="url(#chartGrad)" />
                  <path d="M 0,60 C 30,55 50,40 70,45 S 110,30 130,25 S 170,10 200,20" fill="none" stroke="#3B82F6" strokeWidth="2" />
                  {[[0,60],[70,45],[130,25],[200,20]].map(([x,y],i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
                  ))}
                  <line x1="0" y1="80" x2="200" y2="80" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                  {['Pn','Wt','Śr','Cz','Pt','Sb','Nd'].map(d => (
                    <span key={d} className="text-[7px] text-white/25">{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Donut mockup */}
            <div className="bg-white/5 border border-white/8 rounded-xl p-3">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-white/35 mb-2">Koszty</p>
              <div className="flex justify-center mb-2">
                <svg viewBox="0 0 80 80" className="w-14 h-14">
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#06B6D4" strokeWidth="10" strokeDasharray="52 124" strokeDashoffset="31" />
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#3B82F6" strokeWidth="10" strokeDasharray="37 124" strokeDashoffset="-21" />
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#8B5CF6" strokeWidth="10" strokeDasharray="21 124" strokeDashoffset="-58" />
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#10B981" strokeWidth="10" strokeDasharray="14 124" strokeDashoffset="-79" />
                </svg>
              </div>
              <div className="space-y-1">
                {[['COGS','#06B6D4','31%'],['Praca','#3B82F6','24%'],['OPEX','#8B5CF6','22%'],['Zysk','#10B981','23%']].map(([l,c,v])=>(
                  <div key={l} className="flex items-center justify-between">
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-sm" style={{background:c}}/><span className="text-[8px] text-white/35">{l}</span></div>
                    <span className="text-[8px] font-bold" style={{color:c}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status bar — dual alerts */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#10B981]/10 border border-[#10B981]/25 rounded-lg">
              <ShieldCheck className="w-3 h-3 text-[#10B981] shrink-0" />
              <span className="text-[9px] text-[#10B981] font-semibold">Rentowność OK · Food cost 31,2%</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-lg">
              <Clock className="w-3 h-3 text-[#F59E0B] shrink-0" />
              <span className="text-[9px] text-[#F59E0B] font-semibold">HR: 3 na zmianie · 1 umowa wygasa wkrótce</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#111827] overflow-x-hidden">

      {/* ── TOP BANNER — Made by InnowacyjneAI ── */}
      <div className="relative z-50 w-full border-b border-[#E5E7EB] bg-white">
        <a
          href="https://innowacyjneai.pl/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 py-2 hover:opacity-75 transition-opacity"
        >
          <div className="flex items-center justify-center w-4 h-4 rounded-sm" style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}>
            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5 text-white" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="3" />
              <path d="M6 1v2M6 9v2M1 6h2M9 6h2" />
            </svg>
          </div>
          <span className="text-[12px] font-medium text-[#6B7280]">
            Zaprojektowane i zbudowane przez
          </span>
          <span className="text-[12px] font-bold" style={{ background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            InnowacyjneAI
          </span>
          <span className="text-[11px] text-[#9CA3AF]">→ innowacyjneai.pl</span>
        </a>
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <OneLinkLogo iconSize={28} textSize="text-[15px]" />
        <div className="hidden md:flex items-center gap-6">
          {[['Funkcje', '#features'], ['Jak działa', '#how'], ['Cennik', '/pricing'], ['O nas', '/about']].map(([label, href]) => (
            <a key={label} href={href} className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors font-medium">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors font-medium">
            Zaloguj
          </Link>
          <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all flex items-center shadow-lg shadow-blue-500/25">
            Zacznij za darmo
          </Link>
        </div>
      </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-blue-500/10 border border-blue-500/25 text-[11px] font-semibold text-blue-500">
            ✨ P&L · Magazyn · HR · Ewidencja czasu pracy · Kiosk PIN
          </span>
        </div>

        <h1 className="mt-4 text-[52px] md:text-[76px] font-black tracking-[-0.03em] leading-[1.0] mb-6 max-w-4xl mx-auto text-[#111827]">
          Wiesz ile zarobiłeś{" "}
          <br className="hidden md:block" />
          <GradientText>dzisiaj?</GradientText>
        </h1>

        <p className="text-[18px] text-[#6B7280] max-w-2xl mx-auto leading-relaxed mb-10">
          OneLink to kompletny system dla restauratorów — P&amp;L na żywo, ewidencja czasu pracy z kioskiem PIN, pełny moduł HR i magazyn. Zamknięcie dnia w 10 minut, wszystko na jednym ekranie.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Link href="/auth/sign-up" className="h-13 px-8 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[15px] font-bold text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-xl shadow-blue-500/30" style={{ height: 52 }}>
            Zacznij bezpłatny trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#features" className="h-13 px-8 rounded-2xl border border-[#E5E7EB] bg-white text-[15px] font-semibold text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB] transition-all flex items-center gap-2 shadow-sm" style={{ height: 52 }}>
            Zobacz jak działa
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Reassurance bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mb-12 text-[12px] text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">🔒 Bezpieczna płatność Stripe</span>
          <span className="text-[#D1D5DB]">·</span>
          <span>Anuluj kiedy chcesz</span>
          <span className="text-[#D1D5DB]">·</span>
          <span>Pełny dostęp przez 7 dni</span>
        </div>

        {/* Social proof bar */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-blue-500 fill-blue-500" />
              ))}
            </div>
            <p className="text-[13px] text-[#6B7280]">
              Ponad <span className="text-[#111827] font-bold">50 firm</span> używa naszego systemu
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Zaufali nam:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['Fabryka Pączków', 'Piekarnia Matusik', 'Swojska Spiżarnia'].map(name => (
                <span key={name} className="px-3 py-1 rounded-full text-[11px] font-medium text-[#6B7280] bg-white border border-[#E5E7EB] shadow-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-4xl mx-auto">
          {/* Glow behind the mockup */}
          <div className="absolute -inset-8 rounded-3xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(37,99,235,0.2) 0%, transparent 70%)' }} />
          <DashboardMockup />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[36px] font-black leading-none mb-2" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[12px] text-[#6B7280] font-medium leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-[#9CA3AF] mt-4">* Średnie wyniki wśród klientów OneLink w pierwszych 90 dniach od wdrożenia</p>
      </section>

      {/* ── INTEGRATIONS STRIP ── */}
      <section className="relative max-w-5xl mx-auto px-6 pb-20">
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-6">Integruje się z</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {[
            { name: 'Stripe', desc: 'Płatności', color: '#635BFF' },
            { name: 'CSV Import', desc: 'Dowolny system POS', color: '#10B981' },
            { name: 'Supabase', desc: 'Bezpieczna baza EU', color: '#3ECF8E' },
            { name: 'Każdy system kasowy', desc: 'przez CSV', color: '#06B6D4' },
          ].map(s => (
            <div key={s.name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow transition-shadow">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <div>
                <p className="text-[12px] font-bold text-[#374151]">{s.name}</p>
                <p className="text-[10px] text-[#9CA3AF]">{s.desc}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white">
            <span className="text-[12px] text-[#9CA3AF]">+21 integracji wkrótce</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <Pill><Star className="w-3 h-3 text-blue-500" />Funkcje</Pill>
          <h2 className="text-[40px] md:text-[52px] font-black tracking-tight mt-6 mb-4 text-[#111827]">
            Wszystko co potrzebuje<br />
            <GradientText>właściciel biznesu</GradientText>
          </h2>
          <p className="text-[16px] text-[#6B7280] max-w-xl mx-auto">
            Zaprojektowane dla MŚP — nie korporacyjny software dostosowany na siłę.
          </p>
        </div>

        <div className="space-y-5">
          {FEATURES.map((f, i) => (
            <div key={i} className={`grid md:grid-cols-2 gap-6 items-center rounded-3xl p-8 border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-shadow`}>
              {/* Text side */}
              <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-5" style={{ background: `${f.color}15` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-[22px] font-bold text-[#111827] mb-3 leading-snug">{f.title}</h3>
                <p className="text-[14px] text-[#6B7280] leading-relaxed mb-5">{f.desc}</p>
                <ul className="space-y-2">
                  {f.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-[13px] text-[#4B5563]">
                      <Check className="w-4 h-4 shrink-0" style={{ color: f.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual side — dark mockup intentional */}
              <div className={`rounded-2xl overflow-hidden border border-[#1E293B]/30 shadow-lg ${i % 2 === 1 ? 'md:order-1' : ''}`} style={{ background: '#0D1628' }}>
                <div className="p-5 space-y-3">
                  {i === 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {[['Sprzedaż netto','18 340 zł','#fff'],['EBIT','4 210 zł','#10B981']].map(([l,v,c])=>(
                          <div key={l} className="bg-white/5 rounded-xl p-3 border border-white/8">
                            <p className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{l}</p>
                            <p className="text-[18px] font-black leading-none" style={{color:c}}>{v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                        <p className="text-[9px] uppercase tracking-widest text-white/35 mb-2">Trend tygodniowy</p>
                        <div className="flex items-end gap-1.5 h-14">
                          {[40,58,52,71,63,80,74].map((h,j)=>(
                            <div key={j} className="flex-1 rounded-t-sm" style={{height:`${h}%`, background: j===5?'#3B82F6':'rgba(59,130,246,0.3)'}}/>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg">
                        <ShieldCheck className="w-3 h-3 text-[#10B981]"/>
                        <span className="text-[9px] text-[#10B981] font-semibold">Brak krytycznych odchyleń</span>
                      </div>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/35 mb-1">Ewidencja czasu pracy — dziś</p>
                      {[['Anna K.','08:02','16:45','8h 43min','#10B981'],['Tomasz W.','09:15',null,'W pracy','#3B82F6'],['Maria S.','07:30','15:00','7h 30min','#10B981']].map(([name,ci,co,time,c])=>(
                        <div key={String(name)} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/8 rounded-lg gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/25 flex items-center justify-center text-[9px] font-bold text-blue-300 shrink-0">{String(name)[0]}</div>
                            <span className="text-[11px] text-white/60 font-medium">{name}</span>
                          </div>
                          <span className="text-[9px] text-green-400 font-mono">{ci}</span>
                          <span className="text-[9px] text-orange-400 font-mono">{co ?? '—'}</span>
                          <span className="text-[10px] font-bold shrink-0" style={{color:c as string}}>{time}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg">
                        <span className="text-[9px] text-[#F59E0B] font-semibold">🔢 Kiosk PIN aktywny · 3 odbicia dziś · 📷 zdjęcia zapisane</span>
                      </div>
                    </>
                  )}
                  {i === 2 && (
                    <>
                      {[
                        ['Grafik — tydzień','12 zmian zaplanowanych','#3B82F6'],
                        ['Urlopy — oczekujące','2 wnioski do zatwierdzenia','#F59E0B'],
                        ['Dokumenty — alert','1 umowa wygasa za 14 dni','#DC2626'],
                        ['Certyfikaty — aktywne','8 / 10 certyfikatów ważnych','#10B981'],
                      ].map(([label,value,c])=>(
                        <div key={String(label)} className="flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl">
                          <span className="text-[10px] text-white/45">{label}</span>
                          <span className="text-[10px] font-semibold" style={{color:c}}>{value}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {i === 3 && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {[['Na stanie','284 kg','#fff'],['Zarezerwowane','42 kg','#06B6D4'],['Alerty','2','#DC2626']].map(([l,v,c])=>(
                          <div key={l} className="bg-white/5 rounded-xl p-3 border border-white/8 text-center">
                            <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">{l}</p>
                            <p className="text-[16px] font-black leading-none" style={{color:c}}>{v}</p>
                          </div>
                        ))}
                      </div>
                      {[['Łosoś atlantycki','12.4 kg','OK','#10B981'],['Wołowina','3.1 kg','Niski','#DC2626'],['Masło','8.0 kg','OK','#10B981']].map(([name,qty,status,c])=>(
                        <div key={name} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/8 rounded-lg">
                          <span className="text-[11px] text-white/60 font-medium">{name}</span>
                          <span className="text-[11px] text-white/35">{qty}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{color:c, background:`${c}18`}}>{status}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {i === 4 && (
                    <>
                      {[
                        ['Burger Wołowy','14,20 zł','42,00 zł','33,8%','#10B981','OK'],
                        ['Łosoś Grillowany','28,10 zł','68,00 zł','41,3%','#DC2626','Krytyczny'],
                        ['Sałatka Cezar','8,50 zł','28,00 zł','30,4%','#10B981','OK'],
                      ].map(([name,cost,price,pct,c,status])=>(
                        <div key={name} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] font-semibold text-white">{name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{color:c, background:`${c}18`}}>{status}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-white/35">Koszt: <span className="text-white/60">{cost}</span></span>
                            <span className="text-[10px] text-white/35">Menu: <span className="text-white/60">{price}</span></span>
                            <span className="text-[10px] font-bold" style={{color:c}}>FC: {pct}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {i === 5 && (
                    <>
                      {[
                        ['FV/2026/041','Sysco Polska','1 240 zł','submitted','#3B82F6'],
                        ['FV/2026/039','Metro Cash','890 zł','approved','#10B981'],
                        ['FV/2026/038','Lyreco','320 zł','approved','#10B981'],
                      ].map(([nr,sup,amt,status,c])=>(
                        <div key={nr} className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/8 rounded-xl">
                          <div>
                            <p className="text-[11px] font-semibold text-white">{sup}</p>
                            <p className="text-[9px] text-white/30 mt-0.5">{nr}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-bold text-white">{amt}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{color:c, background:`${c}18`}}>
                              {status === 'approved' ? 'Zatwierdzona' : 'Do zatwierdzenia'}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <div className="flex-1 h-8 rounded-lg bg-[#DC2626]/20 border border-[#DC2626]/30 flex items-center justify-center text-[10px] font-bold text-[#DC2626]">Odrzuć</div>
                        <div className="flex-1 h-8 rounded-lg bg-[#16A34A] flex items-center justify-center text-[10px] font-bold text-white">Zatwierdź</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Inline CTA after features */}
        <div className="mt-12 text-center">
          <p className="text-[14px] text-[#6B7280] mb-4">Gotowy żeby zobaczyć to na żywo w swoim lokalu?</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-blue-500/25">
            Zacznij bezpłatny trial — 7 dni za darmo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <Pill><Clock className="w-3 h-3 text-blue-500" />Jak działa</Pill>
          <h2 className="text-[36px] md:text-[48px] font-black tracking-tight mt-6 mb-4 text-[#111827]">
            Gotowy w <GradientText>20 minut</GradientText>. Zero IT, zero szkoleń.
          </h2>
          <p className="text-[15px] text-[#6B7280]">Konto w 3 minuty. Pierwsze dane dziś.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="relative bg-white border border-[#E5E7EB] rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[52px] font-black leading-none mb-5 text-[#F3F4F6]">
                {step.step}
              </div>
              <h3 className="text-[18px] font-bold text-[#111827] mb-2">{step.title}</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">{step.desc}</p>
              {i < 3 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#EFF6FF] border border-blue-200 items-center justify-center z-10">
                  <ChevronRight className="w-3 h-3 text-blue-500" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Inline CTA after How it works */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/sign-up" className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25">
            Wypróbuj przez 7 dni za darmo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/contact" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">
            Wolisz najpierw zobaczyć demo? →
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <Pill><Star className="w-3 h-3 text-blue-500" />Opinie</Pill>
          <h2 className="text-[36px] md:text-[46px] font-black tracking-tight mt-6 mb-4 text-[#111827]">
            Właściciele firm już korzystają z OneLink
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                ))}
              </div>
              <p className="text-[14px] text-[#4B5563] leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold text-[#111827]">{t.name}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">{t.role}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-semibold text-green-700 shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  Klient
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">Opinie wczesnych użytkowników OneLink. Wyniki indywidualne mogą się różnić.</p>

        {/* Inline CTA after testimonials */}
        <div className="mt-10 text-center">
          <p className="text-[15px] text-[#6B7280] mb-4">Gotowy żeby zobaczyć swoje liczby tak jak Marek czy Agnieszka?</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/25">
            Zacznij bezpłatny trial →
          </Link>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="relative max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <Pill><ShieldCheck className="w-3 h-3 text-green-500" />Porównanie</Pill>
          <h2 className="text-[28px] md:text-[36px] font-black tracking-tight mt-6 mb-3 text-[#111827]">
            OneLink vs. alternatywy
          </h2>
          <p className="text-[14px] text-[#6B7280]">Wiemy, że porównujesz — więc zrobiliśmy to za Ciebie</p>
        </div>

        <div className="overflow-x-auto bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-[12px] font-bold uppercase tracking-widest text-[#9CA3AF] py-4 px-6 w-[40%]">Funkcja</th>
                <th className="text-[13px] font-bold text-blue-600 py-4 px-6 text-center bg-blue-50">OneLink</th>
                <th className="text-[13px] font-bold text-[#6B7280] py-4 px-6 text-center">Arkusz Excel</th>
                <th className="text-[13px] font-bold text-[#6B7280] py-4 px-6 text-center">Systemy ERP</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['P&L w czasie rzeczywistym', true, false, true],
                ['Konfiguracja w 20 minut', true, true, false],
                ['Food cost i odchylenia', true, false, false],
                ['Alerty automatyczne', true, false, true],
                ['Moduł magazynowy', true, false, true],
                ['Wiele lokalizacji', true, false, true],
                ['Cena dla 1 lokalu', '19,99 zł/mies.', '0 zł', '500+ zł/mies.'],
                ['Wsparcie po polsku', true, false, false],
              ].map(([feature, onelink, excel, erp], i) => (
                <tr key={i} className={`border-t border-[#F3F4F6] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                  <td className="py-3.5 px-6 text-[13px] text-[#374151] font-medium">{feature as string}</td>
                  {[onelink, excel, erp].map((val, j) => (
                    <td key={j} className={`py-3.5 px-6 text-center ${j === 0 ? 'bg-blue-50/50' : ''}`}>
                      {typeof val === 'boolean' ? (
                        val
                          ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100"><Check className="w-3.5 h-3.5 text-green-600" /></span>
                          : <span className="text-[#D1D5DB] text-lg leading-none">—</span>
                      ) : (
                        <span className={`text-[12px] font-semibold ${j === 0 ? 'text-blue-600' : 'text-[#9CA3AF]'}`}>{val as string}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section className="relative max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-px" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.5), rgba(245,158,11,0.3), rgba(37,99,235,0.2))' }}>
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #0A0F1E 100%)' }}>
            <Pill>
              <Zap className="w-3 h-3 text-blue-500" />
              Cennik
            </Pill>
            <h2 className="text-[36px] md:text-[52px] font-black tracking-tight mt-6 mb-4 text-white">
              Od <GradientText>19,99 zł</GradientText> miesięcznie
            </h2>
            <p className="text-[15px] text-white/45 max-w-lg mx-auto mb-8 leading-relaxed">
              7 dni za darmo — karta Stripe wymagana do aktywacji, żadna opłata przez 7 dni. Anuluj kiedy chcesz.
            </p>

            {/* Mini plan overview */}
            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { name: 'Start', price: '19,99 zł', sub: '1 lokal · 1 manager' },
                { name: 'Rozwój', price: '39,99 zł', sub: '2 lokale · 2 managerów', popular: true },
                { name: 'Sieć', price: '59,99 zł', sub: '5 lokali · 5 managerów' },
              ].map(p => (
                <div key={p.name} className={`rounded-xl p-3 border ${p.popular ? 'border-blue-400/40 bg-blue-400/8' : 'border-white/10 bg-white/4'}`}>
                  <p className={`text-[11px] font-bold mb-1 ${p.popular ? 'text-blue-300' : 'text-white/50'}`}>{p.name}{p.popular ? ' ★' : ''}</p>
                  <p className="text-[18px] font-black text-white leading-none">{p.price}</p>
                  <p className="text-[10px] text-white/35 mt-1">/ mies. + VAT</p>
                  <p className="text-[10px] text-white/40 mt-1">{p.sub}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/pricing" className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30">
                Zacznij bezpłatny trial
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5">
              {['Karta Stripe do aktywacji', 'Anuluj kiedy chcesz', 'Pełny dostęp przez 7 dni', 'Wsparcie w języku polskim'].map(item => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-white/35">
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MADE BY INNOWACYJNEAI ── */}
      <section className="relative max-w-4xl mx-auto px-6 pb-20">
        <a
          href="https://innowacyjneai.pl/"
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-shadow px-8 py-7 flex flex-col sm:flex-row items-center gap-6">
            {/* AI icon */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-100 to-blue-100 border border-violet-200">
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" strokeWidth="1.5">
                  <defs>
                    <linearGradient id="aiGrad2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2a4 4 0 014 4v1h1a3 3 0 010 6h-1v1a4 4 0 01-8 0v-1H7a3 3 0 010-6h1V6a4 4 0 014-4z" stroke="url(#aiGrad2)" />
                  <circle cx="9" cy="9" r="1" fill="#8B5CF6" stroke="none" />
                  <circle cx="15" cy="9" r="1" fill="#3B82F6" stroke="none" />
                  <path d="M9 15s1 1.5 3 1.5 3-1.5 3-1.5" stroke="url(#aiGrad2)" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9CA3AF] mb-1">Zaprojektowane i zbudowane przez</p>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-[20px] font-black tracking-tight"
                  style={{ background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  InnowacyjneAI
                </span>
                <span className="hidden sm:flex items-center h-5 px-2 rounded-full text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-200">
                  AI Agency
                </span>
              </div>
              <p className="text-[13px] text-[#6B7280] mt-1">
                Budujemy inteligentne oprogramowanie i rozwiązania AI dla biznesu
              </p>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 flex items-center gap-2 text-[13px] font-semibold text-[#6B7280] group-hover:text-violet-600 transition-colors">
              <span className="hidden sm:block">innowacyjneai.pl</span>
              <div className="w-8 h-8 rounded-full border border-[#E5E7EB] group-hover:border-violet-300 group-hover:bg-violet-50 flex items-center justify-center transition-all">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* ── EMPLOYEE APP SECTION ── */}
      <section className="py-20 px-6 bg-[#F0F2F5]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Pill>📱 Aplikacja mobilna</Pill>
            <h2 className="text-[32px] md:text-[40px] font-black text-[#111827] mt-4 mb-3 leading-tight">
              Grafik zawsze <GradientText>pod ręką</GradientText>
            </h2>
            <p className="text-[16px] text-[#6B7280] max-w-xl mx-auto">
              Pracownicy mogą sprawdzić swój harmonogram na telefonie — iOS i Android.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            {/* Phone mockup */}
            <div className="flex justify-center">
              <div className="relative w-[220px]">
                <div className="w-[220px] h-[420px] rounded-[36px] border-[6px] border-white/10 bg-[#0D1425] overflow-hidden shadow-2xl shadow-blue-500/20">
                  {/* Status bar */}
                  <div className="h-8 bg-[#0D1425] flex items-center justify-between px-5 pt-1">
                    <span className="text-[9px] text-white/40 font-semibold">9:41</span>
                    <div className="w-16 h-3 bg-black rounded-full" />
                    <span className="text-[9px] text-white/40">●●●</span>
                  </div>
                  {/* App UI preview */}
                  <div className="px-4 pt-3 space-y-3">
                    <div className="text-white font-bold text-[13px]">Cześć, Jan 👋</div>
                    <div className="rounded-2xl p-4" style={{ background: '#1E3A8A' }}>
                      <div className="text-[8px] text-blue-300/60 font-bold tracking-widest mb-1">NASTĘPNA ZMIANA</div>
                      <div className="text-white font-bold text-[13px] mb-1">Pt, 21 mar</div>
                      <div className="text-blue-200 text-[11px] font-semibold">08:00 – 16:00</div>
                      <div className="text-blue-300/50 text-[9px] mt-1">📍 Lokal Centrum</div>
                    </div>
                    {[
                      { day: 'Pon', shift: '08:00–16:00', pos: 'kucharz', posColor: '#9A3412', posBg: '#FED7AA' },
                      { day: 'Wt', shift: 'wolne', pos: null, posColor: '', posBg: '' },
                      { day: 'Śr', shift: '12:00–20:00', pos: 'kelner', posColor: '#1E40AF', posBg: '#BFDBFE' },
                    ].map(d => (
                      <div key={d.day} className="rounded-xl px-3 py-2.5 bg-white/5 border border-white/6 flex justify-between items-center">
                        <div>
                          <div className="text-[9px] font-bold text-white/50">{d.day}</div>
                          <div className="text-[10px] text-white/70 font-semibold">{d.shift}</div>
                        </div>
                        {d.pos && (
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: d.posBg, color: d.posColor }}>{d.pos}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* glow */}
                <div className="absolute inset-0 rounded-[36px] pointer-events-none"
                  style={{ boxShadow: '0 0 60px rgba(59,130,246,0.15)' }} />
              </div>
            </div>

            {/* Features + download */}
            <div className="space-y-6">
              {[
                { icon: '📅', title: 'Grafik tygodniowy', desc: 'Widok tygodnia i lista zmian w jednym miejscu.' },
                { icon: '🔔', title: 'Aktualizacje w czasie rzeczywistym', desc: 'Odśwież aplikację i masz zawsze aktualny grafik.' },
                { icon: '📍', title: 'Informacje o lokalizacji', desc: 'Nazwa lokalu i godziny przy każdej zmianie.' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-xl flex-shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#111827] mb-0.5">{f.title}</div>
                    <div className="text-[13px] text-[#6B7280]">{f.desc}</div>
                  </div>
                </div>
              ))}

              {/* Download coming soon */}
              <div className="pt-2">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151]">Aplikacja mobilna — wkrótce</p>
                    <p className="text-[11px] text-[#9CA3AF]">iOS & Android — w przygotowaniu</p>
                  </div>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600">
                    Soon
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-2">
                  Webowa wersja pracownicza już dostępna pod{' '}
                  <Link href="/employee" className="text-blue-500 hover:text-blue-600 transition-colors">/employee</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOG TEASER ── */}
      <section className="relative max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <Pill><FileText className="w-3 h-3 text-blue-500" />Blog</Pill>
          <h2 className="text-[28px] font-black tracking-tight mt-5 mb-2 text-[#111827]">Wiedza dla właścicieli firm</h2>
          <p className="text-[14px] text-[#6B7280]">Praktyczne artykuły o food cost, P&amp;L i zarządzaniu firmą</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { tag: 'Food Cost', title: 'Jak obliczyć food cost w firmie i co zrobić gdy jest za wysoki', date: 'Wkrótce' },
            { tag: 'P&L', title: 'Jak czytać rachunek zysków i strat małego lokalu — krok po kroku', date: 'Wkrótce' },
            { tag: 'Magazyn', title: 'Kontrola magazynu w firmie: jak wykryć skoki i straty surowców', date: 'Wkrótce' },
          ].map(a => (
            <div key={a.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <span className="inline-flex items-center h-5 px-2.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 mb-3">{a.tag}</span>
              <h3 className="text-[14px] font-bold text-[#111827] leading-snug mb-3">{a.title}</h3>
              <p className="text-[11px] text-[#9CA3AF]">{a.date}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LEAD CAPTURE ── */}
      <LeadCapture />

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── STICKY CTA ── */}
      <StickyCTA />

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5E7EB] bg-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Top row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <OneLinkLogo iconSize={22} textSize="text-[13px]" />
              <p className="text-[12px] text-[#9CA3AF] mt-3 leading-relaxed">
                System zarządzania dla firm, sklepów i sieci MŚP.
              </p>
              <a href="mailto:kontakt@onelink.pl" className="text-[12px] text-[#6B7280] hover:text-[#111827] transition-colors mt-3 block">
                kontakt@onelink.pl
              </a>
            </div>

            {/* Product */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Produkt</p>
              <div className="space-y-2.5">
                <Link href="/#features" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Funkcje</Link>
                <Link href="/pricing" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Cennik</Link>
                <Link href="/#how" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Jak działa</Link>
                <Link href="/#faq" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">FAQ</Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Firma</p>
              <div className="space-y-2.5">
                <Link href="/about" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">O nas</Link>
                <Link href="/contact" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Kontakt</Link>
                <Link href="/security" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Bezpieczeństwo</Link>
                <a href="https://innowacyjneai.pl/" target="_blank" rel="noopener noreferrer" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">InnowacyjneAI →</a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Prawne</p>
              <div className="space-y-2.5">
                <Link href="/privacy" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Polityka Prywatności</Link>
                <Link href="/terms" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Regulamin</Link>
                <Link href="/security" className="block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Bezpieczeństwo danych</Link>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="border-t border-[#F3F4F6] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-[#9CA3AF]">
              © 2026 OneLink · InnowacyjneAI sp. z o.o. · kontakt@onelink.pl
            </p>
            <div className="flex items-center gap-5">
              <Link href="/auth/login" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Logowanie</Link>
              <Link href="/auth/sign-up" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Rejestracja</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
