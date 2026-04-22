"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  Brain, AlertTriangle, MailCheck, MessageSquare, Sparkles,
  Activity, TrendingUp, ArrowRight, CheckCircle, BarChart3,
  DollarSign, Clock, FileText, ChevronDown, Zap, Eye,
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
  { icon: Activity, color: '#3B82F6', title: 'Monitorowanie P&L 24/7', desc: 'Śledzi marże, EBIT i food cost każdego dnia — bez czekania na koniec miesiąca.' },
  { icon: AlertTriangle, color: '#EF4444', title: 'Wykrywanie anomalii', desc: 'Automatyczne alerty gdy food cost przekracza próg, przychody spadają lub faktury zalegają.' },
  { icon: MailCheck, color: '#10B981', title: 'Tygodniowy briefing email', desc: 'Co poniedziałek o 08:00 — pełne podsumowanie wyników tygodnia na Twoją skrzynkę.' },
  { icon: MessageSquare, color: '#8B5CF6', title: '"Zapytaj CFO" — chat na żywo', desc: 'Zadaj pytanie po polsku, dostaniesz odpowiedź opartą na Twoich rzeczywistych danych.' },
  { icon: BarChart3, color: '#F59E0B', title: 'Historia i trendy', desc: 'Przeglądaj briefingi z ostatnich 8 tygodni i śledź jak zmienia się Twój biznes w czasie.' },
  { icon: Eye, color: '#06B6D4', title: 'Rozwiązywanie alertów', desc: 'Zaznaczasz alert jako rozwiązany — CFO wie, że reagujesz, i nie bombarduje Cię tym samym problemem.' },
];

const ALERTS_DEMO = [
  { severity: 'critical', title: 'Food cost krytyczny — 44.2%', msg: 'Food cost w tym tygodniu przekroczył próg krytyczny 45%. Sprzedaż: 18 340 zł, COS: 8 100 zł. Sprawdź faktury dostawcy i receptury dań mięsnych.' },
  { severity: 'warning', title: 'Spadek przychodów o 18% vs poprzedni tydzień', msg: 'Bieżący tydzień: 14 200 zł, poprzedni: 17 300 zł. Spadek może być związany z mniejszą ilością zdarzeń w weekend lub błędem raportu dziennego.' },
  { severity: 'info', title: '3 faktury czekają na zatwierdzenie ponad 14 dni', msg: 'Faktury na łączną kwotę 6 400 zł nie zostały zatwierdzone. Sprawdź moduł Faktury i zatwierdź lub odrzuć.' },
];

const FAQ = [
  { q: 'Skąd CFO bierze dane?', a: 'Z Twojego konta OneLink — raporty dzienne, faktury, ewidencja czasu pracy. Nie potrzebujesz żadnych integracji zewnętrznych.' },
  { q: 'Jak często uruchamiana jest analiza?', a: 'Analiza anomalii codziennie o 07:00 UTC. Briefing tygodniowy co poniedziałek o 08:00. Możesz też uruchomić ją ręcznie z panelu.' },
  { q: 'Czy CFO zastąpi mojego księgowego?', a: 'Nie — CFO operuje na danych operacyjnych w czasie rzeczywistym. Twój księgowy pracuje na dokumentach formalnych. CFO jest uzupełnieniem, nie zamiennikiem.' },
  { q: 'Co to znaczy "krytyczny" food cost?', a: 'Domyślny próg ostrzegawczy to 38%, krytyczny — 45%. Możemy dostosować progi do Twojej specyfiki (delikatesy vs. fast food mają inne benchmarki).' },
  { q: 'Czy moje dane są bezpieczne?', a: 'Tak. Dane przetwarzane przez GPT-4o nie są używane do trenowania modeli. Supabase przechowuje dane w UE. Stripe obsługuje płatności (PCI DSS L1).' },
];

function AlertDemo({ a }: { a: typeof ALERTS_DEMO[0] }) {
  const [open, setOpen] = useState(false);
  const colors = { critical: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };
  const labels = { critical: 'Krytyczny', warning: 'Uwaga', info: 'Info' };
  const bgs = { critical: 'bg-red-50 border-red-200', warning: 'bg-amber-50 border-amber-200', info: 'bg-blue-50 border-blue-200' };
  const badges = { critical: 'bg-red-100 text-red-700', warning: 'bg-amber-100 text-amber-700', info: 'bg-blue-100 text-blue-700' };

  return (
    <div className={`rounded-xl border ${bgs[a.severity as keyof typeof bgs]} transition-all`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start gap-3 p-4 text-left">
        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: colors[a.severity as keyof typeof colors] }} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badges[a.severity as keyof typeof badges]}`}>{labels[a.severity as keyof typeof labels]}</span>
          </div>
          <p className="text-[13px] font-semibold text-[#111827]">{a.title}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-4 pb-4 text-[13px] text-[#374151] leading-relaxed -mt-1">{a.msg}</p>}
    </div>
  );
}

export default function CfoDirectorPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E5E7EB]/70">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <OneLinkLogo iconSize={26} textSize="text-[15px]" />
            <span className="text-[#D1D5DB] mx-1">/</span>
            <span className="text-[13px] text-[#6B7280]">CFO Dyrektor AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Zaloguj</Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1">
              Zacznij za darmo
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-3xl -translate-y-1/2" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[11px] font-semibold text-blue-700 mb-6">
            <Brain className="w-3 h-3" />
            Dyrektor Finansowy AI · OneLink
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="text-[46px] md:text-[62px] font-black leading-[1.07] tracking-tight mb-6"
          >
            Twój CFO pracuje<br />
            <span className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] bg-clip-text text-transparent">
              gdy Ty śpisz.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-[18px] text-[#6B7280] leading-relaxed mb-8 max-w-xl mx-auto"
          >
            AI analizuje Twój P&L, food cost i faktury 24/7. Alerty gdy coś jest nie tak.
            Tygodniowy briefing w każdy poniedziałek. Pytaj o dane po polsku — i dostajesz odpowiedź.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
          >
            <Link href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[15px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/30">
              Aktywuj CFO AI — 7 dni gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#capabilities"
              className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-2xl bg-white border border-[#E5E7EB] text-[15px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all">
              Co potrafi CFO AI?
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-5 text-[12px] text-[#9CA3AF]">
            {['Codzienne anomalie o 07:00', 'Briefing co poniedziałek o 08:00', 'Pytania w języku polskim', 'Działa na Twoich danych'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                {t}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ALERT DEMO ── */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-10">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Przykładowe alerty</span>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight mb-3">Dowiadujesz się zanim stanie się stratą</h2>
            <p className="text-[15px] text-[#6B7280] max-w-lg mx-auto">Kliknij alert żeby zobaczyć jak CFO wyjaśnia problem i co poleca zrobić.</p>
          </Reveal>

          <Reveal delay={0.1} className="space-y-3">
            {ALERTS_DEMO.map((a, i) => <AlertDemo key={i} a={a} />)}
          </Reveal>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="capabilities" className="py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Możliwości</span>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight">Co potrafi CFO Dyrektor AI</h2>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map(({ icon: Icon, color, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <div className="rounded-2xl border border-[#E5E7EB] p-5 hover:shadow-md hover:border-[#D1D5DB] transition-all h-full">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                  </div>
                  <p className="text-[14px] font-bold text-[#111827] mb-2">{title}</p>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-5" style={{ background: 'linear-gradient(180deg, #F7F8FA 0%, #EFF6FF 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Jak to działa</span>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight">Zero konfiguracji. Gotowy od razu.</h2>
          </Reveal>

          <div className="space-y-6">
            {[
              { n: '01', color: '#3B82F6', icon: Zap, title: 'Otwórz panel CFO', desc: 'W lewym menu OneLink kliknij "CFO Dyrektor AI". Panel ładuje się od razu — dane już tam są.' },
              { n: '02', color: '#8B5CF6', icon: Activity, title: 'Uruchom pierwszą analizę', desc: 'Kliknij "Uruchom analizę". System sprawdza food cost, przychody i faktury z ostatnich 14 dni.' },
              { n: '03', color: '#10B981', icon: Brain, title: 'Alerty i briefingi na bieżąco', desc: 'Od teraz analiza działa automatycznie codziennie. Briefing w każdy poniedziałek trafia do Twojego maila.' },
            ].map(({ n, color, icon: Icon, title, desc }) => (
              <Reveal key={n} delay={0.1}>
                <div className="flex items-start gap-5 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]" style={{ background: color }}>
                    {n}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <p className="text-[15px] font-bold text-[#111827]">{title}</p>
                    </div>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WEEKLY BRIEFING PREVIEW ── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-10">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Tygodniowy briefing</span>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight mb-3">Co poniedziałek — w Twojej skrzynce</h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-lg">
              {/* Email header mockup */}
              <div className="bg-gradient-to-r from-[#0D1628] to-[#1E3A8A] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">OneLink · CFO AI</p>
                    <p className="text-white font-bold">Tygodniowy briefing finansowy</p>
                  </div>
                </div>
                <p className="text-white/50 text-[12px]">Poniedziałek, 21 kwietnia 2025 · Twoja Restauracja</p>
              </div>
              {/* Email body mockup */}
              <div className="bg-white p-6 space-y-4">
                <p className="text-[14px] text-[#374151] leading-relaxed">
                  Miniony tydzień zakończył się przychodem netto <strong>18 340 zł</strong> — o <strong className="text-[#10B981]">5,8% więcej</strong> niż tydzień wcześniej.
                  Food cost utrzymał się na poziomie <strong>31,2%</strong>, poniżej celu 35%. Koszt pracy wyniósł 24,1% przychodów.
                </p>
                <div className="space-y-2">
                  {[
                    'Dostawca Sieć Chłodnicza wystawił 3 faktury za łączną kwotę 4 200 zł — sprawdź czy to zgodne z zamówieniami',
                    'Sobota była Twoim najlepszym dniem (3 200 zł) — rozważ zwiększenie obsady na sobotnie wieczory',
                    'Brak raportu dziennego za środę — uzupełnij, by utrzymać dokładność P&L',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
                      <p className="text-[13px] text-[#374151]">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-[#F3F4F6]">
                  <p className="text-[13px] font-semibold text-[#111827] mb-1">Zalecenia na ten tydzień:</p>
                  <p className="text-[13px] text-[#374151]">
                    1. Zatwierdź 3 faktury COS z zeszłego tygodnia — wpłynie to na obliczenie rzeczywistego food cost.<br />
                    2. Sprawdź recepturę dań mięsnych — koszt produkcji wzrósł o ok. 8% w ostatnich 30 dniach.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-5" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #1E3A8A 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-[36px] md:text-[46px] font-black text-white leading-tight mb-4">
              Twój CFO AI jest gotowy.
            </h2>
            <p className="text-[15px] text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
              Wbudowany w OneLink — żadnych dodatkowych narzędzi, żadnej konfiguracji.
              Aktywuje się z chwilą wdrożenia.
            </p>
            <Link href="/auth/sign-up"
              className="inline-flex items-center gap-2 h-14 px-9 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-[16px] font-bold text-white hover:opacity-90 transition-all shadow-2xl shadow-blue-500/40">
              Zacznij za darmo — 7 dni <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-[12px] text-white/35 mt-4">Bez karty przez 7 dni. CFO aktywny od pierwszego dnia.</p>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-[32px] font-black tracking-tight">Pytania o CFO AI</h2>
          </Reveal>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className={`border rounded-2xl overflow-hidden transition-all ${faqOpen === i ? 'border-[#D1D5DB] shadow-sm' : 'border-[#E5E7EB] hover:shadow-sm'} bg-white`}>
                  <button className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                    <span className="text-[14px] font-semibold text-[#111827]">{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform duration-200 ${faqOpen === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: faqOpen === i ? '300px' : '0px' }}>
                    <p className="px-6 pb-5 text-[13px] text-[#6B7280] leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <OneLinkLogo iconSize={24} textSize="text-[14px]" />
          </Link>
          <div className="flex gap-5 text-[12px] text-[#9CA3AF]">
            <Link href="/" className="hover:text-[#374151] transition-colors">Strona główna</Link>
            <Link href="/auth/sign-up" className="hover:text-[#374151] transition-colors">Zacznij za darmo</Link>
            <a href="mailto:kontakt@onelink.pl" className="hover:text-[#374151] transition-colors">Kontakt</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
