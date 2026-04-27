"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Check, X, ArrowRight, Zap } from "lucide-react";

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

const ROWS_PL = [
  { feature: "P&L w czasie rzeczywistym", excel: false, onelink: true },
  { feature: "Food cost automatyczny (receptury)", excel: false, onelink: true },
  { feature: "Alerty AI gdy marża spada", excel: false, onelink: true },
  { feature: "Ewidencja czasu pracy (kiosk PIN)", excel: false, onelink: true },
  { feature: "Grafik pracowników online", excel: false, onelink: true },
  { feature: "Import faktur (OCR)", excel: false, onelink: true },
  { feature: "Wnioski urlopowe online", excel: false, onelink: true },
  { feature: "Porównanie wyników wielu lokali", excel: false, onelink: true },
  { feature: "Dostęp mobilny bez instalacji", excel: false, onelink: true },
  { feature: "Dane historyczne i trendy", excel: true, onelink: true },
  { feature: "Elastyczne raporty", excel: true, onelink: true },
  { feature: "Bezpłatny start", excel: true, onelink: true },
];
const ROWS_EN = [
  { feature: "Real-time P&L", excel: false, onelink: true },
  { feature: "Automatic food cost (recipes)", excel: false, onelink: true },
  { feature: "AI alerts when margin drops", excel: false, onelink: true },
  { feature: "Time tracking (PIN kiosk)", excel: false, onelink: true },
  { feature: "Online employee schedule", excel: false, onelink: true },
  { feature: "Invoice import (OCR)", excel: false, onelink: true },
  { feature: "Online leave requests", excel: false, onelink: true },
  { feature: "Multi-location result comparison", excel: false, onelink: true },
  { feature: "Mobile access without install", excel: false, onelink: true },
  { feature: "Historical data and trends", excel: true, onelink: true },
  { feature: "Flexible reports", excel: true, onelink: true },
  { feature: "Free start", excel: true, onelink: true },
];

const PAINS_PL = [
  { title: "Excel nie wysyła alertów", desc: "Kiedy food cost skacze o 8pp, Excel milczy. OneLink wysyła powiadomienie zanim strata wejdzie w rachunki." },
  { title: "Excel nie śledzi czasu pracy", desc: "Ręczna ewidencja to błędy i spory. Kiosk PIN w OneLink zapisuje wejście i wyjście automatycznie." },
  { title: "Excel to praca po pracy", desc: "Każdy raport wymaga ręcznego kopiowania danych. W OneLink wynik dnia masz bez klikania." },
  { title: "Excel nie skaluje się do sieci", desc: "5 restauracji = 5 plików. W OneLink porównujesz wszystkie lokale z jednego widoku w 10 sekund." },
];
const PAINS_EN = [
  { title: "Excel doesn't send alerts", desc: "When food cost jumps by 8pp, Excel stays silent. OneLink sends a notification before the loss hits your accounts." },
  { title: "Excel doesn't track time", desc: "Manual timekeeping means errors and disputes. OneLink's PIN kiosk records clock-in and out automatically." },
  { title: "Excel is work after work", desc: "Every report requires manual data copying. In OneLink you have the day's result without any clicking." },
  { title: "Excel doesn't scale to a chain", desc: "5 restaurants = 5 files. In OneLink you compare all locations from one view in 10 seconds." },
];

export default function VsExcelPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const ROWS = pl ? ROWS_PL : ROWS_EN;
  const PAINS = pl ? PAINS_PL : PAINS_EN;

  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/login" className="h-9 px-4 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all flex items-center">{pl ? 'Zaloguj' : 'Log in'}</Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all flex items-center">{pl ? 'Zacznij za darmo' : 'Start for free'}</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-20 px-5 bg-gradient-to-b from-[#F0F7FF] to-white text-center">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#1D4ED8] mb-4 px-3 py-1 bg-blue-50 rounded-full">
              {pl ? 'OneLink vs Excel' : 'OneLink vs Excel'}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-[#111827] leading-[1.1] mb-5">
              {pl ? <>Dlaczego Excel już<br />nie wystarczy dla Twojego biznesu</> : <>Why Excel is no longer<br />enough for your business</>}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-[#6B7280] leading-relaxed mb-8 max-w-xl mx-auto">
              {pl
                ? 'Excel świetnie nadaje się do tabel. Ale nie zastąpi systemu, który liczy food cost, pilnuje marży i śledzi czas pracy — automatycznie.'
                : 'Excel is great for tables. But it cannot replace a system that calculates food cost, monitors margin and tracks time — automatically.'}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-blue-200">
              {pl ? 'Wypróbuj OneLink za darmo' : 'Try OneLink for free'} <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-16 px-5">
        <div className="max-w-[900px] mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-[28px] font-black text-[#111827]">{pl ? 'Porównanie funkcji' : 'Feature comparison'}</h2>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              {/* Header */}
              <div className="grid grid-cols-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <div className="px-6 py-4 text-[13px] font-semibold text-[#6B7280]">{pl ? 'Funkcja' : 'Feature'}</div>
                <div className="px-6 py-4 text-center">
                  <span className="text-[13px] font-bold text-[#374151]">Excel / Arkusze</span>
                </div>
                <div className="px-6 py-4 text-center bg-blue-50">
                  <span className="text-[13px] font-bold text-[#1D4ED8]">OneLink</span>
                </div>
              </div>
              {ROWS.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 border-b border-[#F3F4F6] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                  <div className="px-6 py-3.5 text-[13px] font-medium text-[#374151] flex items-center">{row.feature}</div>
                  <div className="px-6 py-3.5 flex items-center justify-center">
                    {row.excel
                      ? <Check className="w-5 h-5 text-[#10B981]" />
                      : <X className="w-5 h-5 text-[#EF4444]" />}
                  </div>
                  <div className="px-6 py-3.5 flex items-center justify-center bg-blue-50/50">
                    {row.onelink
                      ? <Check className="w-5 h-5 text-[#1D4ED8]" />
                      : <X className="w-5 h-5 text-[#EF4444]" />}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-[28px] font-black text-[#111827]">{pl ? 'Gdzie Excel zawodzi codziennie' : 'Where Excel fails you daily'}</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {PAINS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#111827] mb-1">{p.title}</h3>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] text-center">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <Zap className="w-10 h-10 text-white/60 mx-auto mb-4" />
            <h2 className="text-[32px] font-black text-white mb-4">
              {pl ? 'Przejdź z Excela w 20 minut' : 'Switch from Excel in 20 minutes'}
            </h2>
            <p className="text-[16px] text-blue-100 mb-8">
              {pl ? 'Konfiguracja konta, dodanie pracowników i pierwsze P&L — wszystko bez działu IT.' : 'Account setup, adding employees and first P&L — all without an IT department.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-white text-[14px] font-bold text-[#1D4ED8] hover:bg-blue-50 transition-all shadow-xl">
                {pl ? 'Zacznij za darmo — 7 dni' : 'Start free — 7 days'} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl border border-white/30 text-[14px] font-medium text-white hover:bg-white/10 transition-all">
                {pl ? 'Zobacz demo' : 'See demo'}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="py-8 px-5 border-t border-[#F3F4F6] text-center text-[12px] text-[#9CA3AF]">
        © 2025 OneLink ·{' '}
        <Link href="/privacy" className="hover:text-[#6B7280]">{pl ? 'Polityka prywatności' : 'Privacy policy'}</Link>{' '}·{' '}
        <Link href="/terms" className="hover:text-[#6B7280]">{pl ? 'Regulamin' : 'Terms'}</Link>
      </footer>
    </div>
  );
}
