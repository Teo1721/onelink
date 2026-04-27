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
  { icon: DollarSign, title: "Food cost widoczny dopiero na koniec miesiąca", desc: "Do 25. dnia miesiąca nie wiesz czy zarabiasz czy tracisz. Zamówienia, marnotrawstwo, kradzieże — wszystko wychodzi za późno." },
  { icon: Package, title: "Magazyn w Excelu lub na kartce", desc: "Stany towaru bez kontroli, receptury bez przeliczenia na koszt. Nikt nie wie ile naprawdę kosztuje jedno danie." },
  { icon: Users, title: "Grafik i czas pracy to wieczny chaos", desc: "Kelnerzy, kucharze, barmani — różne stawki, zmiany, L4. Ewidencja ręczna prowadzi do błędów przy wypłatach." },
];
const PROBLEMS_EN = [
  { icon: DollarSign, title: "Food cost only visible at month end", desc: "Until the 25th you don't know if you're making or losing money. Orders, waste, shrinkage — everything comes out too late." },
  { icon: Package, title: "Inventory in Excel or on paper", desc: "Stock levels out of control, recipes without cost calculation. Nobody really knows what a single dish costs." },
  { icon: Users, title: "Schedule and time tracking is constant chaos", desc: "Waiters, cooks, bartenders — different rates, shifts, sick leave. Manual tracking leads to payroll errors." },
];

const FEATURES_PL = [
  { icon: BarChart3, color: "#6366F1", title: "P&L dzienny — wynik restauracji co 24h", desc: "Widzisz przychody, koszty i marżę każdego dnia. Nie czekasz do końca miesiąca — reagujesz od razu." },
  { icon: Package, color: "#F59E0B", title: "Magazyn z recepturami i food costem", desc: "Zdefiniuj receptury, ustaw dostawców i ceny zakupu. System liczy food cost teoretyczny i porównuje ze stanem faktycznym." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO — alert gdy marża spada", desc: "Dyrektor Finansowy AI śledzi Twój wynik i wysyła alert gdy food cost przekracza próg lub przychody odbiegają od normy." },
  { icon: Users, color: "#EF4444", title: "Grafik i kiosk PIN dla pracowników", desc: "Pracownicy odbijają wejście i wyjście na tablecie. Grafik, wnioski urlopowe i ewidencja czasu w jednym miejscu." },
  { icon: FileText, color: "#3B82F6", title: "Faktury dostawców w 30 sekund", desc: "Zrób zdjęcie faktury lub wgraj PDF — OCR przypisuje pozycje do kategorii kosztowych automatycznie." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Sieć restauracji z jednego panelu", desc: "Kilka lokali? Porównuj wyniki, marże i food cost między restauracjami. Widok właściciela sieci bez zbędnych exceli." },
];
const FEATURES_EN = [
  { icon: BarChart3, color: "#6366F1", title: "Daily P&L — restaurant result every 24h", desc: "See revenue, costs and margin every day. Don't wait until month end — react immediately." },
  { icon: Package, color: "#F59E0B", title: "Inventory with recipes and food cost", desc: "Define recipes, set suppliers and purchase prices. System calculates theoretical food cost and compares with actual stock." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO — alert when margin drops", desc: "The AI Finance Director tracks your result and sends an alert when food cost exceeds the threshold or revenue deviates from norm." },
  { icon: Users, color: "#EF4444", title: "Schedule and PIN kiosk for employees", desc: "Employees clock in and out on a tablet. Schedule, leave requests and time tracking in one place." },
  { icon: FileText, color: "#3B82F6", title: "Supplier invoices in 30 seconds", desc: "Take a photo of the invoice or upload a PDF — OCR assigns line items to cost categories automatically." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Restaurant chain from one panel", desc: "Multiple locations? Compare results, margins and food cost between restaurants. Owner view without endless spreadsheets." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink zastępuje system kasowy (POS)?", a: "Nie — OneLink działa obok Twojego systemu POS. Importuje dane sprzedażowe (CSV/Excel) i łączy je z kosztami, by wyliczyć P&L każdego dnia." },
  { q: "Jak szybko zobaczę food cost w czasie rzeczywistym?", a: "Po skonfigurowaniu receptur i dostawców (ok. 30–60 min) system od razu liczy food cost przy każdym zamówieniu towaru." },
  { q: "Czy moi pracownicy muszą instalować aplikację?", a: "Nie — kiosk pracownika działa w przeglądarce na dowolnym tablecie lub smartfonie. Żadnej instalacji, żadnego IT." },
  { q: "Ile kosztuje OneLink dla restauracji?", a: "Od 49,99 zł / miesiąc netto. 7-dniowy trial bez karty — sprawdź za darmo." },
  { q: "Czy działa dla sieci restauracji?", a: "Tak — plan Network obsługuje do 5 lokalizacji z jednym panelem właściciela, porównaniem wyników i wspólnym magazynem." },
];
const FAQ_ITEMS_EN = [
  { q: "Does OneLink replace a POS system?", a: "No — OneLink works alongside your POS. It imports sales data (CSV/Excel) and combines it with costs to calculate daily P&L." },
  { q: "How quickly will I see real-time food cost?", a: "After setting up recipes and suppliers (approx. 30–60 min) the system immediately calculates food cost with every stock order." },
  { q: "Do my employees need to install an app?", a: "No — the employee kiosk works in a browser on any tablet or smartphone. No installation, no IT required." },
  { q: "How much does OneLink cost for a restaurant?", a: "From 49.99 PLN / month net. 7-day trial without a card — try it for free." },
  { q: "Does it work for a restaurant chain?", a: "Yes — the Network plan supports up to 5 locations with one owner panel, result comparison and shared inventory." },
];

const TESTIMONIALS_PL = [
  { name: "Marcin K.", role: "Właściciel, 2 restauracje", text: "W ciągu pierwszych 2 tygodni odkryłem, że food cost u mnie wynosi 38%, nie 31% jak myślałem. OneLink uratował mi marżę." },
  { name: "Anna W.", role: "Manager, sieć burgerów", text: "Grafik i kiosk PIN to oszczędność 3 godzin tygodniowo na papierologii. Polecam każdemu, kto ma więcej niż 5 pracowników." },
  { name: "Tomasz B.", role: "Właściciel, restauracja premium", text: "AI CFO wysłał mi alert o środku nocy — food cost skoczył o 6pp. Okazało się, że dostawca zmienił ceny. Złapałem to w 12h." },
];
const TESTIMONIALS_EN = [
  { name: "Marcin K.", role: "Owner, 2 restaurants", text: "Within the first 2 weeks I discovered my food cost was 38%, not 31% as I thought. OneLink saved my margin." },
  { name: "Anna W.", role: "Manager, burger chain", text: "The schedule and PIN kiosk saves 3 hours per week on paperwork. I recommend it to anyone with more than 5 employees." },
  { name: "Tomasz B.", role: "Owner, premium restaurant", text: "The AI CFO sent me an alert in the middle of the night — food cost jumped by 6pp. Turned out the supplier changed prices. I caught it in 12h." },
];

export default function DlaRestauracjiPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const PROBLEMS = pl ? PROBLEMS_PL : PROBLEMS_EN;
  const FEATURES = pl ? FEATURES_PL : FEATURES_EN;
  const FAQ_ITEMS = pl ? FAQ_ITEMS_PL : FAQ_ITEMS_EN;
  const TESTIMONIALS = pl ? TESTIMONIALS_PL : TESTIMONIALS_EN;

  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/login" className="h-8 px-4 text-[13px] font-medium text-[#374151] hover:text-[#111827] flex items-center">{pl ? 'Zaloguj' : 'Log in'}</Link>
            <Link href="/auth/sign-up" className="h-8 px-4 rounded-lg bg-[#111827] text-[13px] font-semibold text-white hover:bg-[#1F2937] transition-colors flex items-center">{pl ? 'Zacznij za darmo' : 'Start for free'}</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 50%)' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal><span className="inline-block text-[11px] font-bold uppercase tracking-widest text-indigo-300 mb-4 px-3 py-1 bg-white/10 rounded-full">{pl ? 'Dla restauracji i gastronomii' : 'For restaurants and foodservice'}</span></Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[54px] font-black text-white leading-[1.1] mb-5">
              {pl ? <>P&L restauracji —<br />food cost pod kontrolą każdego dnia</> : <>Restaurant P&L —<br />food cost under control every day</>}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-slate-300 leading-relaxed mb-8 max-w-xl mx-auto">
              {pl
                ? 'Finanse restauracji w czasie rzeczywistym, magazyn z recepturami, grafik wielozmianowy i AI CFO który pilnuje Twojej marży.'
                : 'Restaurant finances in real time, inventory with recipes, multi-shift schedule and an AI CFO that guards your margin.'}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-indigo-500 text-[15px] font-bold text-white hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-900/40">
                {pl ? 'Zacznij za darmo — 7 dni' : 'Start free — 7 days'} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                {pl ? 'Zobacz demo →' : 'See demo →'}
              </Link>
            </div>
            <p className="text-[12px] text-slate-400 mt-4">{pl ? 'Bez karty kredytowej. Anuluj kiedy chcesz.' : 'No credit card. Cancel any time.'}</p>
          </Reveal>

          {/* Stats */}
          <Reveal delay={0.4}>
            <div className="flex flex-wrap gap-4 justify-center mt-10">
              {(pl
                ? [{ v: '11 000 zł', l: 'avg. food cost savings / mo.' }, { v: '+19%', l: 'margin growth' }, { v: '97 min', l: 'saved daily per location' }]
                : [{ v: '11,000 PLN', l: 'avg. food cost savings / mo.' }, { v: '+19%', l: 'margin growth' }, { v: '97 min', l: 'saved daily per location' }]
              ).map(({ v, l }) => (
                <div key={l} className="px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-left">
                  <div className="text-[22px] font-black text-white">{v}</div>
                  <div className="text-[11px] text-slate-400">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">{pl ? 'Wyzwania restauracji' : 'Restaurant challenges'}</p>
            <h2 className="text-[28px] font-black text-[#111827]">{pl ? 'Każda restauracja zmaga się z tym samym' : 'Every restaurant faces the same problems'}</h2>
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

      {/* FEATURES */}
      <section className="py-16 px-5">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">{pl ? 'Funkcje dla restauracji' : 'Features for restaurants'}</p>
            <h2 className="text-[28px] font-black text-[#111827]">{pl ? 'Wszystko czego potrzebujesz w jednym panelu' : 'Everything you need in one panel'}</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <div className="flex gap-4 p-5 rounded-2xl border border-[#E5E7EB] hover:shadow-md transition-shadow bg-white">
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

      {/* TESTIMONIALS */}
      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-[28px] font-black text-[#111827]">{pl ? 'Co mówią właściciele restauracji' : 'What restaurant owners say'}</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
                  <div className="flex gap-0.5 mb-3">{[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-[14px]">★</span>)}</div>
                  <p className="text-[13px] text-[#374151] leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <div className="text-[13px] font-bold text-[#111827]">{t.name}</div>
                    <div className="text-[12px] text-[#6B7280]">{t.role}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5 bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4]">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[32px] font-black text-white mb-4">{pl ? 'Gotowy żeby wiedzieć ile zarabiasz?' : 'Ready to know how much you earn?'}</h2>
            <p className="text-[16px] text-blue-100 mb-8">{pl ? '7-dniowy trial za darmo. Bez karty kredytowej.' : '7-day trial for free. No credit card.'}</p>
            <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-10 rounded-2xl bg-white text-[15px] font-bold text-[#1D4ED8] hover:bg-blue-50 transition-all shadow-xl">
              {pl ? 'Zacznij za darmo' : 'Start for free'} <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-5">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-8">
            <h2 className="text-[24px] font-black text-[#111827]">FAQ</h2>
          </Reveal>
          <div className="space-y-3">{FAQ_ITEMS.map(item => <FAQ key={item.q} q={item.q} a={item.a} />)}</div>
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
