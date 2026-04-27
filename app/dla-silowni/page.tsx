"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowRight, CheckCircle, ChevronDown, Users, Calendar,
  BarChart3, DollarSign, TrendingUp, Clock, Zap, ShieldCheck,
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
  { icon: Users, title: "Grafik trenerów nie trafia do wszystkich", desc: "Zmiany w grafiku lądują w grupie na WhatsApp. Trenerzy potwierdzają za późno, a Ty nie wiesz kto faktycznie przyszedł do pracy." },
  { icon: DollarSign, title: "Nie wiesz, które godziny generują zysk", desc: "Strefa siłowni, zajęcia grupowe, bar odżywczy — wszystko w jednym worku. Niemożliwe bez systemu żeby sprawdzić, co się faktycznie opłaca." },
  { icon: BarChart3, title: "Raporty robisz ręcznie w Excelu", desc: "Co miesiąc kilka godzin na zbieranie danych z kas, kart wejść i faktur. Wynik i tak jest przybliżony — bo coś zawsze umknie." },
];
const PROBLEMS_EN = [
  { icon: Users, title: "Trainer schedules don't reach everyone", desc: "Schedule changes land in a WhatsApp group. Trainers confirm too late, and you don't know who actually showed up for work." },
  { icon: DollarSign, title: "You don't know which hours generate profit", desc: "Gym floor, group classes, nutrition bar — all in one bucket. Without a system it's impossible to check what's actually profitable." },
  { icon: BarChart3, title: "Reports are done manually in Excel", desc: "Every month: hours spent collecting data from POS, entry cards and invoices. The result is still approximate — because something always slips through." },
];

const FEATURES_PL = [
  { icon: Calendar, color: "#6366F1", title: "Grafik trenerów i recepcji", desc: "Publikuj grafik online. Pracownicy widzą swoje zmiany w aplikacji mobilnej i potwierdzają jednym kliknięciem." },
  { icon: BarChart3, color: "#10B981", title: "P&L na żywo — strefa po strefie", desc: "Podziel siłownię na centra kosztów: wejścia, PT, bar, sklep. Każdy generuje własny P&L bez Excela." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — analiza finansowa", desc: "Dyrektor Finansowy AI wykrywa anomalie przychodów i alarmuje Cię zanim stracisz 20% miesiąca bez reakcji." },
  { icon: Users, color: "#EF4444", title: "Urlopy i absencje w jednym panelu", desc: "Wnioski urlopowe, L4, godziny nadliczbowe — jeden widok dla managera. Brak niespodzianek w grafiku." },
  { icon: DollarSign, color: "#3B82F6", title: "Faktury i koszty pod kontrolą", desc: "Skanuj faktury za wyposażenie, suplementy, media. System kategoryzuje je automatycznie do P&L." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Wiele lokalizacji — jeden panel", desc: "Sieć siłowni w kilku miastach? Porównujesz wyniki, grafiki i faktury z jednego miejsca." },
];
const FEATURES_EN = [
  { icon: Calendar, color: "#6366F1", title: "Trainer & reception schedule", desc: "Publish schedules online. Employees see their shifts in the mobile app and confirm with one click." },
  { icon: BarChart3, color: "#10B981", title: "Live P&L — zone by zone", desc: "Split the gym into cost centres: entries, PT, bar, shop. Each generates its own P&L without Excel." },
  { icon: TrendingUp, color: "#F59E0B", title: "AI CFO — financial analysis", desc: "The AI Finance Director detects revenue anomalies and alerts you before you lose 20% of the month without reacting." },
  { icon: Users, color: "#EF4444", title: "Leave & absences in one panel", desc: "Leave requests, sick leave, overtime — one view for the manager. No surprises in the schedule." },
  { icon: DollarSign, color: "#3B82F6", title: "Invoices & costs under control", desc: "Scan invoices for equipment, supplements, utilities. The system categorises them automatically to P&L." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Multiple locations — one panel", desc: "Chain of gyms in multiple cities? Compare results, schedules and invoices from one place." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink działa dla siłowni i klubów fitness?", a: "Tak. OneLink obsługuje każdy biznes wielolokalizacyjny z personelem, sprzedażą i kosztami operacyjnymi. Trenerzy personalni, zajęcia grupowe, bar — wszystko można obsłużyć jako oddzielne centra kosztów." },
  { q: "Czy trenerzy mogą używać aplikacji mobilnej?", a: "Tak. Pracownicy mają dostęp do portalu pracownika przez przeglądarkę lub jako PWA na telefonie — widzą grafik, składają wnioski urlopowe i rejestrują godziny." },
  { q: "Jak działa integracja z kasą fiskalną?", a: "OneLink nie zastępuje kasy fiskalnej, ale importuje raporty sprzedaży (CSV lub ręcznie) i łączy je z kosztami, żeby wyliczyć marżę operacyjną." },
  { q: "Ile kosztuje OneLink dla siłowni?", a: "Od 49,99 zł / miesiąc netto. Cena zależy od liczby lokalizacji. 7-dniowy trial — bez zobowiązań." },
  { q: "Jak szybko mogę zacząć?", a: "Pierwsze konto jest gotowe w 3 minuty. Dodanie trenerów i lokalizacji zajmuje kolejne 15–20 minut." },
];
const FAQ_ITEMS_EN = [
  { q: "Does OneLink work for gyms and fitness clubs?", a: "Yes. OneLink supports any multi-location business with staff, sales and operating costs. Personal trainers, group classes, bar — all can be managed as separate cost centres." },
  { q: "Can trainers use the mobile app?", a: "Yes. Employees access the employee portal via browser or as a PWA on their phone — they see their schedule, submit leave requests and log hours." },
  { q: "How does integration with the cash register work?", a: "OneLink doesn't replace your POS, but it imports sales reports (CSV or manually) and combines them with costs to calculate the operating margin." },
  { q: "How much does OneLink cost for a gym?", a: "From 49.99 PLN / month net. Price depends on the number of locations. 7-day trial — no commitment." },
  { q: "How quickly can I start?", a: "First account is ready in 3 minutes. Adding trainers and locations takes another 15–20 minutes." },
];

export default function DlaSilowniPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const PROBLEMS = pl ? PROBLEMS_PL : PROBLEMS_EN;
  const FEATURES = pl ? FEATURES_PL : FEATURES_EN;
  const FAQ_ITEMS = pl ? FAQ_ITEMS_PL : FAQ_ITEMS_EN;
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
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

      {/* HERO */}
      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-indigo-300 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla siłowni i klubów fitness</span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              Zarządzaj siłownią<br />jak siecią — nie jak&nbsp;garażem
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-indigo-200 leading-relaxed mb-8 max-w-xl mx-auto">
              Grafik trenerów, P&L stref, faktury za wyposażenie i AI CFO który alarmuje gdy wyniki siłowni odbiegają od normy.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-white text-[15px] font-bold text-indigo-900 hover:bg-indigo-50 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator ROI
              </Link>
            </div>
            <p className="text-[12px] text-indigo-300 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Problemy które rozwiązujemy</p>
            <h2 className="text-[28px] font-black text-[#111827]">Każda siłownia to te same bóle</h2>
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

      {/* FEATURES */}
      <section className="py-16 px-5">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Co dostaje Twoja siłownia</p>
            <h2 className="text-[28px] font-black text-[#111827]">Wszystko w jednym systemie</h2>
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

      {/* SOCIAL PROOF */}
      <section className="py-14 px-5 bg-[#F9FAFB]">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Zap key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
            </div>
            <p className="text-[18px] font-bold text-[#111827] italic mb-4 leading-relaxed">
              "Zamiast 3 Exceli i grupy na WhatsApp mam jeden panel. Trenerzy sami widzą grafik, a ja widzę P&L każdej strefy w czasie rzeczywistym."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Radosław K.</p>
            <p className="text-[12px] text-[#9CA3AF]">Właściciel sieci siłowni, NeuroSnax</p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowy żeby zarządzać siłownią mądrzej?</h2>
          <p className="text-[15px] text-indigo-200 mb-8">7 dni za darmo. Konfiguracja w 3 minuty. Bez umów.</p>
          <Link href="/auth/sign-up"
            className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-white text-[15px] font-bold text-indigo-900 hover:bg-indigo-50 transition-all shadow-2xl">
            Zacznij za darmo <ArrowRight className="w-5 h-5" />
          </Link>
        </Reveal>
      </section>

      {/* FAQ */}
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

      {/* FOOTER */}
      <footer className="border-t border-[#F3F4F6] py-8 px-5 text-center">
        <p className="text-[12px] text-[#9CA3AF]">© 2025 OneLink · <Link href="/privacy" className="hover:text-[#374151]">Polityka prywatności</Link> · <Link href="/terms" className="hover:text-[#374151]">Regulamin</Link></p>
      </footer>
    </div>
  );
}
