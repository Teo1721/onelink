"use client";

import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Sparkles, Zap, Bug, ArrowRight } from "lucide-react";

const RELEASES_PL = [
  {
    version: "2.4.0",
    date: "Kwiecień 2025",
    badge: "new",
    badgeLabel: "Nowe",
    items: [
      { type: "new", text: "Dyrektor Sprzedaży AI — analiza przychodów i alertów sprzedażowych w czasie rzeczywistym" },
      { type: "new", text: "Wielojęzyczny interfejs (PL / EN) — zmień język z dowolnej strony" },
      { type: "new", text: "Nowe strony branżowe: restauracje, siłownie, sklepy, hotele, apteki, warsztaty, salony beauty, stacje paliw" },
      { type: "improvement", text: "Nowy układ cennika — 4 plany z przełącznikiem miesięcznym / rocznym" },
      { type: "improvement", text: "Przyspieszone ładowanie panelu — pierwsza strona o ~40% szybciej" },
    ],
  },
  {
    version: "2.3.0",
    date: "Marzec 2025",
    badge: "improvement",
    badgeLabel: "Ulepszenia",
    items: [
      { type: "new", text: "Kalkulator ROI — policz zwrot z inwestycji przed zakupem" },
      { type: "new", text: "Eksport raportów dziennych do PDF z logo firmy" },
      { type: "improvement", text: "Przeprojektowany onboarding — konfiguracja w 3 minuty zamiast 15" },
      { type: "improvement", text: "Panel pracownika mobilny (PWA) — działa offline" },
      { type: "fix", text: "Poprawka: błąd przy duplikowaniu grafiku między tygodniami" },
    ],
  },
  {
    version: "2.2.0",
    date: "Luty 2025",
    badge: "new",
    badgeLabel: "Nowe",
    items: [
      { type: "new", text: "Dyrektor Finansowy AI — monitorowanie marży operacyjnej i alerty kosztowe 24/7" },
      { type: "new", text: "Import faktur OCR — zrób zdjęcie faktury, system kategoryzuje automatycznie" },
      { type: "new", text: "Moduł urlopowy — wnioski online, akceptacja w aplikacji" },
      { type: "improvement", text: "Porównanie P&L między lokalizacjami — nowy widok sieciowy" },
    ],
  },
  {
    version: "2.1.0",
    date: "Styczeń 2025",
    badge: "improvement",
    badgeLabel: "Ulepszenia",
    items: [
      { type: "new", text: "Kiosk PIN dla pracowników — ewidencja czasu pracy na tablecie bez logowania" },
      { type: "new", text: "Receptury z automatycznym food costem — przeliczanie przy zmianie cen dostawcy" },
      { type: "improvement", text: "Nowy dashboard P&L — wykres przychodów i kosztów w czasie rzeczywistym" },
      { type: "fix", text: "Poprawka: stany magazynowe przy transferach między lokalami" },
    ],
  },
  {
    version: "2.0.0",
    date: "Grudzień 2024",
    badge: "new",
    badgeLabel: "Major",
    items: [
      { type: "new", text: "OneLink 2.0 — całkowicie nowy interfejs, szybszy i bardziej intuicyjny" },
      { type: "new", text: "Panel właściciela sieci — widok wszystkich lokalizacji w jednym miejscu" },
      { type: "new", text: "Integracja z Stripe — płatności i zarządzanie subskrypcją w aplikacji" },
      { type: "improvement", text: "Nowa architektura API — 3× szybsze zapytania do bazy danych" },
    ],
  },
];

const RELEASES_EN = [
  {
    version: "2.4.0",
    date: "April 2025",
    badge: "new",
    badgeLabel: "New",
    items: [
      { type: "new", text: "AI Sales Director — real-time revenue analysis and sales alerts" },
      { type: "new", text: "Bilingual interface (PL / EN) — change language from any page" },
      { type: "new", text: "New industry pages: restaurants, gyms, stores, hotels, pharmacies, workshops, beauty salons, fuel stations" },
      { type: "improvement", text: "Redesigned pricing — 4 plans with monthly / annual toggle" },
      { type: "improvement", text: "Faster panel loading — first page ~40% faster" },
    ],
  },
  {
    version: "2.3.0",
    date: "March 2025",
    badge: "improvement",
    badgeLabel: "Improvements",
    items: [
      { type: "new", text: "ROI Calculator — calculate return on investment before purchasing" },
      { type: "new", text: "Export daily reports to PDF with company logo" },
      { type: "improvement", text: "Redesigned onboarding — setup in 3 minutes instead of 15" },
      { type: "improvement", text: "Mobile employee panel (PWA) — works offline" },
      { type: "fix", text: "Fix: error when duplicating schedule between weeks" },
    ],
  },
  {
    version: "2.2.0",
    date: "February 2025",
    badge: "new",
    badgeLabel: "New",
    items: [
      { type: "new", text: "AI Finance Director — 24/7 operating margin monitoring and cost alerts" },
      { type: "new", text: "OCR invoice import — photograph an invoice, system categorises automatically" },
      { type: "new", text: "Leave module — online requests, approval in the app" },
      { type: "improvement", text: "P&L comparison between locations — new network view" },
    ],
  },
  {
    version: "2.1.0",
    date: "January 2025",
    badge: "improvement",
    badgeLabel: "Improvements",
    items: [
      { type: "new", text: "Employee PIN kiosk — tablet time tracking without login" },
      { type: "new", text: "Recipes with automatic food cost — recalculates when supplier prices change" },
      { type: "improvement", text: "New P&L dashboard — real-time revenue and cost chart" },
      { type: "fix", text: "Fix: stock levels on transfers between locations" },
    ],
  },
  {
    version: "2.0.0",
    date: "December 2024",
    badge: "new",
    badgeLabel: "Major",
    items: [
      { type: "new", text: "OneLink 2.0 — completely new interface, faster and more intuitive" },
      { type: "new", text: "Chain owner panel — view all locations in one place" },
      { type: "new", text: "Stripe integration — payments and subscription management in-app" },
      { type: "improvement", text: "New API architecture — 3× faster database queries" },
    ],
  },
];

const BADGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  improvement: "bg-purple-100 text-purple-700",
  fix: "bg-orange-100 text-orange-700",
};

const ITEM_ICON: Record<string, React.ReactNode> = {
  new: <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />,
  improvement: <Zap className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />,
  fix: <Bug className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />,
};

export default function CoNowegoPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const RELEASES = pl ? RELEASES_PL : RELEASES_EN;

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

      <div className="max-w-[800px] mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-14">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#1D4ED8] mb-4 px-3 py-1 bg-blue-50 rounded-full">
            {pl ? 'Co nowego' : 'Changelog'}
          </span>
          <h1 className="text-[40px] font-black text-[#111827] mb-4">{pl ? 'Historia aktualizacji' : 'Release history'}</h1>
          <p className="text-[16px] text-[#6B7280]">
            {pl
              ? 'Śledź co nowego w OneLink — nowe funkcje, ulepszenia i poprawki błędów.'
              : 'Track what\'s new in OneLink — new features, improvements and bug fixes.'}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E5E7EB]" />
          <div className="space-y-12">
            {RELEASES.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Dot */}
                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-[#1D4ED8] border-2 border-white ring-2 ring-[#E5E7EB]" />

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-[18px] font-black text-[#111827]">v{release.version}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${BADGE_COLORS[release.badge]}`}>{release.badgeLabel}</span>
                  <span className="text-[13px] text-[#9CA3AF]">{release.date}</span>
                </div>

                <ul className="space-y-2.5">
                  {release.items.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] text-[#374151] leading-relaxed">
                      {ITEM_ICON[item.type]}
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 text-center">
          <h3 className="text-[20px] font-black text-[#111827] mb-2">{pl ? 'Nie korzystasz z OneLink jeszcze?' : 'Not using OneLink yet?'}</h3>
          <p className="text-[14px] text-[#6B7280] mb-5">{pl ? 'Zacznij 7-dniowy trial za darmo — bez karty.' : 'Start a 7-day trial for free — no card.'}</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all">
            {pl ? 'Zacznij za darmo' : 'Start for free'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <footer className="py-8 px-5 border-t border-[#F3F4F6] text-center text-[12px] text-[#9CA3AF]">
        © 2025 OneLink ·{' '}
        <Link href="/privacy" className="hover:text-[#6B7280]">{pl ? 'Polityka prywatności' : 'Privacy policy'}</Link>{' '}·{' '}
        <Link href="/terms" className="hover:text-[#6B7280]">{pl ? 'Regulamin' : 'Terms'}</Link>
      </footer>
    </div>
  );
}
