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
  { icon: Package, title: "Stany magazynowe leku — ręcznie lub w osobnym systemie", desc: "Zamówienia do hurtowni, stany leków refundowanych i OTC — każde źródło danych osobno. Niemożliwe żeby szybko zobaczyć całość bez specjalisty." },
  { icon: Users, title: "Grafik farmaceutów trudny do planowania", desc: "Normy obsady, dyżury nocne, nieobecności — zarządzanie grafikiem w aptece wymaga precyzji. WhatsApp i Excel to za mało." },
  { icon: DollarSign, title: "Marże per kategoria produktów — niewidoczne", desc: "Leki refundowane vs OTC vs suplementy vs dermokosmetyki — każda ma inną marżę, ale bez systemu nie widać które kategorie naprawdę zarabiają." },
];
const PROBLEMS_EN = [
  { icon: Package, title: "Medicine stock — manual or in a separate system", desc: "Wholesale orders, reimbursed and OTC medicine levels — each data source separate. Impossible to see the full picture quickly without a specialist." },
  { icon: Users, title: "Pharmacist scheduling is hard to plan", desc: "Staffing norms, night shifts, absences — managing a pharmacy schedule requires precision. WhatsApp and Excel aren't enough." },
  { icon: DollarSign, title: "Margins per product category — invisible", desc: "Reimbursed drugs vs OTC vs supplements vs cosmetics — each has a different margin, but without a system you can't see which categories are really profitable." },
];

const FEATURES_PL = [
  { icon: Package, color: "#10B981", title: "Stany magazynowe i zamówienia", desc: "Bieżące stany produktów, alerty o niskim poziomie, historia dostaw od hurtowni. Koniec ze zgadywaniem kiedy zamówić." },
  { icon: BarChart3, color: "#6366F1", title: "P&L per apteka i kategoria", desc: "Sprzedaż, koszty, marża operacyjna — widok per lokalizacja i per kategoria produktu (Rx, OTC, suplementy, kosmetyki)." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — finanse apteki pod kontrolą", desc: "Dyrektor Finansowy AI analizuje wyniki tygodniowe i alarmuje gdy marża spada lub koszty operacyjne rosną ponad normę." },
  { icon: Users, color: "#EF4444", title: "Grafik farmaceutów i techników", desc: "Harmonogram zmian z uwzględnieniem norm obsady. Pracownicy widzą grafik online — bez kartek i grup na WhatsApp." },
  { icon: FileText, color: "#3B82F6", title: "Faktury i koszty hurtowni", desc: "Importuj faktury od hurtowni farmaceutycznych. System kategoryzuje koszty automatycznie i łączy je z P&L." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Sieć aptek — jeden widok zarządzający", desc: "Porównuj wyniki, marże i koszty między wszystkimi aptekami z jednego panelu. Wychwytuj odchylenia natychmiast." },
];
const FEATURES_EN = [
  { icon: Package, color: "#10B981", title: "Stock levels and orders", desc: "Current product levels, low-stock alerts, wholesale delivery history. No more guessing when to order." },
  { icon: BarChart3, color: "#6366F1", title: "P&L per pharmacy and category", desc: "Sales, costs, operating margin — view per location and per product category (Rx, OTC, supplements, cosmetics)." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — pharmacy finances under control", desc: "The AI Finance Director analyses weekly results and alerts when margin drops or operating costs rise above norm." },
  { icon: Users, color: "#EF4444", title: "Pharmacist and technician schedule", desc: "Shift schedule respecting staffing norms. Employees see their schedule online — no paper or WhatsApp groups." },
  { icon: FileText, color: "#3B82F6", title: "Wholesale invoices and costs", desc: "Import invoices from pharmaceutical wholesalers. System categorises costs automatically and links them to P&L." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Pharmacy chain — one management view", desc: "Compare results, margins and costs across all pharmacies from one panel. Catch deviations instantly." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink zastępuje system apteczny (np. KS-Apteka)?", a: "Nie — OneLink działa obok systemu aptecznego. Importuje dane sprzedażowe (CSV) i agreguje je z kosztami pracy i fakturami w jeden widok P&L." },
  { q: "Czy mogę kontrolować marżę per kategoria leków?", a: "Tak. Możesz tworzyć kategorie (Rx, OTC, suplementy, dermokosmetyki) i śledzić marżę oraz koszty per kategoria w czasie rzeczywistym." },
  { q: "Jak działa grafik dla farmaceutów?", a: "Manager tworzy grafik w panelu, pracownicy widzą swoje zmiany w aplikacji mobilnej (PWA). Wnioski urlopowe i absencje obsługiwane online." },
  { q: "Czy dane apteki są bezpieczne?", a: "Tak — dane szyfrowane, serwery w UE. OneLink nie przetwarza danych pacjentów ani historii recept — tylko dane operacyjne i finansowe apteki." },
  { q: "Ile kosztuje OneLink dla apteki?", a: "Od 49,99 zł / miesiąc netto per lokalizacja. Dla sieci aptek — skontaktuj się po indywidualną wycenę." },
];
const FAQ_ITEMS_EN = [
  { q: "Does OneLink replace a pharmacy system (e.g. KS-Apteka)?", a: "No — OneLink works alongside your pharmacy system. It imports sales data (CSV) and aggregates it with labour costs and invoices into one P&L view." },
  { q: "Can I control margin per medicine category?", a: "Yes. You can create categories (Rx, OTC, supplements, cosmetics) and track margin and costs per category in real time." },
  { q: "How does the pharmacist schedule work?", a: "Manager creates the schedule in the panel, employees see their shifts in the mobile app (PWA). Leave requests and absences handled online." },
  { q: "Is the pharmacy data secure?", a: "Yes — data encrypted, EU servers. OneLink does not process patient data or prescription history — only pharmacy operational and financial data." },
  { q: "How much does OneLink cost for a pharmacy?", a: "From 49.99 PLN / month net per location. For pharmacy chains — contact us for individual pricing." },
];

export default function DlaApteкPage() {
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

      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal><span className="inline-block text-[11px] font-bold uppercase tracking-widest text-green-200 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla aptek i sieci aptecznych</span></Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              Finanse apteki<br />w jednym miejscu
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-green-200 leading-relaxed mb-8 max-w-xl mx-auto">
              P&L per kategoria leków, grafik farmaceutów, faktury hurtowni i AI CFO który pilnuje marży Twojej apteki.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-white text-[15px] font-bold text-green-900 hover:bg-green-50 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator ROI
              </Link>
            </div>
            <p className="text-[12px] text-green-300 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Wyzwania zarządzania apteką</p>
            <h2 className="text-[28px] font-black text-[#111827]">Problemy znane każdemu kierownikowi apteki</h2>
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Funkcje dla aptek</p>
            <h2 className="text-[28px] font-black text-[#111827]">System operacyjny dla nowoczesnej apteki</h2>
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
              "Nareszcie widzę marżę aptek per kategoria. Wiedziałem, że suplementy są rentowniejsze niż Rx, ale teraz mam na to twarde liczby. AI CFO dwa razy już ostrzegł mnie przed problematycznym miesiącem."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Radosław K.</p>
            <p className="text-[12px] text-[#9CA3AF]">Właściciel sieci aptek, NeuroSnax</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowy żeby mieć finanse apteki pod kontrolą?</h2>
          <p className="text-[15px] text-green-200 mb-8">7 dni za darmo. Konfiguracja w 3 minuty.</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-white text-[15px] font-bold text-green-900 hover:bg-green-50 transition-all shadow-2xl">
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
