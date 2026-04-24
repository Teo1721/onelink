"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
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

const PROBLEMS = [
  { icon: Package, title: "Stany paliwa i towaru — dwa oddzielne światy", desc: "Paliwo ewidencjonujesz w jednym systemie, sklep stacji w innym. Żeby zobaczyć całościowy wynik musisz to ręcznie sklejać co miesiąc." },
  { icon: DollarSign, title: "Marża na paliwie i sklepie niewidoczna oddzielnie", desc: "Stacja jako całość może być rentowna, ale sklep samoobsługowy lub myjnia może generować straty — bez systemu tego nie widać." },
  { icon: Users, title: "Wielozmianowy personel bez systemu", desc: "Kasjerzy, pracownicy myjni, obsługa sklepu — różne zmiany, różne stawki. Ewidencja czasu pracy to wieczny problem." },
];

const FEATURES = [
  { icon: Package, color: "#F59E0B", title: "Ewidencja stanów — paliwo, sklep, myjnia", desc: "Traktuj każdą strefę stacji jako oddzielne centrum kosztów. Stany, zamówienia i faktury per sekcja." },
  { icon: BarChart3, color: "#6366F1", title: "P&L per stacja i per dział", desc: "Paliwo, sklep convenience, myjnia, serwis — każdy generuje własny P&L bez ręcznych zestawień w Excelu." },
  { icon: TrendingUp, color: "#10B981", title: "AI CFO — analiza wyników stacji", desc: "Dyrektor Finansowy AI monitoruje przychody i koszty operacyjne. Alert gdy marża odbiega od normy o ponad 10%." },
  { icon: Users, color: "#EF4444", title: "Grafik wielozmianowy dla personelu stacji", desc: "Harmonogram zmian dla kasjerów, obsługi myjni i sklepu. Pracownicy widzą grafik w aplikacji mobilnej." },
  { icon: FileText, color: "#3B82F6", title: "Faktury dostawców i kategoryzacja kosztów", desc: "Importuj faktury za paliwo, towar do sklepu i środki myjni. System kategoryzuje je automatycznie do P&L." },
  { icon: ShieldCheck, color: "#8B5CF6", title: "Sieć stacji w jednym panelu", desc: "Kilka stacji? Porównuj wyniki, marże i koszty pracy między lokalizacjami z jednego widoku właściciela." },
];

const FAQ_ITEMS = [
  { q: "Czy OneLink zastępuje system POS stacji paliw?", a: "Nie — OneLink działa obok systemu POS. Importuje dane sprzedażowe (CSV/Excel) i łączy je z kosztami, żeby wyliczyć P&L każdej sekcji stacji." },
  { q: "Jak ewidencjonować paliwo oddzielnie od sklepu?", a: "Tworzysz centra kosztów: np. 'Paliwo', 'Sklep', 'Myjnia'. Każde centrum ma własne przychody, koszty i marżę operacyjną." },
  { q: "Czy mogę zarządzać pracownikami różnych zmian?", a: "Tak — moduł grafiku obsługuje wielozmianowość, różne stawki godzinowe i wnioski urlopowe. Ewidencja czasu pracy dostępna w panelu." },
  { q: "Ile kosztuje OneLink dla stacji paliw?", a: "Od 19,99 zł / miesiąc netto per lokalizacja. Dla sieci stacji — skontaktuj się po indywidualną wycenę." },
  { q: "Czy mogę śledzić marżę myjni oddzielnie?", a: "Tak — myjnię możesz traktować jako oddzielne centrum kosztów z własnymi przychodami, kosztami chemii i personelu." },
];

export default function DlaStacjiBenzynowychPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in" className="h-8 px-4 text-[13px] font-medium text-[#374151] hover:text-[#111827] flex items-center">Zaloguj</Link>
            <Link href="/auth/sign-up" className="h-8 px-4 rounded-lg bg-[#111827] text-[13px] font-semibold text-white hover:bg-[#1F2937] transition-colors flex items-center">Zacznij za darmo</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 px-5" style={{ background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #292524 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal><span className="inline-block text-[11px] font-bold uppercase tracking-widest text-amber-300 mb-4 px-3 py-1 bg-white/10 rounded-full">Dla stacji paliw i kompleksów paliwowych</span></Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[40px] md:text-[52px] font-black text-white leading-[1.1] mb-5">
              P&L stacji paliw —<br />paliwo, sklep i myjnia&nbsp;osobno
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[17px] text-stone-300 leading-relaxed mb-8 max-w-xl mx-auto">
              Finanse każdej sekcji stacji osobno, grafik wielozmianowy personelu i AI CFO który pilnuje marży operacyjnej.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-amber-400 text-[15px] font-bold text-stone-900 hover:bg-amber-300 transition-all shadow-xl">
                Zacznij za darmo — 7 dni <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/roi-calculator" className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl border border-white/20 text-[15px] font-medium text-white hover:bg-white/10 transition-all">
                Kalkulator ROI
              </Link>
            </div>
            <p className="text-[12px] text-stone-400 mt-4">Anuluj kiedy chcesz.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Wyzwania stacji paliw</p>
            <h2 className="text-[28px] font-black text-[#111827]">Każda stacja zmaga się z tym samym</h2>
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
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">Funkcje dla stacji paliw</p>
            <h2 className="text-[28px] font-black text-[#111827]">Kompleksowe zarządzanie operacyjne</h2>
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
              "Mam 3 stacje i nigdy nie wiedziałem, że sklep na stacji A generuje 40% zysku, a na stacji B — stratę. OneLink to pokazał w pierwszym tygodniu. Decyzja o zmianie asortymentu była oczywista."
            </p>
            <p className="text-[13px] font-semibold text-[#374151]">Krzysztof K.</p>
            <p className="text-[12px] text-[#9CA3AF]">Właściciel sieci stacji, Piekarnia Matusik</p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #0c0a09 0%, #292524 100%)' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-black text-white mb-3">Gotowy żeby wiedzieć ile naprawdę zarabia Twoja stacja?</h2>
          <p className="text-[15px] text-stone-300 mb-8">7 dni za darmo. Konfiguracja w 3 minuty.</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-amber-400 text-[15px] font-bold text-stone-900 hover:bg-amber-300 transition-all shadow-2xl">
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
