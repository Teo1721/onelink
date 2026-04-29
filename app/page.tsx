"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  TrendingUp, BarChart3, Package, Receipt, ShieldCheck,
  ChevronRight, Check, ArrowRight, Zap, Star,
  Clock, PieChart, FileText, ChevronDown, CheckCircle, Users, Calendar,
  Brain, AlertTriangle, Bell, MessageSquare, Sparkles, Eye, Target,
  DollarSign, Building2, Cpu, LineChart, Activity, MailCheck, MapPin,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

/* ─────────────────────────── helpers ─────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function useCounter(end: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, end, duration]);
  return count;
}

function AnimatedStat({ value, label, prefix = '', suffix = '' }: { value: number; label: string; prefix?: string; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const count = useCounter(value, 1600, inView);
  return (
    <div ref={ref} className="flex flex-col px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
      <span className="text-[20px] font-black text-[#1D4ED8] leading-none">{prefix}{count.toLocaleString('pl-PL')}{suffix}</span>
      <span className="text-[10px] text-[#6B7280] mt-0.5">{label}</span>
    </div>
  );
}

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const stagger = (delay = 0.08) => ({
  visible: { transition: { staggerChildren: delay } },
});

function Reveal({ children, delay = 0, className = "", style }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: EASE } } }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function RevealList({ children, className = "" }: { children: React.ReactNode[]; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger(0.1)} className={className}>
      {children.map((child, i) => (
        <motion.div key={i} variants={fadeUp}>{child}</motion.div>
      ))}
    </motion.div>
  );
}

/* ─────────────────────────── FAQ data ─────────────────────────── */
const FAQ_ITEMS_EN = [
  { q: "How much does OneLink cost after the free trial?", a: "Plans start from 49.99 PLN/month net (+VAT). You can cancel at any time — no lock-in period." },
  { q: "Do I need to provide a credit card to register?", a: "Yes, we ask for card details via Stripe at registration. No charge is made during the 7-day trial. Cancel before 7 days — no payment will be taken." },
  { q: "How long does setup and configuration take?", a: "Your first account is ready in about 3 minutes. Full setup with inviting managers takes up to 20 minutes. No IT required." },
  { q: "Can I manage multiple locations?", a: "Yes. OneLink is designed to manage multiple locations from one owner panel. Compare results, transfer stock and approve invoices across all locations." },
  { q: "How do the AI Directors work?", a: "Each AI Director is a dedicated agent monitoring your data 24/7. The CFO analyses P&L and detects anomalies. The COO tracks attendance and schedules. You get a notification before a problem becomes a loss." },
  { q: "Is my data secure?", a: "Yes. Data is encrypted and stored on EU servers (Supabase). Payments handled by Stripe (PCI DSS Level 1). We do not share data with third parties." },
  { q: "Does OneLink integrate with my POS system?", a: "OneLink works alongside your POS — no direct integration required. Sales data can be entered manually by managers or imported via CSV/Excel. Direct API for popular POS systems is on the roadmap." },
  { q: "Can I migrate data from Excel or another system?", a: "Yes. OneLink supports CSV and Excel import for sales, products and employees. Most clients are set up within one working day." },
  { q: "Does the PIN kiosk work offline?", a: "The PIN kiosk requires an internet connection — time entries are synced in real time. Employees can see their status even during brief connectivity issues, and data syncs when reconnected." },
  { q: "What happens to my data after I cancel?", a: "After cancellation you have 30 days to export all data (reports, invoices, time records) in CSV/Excel format. After that, the account and data are permanently deleted per GDPR." },
  { q: "How many users can use the system simultaneously?", a: "Unlimited — you can add any number of managers and employees. Employees use the PIN kiosk or a QR link, not separate accounts. Active sessions are not restricted." },
];

const FAQ_ITEMS = [
  { q: "Ile kosztuje OneLink po zakończeniu bezpłatnego trialu?", a: "Plany zaczynają się od 49,99 zł miesięcznie netto (+ VAT). Możesz anulować w dowolnym momencie — bez okresu wypowiedzenia." },
  { q: "Czy muszę podawać kartę kredytową przy rejestracji?", a: "Tak, przy rejestracji prosimy o dane karty przez Stripe. Nie pobieramy żadnej opłaty przez 7 dni trialu. Możesz anulować przed upływem 7 dni — żadna opłata nie zostanie pobrana." },
  { q: "Jak długo trwa wdrożenie i konfiguracja?", a: "Pierwsze konto jest gotowe w około 3 minuty. Pełna konfiguracja z zaproszeniem managerów zajmuje do 20 minut. Nie potrzebujesz IT." },
  { q: "Czy mogę zarządzać kilkoma lokalami?", a: "Tak. OneLink jest zaprojektowany do zarządzania wieloma lokalizacjami z jednego panelu. Możesz porównywać wyniki, transferować stany i zatwierdzać faktury z każdego lokalu." },
  { q: "Jak działają Dyrektorzy AI?", a: "Każdy Dyrektor AI to osobny agent, który monitoruje dane z Twojego obszaru 24/7. CFO analizuje P&L i wykrywa anomalie. COO śledzi obecność i grafiki. Jeśli coś jest nie tak — otrzymujesz powiadomienie zanim problem urośnie do straty." },
  { q: "Czy moje dane są bezpieczne?", a: "Tak. Dane szyfrowane, serwery w UE (Supabase). Płatności obsługuje Stripe (PCI DSS Level 1). Nie udostępniamy danych podmiotom trzecim." },
  { q: "Czy OneLink integruje się z moim systemem POS?", a: "OneLink nie wymaga integracji z POS-em — działa obok niego. Dane sprzedażowe możesz wprowadzać ręcznie przez managera lub importować przez CSV/Excel. Bezpośrednie API do Restaumatic, Dotykacka i innych systemów jest w roadmapie." },
  { q: "Czy mogę przenieść dane z Excela lub innego systemu?", a: "Tak. OneLink obsługuje import CSV i Excel dla sprzedaży, produktów i pracowników. Większość klientów jest skonfigurowana w ciągu jednego dnia roboczego." },
  { q: "Czy kiosk PIN działa offline?", a: "Kiosk PIN wymaga połączenia z internetem — rejestracja czasu jest synchronizowana z bazą danych w czasie rzeczywistym. Pracownicy mogą jednak zobaczyć swój status (zalogowany / nie) nawet przy chwilowych problemach z siecią, a dane są synchronizowane po przywróceniu połączenia." },
  { q: "Co się dzieje z moimi danymi po anulowaniu subskrypcji?", a: "Po anulowaniu masz 30 dni na eksport wszystkich danych (raporty, faktury, ewidencja czasu) w formacie CSV/Excel. Po tym czasie konto i dane są trwale usuwane zgodnie z RODO." },
  { q: "Ile użytkowników może korzystać jednocześnie?", a: "Bez limitu — możesz dodać dowolną liczbę managerów i pracowników. Pracownicy używają kiosku PIN lub linku QR, a nie osobnych kont. Liczba aktywnych sesji nie jest ograniczona." },
];

/* ─────────────────────────── Lead Capture ─────────────────────── */
function LeadCapture() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [locationCount, setLocationCount] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const res = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, name, businessType, locationCount, newsletterConsent,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          utmSource: params?.get('utm_source') ?? null,
          utmMedium: params?.get('utm_medium') ?? null,
          utmCampaign: params?.get('utm_campaign') ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Błąd — spróbuj ponownie.'); setLoading(false); return; }
      setDone(true);
    } catch { setError('Błąd połączenia — spróbuj ponownie.'); }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-8 shadow-sm">
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-[22px] font-bold text-[#111827] mb-2">Gotowe!</p>
          <p className="text-[14px] text-[#6B7280]">Arkusz wysłany na <strong>{email}</strong>. Sprawdź skrzynkę.</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 text-center">Nie gotowy na trial?</p>
          <h2 className="text-[20px] font-black text-[#111827] mb-1 leading-tight text-center">Pobierz bezpłatny kalkulator food cost</h2>
          <p className="text-[13px] text-[#6B7280] mb-5 leading-relaxed text-center">Arkusz Excel gotowy do użycia. Bez rejestracji.</p>
          <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Adres e-mail"
              className="w-full h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 shadow-sm transition-all" disabled={loading} />
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Imię i nazwisko"
              className="w-full h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 shadow-sm transition-all" disabled={loading} />
            <select required value={businessType} onChange={e => setBusinessType(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:border-blue-400 shadow-sm transition-all" disabled={loading}>
              <option value="" disabled>Typ działalności</option>
              <option value="restauracja">Restauracja</option>
              <option value="kawiarnia">Kawiarnia / bistro</option>
              <option value="fast-food">Fast food / bar</option>
              <option value="catering">Catering</option>
              <option value="hotel">Restauracja hotelowa</option>
              <option value="inne">Inne</option>
            </select>
            <select required value={locationCount} onChange={e => setLocationCount(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:border-blue-400 shadow-sm transition-all" disabled={loading}>
              <option value="" disabled>Liczba lokalizacji</option>
              <option value="1">1 lokal</option>
              <option value="2-5">2–5 lokali</option>
              <option value="6-20">6–20 lokali</option>
              <option value="20+">Ponad 20 lokali</option>
            </select>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={newsletterConsent} onChange={e => setNewsletterConsent(e.target.checked)} disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-[#D1D5DB] text-blue-600 focus:ring-blue-500 shrink-0" />
              <span className="text-[11px] text-[#6B7280] leading-relaxed">
                Wyrażam zgodę na otrzymywanie wiadomości e-mail z materiałami i ofertami OneLink. Możesz wypisać się w dowolnym momencie.
              </span>
            </label>
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-[13px] font-bold text-white hover:from-blue-500 hover:to-blue-400 transition-all shadow-sm disabled:opacity-60">
              {loading ? 'Wysyłam…' : 'Pobierz kalkulator →'}
            </button>
          </form>
          {error && <p className="text-[12px] text-red-500 mt-2 text-center">{error}</p>}
          <p className="text-[11px] text-[#9CA3AF] mt-3 text-center">Plik wysyłamy zawsze. Do listy mailingowej — tylko za zgodą.</p>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Sticky CTA ───────────────────────── */
function StickyCTA() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handle = () => {
      const y = window.scrollY;
      const faq = document.getElementById('faq');
      if (y < 500) { setVisible(false); return; }
      if (faq) {
        const threshold = faq.getBoundingClientRect().top + window.scrollY - 200;
        setVisible(y < threshold);
      } else { setVisible(true); }
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <>
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <Link href="/auth/sign-up" className="flex flex-col items-center justify-center py-4 bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] active:opacity-80 transition-all">
            <span className="text-[15px] font-bold text-white">Zacznij za darmo — 7 dni bez opłat</span>
            <span className="text-[11px] text-white/75 mt-0.5">Bezpieczna płatność Stripe</span>
          </Link>
        </div>
      </div>
      <div className={`hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border border-[#E5E7EB] bg-white/95 backdrop-blur-md shadow-xl shadow-black/10">
          <div className="flex items-center gap-2">
            {['#06B6D4','#3B82F6','#8B5CF6'].map((c,i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }} />
            ))}
            <span className="text-[12px] text-[#6B7280] ml-1">+19% marży · 11 000 zł food cost savings</span>
          </div>
          <div className="w-px h-5 bg-[#E5E7EB]" />
          <Link href="/auth/sign-up" className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-1.5">
            Zacznij bezpłatny trial <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Director cards ─────────────────────── */
const DIRECTORS = [
  {
    id: 'cfo',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.15)',
    initial: 'CFO',
    title: 'Dyrektor Finansowy AI',
    tagline: 'Twój P&L. 24/7. Bez zaskakiwania na koniec miesiąca.',
    capabilities: [
      { icon: Activity,     text: 'Monitoruje marże i EBIT każdego dnia' },
      { icon: AlertTriangle,text: 'Wykrywa anomalie food cost natychmiast' },
      { icon: MailCheck,    text: 'Wysyła tygodniowy briefing właścicielowi' },
      { icon: MessageSquare,text: 'Odpowiada na pytania: "Czemu food cost wzrósł?"' },
    ],
    insight: '"Food cost w Katowicach wzrósł o 3,2pp w tym tygodniu — głównie chleb i nabiał. Sugeruję renegocjację z dostawcą lub korektę receptur."',
  },
  {
    id: 'coo',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.15)',
    initial: 'COO',
    title: 'Dyrektor Operacyjny AI',
    tagline: 'Twoi ludzie, grafiki i kiosk — pod kontrolą.',
    capabilities: [
      { icon: Users,     text: 'Monitoruje obecność i czas pracy na żywo' },
      { icon: Calendar,  text: 'Wykrywa luki w grafiku zanim wpłyną na serwis' },
      { icon: Clock,     text: 'Analizuje koszty pracy vs. sprzedaż per zmiana' },
      { icon: Bell,      text: 'Alerty: wygasające certyfikaty, niezatwierdzone wnioski' },
    ],
    insight: '"Sobota 18:00-22:00 to Twój peak. W tym tygodniu masz o 2 osoby za mało — koszt niedosady szacuję na 800-1 200 zł utraconych przychodów."',
  },
  {
    id: 'inv',
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.15)',
    initial: 'INV',
    title: 'Dyrektor Inwestorski AI',
    tagline: 'Deck dla banku lub inwestora — gotowy w 60 sekund.',
    capabilities: [
      { icon: LineChart,   text: 'Generuje snapshot rentowności per lokalizacja' },
      { icon: Target,      text: 'Porównuje wyniki do benchmarku branżowego' },
      { icon: FileText,    text: 'Tworzy gotowy raport PDF do prezentacji' },
      { icon: TrendingUp,  text: 'Prognozuje EBIT przy otwarciu kolejnego lokalu' },
    ],
    insight: '"Przy obecnej marży netto 18,4% i planowanym wzroście 12% r/r, break-even nowego lokalu o podobnym profilu nastąpi po ok. 14 miesiącach."',
  },
];

function DirectorCard({ d, active, onClick }: { d: typeof DIRECTORS[0]; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full text-left rounded-2xl border p-6 transition-all duration-200 ${
        active
          ? 'border-transparent shadow-lg'
          : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm'
      }`}
      style={active ? { background: '#fff', boxShadow: `0 0 0 2px ${d.color}40, 0 12px 40px ${d.glow}` } : {}}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black text-white shrink-0" style={{ background: d.color }}>
          {d.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: d.color }}>{d.title}</p>
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">Early Access</span>
          </div>
          <p className="text-[15px] font-semibold text-[#111827] leading-snug">{d.tagline}</p>
        </div>
      </div>
      {active && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-5 space-y-2.5">
          {d.capabilities.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: d.color }} />
              <span className="text-[13px] text-[#374151]">{text}</span>
            </div>
          ))}
          <div className="mt-4 p-3.5 rounded-xl text-[12px] leading-relaxed italic text-[#374151]" style={{ background: `${d.color}0D` }}>
            <Sparkles className="w-3 h-3 inline mr-1.5 -mt-0.5" style={{ color: d.color }} />
            {d.insight}
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

/* ─────────────────────────── Problem numbers ─────────────────────── */
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─────────────────────────── Video Section ─────────────────────────── */
const YT_ID = "HehF-sxBrJc";

function VideoSection({ pl }: { pl: boolean }) {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-16 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <Reveal className="text-center mb-8">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">
            {pl ? 'Zobacz jak to działa' : 'See it in action'}
          </span>
          <h2 className="text-[32px] md:text-[40px] font-black text-[#111827]">
            {pl ? 'OneLink w 60 sekund' : 'OneLink in 60 seconds'}
          </h2>
          <p className="text-[16px] text-[#6B7280] mt-3 max-w-lg mx-auto">
            {pl ? 'Zobacz jak właściciele firm zarządzają P&L, grafikiem i kosztami z jednego panelu.' : 'See how business owners manage P&L, schedules and costs from one panel.'}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-[#E5E7EB] bg-black aspect-video">
            {!playing ? (
              /* Thumbnail + play button */
              <div
                onClick={() => setPlaying(true)}
                className="absolute inset-0 cursor-pointer group"
              >
                <img
                  src={`https://img.youtube.com/vi/${YT_ID}/maxresdefault.jpg`}
                  alt="OneLink demo video"
                  className="w-full h-full object-cover"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-8 h-8 text-[#1D4ED8] ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Duration badge */}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-[12px] font-semibold px-2.5 py-1 rounded backdrop-blur-sm">
                  1:00
                </div>
                <div className="absolute bottom-4 left-4 bg-black/60 text-white text-[12px] font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {pl ? '▶ Obejrzyj demo' : '▶ Watch demo'}
                </div>
              </div>
            ) : (
              /* YouTube iframe — only loads when user clicks play */
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="OneLink demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── Dashboard mockup ─────────────────────── */
function ConsoleMockup() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const alerts = [
    { color: '#F59E0B', text: 'Food cost Katowice +2.8pp powyżej targetu' },
    { color: '#3B82F6', text: 'CFO: Tygodniowy briefing gotowy do odczytu' },
    { color: '#10B981', text: 'Grafik na sobotę — potwierdź zmiany (3 osoby)' },
    { color: '#8B5CF6', text: 'Certyfikat BHP Kowalski wygasa za 14 dni' },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 select-none" style={{ background: '#0D1628' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/3">
        <div className="flex gap-1.5">
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
        </div>
        <div className="flex-1 mx-4 h-6 rounded-md bg-white/8 flex items-center px-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-2" />
          <span className="text-[10px] text-white/40 font-mono">onelink.pl/admin</span>
        </div>
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center">
          <Brain className="w-3 h-3 text-white" />
        </div>
      </div>

      <div className="flex" style={{ minHeight: 400 }}>
        {/* Sidebar */}
        <div className="w-[140px] border-r border-white/8 p-3 flex flex-col gap-0.5 shrink-0">
          <div className="h-7 px-2 mb-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center">
              <span className="text-[8px] font-black text-white">OL</span>
            </div>
            <span className="text-[11px] font-bold text-white">OneLink</span>
          </div>
          {[
            { icon: BarChart3, label: 'Dashboard', active: true },
            { icon: Brain, label: 'Dyrektorzy', badge: '3' },
            { icon: PieChart, label: 'P&L', },
            { icon: Clock, label: 'Czas pracy', badge: '!' },
            { icon: Users, label: 'HR' },
            { icon: Calendar, label: 'Grafik' },
            { icon: Receipt, label: 'Faktury' },
            { icon: Package, label: 'Magazyn' },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 h-7 px-2.5 rounded-lg text-[10px] font-medium ${item.active ? 'bg-[#1E3A8A]/60 text-[#93C5FD]' : 'text-white/45 hover:text-white/70'}`}>
              <item.icon className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded-sm leading-none ${item.badge === '!' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-300'}`}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-4 overflow-hidden space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Sprzedaż netto', val: '18 340 zł', sub: '↑ vs. plan', color: '#fff' },
              { label: 'Food cost', val: '31,2%', sub: '▼ cel: 35%', color: '#10B981' },
              { label: 'Koszt pracy', val: '24,1%', sub: 'Marzec', color: '#F59E0B' },
              { label: 'EBIT', val: '4 210 zł', sub: 'Marża 22,9%', color: '#10B981' },
            ].map((t, i) => (
              <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-3">
                <p className="text-[7px] font-semibold uppercase tracking-widest text-white/40 mb-1">{t.label}</p>
                <p className="text-[14px] font-black leading-none mb-1" style={{ color: t.color }}>{t.val}</p>
                <p className="text-[8px] text-white/40">{t.sub}</p>
              </div>
            ))}
          </div>

          {/* Chart + AI alerts */}
          <div className="grid grid-cols-5 gap-2">
            {/* Sparkline */}
            <div className="col-span-3 bg-white/4 border border-white/8 rounded-xl p-3">
              <p className="text-[7px] font-semibold uppercase tracking-widest text-white/40 mb-2">Sprzedaż — 7 dni</p>
              <svg viewBox="0 0 180 60" className="w-full h-12" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,45 C25,40 45,28 65,32 S105,18 125,14 S160,4 180,10 L180,60 L0,60Z" fill="url(#g)" />
                <path d="M0,45 C25,40 45,28 65,32 S105,18 125,14 S160,4 180,10" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
                {[[0,45],[65,32],[125,14],[180,10]].map(([x,y],i) => (
                  <circle key={i} cx={x} cy={y} r="2.5" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
                ))}
              </svg>
            </div>

            {/* AI Director panel */}
            <div className="col-span-2 bg-white/4 border border-white/8 rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3 h-3 text-[#93C5FD]" />
                <p className="text-[7px] font-bold uppercase tracking-widest text-[#93C5FD]">Dyrektorzy AI</p>
              </div>
              <div className="space-y-1.5 flex-1">
                <AnimatePresence mode="wait">
                  {alerts.slice(tick % 4, (tick % 4) + 2).concat(alerts.slice(0, Math.max(0, 2 - (4 - tick % 4)))).slice(0,2).map((a, i) => (
                    <motion.div key={`${tick}-${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }} className="flex items-start gap-1.5 p-2 rounded-lg bg-white/4 border border-white/6">
                      <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: a.color }} />
                      <p className="text-[8px] text-white/60 leading-snug">{a.text}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom row: attendance + food cost */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/4 border border-white/8 rounded-xl p-3">
              <p className="text-[7px] font-semibold uppercase tracking-widest text-white/40 mb-2">Obecność dziś</p>
              <div className="flex gap-1">
                {Array.from({length:8}).map((_,i) => (
                  <div key={i} className={`flex-1 rounded-sm h-5 ${i < 5 ? 'bg-[#10B981]/70' : 'bg-white/10'}`} />
                ))}
              </div>
              <p className="text-[8px] text-white/40 mt-1">5 z 8 pracowników wbiło się dziś</p>
            </div>
            <div className="bg-white/4 border border-white/8 rounded-xl p-3">
              <p className="text-[7px] font-semibold uppercase tracking-widest text-white/40 mb-2">Food cost vs. cel</p>
              <div className="relative h-4 bg-white/8 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#10B981] to-[#06B6D4]" style={{ width: '89%' }} />
                <div className="absolute inset-y-0 rounded-full bg-white/20" style={{ left: '89%', width: '2px' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-[#10B981] font-bold">31,2% obecny</span>
                <span className="text-[8px] text-white/40">cel 35%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [activeDirector, setActiveDirector] = useState('cfo');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const faqItems = pl ? FAQ_ITEMS : FAQ_ITEMS_EN;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      <StickyCTA />

      {/* ── ANNOUNCEMENT BAR ── */}
      <div className="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white text-[12px] font-medium h-9 flex items-center justify-center gap-2 px-4">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>{pl ? 'Nowe: Dyrektor Sprzedaży AI już dostępny — ' : 'New: AI Sales Director now available — '}</span>
        <Link href="/ai/sales-director" className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity">{pl ? 'Zobacz funkcje →' : 'See features →'}</Link>
      </div>

      {/* ── NAV ── */}
      <nav className="fixed top-9 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E5E7EB]/70">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-10 h-14 flex items-center justify-between">
          <OneLinkLogo iconSize={28} textSize="text-[16px]" />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-[13px] text-[#6B7280]">
            <Link href="/demo" className="hover:text-[#111827] transition-colors">Demo</Link>
            <a href="#directors" className="hover:text-[#111827] transition-colors">{pl ? 'Dyrektorzy AI' : 'AI Directors'}</a>
            <Link href="/pricing" className="hover:text-[#111827] transition-colors">{pl ? 'Cennik' : 'Pricing'}</Link>
            <Link href="/opinie" className="hover:text-[#111827] transition-colors">{pl ? 'Opinie' : 'Reviews'}</Link>
            <Link href="/co-nowego" className="hover:text-[#111827] transition-colors">{pl ? 'Co nowego' : 'Changelog'}</Link>
            <Link href="/investors" className="hover:text-[#111827] transition-colors">{pl ? 'Inwestorzy' : 'Investors'}</Link>
          </div>

          {/* Desktop right buttons */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/login" className="h-9 px-4 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all flex items-center">{pl ? 'Zaloguj' : 'Log in'}</Link>
            <Link href="/contact" className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all">
              {pl ? 'Umów demo' : 'Book a demo'}
            </Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm shadow-blue-500/20 flex items-center whitespace-nowrap">
              {pl ? 'Zacznij za darmo' : 'Start free'}
            </Link>
          </div>

          {/* Mobile right: CTA + three-dots */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white flex items-center whitespace-nowrap">
              {pl ? 'Zacznij za darmo' : 'Start free'}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <circle cx="9" cy="3" r="1.5"/><circle cx="9" cy="9" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE DROPDOWN MENU ── */}
      {mobileMenuOpen && (
        <div className="fixed top-[92px] inset-x-0 z-30 md:hidden bg-white border-b border-[#E5E7EB] shadow-lg">
          <div className="px-5 py-4 space-y-1">
            {[
              { href: '/demo', label: 'Demo' },
              { href: '#directors', label: pl ? 'Dyrektorzy AI' : 'AI Directors' },
              { href: '/pricing', label: pl ? 'Cennik' : 'Pricing' },
              { href: '/opinie', label: pl ? 'Opinie' : 'Reviews' },
              { href: '/co-nowego', label: pl ? 'Co nowego' : 'Changelog' },
              { href: '/investors', label: pl ? 'Inwestorzy' : 'Investors' },
              { href: '/contact', label: pl ? 'Umów demo' : 'Book a demo' },
            ].map(({ href, label }) => (
              href.startsWith('#')
                ? <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 rounded-xl text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors">{label}</a>
                : <Link key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 rounded-xl text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors">{label}</Link>
            ))}
            <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 text-[14px] font-semibold text-[#374151]">{pl ? 'Zaloguj' : 'Log in'}</Link>
              <LanguageSwitcher variant="light" />
            </div>
          </div>
        </div>
      )}

      {/* ════ 1. HERO ════ */}
      <section className="relative pt-40 pb-20 px-5 overflow-hidden">
        {/* Background gradients + dot grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-3xl -translate-y-1/2" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-100/40 blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#1D4ED8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left */}
            <div>
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[11px] font-semibold text-blue-700 mb-6">
                <Sparkles className="w-3 h-3" />
                {pl ? 'System operacyjny dla Twojego biznesu' : 'The operating system for your business'}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                className="text-[44px] md:text-[58px] font-black leading-[1.07] tracking-tight mb-6"
              >
                {pl ? <>Twoja firma zarabia.<br /></> : <>Your business earns.<br /></>}
                <span className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] bg-clip-text text-transparent">
                  {pl ? <>Ale nie wiesz<br />dlaczego traci.</> : <>But you don't know<br />why it loses.</>}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
                className="text-[17px] text-[#6B7280] leading-relaxed mb-8 max-w-lg"
              >
                {pl
                  ? 'OneLink zbiera dane z każdego obszaru biznesu i uruchamia Dyrektorów AI — CFO, COO — którzy mówią Ci co jest nie tak, zanim stanie się stratą. Dla właścicieli od 1 lokalu wzwyż.'
                  : 'OneLink collects data from every area of your business and activates AI Directors — CFO, COO — who tell you what\'s wrong before it becomes a loss. For owners from 1 location up.'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                <Link href="/auth/sign-up"
                  className="inline-flex items-center justify-center gap-2 h-13 px-7 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[15px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/30">
                  {pl ? 'Zacznij za darmo — 7 dni' : 'Start for free — 7 days'} <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#directors"
                  className="inline-flex items-center justify-center gap-2 h-13 px-7 rounded-2xl bg-white border border-[#E5E7EB] text-[15px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all">
                  {pl ? 'Poznaj Dyrektorów AI' : 'Meet the AI Directors'}
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap items-center gap-4 text-[12px] text-[#9CA3AF] mb-6"
              >
                {(pl
                  ? ['Konfiguracja w 3 minuty', 'Dane w UE — RODO compliant', 'Anuluj kiedy chcesz']
                  : ['Setup in 3 minutes', 'EU data — GDPR compliant', 'Cancel any time']
                ).map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                    {t}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap gap-3"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 text-[12px] text-[#374151] font-medium leading-relaxed">
                  {pl
                    ? '30+ lokali aktywnie w systemie · 6 firm · −4,2 pp średnia redukcja food cost · 97 min zaoszczędzone dziennie / lokal'
                    : '30+ locations active · 6 companies · −4.2pp avg food cost reduction · 97 min saved daily / location'}
                </div>
              </motion.div>
            </div>

            {/* Right — dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, y: 10 }} animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
              className="hidden lg:block"
            >
              <ConsoleMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════ VIDEO SECTION ════ */}
      <VideoSection pl={pl} />

      {/* ════ TRUSTED BY ════ */}
      <section className="py-10 px-5 border-y border-[#F3F4F6] bg-white">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-7">Używają na co dzień — nie w prezentacji.</p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {[
              { src: '/logos/baked.jpg', alt: 'Baked' },
              { src: '/logos/olinek.jpg', alt: 'Olinek' },
              { src: '/logos/swojska-spizarnia.jpg', alt: 'Swojska Spiżarnia' },
              { src: '/logos/neuro.jpg', alt: 'Neuro' },
              { src: '/logos/akab-group.jpg', alt: 'AKAB Group' },
              { src: '/logos/feniks.jpg', alt: 'Feniks' },
            ].map(({ src, alt }) => (
              <img key={alt} src={src} alt={alt}
                className="h-12 md:h-14 object-contain opacity-90 hover:opacity-100 transition-all duration-300" />
            ))}
          </div>
          <p className="text-center text-[11px] text-[#9CA3AF] mt-6">Wszystkie firmy używają OneLink aktywnie. Żadnych płatnych rekomendacji.</p>
        </div>
      </section>

      {/* ════ 2. PROBLEM STORY ════ */}
      <section className="relative py-24 px-5 overflow-hidden">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Znasz to uczucie?</span>
            <h2 className="text-[38px] md:text-[52px] font-black leading-[1.1] tracking-tight">
              Twoja firma zarabia —<br />
              <span className="text-[#9CA3AF]">ale nie wiesz dlaczego traci.</span>
            </h2>
          </Reveal>

          <RevealList className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                color: '#F59E0B',
                bg: '#FEF3C7',
                problem: 'Zamknięcie dnia trwa godzinę',
                detail: 'Manager dzwoni, wysyła Excele, liczy w głowie. Ty dostajesz dane o 22:00 — albo nie dostajesz wcale.',
              },
              {
                icon: AlertTriangle,
                color: '#EF4444',
                bg: '#FEE2E2',
                problem: 'Problemy widzisz tydzień po fakcie',
                detail: 'Food cost urósł w poniedziałek. Dowiadujesz się w piątek. Do tego czasu straciłeś 3 500 zł.',
              },
              {
                icon: FileText,
                color: '#8B5CF6',
                bg: '#EDE9FE',
                problem: 'Dane rozproszone w 5 arkuszach',
                detail: 'Grafik w Excelu, faktury w mailach, obecność na papierze. Żaden widok nie daje pełnego obrazu.',
              },
            ].map(({ icon: Icon, color, bg, problem, detail }) => (
              <div key={problem} className="rounded-2xl bg-white border border-[#E5E7EB] p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-[15px] font-bold text-[#111827] mb-2">{problem}</p>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{detail}</p>
              </div>
            ))}
          </RevealList>

          <Reveal delay={0.2} className="mt-16 rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #1E3A8A 100%)' }}>
            <p className="text-[13px] font-bold uppercase tracking-widest text-blue-300 mb-3">Nowe podejście</p>
            <p className="text-[26px] md:text-[34px] font-black text-white leading-snug">
              Co jeśli Twoja firma<br />
              <span className="bg-gradient-to-r from-[#60A5FA] to-[#06B6D4] bg-clip-text text-transparent">
                mogłaby powiedzieć Ci, co jest nie tak —
              </span>
              <br />zanim stanie się stratą?
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════ 3. DATA FOUNDATION ════ */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Fundament danych</span>
            <h2 className="text-[36px] md:text-[46px] font-black tracking-tight mb-4">
              Wszystkie dane w jednym miejscu
            </h2>
            <p className="text-[16px] text-[#6B7280] max-w-xl mx-auto">
              OneLink zbiera sygnały z każdego obszaru Twojego biznesu — i zamienia je w wiedzę, którą rozumiesz.
            </p>
          </Reveal>

          <RevealList className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BarChart3, color: '#3B82F6', title: 'P&L na żywo', items: ['Sprzedaż netto i brutto', 'Food cost % per lokal', 'EBIT i marża dzień po dniu'] },
              { icon: Clock, color: '#F59E0B', title: 'Czas pracy i kiosk', items: ['Rejestracja PIN lub QR z foto', 'Koszty pracy per zmiana', 'Ewidencja godzin i nadgodzin'] },
              { icon: Users, color: '#EC4899', title: 'HR i pracownicy', items: ['Grafiki i zamiany zmian', 'Urlopy i absencje', 'Dokumenty i certyfikaty'] },
              { icon: Package, color: '#8B5CF6', title: 'Magazyn', items: ['Stany i dostawy', 'Zużycie teoretyczne vs. rzeczywiste', 'Transfery między lokalami'] },
              { icon: Receipt, color: '#10B981', title: 'Faktury i zatwierdzenia', items: ['Faktury COS i SEMIS', 'Workflow zatwierdzeń', 'Eksport do księgowości'] },
              { icon: Brain, color: '#06B6D4', title: 'AI Directors', items: ['Analiza anomalii 24/7', 'Powiadomienia proaktywne', 'Briefingi i raporty na żądanie'] },
            ].map(({ icon: Icon, color, title, items }) => (
              <div key={title} className="rounded-2xl border border-[#E5E7EB] p-5 hover:shadow-md hover:border-[#D1D5DB] transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <p className="text-[14px] font-bold text-[#111827] mb-3">{title}</p>
                <div className="space-y-1.5">
                  {items.map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[12px] text-[#6B7280]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </RevealList>
        </div>
      </section>

      {/* ════ 4. MEET THE DIRECTORS ════ */}
      <section id="directors" className="py-24 px-5" style={{ background: 'linear-gradient(180deg, #F7F8FA 0%, #EFF6FF 100%)' }}>
        <div className="max-w-[1400px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3 h-3" /> Early Access
            </span>
            <h2 className="text-[36px] md:text-[46px] font-black tracking-tight mb-4 mt-3">
              Dyrektorzy AI
            </h2>
            <p className="text-[16px] text-[#6B7280] max-w-2xl mx-auto">
              Nasze modele są karmione rzeczywistymi danymi z polskich biznesów — nie syntetycznymi zbiorami.
              Im więcej lokali w systemie, tym lepsze decyzje podejmują. Dołącz teraz i kształtuj produkt razem z nami.
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Cards */}
            <div className="space-y-3">
              {DIRECTORS.map(d => (
                <DirectorCard key={d.id} d={d} active={activeDirector === d.id} onClick={() => setActiveDirector(d.id)} />
              ))}
            </div>

            {/* Visual */}
            <Reveal delay={0.1} className="lg:sticky lg:top-24">
              <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] bg-white shadow-lg p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black text-white" style={{ background: DIRECTORS.find(d=>d.id===activeDirector)?.color }}>
                    {DIRECTORS.find(d=>d.id===activeDirector)?.initial}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      {DIRECTORS.find(d=>d.id===activeDirector)?.title}
                    </p>
                    <p className="text-[14px] font-bold text-[#111827]">Centrum dowodzenia</p>
                  </div>
                  <div className="ml-auto">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="text-[10px] font-bold text-[#10B981]">Aktywny</span>
                    </div>
                  </div>
                </div>

                {/* Simulated chat */}
                <AnimatePresence mode="wait">
                  <motion.div key={activeDirector} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }} className="space-y-3">
                    {/* AI message */}
                    <div className="rounded-xl p-4 text-[13px] leading-relaxed text-[#374151]" style={{ background: `${DIRECTORS.find(d=>d.id===activeDirector)?.color}0D` }}>
                      <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" style={{ color: DIRECTORS.find(d=>d.id===activeDirector)?.color }} />
                      {DIRECTORS.find(d=>d.id===activeDirector)?.insight}
                    </div>

                    {/* Quick actions */}
                    <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Szybkie pytania</p>
                    {activeDirector === 'cfo' && [
                      'Który lokal ma najwyższy food cost?',
                      'Porównaj marzec z lutym',
                      'Kiedy muszę zaalarmować dostawcę?',
                    ].map(q => (
                      <button key={q} className="w-full text-left text-[12px] px-3 py-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F3F4F6] transition-all">
                        {q}
                      </button>
                    ))}
                    {activeDirector === 'coo' && [
                      'Kto jest dziś na zmianie?',
                      'Gdzie mam lukę w grafiku?',
                      'Pokaż koszt pracy vs. sprzedaż',
                    ].map(q => (
                      <button key={q} className="w-full text-left text-[12px] px-3 py-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F3F4F6] transition-all">
                        {q}
                      </button>
                    ))}
                    {activeDirector === 'inv' && [
                      'Wygeneruj raport dla banku',
                      'Jaki jest mój break-even?',
                      'Pokaż prognozy na Q3',
                    ].map(q => (
                      <button key={q} className="w-full text-left text-[12px] px-3 py-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F3F4F6] transition-all">
                        {q}
                      </button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Reveal>
          </div>

          {/* AI Directors how it works + trust badges */}
          <Reveal className="mt-16">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-6 text-center">Jak działają Dyrektorzy AI</p>
              <div className="grid sm:grid-cols-4 gap-6 mb-10">
                {[
                  { step: '1', title: 'Zbierają dane', desc: 'Automatycznie pobierają sprzedaż, koszty, grafiki i stany magazynowe z Twojego systemu.' },
                  { step: '2', title: 'Analizują 24/7', desc: 'Porównują z targetami, historią i benchmarkiem branży — bez przerwy, bez urlopu.' },
                  { step: '3', title: 'Alarmują gdy trzeba', desc: 'Wysyłają powiadomienie tylko gdy coś wymaga Twojej reakcji. Bez szumu informacyjnego.' },
                  { step: '4', title: 'Odpowiadają na pytania', desc: 'Możesz zapytać o dowolny wskaźnik w języku naturalnym — dostaniesz odpowiedź w sekundach.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="text-center">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] text-white text-[13px] font-black flex items-center justify-center mx-auto mb-3">{step}</div>
                    <h4 className="text-[13px] font-bold text-[#111827] mb-1">{title}</h4>
                    <p className="text-[12px] text-[#9CA3AF] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F3F4F6] pt-6 flex flex-wrap justify-center gap-6">
                {[
                  { icon: ShieldCheck, label: 'Dane tylko Twoje — nigdy nie trafiają do trenowania modeli AI' },
                  { icon: Zap, label: 'Odpowiedź w mniej niż 3 sekundy' },
                  { icon: Brain, label: 'Dostępne dla właściciela i każdego managera z dostępem' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Icon className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════ 5. HOW IT WORKS ════ */}
      <section id="how" className="py-24 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Jak to działa</span>
            <h2 className="text-[36px] md:text-[46px] font-black tracking-tight">Od rejestracji do pierwszego briefingu</h2>
          </Reveal>

          <div className="relative">
            <div className="absolute left-[22px] top-8 bottom-8 w-px bg-gradient-to-b from-[#3B82F6] via-[#06B6D4] to-[#10B981] opacity-30 hidden md:block" />
            <RevealList className="space-y-8">
              {[
                { n: '01', color: '#3B82F6', icon: Zap, title: 'Załóż konto — 3 minuty', desc: 'Rejestrujesz się, dodajesz lokalizację, zapraszasz managera. Kiosk PIN gotowy do użycia w tym samym panelu. Zero IT.' },
                { n: '02', color: '#06B6D4', icon: Clock, title: 'Pracownicy rejestrują czas przez kiosk', desc: 'Na firmowym telefonie wpisują PIN lub skanują QR. System robi zdjęcie automatycznie. Ewidencja bez arkuszy.' },
                { n: '03', color: '#8B5CF6', icon: FileText, title: 'Managerowie wpisują dane z telefonu', desc: 'Sprzedaż, faktury, stany magazynu, grafik — prosty formularz na telefonie. Żadnych Exceli wysyłanych e-mailem.' },
                { n: '04', color: '#10B981', icon: Brain, title: 'Dyrektorzy AI analizują — Ty tylko reagujesz', desc: 'Marże, anomalie, wygasające dokumenty, luki w grafiku — Dyrektorzy AI monitorują 24/7 i alarmują tylko gdy trzeba.' },
              ].map(({ n, color, icon: Icon, title, desc }) => (
                <div key={n} className="flex items-start gap-6">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px] shadow-md" style={{ background: color }}>
                    {n}
                  </div>
                  <div className="pt-1.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <p className="text-[16px] font-bold text-[#111827]">{title}</p>
                    </div>
                    <p className="text-[14px] text-[#6B7280] leading-relaxed max-w-lg">{desc}</p>
                  </div>
                </div>
              ))}
            </RevealList>
          </div>
        </div>
      </section>

      {/* ════ 6. RESULTS / ROI ════ */}
      <section id="results" className="py-24 px-5" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #0F2856 100%)' }}>
        <div className="max-w-[1400px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-4">Wyniki</span>
            <h2 className="text-[36px] md:text-[46px] font-black tracking-tight text-white mb-3">
              Co zmienia się w ciągu 90 dni
            </h2>
            <p className="text-[16px] text-white/50 max-w-lg mx-auto">Rzeczywiste wyniki właścicieli gastronomii, którzy przeszli z Excela na OneLink.</p>
          </Reveal>

          {/* Stats — AKAB Group real data */}
          <RevealList className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { display: '2h → 18 min', label: 'czas zamknięcia dnia (AKAB Group)', color: '#3B82F6' },
              { display: '−4,2 pp', label: 'redukcja food cost w 3 mies.', color: '#10B981' },
              { display: '504 000 zł', label: 'miesięczny przychód pod kontrolą', color: '#8B5CF6' },
              { display: '97 min', label: 'zaoszczędzone dziennie / lokal', color: '#F59E0B' },
            ].map(({ display, label, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-[32px] font-black leading-none mb-1" style={{ color }}>{display}</p>
                <p className="text-[12px] text-white/50 leading-snug">{label}</p>
              </div>
            ))}
          </RevealList>

          {/* Testimonials */}
          <RevealList className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Ewelina K.', role: 'CEO — AKAB Group', text: 'Pierwszy raz w życiu wiem co się dzieje w moich lokalach bez dzwonienia do managerów. Koszt surowca spadł o 4 punkty procentowe w trzy miesiące.' },
              { name: 'Krzysztof K.', role: 'właściciel — Piekarnia Matusik (sieć 4 punktów)', text: 'Zamknięcie dnia zajmuje teraz 10 minut zamiast godziny. Managerowie wpisują dane przez telefon, ja rano widzę pełny raport. Nie wiem jak funkcjonowałem bez tego.' },
              { name: 'Estera N.', role: 'właścicielka — Baked', text: 'Wykryłam że jeden składnik regularnie znikał ze stanu. Bez OneLink nigdy bym tego nie zauważyła. Odbiłam 1 800 zł miesięcznie tylko na tym.' },
            ].map(({ name, role, text }) => (
              <div key={name} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex mb-3">
                  {Array(5).fill(0).map((_,i) => <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />)}
                </div>
                <p className="text-[14px] text-white/75 leading-relaxed mb-4 italic">"{text}"</p>
                <div>
                  <p className="text-[13px] font-semibold text-white">{name}</p>
                  <p className="text-[11px] text-white/40">{role}</p>
                </div>
              </div>
            ))}
          </RevealList>
        </div>
      </section>

      {/* ════ 7. INTEGRATIONS ════ */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto text-center">
          <Reveal>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Ekosystem</span>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight mb-4">Działa z narzędziami, które już znasz</h2>
            <p className="text-[15px] text-[#6B7280] max-w-lg mx-auto mb-12">
              OneLink nie zastępuje Twojej księgowości ani POS-a. Uzupełnia je — zbierając dane, których im brakuje.
            </p>
          </Reveal>

          <RevealList className="flex flex-wrap justify-center gap-4">
            {[
              { name: 'Stripe', desc: 'Płatności', color: '#6772e5' },
              { name: 'Supabase', desc: 'Dane w UE', color: '#3ECF8E' },
              { name: 'Excel / CSV', desc: 'Import danych', color: '#217346' },
              { name: 'Modele LLM', desc: 'AI Directors', color: '#10a37f' },
              { name: 'Resend', desc: 'Powiadomienia e-mail', color: '#000' },
              { name: 'QR / PIN Kiosk', desc: 'Rejestracja czasu', color: '#3B82F6' },
            ].map(({ name, desc, color }) => (
              <div key={name} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:shadow-sm hover:border-[#D1D5DB] transition-all">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-[#111827]">{name}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{desc}</p>
                </div>
              </div>
            ))}
          </RevealList>
        </div>
      </section>

      {/* ════ 8. COMPARISON TABLE ════ */}
      <section className="py-20 px-5 bg-[#F7F8FA]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Porównanie</span>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight mb-4">Dlaczego nie Excel ani sam POS?</h2>
            <p className="text-[15px] text-[#6B7280] max-w-xl mx-auto">
              Każde narzędzie rozwiązuje fragment. OneLink łączy wszystko w jedno.
            </p>
          </Reveal>

          <Reveal>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left px-6 py-4 text-[#9CA3AF] font-semibold w-[38%]">Funkcja</th>
                    <th className="px-4 py-4 text-center text-[#9CA3AF] font-semibold">Excel / Arkusze</th>
                    <th className="px-4 py-4 text-center text-[#9CA3AF] font-semibold">System POS</th>
                    <th className="px-4 py-4 text-center font-bold text-[#1D4ED8] bg-blue-50/60">OneLink</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['P&L w czasie rzeczywistym', false, false, true],
                    ['Ewidencja czasu pracy + kiosk', false, false, true],
                    ['Food cost per danie / kategoria', false, 'częściowo', true],
                    ['AI analizuje dane za Ciebie', false, false, true],
                    ['Grafik pracowniczy + wnioski', false, false, true],
                    ['Faktury i OPEX w jednym miejscu', false, false, true],
                    ['Wiele lokalizacji — jeden widok', false, false, true],
                    ['Działa na telefonie', false, 'częściowo', true],
                  ].map(([feature, excel, pos, onelink], i) => (
                    <tr key={i} className={`border-b border-[#F3F4F6] last:border-0 ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}>
                      <td className="px-6 py-3.5 font-medium text-[#374151]">{feature as string}</td>
                      <td className="px-4 py-3.5 text-center">
                        {excel === false ? <span className="text-[#D1D5DB] text-[18px]">✕</span> : <span className="text-[11px] text-[#9CA3AF] font-medium">{excel as string}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {pos === false ? <span className="text-[#D1D5DB] text-[18px]">✕</span> : pos === true ? <span className="text-[#10B981] text-[16px]">✓</span> : <span className="text-[11px] text-[#F59E0B] font-medium">{pos as string}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center bg-blue-50/40">
                        {onelink === true ? <span className="text-[#10B981] font-bold text-[16px]">✓</span> : <span className="text-[11px] text-[#9CA3AF]">{onelink as string}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {[
                ['P&L w czasie rzeczywistym', false, false, true],
                ['Ewidencja czasu pracy + kiosk', false, false, true],
                ['Food cost per danie / kategoria', false, 'częściowo', true],
                ['AI analizuje dane za Ciebie', false, false, true],
                ['Grafik pracowniczy + wnioski', false, false, true],
                ['Faktury i OPEX w jednym miejscu', false, false, true],
                ['Wiele lokalizacji — jeden widok', false, false, true],
                ['Działa na telefonie', false, 'częściowo', true],
              ].map(([feature, excel, pos, onelink], i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#F3F4F6]">
                    <p className="text-[13px] font-semibold text-[#111827]">{feature as string}</p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-[#F3F4F6]">
                    {[
                      { label: 'Excel', val: excel },
                      { label: 'POS', val: pos },
                      { label: 'OneLink', val: onelink, highlight: true },
                    ].map(({ label, val, highlight }) => (
                      <div key={label} className={`flex flex-col items-center py-3 gap-1 ${highlight ? 'bg-blue-50/50' : ''}`}>
                        <span className={`text-[10px] font-semibold ${highlight ? 'text-[#1D4ED8]' : 'text-[#9CA3AF]'}`}>{label}</span>
                        {val === false
                          ? <span className="text-[#D1D5DB] text-[16px]">✕</span>
                          : val === true
                            ? <span className={`text-[16px] font-bold ${highlight ? 'text-[#1D4ED8]' : 'text-[#10B981]'}`}>✓</span>
                            : <span className="text-[10px] text-[#F59E0B] font-semibold text-center px-1">{val as string}</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════ 9. CLOSING CTA ════ */}
      <section className="py-28 px-5 bg-[#F7F8FA]">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="rounded-3xl p-12 shadow-2xl" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #1E3A8A 60%, #0E4275 100%)' }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-blue-300 mb-4">Czas zacząć</p>
              <h2 className="text-[34px] md:text-[44px] font-black text-white leading-tight mb-4">
                Twój wirtualny zarząd<br />jest gotowy do pracy.
              </h2>
              <p className="text-[15px] text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
                Dołącz do właścicieli, którzy przestali zgadywać i zaczęli zarządzać danymi.
                Pierwsze 7 dni gratis — bez ryzyka.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/auth/sign-up"
                  className="inline-flex items-center gap-2 h-14 px-9 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-[16px] font-bold text-white hover:opacity-90 transition-all shadow-2xl shadow-blue-500/40">
                  Zacznij za darmo — 7 dni <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/contact"
                  className="inline-flex items-center gap-2 h-14 px-9 rounded-2xl border border-white/20 text-[16px] font-semibold text-white hover:bg-white/10 transition-all">
                  Umów demo
                </Link>
              </div>
              <p className="text-[12px] text-white/35 mt-4">Anuluj kiedy chcesz.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════ SOCIAL PROOF STRIP ════ */}
      <section className="py-5 px-5 border-y border-[#E5E7EB] bg-white/70">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Właściciele gastronomii, którzy nam zaufali</p>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
            {['Fabryka Pączków', 'Piekarnia Matusik', 'Swojska Spiżarnia', 'Kawiarnia Centrum', 'Bistro Rynek'].map(name => (
              <span key={name} className="text-[12px] font-semibold text-[#9CA3AF] hover:text-[#6B7280] transition-colors">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ════ LEAD CAPTURE ════ */}
      <section className="py-4 px-5">
        <div className="max-w-2xl mx-auto">
          <Reveal><LeadCapture /></Reveal>
        </div>
      </section>

      {/* ════ FAQ ════ */}
      <section id="faq" className="py-24 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-[36px] md:text-[46px] font-black tracking-tight mb-4">Często zadawane pytania</h2>
            <p className="text-[16px] text-[#6B7280]">Wszystko co chcesz wiedzieć przed startem trialu</p>
          </Reveal>
          <div className="space-y-2">
            {faqItems.map((item, i) => (
              <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${faqOpen === i ? 'border-[#D1D5DB] bg-white shadow-sm' : 'border-[#E5E7EB] bg-white hover:shadow-sm'}`}>
                <button className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}>
                  <span className="text-[15px] font-semibold text-[#111827] leading-snug">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-[#6B7280] transition-transform duration-200 ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: faqOpen === i ? '400px' : '0px' }}>
                  <p className="px-6 pb-5 text-[14px] text-[#6B7280] leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ INDUSTRIES ════ */}
      <section className="py-16 px-5 bg-[#F9FAFB]">
        <div className="max-w-[1200px] mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Nie tylko gastronomia</p>
            <h2 className="text-[28px] font-black text-[#111827]">OneLink działa w każdej branży</h2>
            <p className="text-[14px] text-[#6B7280] mt-2">Zarządzaj personelem, kosztami i P&L — niezależnie od sektora.</p>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: pl ? 'Restauracje' : 'Restaurants', href: '/dla-restauracji', emoji: '🍽️' },
              { label: pl ? 'Siłownie i fitness' : 'Gyms & fitness', href: '/dla-silowni', emoji: '🏋️' },
              { label: pl ? 'Sklepy detaliczne' : 'Retail stores', href: '/dla-sklepow', emoji: '🛒' },
              { label: pl ? 'Hotele' : 'Hotels', href: '/dla-hoteli', emoji: '🏨' },
              { label: pl ? 'Salony beauty' : 'Beauty salons', href: '/dla-salonow-beauty', emoji: '💅' },
              { label: pl ? 'Apteki' : 'Pharmacies', href: '/dla-aptek', emoji: '💊' },
              { label: pl ? 'Warsztaty' : 'Workshops', href: '/dla-warsztatow', emoji: '🔧' },
              { label: pl ? 'Stacje paliw' : 'Fuel stations', href: '/dla-stacji-benzynowych', emoji: '⛽' },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm transition-all group">
                <span className="text-[20px]">{item.emoji}</span>
                <span className="text-[13px] font-semibold text-[#374151] group-hover:text-[#111827] transition-colors">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-[#E5E7EB] bg-white pt-14 pb-8 px-5">
        <div className="max-w-[1400px] mx-auto">
          {/* Top: logo + columns */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <OneLinkLogo iconSize={28} textSize="text-[16px]" />
              <p className="text-[13px] text-[#9CA3AF] mt-3 max-w-xs leading-relaxed">
                System operacyjny dla właścicieli gastronomii. P&amp;L, kadry, magazyn i Dyrektorzy AI w jednym panelu.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <a href="mailto:kontakt@onelink.pl"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#111827] transition-colors">
                  <MailCheck className="w-3.5 h-3.5" /> kontakt@onelink.pl
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#111827] mb-4">Produkt</p>
              <ul className="space-y-2.5 text-[13px] text-[#6B7280]">
                <li><a href="#directors" className="hover:text-[#111827] transition-colors">Dyrektorzy AI</a></li>
                <li><a href="#how" className="hover:text-[#111827] transition-colors">Jak to działa</a></li>
                <li><Link href="/pricing" className="hover:text-[#111827] transition-colors">Cennik</Link></li>
                <li><a href="#faq" className="hover:text-[#111827] transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#111827] mb-4">Firma</p>
              <ul className="space-y-2.5 text-[13px] text-[#6B7280]">
                <li><Link href="/about" className="hover:text-[#111827] transition-colors">O nas</Link></li>
                <li><Link href="/case-study/akab-group" className="hover:text-[#111827] transition-colors">Case study</Link></li>
                <li><Link href="/contact" className="hover:text-[#111827] transition-colors">Kontakt</Link></li>
                <li><Link href="/auth/sign-up" className="hover:text-[#111827] transition-colors">Zacznij za darmo</Link></li>
                <li><Link href="/auth/login" className="hover:text-[#111827] transition-colors">Logowanie</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#111827] mb-4">Prawne</p>
              <ul className="space-y-2.5 text-[13px] text-[#6B7280]">
                <li><Link href="/terms" className="hover:text-[#111827] transition-colors">Regulamin</Link></li>
                <li><Link href="/privacy" className="hover:text-[#111827] transition-colors">Polityka prywatności</Link></li>
                <li><Link href="/security" className="hover:text-[#111827] transition-colors">Bezpieczeństwo</Link></li>
                <li><Link href="/status" className="hover:text-[#111827] transition-colors flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />Status systemu</Link></li>
              </ul>
            </div>

            {/* Industries */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#111827] mb-4">Branże</p>
              <ul className="space-y-2.5 text-[13px] text-[#6B7280]">
                <li><Link href="/dla-restauracji" className="hover:text-[#111827] transition-colors">{pl ? 'Restauracje' : 'Restaurants'}</Link></li>
                <li><Link href="/dla-silowni" className="hover:text-[#111827] transition-colors">{pl ? 'Siłownie' : 'Gyms'}</Link></li>
                <li><Link href="/dla-sklepow" className="hover:text-[#111827] transition-colors">{pl ? 'Sklepy' : 'Stores'}</Link></li>
                <li><Link href="/dla-hoteli" className="hover:text-[#111827] transition-colors">{pl ? 'Hotele' : 'Hotels'}</Link></li>
                <li><Link href="/dla-salonow-beauty" className="hover:text-[#111827] transition-colors">{pl ? 'Salony beauty' : 'Beauty salons'}</Link></li>
                <li><Link href="/dla-aptek" className="hover:text-[#111827] transition-colors">{pl ? 'Apteki' : 'Pharmacies'}</Link></li>
                <li><Link href="/dla-warsztatow" className="hover:text-[#111827] transition-colors">{pl ? 'Warsztaty' : 'Workshops'}</Link></li>
                <li><Link href="/dla-stacji-benzynowych" className="hover:text-[#111827] transition-colors">{pl ? 'Stacje paliw' : 'Fuel stations'}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#F3F4F6] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[#D1D5DB]">© {new Date().getFullYear()} OneLink. Wszelkie prawa zastrzeżone.</p>
            <div className="flex items-center gap-4 text-[11px] text-[#D1D5DB]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Dane szyfrowane
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Serwery w UE
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" /> RODO compliant
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
