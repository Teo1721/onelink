"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  TrendingUp, TrendingDown, AlertTriangle, MapPin, Calendar,
  ArrowRight, CheckCircle, BarChart3, DollarSign, ChevronDown,
  Zap, Star, Clock,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

const CAPABILITIES = [
  { icon: TrendingUp,   color: '#6366F1', title: 'Analiza przychodów 24/7', desc: 'Porównuje dzisiejszą sprzedaż z tym samym dniem poprzedniego tygodnia automatycznie.' },
  { icon: Calendar,     color: '#10B981', title: 'Najlepszy i najsłabszy dzień', desc: 'Wykrywa który dzień tygodnia generuje największe przychody i gdzie jest największa szansa.' },
  { icon: MapPin,       color: '#F59E0B', title: 'Ranking lokalizacji', desc: 'Porównuje wyniki wszystkich Twoich lokali i wskazuje lokalizację wymagającą uwagi.' },
  { icon: TrendingDown, color: '#EF4444', title: 'Wykrywanie trendów spadkowych', desc: '3 tygodnie z rzędu poniżej normy? Zofia alarmuje zanim będzie za późno na reakcję.' },
  { icon: DollarSign,   color: '#3B82F6', title: 'Weekend vs. tydzień', desc: 'Pokazuje czy biznes jest za bardzo uzależniony od weekendu i gdzie tkwi potencjał wzrostu.' },
  { icon: Star,         color: '#8B5CF6', title: '"Zapytaj Zofię" — chat sprzedażowy', desc: 'Zapytaj po polsku o przychody, trendy lub strategię wzrostu. Odpowiedź w 3 sekundy.' },
];

const ALERTS_DEMO = [
  { severity: 'critical', title: '3-tygodniowy trend spadkowy — łącznie –22.4%', msg: 'Tydzień 3 temu: 28 400 zł → 2 temu: 24 100 zł → bieżący: 22 040 zł. Łączny spadek 22,4% w ciągu 3 tygodni. Sprawdź menu, aktywność marketingową lub zmiany w godzinach pracy.' },
  { severity: 'warning',  title: 'Przychody –14.2% vs poprzedni tydzień', msg: 'Ten tydzień: 18 900 zł, poprzedni: 22 030 zł. Upewnij się, że grafik jest pełny i czy nie brakuje akcji promocyjnych na słabsze dni.' },
  { severity: 'info',     title: 'Wtorek (1 240 zł) vs Sobota (4 890 zł) — różnica 75%', msg: 'Sobota to Twój najlepszy dzień, wtorek — najsłabszy. Rozważ lunch menu, katering lub delivery na wtorek, aby wyrównać wyniki w tygodniu.' },
];

const STEPS = [
  { n: '01', title: 'Łączy się z Twoimi danymi', desc: 'Zofia ma dostęp do sprzedaży z wszystkich lokalizacji z ostatnich 28 dni. Bez arkuszy, bez ręcznego wprowadzania.' },
  { n: '02', title: 'Codziennie o 07:30 UTC', desc: 'Analizuje przychody, porównuje z benchmarkami i generuje alerty dla alertów powyżej progów.' },
  { n: '03', title: 'Alerty w panelu i push', desc: 'Widzisz alerty w zakładce Dyrektor Sprzedaży. Krytyczne — otrzymujesz też push notification na telefon.' },
  { n: '04', title: 'Pytaj kiedy chcesz', desc: 'Chat z Zofią dostępny 24/7. Zapytaj o dowolny aspekt sprzedaży bazując na Twoich danych.' },
];

const FAQ = [
  { q: 'Skąd Zofia bierze dane sprzedażowe?', a: 'Z raportów dziennych wprowadzanych przez Twój zespół w OneLink. Im dokładniej wypełniasz raporty, tym trafniejsze są analizy.' },
  { q: 'Jak często działa analiza?', a: 'Codziennie o 07:30 UTC — 30 minut po analizie CFO. Możesz też odświeżyć panel ręcznie w każdej chwili.' },
  { q: 'Co to jest "3-tygodniowy trend"?', a: 'Jeśli każdy kolejny tydzień ma niższe przychody niż poprzedni przez 3 tygodnie z rzędu — Zofia zgłasza krytyczny alert. To sygnał, że problem jest systemowy, nie przypadkowy.' },
  { q: 'Czy Zofia wysyła emaile?', a: 'Nie — alerty sprzedażowe są w panelu i przez push. Tygodniowy email briefing należy do CFO i obejmuje pełne P&L, w tym sprzedaż.' },
  { q: 'Ile lokalizacji obsługuje?', a: 'Bez limitu. Im więcej lokalizacji, tym bardziej przydatny jest ranking — Zofia wskaże która wymaga interwencji.' },
];

function AlertDemo({ a }: { a: typeof ALERTS_DEMO[0] }) {
  const [open, setOpen] = useState(false);
  const bgs = { critical: 'bg-red-50 border-red-200', warning: 'bg-amber-50 border-amber-200', info: 'bg-blue-50 border-blue-200' };
  const badges = { critical: 'bg-red-100 text-red-700', warning: 'bg-amber-100 text-amber-700', info: 'bg-blue-100 text-blue-700' };
  const labels = { critical: 'Krytyczny', warning: 'Uwaga', info: 'Info' };

  return (
    <div className={`rounded-xl border ${bgs[a.severity as keyof typeof bgs]}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start gap-3 p-4 text-left">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 mt-0.5 ${badges[a.severity as keyof typeof badges]}`}>
          {labels[a.severity as keyof typeof labels]}
        </span>
        <p className="flex-1 text-[13px] font-semibold text-[#111827]">{a.title}</p>
        <ChevronDown className={`w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#E5E7EB]/60 pt-3">
          <p className="text-[12px] text-[#374151] leading-relaxed">{a.msg}</p>
        </div>
      )}
    </div>
  );
}

export default function SalesDirectorLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E5E7EB]/70">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/ai/cfo-director" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors hidden sm:block">CFO Director</Link>
            <Link href="/auth/sign-up"
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1">
              Zacznij za darmo
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-28 pb-24">

        {/* Hero */}
        <Reveal className="text-center mb-16">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-[11px] font-semibold text-violet-700 mb-5">
            <TrendingUp className="w-3 h-3" />
            Dyrektor Sprzedaży AI — OneLink
          </span>
          <h1 className="text-[38px] md:text-[56px] font-black leading-tight tracking-tight mb-5">
            Zofia wie, kiedy sprzedaż
            <br />
            <span className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
              idzie w złym kierunku
            </span>
          </h1>
          <p className="text-[17px] text-[#6B7280] max-w-2xl mx-auto mb-8">
            AI Sales Director analizuje Twoje przychody każdego ranka — porównuje tygodnie,
            wykrywa trendy, rankinguje lokalizacje i alarmuje zanim strata stanie się problemem.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-[15px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-violet-500/30">
              7 dni za darmo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/roi-calculator"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl border border-[#E5E7EB] bg-white text-[15px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              Kalkulator ROI
            </Link>
          </div>
        </Reveal>

        {/* Demo alerts */}
        <Reveal delay={0.1} className="mb-20">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-[11px] font-black text-white">Z</div>
              <div>
                <p className="text-[13px] font-bold text-[#111827]">Zofia — Dyrektor Sprzedaży</p>
                <p className="text-[10px] text-[#9CA3AF]">Dziś, 07:32 · 3 alerty</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">1 krytyczny</span>
            </div>
            <div className="space-y-2">
              {ALERTS_DEMO.map((a, i) => <AlertDemo key={i} a={a} />)}
            </div>
          </div>
        </Reveal>

        {/* Capabilities */}
        <Reveal delay={0.05} className="mb-20">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-center mb-10">Co monitoruje Zofia</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map(({ icon: Icon, color, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <p className="text-[14px] font-bold text-[#111827] mb-1.5">{title}</p>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* How it works */}
        <Reveal className="mb-20">
          <div className="rounded-3xl p-8 md:p-12" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #2D1B69 100%)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-2">Jak to działa</p>
            <h2 className="text-[28px] md:text-[36px] font-black text-white mb-10">Zero konfiguracji. Działa od pierwszego dnia.</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {STEPS.map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <span className="text-[32px] font-black text-violet-500/40 leading-none shrink-0">{n}</span>
                  <div>
                    <p className="text-[14px] font-bold text-white mb-1">{title}</p>
                    <p className="text-[13px] text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* DOW preview */}
        <Reveal className="mb-20">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Przykładowa analiza dni tygodnia</p>
            <p className="text-[14px] font-bold text-[#111827] mb-4">Śr. przychód wg dnia tygodnia (28 dni)</p>
            <div className="flex items-end gap-2 h-28">
              {[
                { d: 'Ndz', v: 62, we: true },
                { d: 'Pon', v: 28, we: false },
                { d: 'Wto', v: 22, we: false },
                { d: 'Śro', v: 31, we: false },
                { d: 'Czw', v: 38, we: false },
                { d: 'Pią', v: 71, we: false },
                { d: 'Sob', v: 100, we: true },
              ].map(({ d, v, we }) => (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                    <div className={`w-full rounded-t-md transition-all ${we ? 'bg-[#6366F1]' : 'bg-[#3B82F6]'}`} style={{ height: `${v}%` }} />
                  </div>
                  <span className="text-[10px] text-[#9CA3AF]">{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-violet-50 border border-violet-200 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-violet-700">
                <strong>Sobota</strong> to Twój najlepszy dzień, <strong>wtorek</strong> — najsłabszy (różnica 78%). Zofia sugeruje menu lunchowe lub delivery na wtorek.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Testimonial / social proof strip */}
        <Reveal className="mb-20">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { stat: '5', label: 'typów anomalii', sub: 'monitorowanych codziennie' },
              { stat: '28d', label: 'historia trendów', sub: 'rolling window' },
              { stat: '3s', label: 'czas odpowiedzi', sub: '"Zapytaj Zofię"' },
            ].map(({ stat, label, sub }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 text-center shadow-sm">
                <p className="text-[36px] font-black bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">{stat}</p>
                <p className="text-[13px] font-bold text-[#111827]">{label}</p>
                <p className="text-[11px] text-[#9CA3AF]">{sub}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* FAQ */}
        <Reveal className="mb-16">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-center mb-8">Często zadawane pytania</p>
          <div className="max-w-2xl mx-auto space-y-2">
            {FAQ.map(({ q, a }, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left">
                  <span className="text-[14px] font-semibold text-[#111827]">{q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform ml-3 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 border-t border-[#F3F4F6] pt-3">
                    <p className="text-[13px] text-[#6B7280] leading-relaxed">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal className="text-center">
          <div className="rounded-3xl p-10 text-center" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #2D1B69 100%)' }}>
            <p className="text-[28px] font-black text-white mb-3">Gotowy żeby Zofia pilnowała sprzedaży?</p>
            <p className="text-[14px] text-slate-400 mb-8 max-w-md mx-auto">7 dni bezpłatnie. Konfiguracja w 3 minuty.</p>
            <Link href="/auth/sign-up"
              className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-[15px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-violet-500/40">
              Zacznij teraz — za darmo <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center justify-center gap-6 mt-6">
              {['Anuluj kiedy chcesz', 'Dane w Polsce (EU)'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[12px] text-slate-400">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-5">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/"><OneLinkLogo iconSize={24} textSize="text-[14px]" /></Link>
          <div className="flex items-center gap-5 text-[12px] text-[#9CA3AF]">
            <Link href="/ai/cfo-director" className="hover:text-[#374151] transition-colors">CFO Director</Link>
            <Link href="/pricing" className="hover:text-[#374151] transition-colors">Cennik</Link>
            <Link href="/roi-calculator" className="hover:text-[#374151] transition-colors">Kalkulator ROI</Link>
          </div>
          <p className="text-[11px] text-[#D1D5DB]">© {new Date().getFullYear()} OneLink</p>
        </div>
      </footer>
    </div>
  );
}
