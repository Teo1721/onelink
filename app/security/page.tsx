"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  ShieldCheck, Lock, Server, Eye, RefreshCw, CheckCircle,
  Zap, Globe, Key, Database, ArrowRight, AlertTriangle, Clock,
} from "lucide-react";

/* ─── helpers ─── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Security pillars ─── */
const PILLARS = [
  {
    icon: Lock,
    gradient: "from-[#1D4ED8] to-[#06B6D4]",
    title: "Szyfrowanie end-to-end",
    desc: "Wszystkie dane przesyłane między Twoją przeglądarką a naszymi serwerami są chronione przez TLS 1.3. Dane w bazie szyfrowane w stanie spoczynku algorytmem AES-256.",
    badge: "TLS 1.3 · AES-256",
  },
  {
    icon: Server,
    gradient: "from-[#2563EB] to-[#0EA5E9]",
    title: "Infrastruktura w Unii Europejskiej",
    desc: "Wszystkie dane aplikacji przechowywane są na serwerach Supabase zlokalizowanych w UE. Pełna zgodność z RODO i wymogami lokalizacji danych — bez wyjątków.",
    badge: "Supabase · Frankfurt (EU)",
  },
  {
    icon: Eye,
    gradient: "from-[#7C3AED] to-[#6366F1]",
    title: "Izolacja i kontrola dostępu",
    desc: "Row Level Security (RLS) na poziomie bazy danych zapewnia, że każda firma widzi wyłącznie swoje dane. Role i uprawnienia dla managerów i pracowników są ściśle odizolowane.",
    badge: "RLS · RBAC",
  },
  {
    icon: RefreshCw,
    gradient: "from-[#059669] to-[#0891B2]",
    title: "Automatyczne kopie zapasowe",
    desc: "Codzienne automatyczne backupy bazy danych. Po anulowaniu konta dane przechowywane przez 30 dni, a następnie trwale i nieodwracalnie usuwane z wszystkich systemów.",
    badge: "Backup 24h · Retencja 30 dni",
  },
  {
    icon: Key,
    gradient: "from-[#D97706] to-[#EA580C]",
    title: "Bezpieczne uwierzytelnianie",
    desc: "Hasła przechowywane wyłącznie jako hash bcrypt — nigdy w postaci jawnej. Sesje zarządzane przez Supabase Auth z automatycznym wygasaniem i odświeżaniem tokenów.",
    badge: "bcrypt · JWT",
  },
  {
    icon: Database,
    gradient: "from-[#BE185D] to-[#9333EA]",
    title: "Monitoring i alerty bezpieczeństwa",
    desc: "Ciągłe monitorowanie aktywności kont i logów dostępu. Podejrzane działania (wielokrotne nieudane logowania, anomalie) generują alerty i mogą blokować dostęp automatycznie.",
    badge: "24/7 monitoring",
  },
];

/* ─── Security practices ─── */
const PRACTICES = [
  "Żaden pracownik OneLink nie ma dostępu do Twoich danych biznesowych bez Twojej zgody",
  "Dane operacyjne (P&L, faktury, grafiki) widoczne wyłącznie dla Twojego konta i zaproszonych managerów",
  "Płatności tokenizowane przez Stripe — nie przechowujemy numerów kart ani CVV na naszych serwerach",
  "Aktualizacje bezpieczeństwa wdrażane regularnie z minimalnym czasem przestoju",
  "Testy bezpieczeństwa i przegląd kodu przed każdym dużym wdrożeniem",
  "Polityka haseł: minimalna długość, wymóg złożoności i bezpieczne resetowanie",
  "Wszystkie dane osobowe i operacyjne przechowywane wyłącznie w granicach UE (EOG)",
  "Zgodność z RODO — pełne prawa do dostępu, sprostowania, usunięcia i przeniesienia danych",
];

/* ─── Compliance badges ─── */
const COMPLIANCE = [
  { label: "RODO / GDPR", sublabel: "UE 2016/679", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  { label: "PCI DSS L1", sublabel: "via Stripe", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD" },
  { label: "TLS 1.3", sublabel: "Szyfrowanie", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  { label: "AES-256", sublabel: "Dane w spoczynku", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { label: "SOC 2", sublabel: "via Supabase", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  { label: "Dane w UE", sublabel: "Frankfurt", color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
];

export default function SecurityPage() {
  return (
    <div className="bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" dark={false} /></Link>
          <div className="hidden md:flex items-center gap-5 text-[13px] text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">Strona główna</Link>
            <Link href="/pricing" className="hover:text-[#111827] transition-colors">Cennik</Link>
            <Link href="/terms" className="hover:text-[#111827] transition-colors">Regulamin</Link>
            <Link href="/privacy" className="hover:text-[#111827] transition-colors">Prywatność</Link>
            <Link href="/security" className="font-semibold text-[#111827]">Bezpieczeństwo</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="h-9 px-4 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all flex items-center">Zaloguj</Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5">
              Zacznij za darmo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #0C4A6E 100%)" }}>
        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, #1D4ED8 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-[1100px] mx-auto px-6 py-24 text-center">
          {/* Shield icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative inline-flex mb-8"
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-3xl blur-xl opacity-50 bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4]" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-[-8px] rounded-[28px] border-2 border-[#1D4ED8]/30 animate-ping" style={{ animationDuration: "2s" }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold text-white/80 mb-5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Bezpieczeństwo danych — OneLink
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="text-[42px] md:text-[60px] font-black tracking-tight leading-[1.07] text-white mb-5"
          >
            Twoje dane biznesowe<br />
            <span className="bg-gradient-to-r from-[#60A5FA] to-[#06B6D4] bg-clip-text text-transparent">
              są bezpieczne.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-[16px] text-white/60 max-w-xl mx-auto leading-relaxed mb-10"
          >
            Powierzasz nam dane swojego biznesu — P&L, koszty, faktury, dane pracowników.
            Traktujemy to jako priorytet. Oto jak chronimy każdy bajt.
          </motion.p>

          {/* Compliance badges */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {COMPLIANCE.map(({ label, sublabel }) => (
              <div key={label} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/8 border border-white/15 backdrop-blur-sm">
                <CheckCircle className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-white leading-none">{label}</p>
                  <p className="text-[9px] text-white/50 leading-none mt-0.5">{sublabel}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECURITY PILLARS ── */}
      <section className="py-24 px-6">
        <div className="max-w-[1400px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Filary bezpieczeństwa</span>
            <h2 className="text-[32px] md:text-[42px] font-black tracking-tight mb-4 text-[#111827]">
              Sześć warstw ochrony Twoich danych
            </h2>
            <p className="text-[15px] text-[#6B7280] max-w-lg mx-auto">
              Bezpieczeństwo wbudowane na każdym poziomie infrastruktury — nie dodane na końcu.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm h-full flex flex-col"
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${pillar.gradient} shadow-md`}>
                    <pillar.icon className="w-5.5 h-5.5 text-white" />
                  </div>

                  {/* Badge */}
                  <div className="mb-3">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[10px] font-bold text-[#6B7280] tracking-wide">
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-bold text-[#111827] mb-2 leading-snug">{pillar.title}</h3>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed flex-1">{pillar.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STRIPE PAYMENTS ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-md">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-[18px] font-black text-[#111827]">Płatności — Stripe PCI DSS Level 1</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-bold text-purple-700">CERTYFIKAT PCI DSS L1</span>
                  </div>
                  <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">
                    Wszystkie płatności obsługuje <strong className="text-[#111827]">Stripe</strong> — jeden z najbardziej zaufanych procesorów płatności na świecie, certyfikowany na najwyższym poziomie bezpieczeństwa kart PCI DSS Level 1.{" "}
                    <strong className="text-[#111827]">Nie przechowujemy numerów kart, CVV ani żadnych pełnych danych płatniczych</strong> na naszych serwerach. Dane kart są tokenizowane i zarządzane wyłącznie przez Stripe.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {["Tokenizacja kart", "3D Secure", "Fraud detection", "Bezpieczny checkout"].map(tag => (
                      <div key={tag} className="flex items-center gap-1.5 text-[12px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GDPR ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)" }}>
                <Globe className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="text-[14px] font-bold text-white">Zgodność z RODO (UE 2016/679)</h3>
                <span className="ml-auto px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white/70">AKTYWNA</span>
              </div>
              <div className="p-6 bg-white">
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "Dane przetwarzane wyłącznie na podstawie umowy i uzasadnionego interesu administratora (art. 6 RODO)",
                    "Dane nie są przekazywane poza Europejski Obszar Gospodarczy",
                    "Prawo dostępu — otrzymasz swoje dane na żądanie w ciągu 30 dni",
                    "Prawo do usunięcia — Twoje dane znikają trwale po 30 dniach od anulowania",
                    "Prawo do przenoszenia — eksport danych w ustrukturyzowanym formacie",
                    "Kontakt w sprawach RODO: kontakt@onelink.pl — odpowiedź do 30 dni",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#4B5563] leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SECURITY PRACTICES ── */}
      <section className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Nasze praktyki</span>
            <h2 className="text-[28px] md:text-[36px] font-black tracking-tight mb-3 text-[#111827]">
              Co robimy każdego dnia, żeby chronić Twoje dane
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              {PRACTICES.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 px-6 py-4 ${i !== PRACTICES.length - 1 ? "border-b border-[#F3F4F6]" : ""} ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} hover:bg-blue-50/30 transition-colors`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1D4ED8]/10 to-[#06B6D4]/10 border border-[#1D4ED8]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  </div>
                  <p className="text-[13px] text-[#374151] leading-relaxed pt-0.5">{item}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── INCIDENT RESPONSE ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#111827] mb-2">Odpowiedź na incydenty bezpieczeństwa</h3>
                  <p className="text-[13px] text-[#4B5563] leading-relaxed mb-4">
                    W przypadku wykrycia naruszenia bezpieczeństwa danych, powiadomimy Cię w ciągu{" "}
                    <strong className="text-[#111827]">72 godzin</strong> — zgodnie z wymogami RODO (art. 33). Incydenty
                    zgłaszamy również do właściwego organu nadzorczego (PUODO). Polityka zerowej tolerancji na naruszenia.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { icon: Clock, text: "Powiadomienie w 72h" },
                      { icon: Zap, text: "Natychmiastowe działania" },
                      { icon: Globe, text: "Zgłoszenie do PUODO" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg">
                        <Icon className="w-3.5 h-3.5" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CONTACT CTA ── */}
      <section className="py-20 px-6 bg-[#F7F8FA]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="rounded-3xl p-10 text-center shadow-2xl" style={{ background: "linear-gradient(135deg, #0D1628 0%, #1E3A8A 60%, #0E4275 100%)" }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/40">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-[28px] md:text-[36px] font-black text-white mb-3">
                Masz pytania dotyczące bezpieczeństwa?
              </h2>
              <p className="text-[14px] text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
                Chętnie wyjaśnimy szczegóły naszej architektury bezpieczeństwa, procesu certyfikacji lub odpowiemy na pytania techniczne.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="mailto:kontakt@onelink.pl?subject=Bezpieczeństwo danych OneLink"
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/40"
                >
                  Napisz do nas <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-xl border border-white/20 bg-white/10 text-[14px] font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-all backdrop-blur-sm"
                >
                  Polityka Prywatności
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-5 mt-8">
                {["Dane w UE — RODO compliant", "Szyfrowanie TLS 1.3", "PCI DSS Level 1 via Stripe"].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <CheckCircle className="w-3 h-3 text-[#10B981]" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/"><OneLinkLogo iconSize={22} textSize="text-[13px]" dark={false} /></Link>
            <span className="text-[12px] text-[#D1D5DB]">|</span>
            <p className="text-[12px] text-[#9CA3AF]">© 2026 InnowacyjneAI sp. z o.o.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/privacy" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Polityka Prywatności</Link>
            <Link href="/terms" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Regulamin</Link>
            <Link href="/security" className="text-[12px] text-[#6B7280] font-medium transition-colors">Bezpieczeństwo</Link>
            <a href="mailto:kontakt@onelink.pl" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Kontakt</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
