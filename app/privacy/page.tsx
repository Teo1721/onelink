"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { OneLinkLogo } from "@/components/onelink-logo";
import { ChevronRight, ArrowRight, Lock, Shield, Eye, Database, Globe, CheckCircle } from "lucide-react";

/* ─── Section data ─── */
const SECTIONS = [
  { id: "s1",  label: "1. Administrator danych" },
  { id: "s2",  label: "2. Jakie dane zbieramy" },
  { id: "s3",  label: "3. Cel przetwarzania" },
  { id: "s4",  label: "4. Przechowywanie danych" },
  { id: "s5",  label: "5. Okres przechowywania" },
  { id: "s6",  label: "6. Twoje prawa (RODO)" },
  { id: "s7",  label: "7. Pliki cookies" },
  { id: "s8",  label: "8. Zgodność z RODO" },
  { id: "s9",  label: "9. Podstawy prawne" },
  { id: "s10", label: "10. Przekazywanie danych" },
  { id: "s11", label: "11. Bezpieczeństwo" },
  { id: "s12", label: "12. Kontakt" },
];

/* ─── GDPR rights ─── */
const GDPR_RIGHTS = [
  {
    icon: Eye,
    title: "Prawo dostępu",
    desc: "Możesz w każdej chwili zażądać informacji o tym, jakie dane na Twój temat przetwarzamy oraz otrzymać ich kopię.",
    color: "#3B82F6",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: CheckCircle,
    title: "Prawo do sprostowania",
    desc: "Możesz poprawić nieprawidłowe lub niekompletne dane osobowe przechowywane przez OneLink.",
    color: "#10B981",
    bg: "bg-green-50",
    border: "border-green-100",
  },
  {
    icon: Shield,
    title: "Prawo do usunięcia",
    desc: "Możesz zażądać usunięcia swoich danych — tzw. \"prawo do bycia zapomnianym\" (art. 17 RODO).",
    color: "#EF4444",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  {
    icon: Database,
    title: "Prawo do przenoszenia",
    desc: "Możesz otrzymać swoje dane w ustrukturyzowanym, powszechnie używanym formacie do transferu.",
    color: "#8B5CF6",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
  {
    icon: Lock,
    title: "Prawo do sprzeciwu",
    desc: "Możesz sprzeciwić się przetwarzaniu danych w określonych celach, w tym do celów marketingowych.",
    color: "#F59E0B",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    icon: Globe,
    title: "Prawo do ograniczenia",
    desc: "Możesz żądać ograniczenia przetwarzania Twoich danych, gdy kwestionujesz ich prawidłowość.",
    color: "#06B6D4",
    bg: "bg-cyan-50",
    border: "border-cyan-100",
  },
];

/* ─── TOC ─── */
function TableOfContents({ active }: { active: string }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav className="space-y-0.5">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all ${
            active === s.id
              ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-[#1D4ED8] font-semibold border border-blue-100"
              : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
          }`}
        >
          <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${active === s.id ? "text-[#1D4ED8]" : "text-[#D1D5DB]"}`} />
          <span className="leading-snug">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function PrivacyPage() {
  const [active, setActive] = useState("s1");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div className="bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" dark={false} /></Link>
          <div className="hidden md:flex items-center gap-5 text-[13px] text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">Strona główna</Link>
            <Link href="/pricing" className="hover:text-[#111827] transition-colors">Cennik</Link>
            <Link href="/terms" className="hover:text-[#111827] transition-colors">Regulamin</Link>
            <Link href="/privacy" className="font-semibold text-[#111827]">Prywatność</Link>
            <Link href="/security" className="hover:text-[#111827] transition-colors">Bezpieczeństwo</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden md:block text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors">Zaloguj</Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5">
              Zacznij za darmo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[11px] font-semibold text-blue-700 mb-5">
              <Shield className="w-3 h-3" />
              RODO · Ochrona danych osobowych
            </div>
            <h1 className="text-[38px] md:text-[48px] font-black tracking-tight leading-[1.1] mb-4 text-[#111827]">
              Polityka Prywatności
            </h1>
            <p className="text-[15px] text-[#6B7280] leading-relaxed max-w-xl">
              Twoje dane są bezpieczne. Opisujemy dokładnie, jakie informacje zbieramy, jak je przetwarzamy i jakie przysługują Ci prawa.
            </p>
            <div className="flex flex-wrap gap-4 mt-5 text-[12px] text-[#9CA3AF]">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#10B981]" /> Ostatnia aktualizacja: marzec 2026</span>
              <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#3B82F6]" /> Dane przechowywane w UE</span>
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#8B5CF6]" /> Zgodność z RODO (UE 2016/679)</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── GDPR RIGHTS HIGHLIGHT ── */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-5">Twoje prawa RODO w skrócie</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {GDPR_RIGHTS.map(({ icon: Icon, title, color, bg, border }) => (
              <div key={title} className={`rounded-xl border ${border} ${bg} p-3 text-center`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${color}20` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-[11px] font-semibold text-[#111827] leading-snug">{title}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[#6B7280] mt-4">
            Aby skorzystać z któregokolwiek prawa, wyślij e-mail na{" "}
            <a href="mailto:kontakt@onelink.pl" className="text-[#1D4ED8] hover:underline font-medium">kontakt@onelink.pl</a>{" "}
            — odpowiemy w ciągu 30 dni.
          </p>
        </div>
      </div>

      {/* ── CONTENT + SIDEBAR ── */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="flex gap-10 items-start">

          {/* Sidebar TOC — desktop only */}
          <aside className="hidden lg:block w-[220px] shrink-0 sticky top-24">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] px-3 mb-3">Spis treści</p>
              <TableOfContents active={active} />
            </div>
            <div className="mt-4 bg-gradient-to-br from-green-50 to-cyan-50 border border-green-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <p className="text-[12px] font-semibold text-[#111827]">Dane chronione</p>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">Serwery w UE, szyfrowanie TLS 1.3 i AES-256, izolacja na poziomie bazy danych.</p>
              <Link href="/security" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981] hover:text-[#059669] transition-colors mt-2">
                Strona Bezpieczeństwa <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 space-y-0">

            <Section id="s1" title="1. Administrator danych">
              <p>
                Administratorem Twoich danych osobowych jest <Strong>InnowacyjneAI sp. z o.o.</Strong>,
                świadcząca usługę OneLink. W sprawach dotyczących danych osobowych możesz skontaktować się z nami pod adresem:{" "}
                <Email>kontakt@onelink.pl</Email>.
              </p>
            </Section>

            <Section id="s2" title="2. Jakie dane zbieramy">
              <p className="mb-4">W ramach świadczenia usługi OneLink przetwarzamy następujące dane:</p>
              <div className="space-y-3">
                {[
                  { label: "Adres e-mail", desc: "Niezbędny do założenia konta i komunikacji z Tobą.", color: "#3B82F6" },
                  { label: "Nazwa firmy", desc: "Wykorzystywana do personalizacji konta i fakturowania.", color: "#10B981" },
                  { label: "Dane płatnicze", desc: "Obsługiwane wyłącznie przez Stripe. Nie przechowujemy numerów kart ani pełnych danych płatniczych na naszych serwerach. Stripe przetwarza płatności zgodnie z PCI DSS.", color: "#F59E0B" },
                  { label: "Dane operacyjne", desc: "Dane wprowadzane przez Ciebie lub Twoich pracowników w aplikacji (sprzedaż, faktury, stany magazynowe), niezbędne do świadczenia usługi.", color: "#8B5CF6" },
                ].map(({ label, desc, color }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: color }} />
                    <div>
                      <span className="text-[13px] font-semibold text-[#111827]">{label}</span>
                      <span className="text-[13px] text-[#4B5563]"> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="s3" title="3. Cel przetwarzania danych">
              <p className="mb-4">Twoje dane przetwarzamy w następujących celach:</p>
              <BulletList items={[
                "Świadczenie usługi OneLink oraz umożliwienie logowania i korzystania z aplikacji.",
                "Wystawianie faktur i obsługa płatności za pośrednictwem Stripe.",
                "Komunikacja z Tobą — odpowiadanie na pytania, wysyłanie powiadomień dotyczących konta i aktualizacji usługi.",
                "Zapewnienie bezpieczeństwa konta i wykrywanie nadużyć.",
              ]} />
            </Section>

            <Section id="s4" title="4. Przechowywanie danych">
              <p className="mb-4">Twoje dane są przechowywane na bezpiecznych serwerach:</p>
              <div className="space-y-3">
                <InfoCard
                  title="Supabase — dane aplikacji"
                  desc="Dane aplikacji przechowywane są na serwerach w Unii Europejskiej, co zapewnia zgodność z wymogami RODO. Baza danych szyfrowana w stanie spoczynku (AES-256)."
                  color="#3ECF8E"
                />
                <InfoCard
                  title="Stripe — dane płatnicze"
                  desc="Dane płatnicze przetwarzane i przechowywane przez Stripe zgodnie z normą PCI DSS Level 1. Nie mamy dostępu do pełnych numerów kart."
                  color="#6772e5"
                  link={{ text: "stripe.com/privacy", href: "https://stripe.com/privacy" }}
                />
              </div>
            </Section>

            <Section id="s5" title="5. Okres przechowywania danych">
              <p>
                Twoje dane przechowujemy przez czas trwania subskrypcji. Po anulowaniu konta dane są
                przechowywane przez <Strong>30 dni</Strong>, w ciągu których możesz przywrócić konto lub
                pobrać swoje dane. Po upływie tego okresu wszystkie dane są <Strong>trwale i nieodwracalnie usuwane</Strong>{" "}
                z naszych serwerów — bez możliwości odtworzenia.
              </p>
            </Section>

            <Section id="s6" title="6. Twoje prawa (RODO)">
              <p className="mb-5">
                Zgodnie z Rozporządzeniem o Ochronie Danych Osobowych (RODO) przysługują Ci następujące prawa:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                {GDPR_RIGHTS.map(({ icon: Icon, title, desc, color, bg, border }) => (
                  <div key={title} className={`rounded-xl border ${border} ${bg} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <p className="text-[13px] font-semibold text-[#111827]">{title}</p>
                    </div>
                    <p className="text-[12px] text-[#4B5563] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <p className="text-[13px] text-[#374151] leading-relaxed">
                  Aby skorzystać z powyższych praw, skontaktuj się z nami:{" "}
                  <Email>kontakt@onelink.pl</Email>.{" "}
                  Odpowiemy w ciągu <Strong>30 dni</Strong> od otrzymania żądania.
                </p>
              </div>
            </Section>

            <Section id="s7" title="7. Pliki cookies">
              <p>
                Używamy wyłącznie <Strong>niezbędnych plików cookies</Strong> służących do uwierzytelniania użytkownika
                i utrzymania sesji w aplikacji. Nie używamy cookies analitycznych, reklamowych ani cookies stron trzecich
                (z wyjątkiem Stripe, które może ustawiać własne cookies w celu przetwarzania płatności).
                Korzystając z OneLink, wyrażasz zgodę na używanie tych niezbędnych plików cookies.
              </p>
            </Section>

            <Section id="s8" title="8. Zgodność z RODO">
              <p className="mb-4">
                InnowacyjneAI sp. z o.o. przetwarza dane osobowe zgodnie z Rozporządzeniem Parlamentu Europejskiego
                i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO).
              </p>
              <BulletList items={[
                "Dane przetwarzane wyłącznie na podstawie umowy i uzasadnionego interesu administratora.",
                "Dane nie są przekazywane poza Europejski Obszar Gospodarczy.",
                "Stosujemy zasadę minimalizacji danych — zbieramy tylko to, co niezbędne.",
                "Każdy pracownik mający dostęp do danych jest zobowiązany do zachowania poufności.",
              ]} />
            </Section>

            <Section id="s9" title="9. Podstawy prawne przetwarzania">
              <p className="mb-4">Przetwarzamy Twoje dane osobowe na następujących podstawach prawnych:</p>
              <div className="space-y-3">
                <InfoCard
                  title="Wykonanie umowy (art. 6 ust. 1 lit. b RODO)"
                  desc="Przetwarzanie jest niezbędne do realizacji usługi OneLink na podstawie zawartej umowy (Regulaminu usługi)."
                  color="#3B82F6"
                />
                <InfoCard
                  title="Uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO)"
                  desc="Zapewnienie bezpieczeństwa usługi, wykrywanie nadużyć i ochrona przed oszustwami."
                  color="#8B5CF6"
                />
                <InfoCard
                  title="Obowiązek prawny (art. 6 ust. 1 lit. c RODO)"
                  desc="Wystawianie faktur VAT i prowadzenie dokumentacji księgowej wymaganej przepisami prawa."
                  color="#10B981"
                />
              </div>
            </Section>

            <Section id="s10" title="10. Przekazywanie danych">
              <p className="mb-4">
                Twoje dane mogą być przekazywane następującym podmiotom trzecim, wyłącznie w zakresie niezbędnym do świadczenia usługi:
              </p>
              <BulletList items={[
                "Stripe Inc. — obsługa płatności (certyfikowany PCI DSS Level 1).",
                "Supabase Inc. — infrastruktura bazy danych, serwery w UE.",
                "OpenAI (dla funkcji Dyrektorów AI) — przetwarzanie zapytań, bez przechowywania danych biznesowych.",
                "Resend — dostarczanie e-maili transakcyjnych i powiadomień.",
              ]} />
              <p className="mt-4 text-[13px] text-[#4B5563] leading-relaxed">
                Wszystkie podmioty przetwarzające działają na podstawie umów powierzenia przetwarzania danych.{" "}
                <Strong>Dane nie są przekazywane poza EOG.</Strong>
              </p>
            </Section>

            <Section id="s11" title="11. Bezpieczeństwo danych">
              <p className="mb-4">
                Stosujemy techniczne i organizacyjne środki bezpieczeństwa, aby chronić Twoje dane:
              </p>
              <BulletList items={[
                "Szyfrowanie transmisji danych TLS 1.3 (HTTPS).",
                "Szyfrowanie danych w spoczynku AES-256.",
                "Izolacja danych na poziomie bazy danych — Row Level Security (RLS).",
                "Kontrola dostępu oparta na rolach — każdy pracownik widzi tylko swoje dane.",
                "Automatyczne kopie zapasowe bazy danych — codziennie.",
                "Monitorowanie bezpieczeństwa i alertowanie o podejrzanych działaniach.",
              ]} />
              <div className="mt-4">
                <Link href="/security" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] transition-colors">
                  Pełna strona bezpieczeństwa <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Section>

            <Section id="s12" title="12. Kontakt" last>
              <p className="mb-4">
                W razie pytań dotyczących niniejszej Polityki Prywatności lub przetwarzania Twoich danych
                osobowych, skontaktuj się z nami:{" "}
                <Email>kontakt@onelink.pl</Email>
              </p>
              <p className="mb-6 text-[13px] text-[#4B5563]">
                Jeśli uważasz, że Twoje prawa w zakresie ochrony danych zostały naruszone, masz prawo złożyć
                skargę do <Strong>Prezesa Urzędu Ochrony Danych Osobowych (PUODO)</Strong> — organu nadzorczego
                w Polsce.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="mailto:kontakt@onelink.pl" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm shadow-blue-500/20">
                  Napisz do nas <ArrowRight className="w-4 h-4" />
                </a>
                <Link href="/terms" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all">
                  Regulamin usługi
                </Link>
              </div>
            </Section>

          </article>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/"><OneLinkLogo iconSize={22} textSize="text-[13px]" dark={false} /></Link>
            <span className="text-[12px] text-[#D1D5DB]">|</span>
            <p className="text-[12px] text-[#9CA3AF]">© 2026 InnowacyjneAI sp. z o.o.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/privacy" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Polityka Prywatności</Link>
            <Link href="/terms" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Regulamin</Link>
            <Link href="/security" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Bezpieczeństwo</Link>
            <a href="mailto:kontakt@onelink.pl" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Kontakt</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Shared sub-components ─── */

function Section({ id, title, children, last = false }: {
  id: string; title: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={`py-8 ${!last ? "border-b border-[#F3F4F6]" : ""}`}
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-[19px] font-black text-[#111827] mb-4 pb-3 border-b border-[#F3F4F6] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center text-[9px] font-black text-white shrink-0">
            {title.split(".")[0]}
          </span>
          {title.replace(/^\d+\.\s/, "")}
        </h2>
        <div className="text-[14px] text-[#4B5563] leading-[1.8]">{children}</div>
      </div>
    </motion.section>
  );
}

function InfoCard({ title, desc, color, link }: {
  title: string;
  desc: string;
  color: string;
  link?: { text: string; href: string };
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
      <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: color }} />
      <div>
        <p className="text-[13px] font-semibold text-[#111827] mb-1">{title}</p>
        <p className="text-[13px] text-[#4B5563] leading-relaxed">{desc}</p>
        {link && (
          <a href={link.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1D4ED8] hover:underline mt-1">
            {link.text} <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-[#111827]">{children}</strong>;
}

function Email({ children }: { children: React.ReactNode }) {
  return (
    <a href={`mailto:${children}`} className="text-[#1D4ED8] hover:text-[#1E40AF] font-medium underline underline-offset-2 transition-colors">
      {children}
    </a>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#1D4ED8]/10 to-[#06B6D4]/10 border border-[#1D4ED8]/20 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4]" />
          </div>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}
