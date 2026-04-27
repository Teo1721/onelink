"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowRight, ChevronDown, BarChart3, DollarSign,
  TrendingUp, Users, ShieldCheck, FileText, Zap, Package,
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
  { icon: BarChart3, title: "F&B i hotel w osobnych systemach", desc: "Restauracja hotelowa ma własne raporty, recepcja inne — a Ty musisz to sklejać ręcznie, żeby zobaczyć wynik całości." },
  { icon: Users, title: "Wielozmianowy personel — brak przejrzystości", desc: "Kuchnia, obsługa, recepcja — różne grafiki, różne stawki. Koszt pracy to czarna skrzynka do końca miesiąca." },
  { icon: FileText, title: "Faktury od dziesiątek dostawców", desc: "Żywność, napoje, środki czystości, wyposażenie — każda faktura w innym formacie. Kategoryzacja zajmuje godziny." },
];
const PROBLEMS_EN = [
  { icon: BarChart3, title: "F&B and hotel in separate systems", desc: "The hotel restaurant has its own reports, reception has different ones — and you have to stitch them together manually to see the full picture." },
  { icon: Users, title: "Multi-shift staff — no visibility", desc: "Kitchen, service, reception — different schedules, different rates. Labour cost is a black box until end of month." },
  { icon: FileText, title: "Invoices from dozens of suppliers", desc: "Food, beverages, cleaning supplies, equipment — every invoice in a different format. Categorisation takes hours." },
];

const FEATURES_PL = [
  { icon: BarChart3, color: "#6366F1", title: "P&L restauracji i hotelu oddzielnie", desc: "Centrum kosztów restauracja hotelowa vs. wynajem pokoi. Marże per dział bez ręcznych zestawień." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO dla obiektów hotelowych", desc: "Dyrektor Finansowy AI analizuje przychody, food cost i marżę F&B. Alert gdy coś odbiega od normy o ponad 15%." },
  { icon: Users, color: "#F59E0B", title: "Grafik wielozmianowy — kuchnia i recepcja", desc: "Jeden panel dla wszystkich działów. Pracownicy widzą zmiany w aplikacji, manager widzi pełne zestawienie kosztów pracy." },
  { icon: FileText, color: "#EF4444", title: "Faktury dostawców i kategoryzacja", desc: "Importuj faktury PDF lub CSV. System kategoryzuje je do F&B, housekeeping, technicznego — automatycznie." },
  { icon: Package, color: "#3B82F6", title: "Stany F&B i food cost", desc: "Śledzenie stanów kuchennych, procentowy food cost per tydzień — kluczowy wskaźnik dla rentowności restauracji hotelowej." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Wiele obiektów — jeden widok", desc: "Sieć hoteli? Porównuj wyniki F&B, koszty pracy i marże między obiektami z jednego panelu właściciela." },
];
const FEATURES_EN = [
  { icon: BarChart3, color: "#6366F1", title: "Restaurant and hotel P&L separately", desc: "Cost centre: hotel restaurant vs. room rentals. Department margins without manual reports." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO for hotel properties", desc: "The AI Finance Director analyses revenue, food cost and F&B margin. Alert when something deviates from norm by more than 15%." },
  { icon: Users, color: "#F59E0B", title: "Multi-shift schedule — kitchen and reception", desc: "One panel for all departments. Employees see their shifts in the app, manager sees the full labour cost breakdown." },
  { icon: FileText, color: "#EF4444", title: "Supplier invoices and categorisation", desc: "Import PDF or CSV invoices. The system categorises them to F&B, housekeeping, technical — automatically." },
  { icon: Package, color: "#3B82F6", title: "F&B stock and food cost", desc: "Track kitchen stock, weekly food cost percentage — the key metric for hotel restaurant profitability." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Multiple properties — one view", desc: "Hotel chain? Compare F&B results, labour costs and margins between properties from the owner panel." },
];

const FAQ_ITEMS_PL = [
  { q: "Czy OneLink jest dedykowany hotelom?", a: "OneLink zarządza operacjami wielolokalizacyjnymi — restauracje hotelowe, koszty pracy i faktury dostawców to jego core. Nie zastępuje PMS, ale uzupełnia go o widok finansowy." },
  { q: "Czy mogę podzielić P&L na restaurację i hotel?", a: "Tak. Możesz tworzyć centra kosztów i przypisywać do nich sprzedaż, faktury i koszty pracy. P&L każdego działu osobno." },
  { q: "Jak działa AI CFO dla hotelu?", a: "AI CFO analizuje dane z Twoich raportów dziennych i faktur. Porównuje wyniki z poprzednimi tygodniami i alarmuje o anomaliach — np. wzrost food cost powyżej 35%." },
  { q: "Czy mogę importować dane z systemu PMS?", a: "Jeśli Twój PMS eksportuje CSV/Excel, możesz zaimportować dane sprzedażowe do OneLink. Integracje API są na roadmapie." },
  { q: "Ile kosztuje OneLink dla hoteli?", a: "Od 49,99 zł / miesiąc netto. Dla hoteli z kilkoma działami — skontaktuj się po indywidualną wycenę." },
];
const FAQ_ITEMS_EN = [
  { q: "Is OneLink dedicated to hotels?", a: "OneLink manages multi-location operations — hotel restaurants, labour costs and supplier invoices are its core. It doesn't replace a PMS, but complements it with a financial view." },
  { q: "Can I split P&L between the restaurant and hotel?", a: "Yes. You can create cost centres and assign sales, invoices and labour costs to them. Each department gets its own P&L." },
  { q: "How does AI CFO work for a hotel?", a: "AI CFO analyses data from your daily reports and invoices. It compares results to previous weeks and alerts on anomalies — e.g. food cost rising above 35%." },
  { q: "Can I import data from a PMS system?", a: "If your PMS exports CSV/Excel, you can import sales data into OneLink. API integrations are on the roadmap." },
  { q: "How much does OneLink cost for hotels?", a: "From 49.99 PLN / month net. For hotels with several departments — contact us for individual pricing." },
];

export default function DlaHoteliPage() {
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

      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal><span className="inline-block text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla hoteli i obiektów noclegowych</span></Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              P&L restauracji hotelowej<br />bez ręcznych zestawień
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-blue-200 leading-relaxed mb-8 max-w-xl mx-auto">
              Grafik personelu, food cost F&B, faktury dostawców i AI CFO — w jednym systemie dla managera hotelu.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-white text-[15px] font-bold text-blue-900 hover:bg-blue-50 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator ROI
              </Link>
            </div>
            <p className="text-[12px] text-blue-300 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Wyzwania branży hotelarskiej</p>
            <h2 className="text-[28px] font-black text-[#111827]">Problemy znane każdemu hotelarzowi</h2>
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Funkcje dla hoteli</p>
            <h2 className="text-[28px] font-black text-[#111827]">Wszystko co potrzebuje nowoczesny hotel</h2>
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
              "Nareszcie widzę food cost restauracji hotelowej oddzielnie od kosztów pokoi. AI CFO alarmował nas gdy food cost przekroczył 38% — zanim to zauważył szef kuchni."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Klaudia D.</p>
            <p className="text-[12px] text-[#9CA3AF]">Właścicielka, Olinek</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowy żeby mieć P&L hotelu pod kontrolą?</h2>
          <p className="text-[15px] text-blue-200 mb-8">7 dni za darmo. Konfiguracja w 3 minuty.</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-white text-[15px] font-bold text-blue-900 hover:bg-blue-50 transition-all shadow-2xl">
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
