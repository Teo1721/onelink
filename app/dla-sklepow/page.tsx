"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowRight, ChevronDown, Package, BarChart3, DollarSign,
  TrendingUp, Users, ShieldCheck, Clock, Zap,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-[#F9FAFB] transition-colors">
        <span className="text-[14px] font-semibold text-[#111827]">{q}</span>
        <ChevronDown className={`w-4 h-4 text-[#6B7280] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-4 text-[13px] text-[#6B7280] leading-relaxed bg-white">{a}</div>}
    </div>
  );
}

const PROBLEMS_PL = [
  { icon: Package, title: "Stany magazynowe w głowie lub Excelu", desc: "Brakuje towaru? Dowiadujesz się, gdy klient pyta o produkt. Zamawiasz za dużo albo za mało — bo nie ma jednego miejsca z prawdziwymi stanami." },
  { icon: DollarSign, title: "Koszty operacyjne rosną bez kontroli", desc: "Faktury od dostawców, pracownicy, media — trudno zebrać wszystko i wyliczyć marżę per kategoria produktu czy sklep." },
  { icon: Users, title: "Grafik na kartce, absencje przez SMS", desc: "Zarządzanie zmianami kilku pracowników w różnych godzinach generuje chaos, gdy ktoś odwołuje w ostatniej chwili." },
];
const PROBLEMS_EN = [
  { icon: Package, title: "Stock levels in your head or Excel", desc: "Running out of stock? You find out when a customer asks. You over- or under-order — because there's no single source of truth for stock levels." },
  { icon: DollarSign, title: "Operating costs growing out of control", desc: "Supplier invoices, staff, utilities — it's hard to pull everything together and calculate margin per product category or store." },
  { icon: Users, title: "Schedule on paper, absences by SMS", desc: "Managing shifts for several employees at different hours creates chaos whenever someone cancels at the last minute." },
];

const FEATURES_PL = [
  { icon: Package, color: "#10B981", title: "Stany i zamówienia w jednym miejscu", desc: "Bieżące stany magazynowe, alerty o niskim poziomie, historia dostaw — bez arkuszy kalkulacyjnych." },
  { icon: BarChart3, color: "#6366F1", title: "P&L na sklep i kategorię", desc: "Sprzedaż, koszty, marża — widok per lokal i per kategoria produktowa. Wiesz, co zarabia, a co obciąża wynik." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — alert gdy marża spada", desc: "Dyrektor Finansowy AI analizuje wyniki każdego sklepu i alarmuje, gdy trend jest niepokojący." },
  { icon: Users, color: "#EF4444", title: "Grafik i ewidencja czasu pracy", desc: "Harmonogram zmian online, wnioski urlopowe w aplikacji, automatyczna ewidencja godzin dla kadr." },
  { icon: DollarSign, color: "#3B82F6", title: "Faktury i koszty dostawców", desc: "Skanuj i kategoryzuj faktury. System łączy je z P&L automatycznie — zero ręcznego przepisywania." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Sieć sklepów w jednym panelu", desc: "Porównuj wyniki między sklepami, buduj rankingi i wychwytuj lokal wymagający interwencji." },
];
const FEATURES_EN = [
  { icon: Package, color: "#10B981", title: "Stock and orders in one place", desc: "Current stock levels, low-level alerts, delivery history — without spreadsheets." },
  { icon: BarChart3, color: "#6366F1", title: "P&L per store and category", desc: "Sales, costs, margin — view per location and per product category. You know what earns and what drags the result." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — alert when margin drops", desc: "The AI Finance Director analyses each store's results and alerts you when the trend is worrying." },
  { icon: Users, color: "#EF4444", title: "Schedule and time tracking", desc: "Online shift schedule, leave requests in the app, automatic time records for HR." },
  { icon: DollarSign, color: "#3B82F6", title: "Invoices and supplier costs", desc: "Scan and categorise invoices. The system links them to P&L automatically — zero manual re-entry." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Store network in one panel", desc: "Compare results between stores, build rankings and identify the location that needs attention." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink działa dla sklepów detalicznych?", a: "Tak. OneLink obsługuje każdy biznes z personelem, magazynem i kosztami operacyjnymi — w tym sklepy detaliczne, spożywcze i specjalistyczne." },
  { q: "Czy mogę śledzić stany magazynowe?", a: "Tak. Możesz prowadzić stany przez system transakcji magazynowych, importować dane CSV i powiązywać produkty z dostawcami i fakturami." },
  { q: "Czy aplikacja mobilna działa bez internetu?", a: "Aplikacja pracownika jest PWA — działa na każdym smartfonie przez przeglądarkę. Podstawowe widoki są dostępne offline." },
  { q: "Ile kosztuje OneLink dla sieci sklepów?", a: "Od 19,99 zł / miesiąc netto za lokalizację. Dla sieci powyżej 5 lokali — skontaktuj się po indywidualną wycenę." },
  { q: "Jak zintegrować OneLink z moją kasą fiskalną?", a: "OneLink importuje raporty sprzedaży (CSV/Excel) i łączy je z danymi kosztowymi. Nie zastępuje kasy, ale agreguje wszystkie dane w jednym miejscu." },
];
const FAQ_ITEMS_EN = [
  { q: "Does OneLink work for retail stores?", a: "Yes. OneLink supports any business with staff, inventory and operating costs — including retail, grocery and specialist stores." },
  { q: "Can I track stock levels?", a: "Yes. You can manage stock via the warehouse transaction system, import CSV data and link products to suppliers and invoices." },
  { q: "Does the mobile app work offline?", a: "The employee app is a PWA — it runs on any smartphone through the browser. Key views are available offline." },
  { q: "How much does OneLink cost for a store chain?", a: "From 49.99 PLN / month net per location. For chains over 5 locations — contact us for individual pricing." },
  { q: "How do I integrate OneLink with my POS?", a: "OneLink imports sales reports (CSV/Excel) and combines them with cost data. It doesn't replace your POS, but aggregates all data in one place." },
];

export default function DlaSklepowPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const PROBLEMS = pl ? PROBLEMS_PL : PROBLEMS_EN;
  const FEATURES = pl ? FEATURES_PL : FEATURES_EN;
  const FAQ_ITEMS = pl ? FAQ_ITEMS_PL : FAQ_ITEMS_EN;
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/sign-in" className="h-8 px-4 text-[13px] font-medium text-[#374151] hover:text-[#111827] flex items-center">{pl ? 'Zaloguj' : 'Log in'}</Link>
            <Link href="/auth/sign-up" className="h-8 px-4 rounded-lg bg-[#111827] text-[13px] font-semibold text-white hover:bg-[#1F2937] transition-colors flex items-center">
              {pl ? 'Zacznij za darmo' : 'Start for free'}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #052e16 0%, #065f46 50%, #047857 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla sklepów i sieci detalicznych</span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              Jeden panel dla&nbsp;całej<br />sieci sklepów
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-emerald-200 leading-relaxed mb-8 max-w-xl mx-auto">
              Stany magazynowe, grafik pracowników, P&L per sklep i AI CFO który widzi problemy zanim Ty je zauważysz.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-white text-[15px] font-bold text-emerald-900 hover:bg-emerald-50 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator oszczędności
              </Link>
            </div>
            <p className="text-[12px] text-emerald-300 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Problemy które rozwiązujemy</p>
            <h2 className="text-[28px] font-black text-[#111827]">Każdy sklep walczy z tym samym</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                    <p.icon className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#111827] mb-2">{p.title}</h3>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Funkcje systemu</p>
            <h2 className="text-[28px] font-black text-[#111827]">Wszystko co potrzebuje sklep</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="flex gap-4 p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: f.color + '18' }}>
                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#111827] mb-1">{f.title}</h3>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 px-5 bg-[#F9FAFB]">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Zap key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
            </div>
            <p className="text-[18px] font-bold text-[#111827] italic mb-4 leading-relaxed">
              "Zarządzam 6 sklepami z jednego telefonu. Widzę marżę każdego sklepu, kto jest na zmianie i wszystkie faktury. Wcześniej potrzebowałem do tego asystentki i 3 Exceli."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Magdalena S.</p>
            <p className="text-[12px] text-[#9CA3AF]">Właścicielka sieci sklepów, Feniks</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #052e16 0%, #047857 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowy żeby ogarnąć sieć sklepów?</h2>
          <p className="text-[15px] text-emerald-200 mb-8">7 dni za darmo. Konfiguracja w 3 minuty.</p>
          <Link href="/auth/sign-up"
            className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-white text-[15px] font-bold text-emerald-900 hover:bg-emerald-50 transition-all shadow-2xl">
            Zacznij za darmo <ArrowRight className="w-5 h-5" />
          </Link>
        </Reveal>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-8">
            <h2 className="text-[26px] font-black text-[#111827]">Często zadawane pytania</h2>
          </Reveal>
          <div className="space-y-3">
            {FAQ_ITEMS.map(item => <FAQ key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#F3F4F6] py-8 px-5 text-center">
        <p className="text-[12px] text-[#9CA3AF]">© 2025 OneLink · <Link href="/privacy" className="hover:text-[#374151]">Polityka prywatności</Link> · <Link href="/terms" className="hover:text-[#374151]">Regulamin</Link></p>
      </footer>
    </div>
  );
}
