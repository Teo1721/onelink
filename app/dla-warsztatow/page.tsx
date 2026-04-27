"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowRight, ChevronDown, BarChart3, DollarSign,
  TrendingUp, Users, ShieldCheck, Package, Zap, FileText,
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
  { icon: Package, title: "Części zamienne znikają bez ewidencji", desc: "Mechanik bierze część z magazynu, ale nikt nie odnotowuje. Koniec miesiąca — stany się nie zgadzają, a marża na zleceniu jest iluzją." },
  { icon: DollarSign, title: "Nie wiesz ile zarabia każde stanowisko", desc: "Podnośnik A i podnośnik B — oba zajęte, ale który generuje więcej? Bez systemu rozliczania zleceń nie ma odpowiedzi." },
  { icon: FileText, title: "Faktury za części i dostawców — sterta papierów", desc: "Dziesiątki faktur za części od różnych dostawców. Ręczne przepisywanie do Excelu zajmuje godziny, a i tak są błędy." },
];
const PROBLEMS_EN = [
  { icon: Package, title: "Spare parts disappear without tracking", desc: "A mechanic takes a part from stock, but nobody records it. End of month — levels don't match and the job margin is an illusion." },
  { icon: DollarSign, title: "You don't know how much each bay earns", desc: "Lift A and lift B — both busy, but which earns more? Without a job costing system, there's no answer." },
  { icon: FileText, title: "Parts and supplier invoices — a pile of paperwork", desc: "Dozens of invoices from different parts suppliers. Manual entry into Excel takes hours, and there are still errors." },
];

const FEATURES_PL = [
  { icon: Package, color: "#F59E0B", title: "Magazyn części — stany i zamówienia", desc: "Bieżące stany, alerty niskiego poziomu, historia dostaw. Mechanicy widzą dostępność części zanim zaczną zlecenie." },
  { icon: BarChart3, color: "#6366F1", title: "P&L per warsztat i per stanowisko", desc: "Przychody ze zleceń, koszty części, koszty pracy — marża per stanowisko i per warsztat bez ręcznych zestawień." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO — wyniki warsztatu pod kontrolą", desc: "Dyrektor Finansowy AI monitoruje przychody tygodniowe i koszty. Alert gdy marża zleceniowa spada poniżej progu." },
  { icon: Users, color: "#EF4444", title: "Grafik mechaników i pracowników", desc: "Harmonogram zmian online. Pracownicy widzą grafik w aplikacji, manager zatwierdza urlopy jednym kliknięciem." },
  { icon: FileText, color: "#3B82F6", title: "Faktury dostawców części", desc: "Skanuj i importuj faktury. System kategoryzuje koszty części do P&L automatycznie — koniec z papierowymi stosami." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Sieć warsztatów w jednym panelu", desc: "Kilka lokalizacji? Porównuj wyniki, rankingi stanowisk i koszty między warsztatami. Skaluj to co działa." },
];
const FEATURES_EN = [
  { icon: Package, color: "#F59E0B", title: "Parts inventory — stock and orders", desc: "Current stock, low-level alerts, delivery history. Mechanics see part availability before starting a job." },
  { icon: BarChart3, color: "#6366F1", title: "P&L per workshop and per bay", desc: "Job revenues, parts costs, labour costs — margin per bay and per workshop without manual reports." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO — workshop results under control", desc: "The AI Finance Director monitors weekly revenues and costs. Alert when job margin drops below threshold." },
  { icon: Users, color: "#EF4444", title: "Mechanic and staff schedule", desc: "Online shift schedule. Employees see their schedule in the app, manager approves leave with one click." },
  { icon: FileText, color: "#3B82F6", title: "Parts supplier invoices", desc: "Scan and import invoices. System categorises parts costs to P&L automatically — end of paper piles." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Workshop chain in one panel", desc: "Multiple locations? Compare results, bay rankings and costs between workshops. Scale what works." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink zastępuje program do zarządzania zleceniami serwisowymi?", a: "Nie — OneLink zarządza finansami operacyjnymi i personelem. Możesz importować dane zleceń z CSV i łączyć je z kosztami części i pracy." },
  { q: "Jak śledzić zużycie części w zleceniach?", a: "Przez moduł transakcji magazynowych — każde pobranie części z magazynu jest rejestrowane i przypisywane do centrum kosztów (stanowisko/warsztat)." },
  { q: "Czy mogę liczyć marżę per zlecenie?", a: "Tak — przypisując przychody i koszty do konkretnych centrów kosztów (np. per stanowisko lub typ usługi) możesz wyliczyć marżę operacyjną." },
  { q: "Ile kosztuje OneLink dla warsztatu?", a: "Od 49,99 zł / miesiąc netto. Dla sieci warsztatów — skontaktuj się po indywidualną wycenę z rabatem." },
  { q: "Jak szybko można wdrożyć OneLink?", a: "Pierwsze konto gotowe w 3 minuty. Dodanie pracowników, produktów i lokalizacji — maksymalnie 20 minut." },
];
const FAQ_ITEMS_EN = [
  { q: "Does OneLink replace a job management system?", a: "No — OneLink manages operational finances and staff. You can import job data from CSV and link it with parts and labour costs." },
  { q: "How do I track parts consumption per job?", a: "Through the warehouse transaction module — every part taken from stock is recorded and assigned to a cost centre (bay/workshop)." },
  { q: "Can I calculate margin per job?", a: "Yes — by assigning revenues and costs to specific cost centres (e.g. per bay or service type) you can calculate operating margin." },
  { q: "How much does OneLink cost for a workshop?", a: "From 49.99 PLN / month net. For workshop chains — contact us for individual pricing with a discount." },
  { q: "How quickly can OneLink be deployed?", a: "First account ready in 3 minutes. Adding employees, products and locations — maximum 20 minutes." },
];

export default function DlaWarsztatowPage() {
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

      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal><span className="inline-block text-[11px] font-bold uppercase tracking-widest text-amber-300 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla warsztatów samochodowych i serwisów</span></Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              Zarządzaj warsztatem<br />jak dobrze naoliwioną maszyną
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-stone-300 leading-relaxed mb-8 max-w-xl mx-auto">
              Magazyn części, grafik mechaników, faktury dostawców i AI CFO który pilnuje marży Twojego warsztatu.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-amber-400 text-[15px] font-bold text-stone-900 hover:bg-amber-300 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator oszczędności
              </Link>
            </div>
            <p className="text-[12px] text-stone-400 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Problemy warsztatów</p>
            <h2 className="text-[28px] font-black text-[#111827]">Każdy serwis walczy z tym samym</h2>
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
            <h2 className="text-[28px] font-black text-[#111827]">Profesjonalne zarządzanie warsztatem</h2>
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
              "Prowadzę 2 warsztaty i zanim wdrożyłem OneLink, nigdy nie wiedziałem który jest rentowniejszy. Teraz widzę marżę per stanowisko i per lokal. Jeden warsztat dotował drugi — teraz to widzę jasno."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Ewelina K.</p>
            <p className="text-[12px] text-[#9CA3AF]">CEO, AKAB Group</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowy żeby warsztat naprawdę zarabiał?</h2>
          <p className="text-[15px] text-stone-300 mb-8">7 dni za darmo. Konfiguracja w 3 minuty.</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-amber-400 text-[15px] font-bold text-stone-900 hover:bg-amber-300 transition-all shadow-2xl">
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
