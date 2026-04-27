"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowRight, Star } from "lucide-react";

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

const TESTIMONIALS_PL = [
  {
    name: "Marcin Kowalski", role: "Właściciel", company: "Baked — sieć 3 piekarni", stars: 5,
    text: "W ciągu pierwszych 2 tygodni odkryłem, że food cost u mnie wynosi 38%, nie 31% jak myślałem. OneLink uratował mi marżę i zmienił sposób, w jaki zarządzam zamówieniami.",
    highlight: "food cost 38% vs 31%",
  },
  {
    name: "Anna Wiśniewska", role: "Manager operacyjny", company: "AKAB Group — 5 lokali", stars: 5,
    text: "Grafik i kiosk PIN to oszczędność 3 godzin tygodniowo na papierologii. Pracownicy sami widzą swój grafik w telefonie — koniec z SMS-ami w niedzielę wieczór.",
    highlight: "3h / tydzień mniej papierkowej roboty",
  },
  {
    name: "Tomasz Brzozowski", role: "Właściciel", company: "Restauracja Feniks", stars: 5,
    text: "AI CFO wysłał mi alert o 2 w nocy — food cost skoczył o 6pp. Okazało się, że dostawca zmienił ceny bez informowania. Złapałem to w 12 godzin, a nie na koniec miesiąca.",
    highlight: "Alert w 12h zamiast na koniec miesiąca",
  },
  {
    name: "Karolina Nowak", role: "CFO", company: "Sieć kawiarni Olinek", stars: 5,
    text: "Wcześniej konsolidacja P&L 4 kawiarni zajmowała mi cały piątek. Teraz mam raport gotowy rano w 30 sekund. OneLink zwrócił się w ciągu pierwszego miesiąca.",
    highlight: "Cały piątek → 30 sekund",
  },
  {
    name: "Piotr Jaworski", role: "Właściciel", company: "Siłownia FitZone", stars: 5,
    text: "Prowadzę 2 siłownie i wreszcie widzę który lokal zarabia, a który generuje koszty. Dashboard właściciela to najlepsze co mi się przydarzyło w 5 latach prowadzenia biznesu.",
    highlight: "Widok 2 siłowni w jednym panelu",
  },
  {
    name: "Magdalena Adamska", role: "Manager", company: "Salon Beauty Glow", stars: 5,
    text: "Ewidencja czasu pracy stylistek była moim największym problemem. Kiosk PIN rozwiązał to bez żadnego IT — po prostu działa na tablecie przy wejściu.",
    highlight: "Kiosk PIN gotowy w 5 minut",
  },
  {
    name: "Rafał Szymański", role: "Właściciel", company: "Warsztat Auto-Expert", stars: 5,
    text: "Nie spodziewałem się, że system dla restauracji będzie tak dobrze pasował do warsztatu. P&L per mechanik to coś, czego nie miałem nigdzie indziej.",
    highlight: "P&L per mechanik",
  },
  {
    name: "Joanna Michalska", role: "Kierownik apteki", company: "Apteka Swojska Spiżarnia", stars: 5,
    text: "Faktury od dostawców w 30 sekund dzięki OCR — to brzmiało za dobrze żeby być prawdą, ale działa. Oszczędzam 2h tygodniowo tylko na księgowaniu faktur.",
    highlight: "Faktury OCR w 30 sekund",
  },
  {
    name: "Krzysztof Wróbel", role: "Dyrektor operacyjny", company: "Sieć hoteli Neuro", stars: 5,
    text: "Mamy 3 hotele z restauracją, spa i parking. Każdy dział ma własny P&L w OneLink. Pierwsza konsolidacja bez Excela zajęła mi 3 minuty.",
    highlight: "3 hotele, 1 panel, 3 minuty",
  },
];

const TESTIMONIALS_EN = [
  {
    name: "Marcin Kowalski", role: "Owner", company: "Baked — 3-bakery chain", stars: 5,
    text: "Within the first 2 weeks I discovered my food cost was 38%, not 31% as I thought. OneLink saved my margin and changed the way I manage orders.",
    highlight: "food cost 38% vs 31%",
  },
  {
    name: "Anna Wiśniewska", role: "Operations Manager", company: "AKAB Group — 5 locations", stars: 5,
    text: "The schedule and PIN kiosk saves 3 hours a week on paperwork. Employees see their schedule on their phone — no more Sunday evening texts.",
    highlight: "3h / week less admin work",
  },
  {
    name: "Tomasz Brzozowski", role: "Owner", company: "Restaurant Feniks", stars: 5,
    text: "The AI CFO sent me an alert at 2am — food cost jumped by 6pp. Turned out the supplier changed prices without telling us. I caught it in 12 hours, not at month end.",
    highlight: "Alert in 12h instead of month end",
  },
  {
    name: "Karolina Nowak", role: "CFO", company: "Olinek coffee chain", stars: 5,
    text: "Before, consolidating P&L across 4 cafés took me all Friday. Now I have the report ready in 30 seconds in the morning. OneLink paid for itself in the first month.",
    highlight: "All Friday → 30 seconds",
  },
  {
    name: "Piotr Jaworski", role: "Owner", company: "FitZone Gym", stars: 5,
    text: "I run 2 gyms and finally see which location earns money and which generates costs. The owner dashboard is the best thing that happened to me in 5 years of running a business.",
    highlight: "2 gyms in one panel",
  },
  {
    name: "Magdalena Adamska", role: "Manager", company: "Beauty Glow Salon", stars: 5,
    text: "Tracking stylist hours was my biggest headache. The PIN kiosk fixed it without any IT — it just works on a tablet by the entrance.",
    highlight: "PIN kiosk ready in 5 minutes",
  },
  {
    name: "Rafał Szymański", role: "Owner", company: "Auto-Expert Workshop", stars: 5,
    text: "I didn't expect a system built for restaurants to fit a workshop so well. P&L per mechanic is something I couldn't get anywhere else.",
    highlight: "P&L per mechanic",
  },
  {
    name: "Joanna Michalska", role: "Pharmacy Manager", company: "Swojska Spiżarnia Pharmacy", stars: 5,
    text: "Invoices from suppliers in 30 seconds with OCR — it sounded too good to be true, but it works. I save 2h a week just on invoice entry.",
    highlight: "OCR invoices in 30 seconds",
  },
  {
    name: "Krzysztof Wróbel", role: "Operations Director", company: "Neuro Hotel Group", stars: 5,
    text: "We have 3 hotels with restaurant, spa and parking. Each department has its own P&L in OneLink. First consolidation without Excel took me 3 minutes.",
    highlight: "3 hotels, 1 panel, 3 minutes",
  },
];

const STATS_PL = [
  { value: "500+", label: "firm korzysta z OneLink" },
  { value: "4.9/5", label: "średnia ocena" },
  { value: "97 min", label: "zaoszczędzone dziennie" },
  { value: "11 000 zł", label: "avg. food cost savings / mies." },
];
const STATS_EN = [
  { value: "500+", label: "businesses use OneLink" },
  { value: "4.9/5", label: "average rating" },
  { value: "97 min", label: "saved daily" },
  { value: "11,000 PLN", label: "avg. food cost savings / mo." },
];

export default function OpiniePage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const TESTIMONIALS = pl ? TESTIMONIALS_PL : TESTIMONIALS_EN;
  const STATS = pl ? STATS_PL : STATS_EN;

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
      <section className="py-20 px-5 bg-gradient-to-b from-[#FFFBEB] to-white text-center">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />)}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-[#111827] leading-[1.1] mb-5">
              {pl ? <>Co mówią nasi<br />klienci</> : <>What our<br />customers say</>}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-[#6B7280] mb-6">
              {pl ? 'Prawdziwe opinie od właścicieli firm, którzy zarządzają swoimi biznesami z OneLink.' : 'Real reviews from business owners who manage their businesses with OneLink.'}
            </p>
          </Reveal>
        </div>
      </section>

      {/* STATS */}
      <section className="py-10 px-5 border-y border-[#F3F4F6] bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06} className="text-center">
                <div className="text-[32px] font-black text-[#1D4ED8]">{s.value}</div>
                <div className="text-[13px] text-[#6B7280] mt-1">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS GRID */}
      <section className="py-16 px-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.05} className="break-inside-avoid">
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.stars)].map((_, i) => <span key={i} className="text-amber-400 text-[13px]">★</span>)}
                  </div>
                  <p className="text-[13px] text-[#374151] leading-relaxed mb-4">"{t.text}"</p>
                  {t.highlight && (
                    <div className="inline-block text-[11px] font-bold text-[#1D4ED8] bg-blue-50 px-2.5 py-1 rounded-full mb-4">{t.highlight}</div>
                  )}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#F3F4F6]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {t.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-[#111827]">{t.name.split(' ')[0]} {t.name.split(' ')[1]?.[0]}.</div>
                      <div className="text-[11px] text-[#9CA3AF]">{t.role}</div>
                    </div>
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
            <h2 className="text-[32px] font-black text-white mb-4">{pl ? 'Dołącz do grona zadowolonych klientów' : 'Join our satisfied customers'}</h2>
            <p className="text-[16px] text-blue-100 mb-8">{pl ? '7-dniowy trial za darmo. Bez karty kredytowej.' : '7-day trial for free. No credit card.'}</p>
            <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-white text-[14px] font-bold text-[#1D4ED8] hover:bg-blue-50 transition-all shadow-xl">
              {pl ? 'Zacznij za darmo' : 'Start for free'} <ArrowRight className="w-4 h-4" />
            </Link>
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
