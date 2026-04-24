"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  Check, X, Zap, Star, ChevronDown, ArrowRight, Shield,
  RefreshCw, Users, BarChart3, Receipt, Clock, Package,
  Calendar, TrendingUp, ShieldCheck, Brain,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

/* ─── Types ─── */
type Plan = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  monthlyPrice: string;       // e.g. "19,99"
  annualPrice: string;        // monthly equivalent when billed annually, e.g. "15,99"
  annualTotalPrice: string;   // total charged once per year, e.g. "191,88"
  priceId: string;            // Stripe monthly price ID
  annualPriceId: string;      // Stripe annual price ID
  features: string[];
  cta: string;
  popular?: boolean;
};

/* ─── Plan data — Enterprise → Network → Growth → Start ─── */
const PLANS: Plan[] = [
  {
    id: "plan4",
    name: "Enterprise",
    subtitle: "Dla większych operacji",
    description: "Pełny dostęp, dedykowane wsparcie i integracje na zamówienie dla dużych sieci.",
    monthlyPrice: "Wycena",
    annualPrice: "Wycena",
    annualTotalPrice: "Wycena",
    priceId: "",
    annualPriceId: "",
    cta: "Skontaktuj się",
    features: [
      "Nielimitowane lokale i managerowie",
      "Pełny P&L, EBIT i raporty cross-lokalizacyjne",
      "Dedykowany opiekun konta",
      "Onboarding i migracja danych",
      "SLA i gwarancja dostępności",
      "Dostęp do API i integracje na zamówienie",
      "Rozliczenie fakturowe dostępne",
    ],
  },
  {
    id: "plan3",
    name: "Sieć",
    subtitle: "Dla większych operacji",
    description: "Dla sieci firm — pełen dostęp, HR dla całej sieci, raporty cross-lokalizacyjne.",
    monthlyPrice: "179,99",
    annualPrice: "143,99",
    annualTotalPrice: "1 727,90",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAN3 ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAN3_ANNUAL ?? "",
    cta: "Zacznij 7-dniowy trial",
    features: [
      "Do 5 lokali · 5 managerów",
      "Pełny dostęp P&L i EBIT",
      "HR dla całej sieci — raporty zagregowane",
      "Panel regionalny i finansowy",
      "Zaawansowane raporty cross-lokalizacyjne",
      "Eksport danych i integracje",
      "Onboarding pracowników multi-lokal",
      "Dedykowany opiekun konta",
      "Wszystkie 4 Dyrektory AI (CFO, Sprzedaż, HR, Inwestorski)",
      "Push notyfikacje na telefon dla alertów krytycznych",
    ],
  },
  {
    id: "plan2",
    name: "Rozwój",
    subtitle: "Dla rosnącej sieci",
    description: "Pełna kontrola operacyjna — faktury, magazyn, food cost, HR i zaawansowane raporty.",
    monthlyPrice: "99,99",
    annualPrice: "79,99",
    annualTotalPrice: "959,90",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAN2 ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAN2_ANNUAL ?? "",
    cta: "Zacznij 7-dniowy trial",
    popular: true,
    features: [
      "Do 2 lokali · 2 managerów",
      "Sprzedaż + faktury (COS i SEMIS)",
      "Moduł inwentaryzacji i magazynu",
      "Pełny moduł HR (dokumenty, certyfikaty)",
      "Alerty wygasania umów i certyfikatów",
      "Symulacje cen menu i food cost",
      "Zamknięcie miesiąca z walidacją",
      "Priorytetowe wsparcie",
      "CFO + Dyrektor Sprzedaży AI",
      "Dyrektor HR AI",
      "Pokój Co jeśli (symulator decyzji)",
    ],
  },
  {
    id: "plan1",
    name: "Start",
    subtitle: "Dla jednego lokalu",
    description: "Wszystko czego potrzebujesz żeby zacząć — P&L, grafik, czas pracy i AI CFO.",
    monthlyPrice: "49,99",
    annualPrice: "39,99",
    annualTotalPrice: "479,90",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAN1 ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAN1_ANNUAL ?? "",
    cta: "Zacznij 7-dniowy trial",
    features: [
      "1 lokal · 1 manager",
      "Raport P&L dzienny",
      "Ewidencja czasu pracy (Kiosk)",
      "Grafik pracowników",
      "Wnioski urlopowe online",
      "CFO Dyrektor AI",
    ],
  },
];

/* ─── Comparison table ─── */
type FeatureRow = { label: string; plans: [boolean | string, boolean | string, boolean | string] };
const COMPARISON: FeatureRow[] = [
  { label: "Liczba lokali",          plans: ["1",         "Do 2",      "Do 5"] },
  { label: "Liczba managerów",       plans: ["1",         "2",         "5"] },
  { label: "Raport P&L dzienny",     plans: [true,        true,        true] },
  { label: "Ewidencja czasu (Kiosk)",plans: [true,        true,        true] },
  { label: "Grafik pracowników",     plans: [true,        true,        true] },
  { label: "Wnioski urlopowe",       plans: [true,        true,        true] },
  { label: "Faktury COS / SEMIS",    plans: [false,       true,        true] },
  { label: "Magazyn i food cost",    plans: [false,       true,        true] },
  { label: "Symulacje cen menu",     plans: [false,       true,        true] },
  { label: "HR — dokumenty i certyfikaty", plans: [false, true,        true] },
  { label: "Raporty cross-lokalizacyjne", plans: [false,  false,       true] },
  { label: "Panel regionalny",       plans: [false,       false,       true] },
  { label: "CFO Dyrektor AI",        plans: [true,        true,        true] },
  { label: "Dyrektor Sprzedaży AI",  plans: [false,       true,        true] },
  { label: "Dyrektor HR AI",         plans: [false,       true,        true] },
  { label: "Dyrektor Inwestorski AI",plans: [false,       false,       true] },
  { label: "Dedykowany opiekun",     plans: [false,       false,       true] },
];

/* ─── Testimonials ─── */
const TESTIMONIALS = [
  {
    name: "Marek W.",
    city: "Kraków",
    biz: "Właściciel kawiarni (2 lokale)",
    text: "Od kiedy przeszedłem na OneLink, mam pełny obraz finansów każdego ranka. Wykryłem wyciek na food cost, który kosztował mnie 2 000 zł miesięcznie — teraz go kontroluję na bieżąco.",
    stars: 5,
  },
  {
    name: "Agnieszka K.",
    city: "Wrocław",
    biz: "CEO — sieć piekarni (4 punkty)",
    text: "Zamknięcie dnia skróciło się z godziny do dziesięciu minut. Managerowie wprowadzają dane przez telefon, a ja rano widzę pełny raport P&L. Nie wyobrażam sobie już pracy bez tego.",
    stars: 5,
  },
  {
    name: "Tomasz R.",
    city: "Poznań",
    biz: "Właściciel restauracji",
    text: "Plan Rozwój spłacił się w pierwszym miesiącu. Dyrektorzy AI wykryli anomalię w magazynie, dzięki czemu odbiłem 1 800 zł. Cena abonamentu to inwestycja, nie koszt.",
    stars: 5,
  },
];

/* ─── FAQ ─── */
const FAQ_ITEMS = [
  {
    q: "Czy mogę anulować subskrypcję w dowolnym momencie?",
    a: "Tak — anulowanie jest natychmiastowe z poziomu panelu konta. Po anulowaniu konto pozostaje aktywne do końca opłaconego okresu. Nie ma żadnych opłat za wcześniejsze anulowanie ani okresu wypowiedzenia.",
  },
  {
    q: "Jak działa 7-dniowy trial?",
    a: "Po rejestracji masz pełny dostęp do wybranego planu przez 7 dni. Karta Stripe jest wymagana przy rejestracji, ale żadna opłata nie zostanie pobrana w trakcie trialu. Anuluj przed upływem 7 dni — bez żadnych kosztów.",
  },
  {
    q: "Co oznacza rozliczenie roczne i ile oszczędzam?",
    a: "Przy wyborze planu rocznego płacisz z góry za 12 miesięcy i oszczędzasz 20% w porównaniu do abonamentu miesięcznego. Kwota jest pobierana jednorazowo przez Stripe. Rozliczenie roczne oznacza niższy miesięczny koszt na fakturze.",
  },
  {
    q: "Czy mogę zmienić plan w trakcie subskrypcji?",
    a: "Tak, możesz w dowolnym momencie przejść na wyższy lub niższy plan. Przy upgradu różnica jest naliczana proporcjonalnie. Przy downgrade zmiany wchodzą w życie z początkiem następnego okresu rozliczeniowego.",
  },
  {
    q: "Jakie metody płatności są akceptowane?",
    a: "Wszystkie płatności obsługuje Stripe — akceptujemy karty Visa, Mastercard, American Express oraz przelewy SEPA. Faktury VAT wystawiane są automatycznie po każdej płatności i dostępne w panelu konta.",
  },
];

/* ─── Helpers ─── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function CheckCell({ val }: { val: boolean | string }) {
  if (typeof val === "string") {
    return <span className="text-[13px] font-semibold text-[#111827]">{val}</span>;
  }
  return val
    ? <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto"><Check className="w-3.5 h-3.5 text-green-600" /></div>
    : <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto"><X className="w-3 h-3 text-[#D1D5DB]" /></div>;
}

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(true);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const { lang } = useLanguage();
  const pl = lang === 'pl';

  const handleSubscribe = async (plan: Plan) => {
    setLoading(true);
    setError(null);
    const priceId = annual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planCode: plan.id }),
      });
      const data = await res.json();
      if (res.status === 401) { window.location.href = "/auth/sign-up"; return; }
      if (!res.ok || !data.url) throw new Error(data.error || "Nie udało się rozpocząć płatności");
      window.location.href = data.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas łączenia ze Stripe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#111827] overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" dark={false} /></Link>
          <div className="hidden md:flex items-center gap-5 text-[13px] text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">{pl ? 'Strona główna' : 'Home'}</Link>
            <Link href="/pricing" className="font-semibold text-[#111827]">{pl ? 'Cennik' : 'Pricing'}</Link>
            <Link href="/terms" className="hover:text-[#111827] transition-colors">{pl ? 'Regulamin' : 'Terms'}</Link>
            <Link href="/privacy" className="hover:text-[#111827] transition-colors">{pl ? 'Prywatność' : 'Privacy'}</Link>
            <Link href="/security" className="hover:text-[#111827] transition-colors">{pl ? 'Bezpieczeństwo' : 'Security'}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/login" className="hidden md:block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">{pl ? 'Zaloguj' : 'Log in'}</Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5">
              {pl ? 'Zacznij za darmo' : 'Start for free'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[11px] font-semibold text-blue-700 mb-6"
        >
          <Zap className="w-3 h-3" />
          {pl ? '7 dni za darmo · bez ryzyka · anuluj kiedy chcesz' : '7 days free · no risk · cancel any time'}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="text-[42px] md:text-[60px] font-black tracking-tight leading-[1.05] mb-5 text-[#111827]"
        >
          {pl ? 'Prosty cennik.' : 'Simple pricing.'}{" "}
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] bg-clip-text text-transparent">
            {pl ? 'Pełna kontrola.' : 'Full control.'}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[17px] text-[#6B7280] max-w-xl mx-auto leading-relaxed mb-10"
        >
          {pl
            ? 'Jeden panel do zarządzania całym biznesem. Wybierz plan odpowiedni do skali Twojej firmy. Żadnych ukrytych opłat — żadnych niespodzianek.'
            : 'One panel to manage your entire business. Choose the plan that fits your scale. No hidden fees — no surprises.'}
        </motion.p>

        {/* ── Billing Toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="inline-flex items-center gap-4 p-1.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm"
        >
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              !annual ? "bg-[#111827] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            {pl ? 'Miesięcznie' : 'Monthly'}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              annual ? "bg-[#111827] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            {pl ? 'Rocznie' : 'Annually'}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${annual ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}>{pl ? 'Oszczędź 20%' : 'Save 20%'}</span>
          </button>
        </motion.div>
        {annual && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-green-600 font-medium mt-3">
            {pl ? 'Oszczędzasz 20% — rozliczenie jednorazowo raz w roku' : 'You save 20% — billed once per year'}
          </motion.p>
        )}
      </section>

      {/* ── PRICING CARDS ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
          {PLANS.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: EASE }}
              className={`relative flex flex-col rounded-3xl p-5 transition-all ${
                plan.popular
                  ? "bg-[#0F172A] text-white shadow-2xl shadow-black/25 ring-2 ring-[#1D4ED8]/60 z-10"
                  : "bg-white border border-[#E5E7EB] text-[#111827] shadow-sm hover:shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[11px] font-bold text-white tracking-wide shadow-lg whitespace-nowrap">
                  NAJCZĘŚCIEJ WYBIERANY
                </div>
              )}

              <div className="mb-6">
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${plan.popular ? "text-blue-400" : "text-[#6B7280]"}`}>
                  {plan.subtitle}
                </p>
                <h3 className={`text-[28px] font-black tracking-tight mb-2 ${plan.popular ? "text-white" : "text-[#111827]"}`}>
                  {plan.name}
                </h3>
                <p className={`text-[13px] leading-relaxed ${plan.popular ? "text-white/55" : "text-[#6B7280]"}`}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-7">
                {plan.id === "plan4" ? (
                  <div>
                    <p className={`text-[36px] font-black leading-none mb-1 ${plan.popular ? "text-white" : "text-[#111827]"}`}>Wycena</p>
                    <p className={`text-[12px] ${plan.popular ? "text-white/40" : "text-[#9CA3AF]"}`}>Indywidualna oferta</p>
                  </div>
                ) : (
                  <>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={annual ? "annual" : "monthly"}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className={`text-[40px] font-black leading-none ${plan.popular ? "text-white" : "text-[#111827]"}`}
                      >
                        {annual ? plan.annualTotalPrice : plan.monthlyPrice}
                      </motion.span>
                    </AnimatePresence>
                    <span className={`text-[13px] font-medium ${plan.popular ? "text-white/50" : "text-[#9CA3AF]"}`}>
                      {annual ? "zł / rok" : "zł / mies."}
                    </span>
                  </div>
                  {annual ? (
                    <p className={`text-[12px] mt-1 ${plan.popular ? "text-white/40" : "text-[#9CA3AF]"}`}>
                      {plan.annualPrice} {pl ? 'zł / mies. — płatne rocznie' : 'PLN / mo — billed annually'}
                    </p>
                  ) : (
                    <p className={`text-[12px] mt-1 ${plan.popular ? "text-white/40" : "text-[#9CA3AF]"}`}>
                      {pl ? 'po 7-dniowym trialu' : 'after 7-day trial'}
                    </p>
                  )}
                  </>
                )}
              </div>

              {/* CTA */}
              {plan.id === "plan4" ? (
                <a
                  href="mailto:kontakt@onelink.pl"
                  className="w-full h-12 rounded-xl font-bold text-[14px] transition-all mb-7 flex items-center justify-center gap-2 bg-[#111827] text-white hover:bg-[#1F2937]"
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading}
                className={`w-full h-12 rounded-xl font-bold text-[14px] transition-all mb-7 disabled:opacity-60 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white hover:opacity-90 shadow-xl shadow-blue-500/30"
                    : "bg-[#111827] text-white hover:bg-[#1F2937]"
                }`}
              >
                {loading ? (pl ? "Przekierowanie..." : "Redirecting...") : (pl ? plan.cta : plan.cta === 'Zacznij 7-dniowy trial' ? 'Start 7-day trial' : plan.cta)}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
              )}

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.popular ? "bg-blue-500/20" : "bg-green-100"}`}>
                      <Check className={`w-3 h-3 ${plan.popular ? "text-blue-400" : "text-green-600"}`} />
                    </div>
                    <span className={`text-[13px] leading-relaxed ${plan.popular ? "text-white/75" : "text-[#374151]"}`}>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center mt-8 bg-red-50 border border-red-200 rounded-xl py-3 px-4">{error}</p>
        )}

        <p className="text-center text-[12px] text-[#9CA3AF] mt-6">
          Ceny podane netto. VAT doliczany przy kasie.
        </p>
        <p className="text-center text-[12px] text-[#9CA3AF] mt-2">
          Wszystkie plany: 7-dniowy trial · Anuluj kiedy chcesz · Bezpieczna płatność Stripe
        </p>
      </section>

      {/* ── FEATURE COMPARISON TABLE ── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-12">
          <h2 className="text-[32px] md:text-[40px] font-black tracking-tight mb-3 text-[#111827]">
            Porównanie planów
          </h2>
          <p className="text-[15px] text-[#6B7280]">Sprawdź dokładnie, co zawiera każdy plan.</p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm bg-white">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px_120px] bg-[#0F172A]">
            <div className="p-5 text-[11px] font-bold uppercase tracking-widest text-white/40">Funkcja</div>
            {PLANS.map((plan, i) => (
              <div key={plan.id} className={`p-5 text-center ${i === 1 ? "bg-[#1D4ED8]/30" : ""}`}>
                <p className={`text-[12px] font-black ${i === 1 ? "text-[#60A5FA]" : "text-white"}`}>{plan.name}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${i === 1 ? "text-blue-300/70" : "text-white/40"}`}>{plan.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Rows */}
          {COMPARISON.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_120px_120px_120px] border-b border-[#F3F4F6] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} hover:bg-blue-50/40 transition-colors`}
            >
              <div className="px-5 py-3.5 text-[13px] text-[#374151] font-medium flex items-center">{row.label}</div>
              {row.plans.map((val, j) => (
                <div key={j} className={`px-5 py-3.5 flex items-center justify-center ${j === 1 ? "bg-blue-50/30" : ""}`}>
                  <CheckCell val={val} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-4">Opinie klientów</span>
            <h2 className="text-[36px] md:text-[44px] font-black tracking-tight text-white mb-3">
              Co mówią właściciele biznesów
            </h2>
            <p className="text-[15px] text-white/50 max-w-xl mx-auto">Prawdziwe wyniki od prawdziwych restauratorów.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/8 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                {/* Quote icon */}
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center mb-4">
                  <span className="text-white font-black text-[16px] leading-none">"</span>
                </div>
                <p className="text-[14px] text-white/80 leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-[14px] font-bold text-white">{t.name}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{t.city} · {t.biz}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[36px] md:text-[44px] font-black tracking-tight mb-3 text-[#111827]">
              Często zadawane pytania
            </h2>
            <p className="text-[15px] text-[#6B7280]">Masz inne pytanie? Napisz na kontakt@onelink.pl</p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`rounded-2xl border overflow-hidden transition-all ${faqOpen === i ? "border-[#D1D5DB] shadow-sm" : "border-[#E5E7EB] hover:border-[#D1D5DB]"} bg-white`}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  aria-expanded={faqOpen === i}
                >
                  <span className="text-[15px] font-semibold text-[#111827] leading-snug">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 text-[#6B7280] transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: faqOpen === i ? "500px" : "0px" }}>
                  <p className="px-6 pb-6 text-[14px] text-[#6B7280] leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6 bg-[#F7F8FA]">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl p-12 text-center shadow-2xl" style={{ background: "linear-gradient(135deg, #0D1628 0%, #1E3A8A 60%, #0E4275 100%)" }}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/40">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-4">Zacznij już dziś</p>
            <h2 className="text-[34px] md:text-[44px] font-black text-white leading-tight mb-4">
              Zacznij 7-dniowy trial.<br />
              <span className="bg-gradient-to-r from-[#60A5FA] to-[#06B6D4] bg-clip-text text-transparent">
                Bez ryzyka.
              </span>
            </h2>
            <p className="text-[15px] text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
              Pełny dostęp do wybranego planu przez 7 dni. Żadna opłata nie zostanie pobrana przed upływem trialu.
            </p>

            <button
              onClick={() => handleSubscribe(PLANS[1])}
              disabled={loading}
              className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[16px] font-bold text-white hover:opacity-90 transition-all shadow-2xl shadow-blue-500/40 disabled:opacity-60"
            >
              {loading ? "Przekierowanie..." : "Zacznij 7-dniowy trial"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>

            {/* Guarantees */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              {[
                { icon: Shield, text: "Bezpieczna płatność Stripe" },
                { icon: RefreshCw, text: "Anuluj kiedy chcesz" },
                { icon: ShieldCheck, text: "Dane w UE — RODO" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-[12px] text-white/50">
                  <Icon className="w-3.5 h-3.5 text-white/30" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5E7EB] py-10 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
            <div>
              <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" dark={false} /></Link>
              <p className="text-[12px] text-[#9CA3AF] mt-2 max-w-xs">System operacyjny dla restauracji i MŚP — P&L, HR, faktury i AI w jednym miejscu.</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-2">
              <Link href="/about" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">O nas</Link>
              <a href="mailto:kontakt@onelink.pl" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Kontakt</a>
              <Link href="/security" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Bezpieczeństwo</Link>
              <Link href="/privacy" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Prywatność</Link>
              <Link href="/terms" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Regulamin</Link>
            </div>
          </div>
          <div className="border-t border-[#F3F4F6] pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-[12px] text-[#9CA3AF]">© 2026 OneLink · InnowacyjneAI sp. z o.o.</p>
            <p className="text-[12px] text-[#9CA3AF]">Bezpieczne płatności przez Stripe · Dane w UE</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
