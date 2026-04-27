"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowRight, ChevronDown, BarChart3, DollarSign,
  TrendingUp, Users, ShieldCheck, Calendar, Zap, Package,
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
  { icon: Calendar, title: "Grafik stylistów to ciągłe przeplanowania", desc: "Zmiana urlopu jednej osoby przesuwa terminy klientów, a informacja trafia do wszystkich SMS-em lub na grupie. Chaos przy każdej nieobecności." },
  { icon: DollarSign, title: "Nie wiesz ile zarabia każdy pracownik dla salonu", desc: "Usługi, produkty, napiwki — każdy stylista to inne przychody i koszty. Bez systemu niemożliwe jest obiektywne rozliczenie wydajności." },
  { icon: Package, title: "Kosmetyki i produkty znikają bez śladu", desc: "Zuzycie produktów robocze vs sprzedaż klientom — bez ewidencji magazynowej strata jest ukryta w kosztach i trudna do zlokalizowania." },
];
const PROBLEMS_EN = [
  { icon: Calendar, title: "Stylist schedules are constant rescheduling", desc: "One person's holiday change shifts client appointments, and the info goes out by SMS or group chat. Chaos with every absence." },
  { icon: DollarSign, title: "You don't know how much each employee earns for the salon", desc: "Services, products, tips — each stylist has different revenues and costs. Without a system, objective performance tracking is impossible." },
  { icon: Package, title: "Cosmetics and products disappear without a trace", desc: "Working product usage vs. client sales — without inventory records, the loss is hidden in costs and hard to locate." },
];

const FEATURES_PL = [
  { icon: Calendar, color: "#EC4899", title: "Grafik stylistów — widoczny dla całego zespołu", desc: "Każdy stylista ma swój grafik online. Zmiany widoczne natychmiast, bez SMS-ów. Manager zatwierdza modyfikacje z telefonu." },
  { icon: BarChart3, color: "#8B5CF6", title: "P&L per stylista i per salon", desc: "Ile każda osoba generuje przychodów i kosztów? OneLink pokazuje marżę operacyjną per stylista i per lokalizację." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — wyniki salonu pod lupą", desc: "Dyrektor Finansowy AI porównuje wyniki tygodniowe, wykrywa spadki przychodów i sugeruje działania naprawcze." },
  { icon: Package, color: "#10B981", title: "Ewidencja kosmetyków i produktów", desc: "Śledź zuzycie produktów roboczych, rozróżniaj od sprzedaży klientom. Koniec z tajemniczymi stratami w kosztach." },
  { icon: Users, color: "#3B82F6", title: "Urlopy i L4 bez niespodzianek", desc: "Wnioski urlopowe online, historia absencji, automatyczne obliczanie kosztów zastępstw — zero papierowej dokumentacji." },
  { icon: ShieldCheck, color: "#6366F1", title: "Sieć salonów w jednym panelu", desc: "Wiele lokalizacji? Porównuj wyniki, rankingi stylistów i koszty między salonami. Skaluj to, co działa." },
];
const FEATURES_EN = [
  { icon: Calendar, color: "#EC4899", title: "Stylist schedule — visible to the whole team", desc: "Every stylist has their schedule online. Changes visible instantly, no SMS. Manager approves modifications from their phone." },
  { icon: BarChart3, color: "#8B5CF6", title: "P&L per stylist and per salon", desc: "How much revenue and cost does each person generate? OneLink shows operating margin per stylist and per location." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — salon results under the microscope", desc: "The AI Finance Director compares weekly results, detects revenue drops and suggests corrective actions." },
  { icon: Package, color: "#10B981", title: "Cosmetics and product tracking", desc: "Track working product consumption, separate from client sales. No more mysterious losses in costs." },
  { icon: Users, color: "#3B82F6", title: "Leave and sick days — no surprises", desc: "Online leave requests, absence history, automatic cover cost calculation — zero paper documentation." },
  { icon: ShieldCheck, color: "#6366F1", title: "Salon chain in one panel", desc: "Multiple locations? Compare results, stylist rankings and costs between salons. Scale what works." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink zastępuje system rezerwacji?", a: "Nie — OneLink zarządza operacjami: grafik, P&L, faktury, koszty pracy. Możesz korzystać z Booksy lub innego narzędzia do rezerwacji równolegle." },
  { q: "Jak śledzić wydajność każdego stylisty?", a: "Przypisuj przychody i godziny do konkretnych pracowników. OneLink wylicza przychód na godzinę pracy, koszt i marżę per osoba." },
  { q: "Czy mogę rozliczać prowizje pracownicze?", a: "Tak — możesz definiować stawki godzinowe lub prowizyjne. System generuje zestawienie kosztów pracy do wypłat." },
  { q: "Ile kosztuje OneLink dla salonu?", a: "Od 49,99 zł / miesiąc netto. Dla sieci salonów — skontaktuj się po wycenę z rabatem dla wielu lokalizacji." },
  { q: "Jak szybko mogę wdrożyć OneLink w salonie?", a: "Pierwsze konto gotowe w 3 minuty. Dodanie pracowników, produktów i lokalizacji — maksymalnie 20 minut." },
];
const FAQ_ITEMS_EN = [
  { q: "Does OneLink replace a booking system?", a: "No — OneLink manages operations: schedule, P&L, invoices, labour costs. You can use Booksy or another booking tool alongside it." },
  { q: "How do I track each stylist's performance?", a: "Assign revenues and hours to specific employees. OneLink calculates revenue per hour worked, cost and margin per person." },
  { q: "Can I manage employee commissions?", a: "Yes — you can define hourly or commission-based rates. The system generates a labour cost breakdown for payroll." },
  { q: "How much does OneLink cost for a salon?", a: "From 49.99 PLN / month net. For salon chains — contact us for a multi-location discount quote." },
  { q: "How quickly can I deploy OneLink in my salon?", a: "First account ready in 3 minutes. Adding staff, products and locations — maximum 20 minutes." },
];

export default function DlaSalonowBeautyPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const PROBLEMS = pl ? PROBLEMS_PL : PROBLEMS_EN;
  const FEATURES = pl ? FEATURES_PL : FEATURES_EN;
  const FAQ_ITEMS = pl ? FAQ_ITEMS_PL : FAQ_ITEMS_EN;
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/sign-in" className="h-8 px-4 text-[13px] font-medium text-[#374151] hover:text-[#111827] flex items-center">{pl ? 'Zaloguj' : 'Log in'}</Link>
            <Link href="/auth/sign-up" className="h-8 px-4 rounded-lg bg-[#111827] text-[13px] font-semibold text-white hover:bg-[#1F2937] transition-colors flex items-center">{pl ? 'Zacznij za darmo' : 'Start for free'}</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #4a044e 0%, #86198f 50%, #c026d3 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal><span className="inline-block text-[11px] font-bold uppercase tracking-widest text-fuchsia-200 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla salonów beauty i fryzjerskich</span></Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              Zarządzaj salonem<br />jak prawdziwy biznes
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-fuchsia-200 leading-relaxed mb-8 max-w-xl mx-auto">
              Grafik stylistów, P&L per pracownik, ewidencja kosmetyków i AI CFO który pilnuje marży Twojego salonu.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-white text-[15px] font-bold text-fuchsia-900 hover:bg-fuchsia-50 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator oszczędności
              </Link>
            </div>
            <p className="text-[12px] text-fuchsia-300 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Problemy salonów beauty</p>
            <h2 className="text-[28px] font-black text-[#111827]">Każdy salon zmaga się z tym samym</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4"><p.icon className="w-5 h-5 text-red-500" /></div>
                  <h3 className="text-[15px] font-bold text-[#111827] mb-2">{p.title}</h3>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Funkcje systemu</p>
            <h2 className="text-[28px] font-black text-[#111827]">Profesjonalne zarządzanie salonem</h2>
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
            <div className="flex justify-center gap-1 mb-4">{[...Array(5)].map((_, i) => <Zap key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
            <p className="text-[18px] font-bold text-[#111827] italic mb-4 leading-relaxed">
              "Prowadzę 3 salony i pierwszy raz w życiu wiem, który stylistka generuje największy przychód na godzinę. OneLink zmienił sposób w jaki zarządzam zespołem."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Estera N.</p>
            <p className="text-[12px] text-[#9CA3AF]">Właścicielka sieci salonów, Baked</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #4a044e 0%, #c026d3 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowa żeby prowadzić salon jak ekspertka?</h2>
          <p className="text-[15px] text-fuchsia-200 mb-8">7 dni za darmo. Konfiguracja w 3 minuty.</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-white text-[15px] font-bold text-fuchsia-900 hover:bg-fuchsia-50 transition-all shadow-2xl">
            Zacznij za darmo <ArrowRight className="w-5 h-5" />
          </Link>
        </Reveal>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-8"><h2 className="text-[26px] font-black text-[#111827]">Często zadawane pytania</h2></Reveal>
          <div className="space-y-3">{FAQ_ITEMS.map(item => <FAQ key={item.q} q={item.q} a={item.a} />)}</div>
        </div>
      </section>

      <footer className="border-t border-[#F3F4F6] py-8 px-5 text-center">
        <p className="text-[12px] text-[#9CA3AF]">© 2025 OneLink · <Link href="/privacy" className="hover:text-[#374151]">Polityka prywatności</Link> · <Link href="/terms" className="hover:text-[#374151]">Regulamin</Link></p>
      </footer>
    </div>
  );
}
