"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { OneLinkLogo } from "@/components/onelink-logo";
import { ChevronRight, ArrowRight, FileText, Shield } from "lucide-react";

/* ─── Section data ─── */
const SECTIONS = [
  { id: "s1",  label: "1. Usługodawca" },
  { id: "s2",  label: "2. Opis usługi" },
  { id: "s3",  label: "3. Rejestracja i konto" },
  { id: "s4",  label: "4. Okres próbny" },
  { id: "s5",  label: "5. Subskrypcja i płatności" },
  { id: "s6",  label: "6. Obowiązki użytkownika" },
  { id: "s7",  label: "7. Dostępność usługi" },
  { id: "s8",  label: "8. Dane po anulowaniu" },
  { id: "s9",  label: "9. Odpowiedzialność" },
  { id: "s10", label: "10. Prawo właściwe" },
  { id: "s11", label: "11. Zmiany regulaminu" },
  { id: "s12", label: "12. Kontakt" },
];

/* ─── TOC component ─── */
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

export default function TermsPage() {
  const [active, setActive] = useState("s1");

  /* Intersection observer to track active section */
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
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" dark={false} /></Link>
          <div className="hidden md:flex items-center gap-5 text-[13px] text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">Strona główna</Link>
            <Link href="/pricing" className="hover:text-[#111827] transition-colors">Cennik</Link>
            <Link href="/terms" className="font-semibold text-[#111827]">Regulamin</Link>
            <Link href="/privacy" className="hover:text-[#111827] transition-colors">Prywatność</Link>
            <Link href="/security" className="hover:text-[#111827] transition-colors">Bezpieczeństwo</Link>
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
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[11px] font-semibold text-blue-700 mb-5">
              <FileText className="w-3 h-3" />
              Dokument prawny
            </div>
            <h1 className="text-[38px] md:text-[48px] font-black tracking-tight leading-[1.1] mb-4 text-[#111827]">
              Regulamin usługi
            </h1>
            <p className="text-[15px] text-[#6B7280] leading-relaxed max-w-xl">
              Zasady korzystania z OneLink — subskrypcja, prawa, obowiązki i ochrona Twojego konta.
            </p>
            <div className="flex flex-wrap gap-4 mt-5 text-[12px] text-[#9CA3AF]">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#10B981]" /> Data wejścia w życie: marzec 2026</span>
              <span>12 sekcji</span>
              <span>Prawo polskie i RODO</span>
            </div>
          </motion.div>
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
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-[12px] font-semibold text-[#111827] mb-1">Masz pytania?</p>
              <p className="text-[11px] text-[#6B7280] mb-3 leading-relaxed">Napisz do nas — odpowiemy w ciągu 24h.</p>
              <a href="mailto:kontakt@onelink.pl" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] transition-colors">
                kontakt@onelink.pl <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0">
            <div className="space-y-0">

              <Section id="s1" title="1. Usługodawca">
                <p>
                  Usługę OneLink świadczy <Strong>InnowacyjneAI sp. z o.o.</Strong> z siedzibą w Polsce.
                  Kontakt z usługodawcą możliwy jest pod adresem e-mail:{" "}
                  <Email>kontakt@onelink.pl</Email>.
                </p>
              </Section>

              <Section id="s2" title="2. Opis usługi">
                <p>
                  <Strong>OneLink</Strong> to system zarządzania małym biznesem w modelu SaaS (Software as a Service),
                  umożliwiający właścicielom restauracji, piekarni, cukierni i innych lokali gastronomicznych zarządzanie
                  finansami, magazynem, fakturami i raportami P&amp;L w czasie rzeczywistym. Usługa dostępna jest przez
                  przeglądarkę internetową na urządzeniach stacjonarnych i mobilnych.
                </p>
              </Section>

              <Section id="s3" title="3. Rejestracja i konto">
                <p className="mb-4">
                  Korzystanie z OneLink wymaga założenia konta. Podczas rejestracji wymagane jest podanie adresu
                  e-mail, nazwy firmy oraz danych karty płatniczej. Rejestrując się, użytkownik oświadcza, że:
                </p>
                <BulletList items={[
                  "podane dane są prawdziwe i aktualne,",
                  "ma ukończone 18 lat i pełną zdolność do czynności prawnych,",
                  "akceptuje niniejszy Regulamin oraz Politykę Prywatności.",
                ]} />
              </Section>

              <Section id="s4" title="4. Okres próbny">
                <p>
                  Każde nowe konto objęte jest <Strong>7-dniowym okresem próbnym (trial)</Strong>.
                  W tym czasie usługa dostępna jest w pełnym zakresie wybranego planu. Podanie danych karty
                  płatniczej jest wymagane przy rejestracji, jednak <Strong>żadna opłata nie zostanie pobrana
                  w trakcie okresu próbnego</Strong>. Użytkownik może anulować subskrypcję w dowolnym momencie
                  przed upływem 7 dni — bez żadnych kosztów.
                </p>
              </Section>

              <Section id="s5" title="5. Subskrypcja i płatności">
                <p className="mb-4">
                  Po zakończeniu okresu próbnego usługa przechodzi automatycznie na wybrany plan subskrypcyjny:
                </p>
                <BulletList items={[
                  "Subskrypcja rozliczana jest miesięcznie z góry i odnawia się automatycznie.",
                  "Płatności obsługiwane są wyłącznie przez Stripe — bezpiecznego operatora płatności certyfikowanego PCI DSS.",
                  "Użytkownik może anulować subskrypcję w dowolnym momencie z poziomu panelu konta. Anulowanie wejdzie w życie z końcem bieżącego okresu rozliczeniowego.",
                  "InnowacyjneAI sp. z o.o. zastrzega sobie prawo do zmiany cennika z 30-dniowym wyprzedzeniem.",
                  "Faktury VAT wystawiane są automatycznie i dostępne w panelu konta.",
                ]} />
              </Section>

              <Section id="s6" title="6. Obowiązki użytkownika">
                <p className="mb-4">Korzystając z usługi OneLink, użytkownik zobowiązuje się do:</p>
                <BulletList items={[
                  "Podawania prawdziwych i aktualnych danych w formularzu rejestracyjnym oraz podczas korzystania z usługi.",
                  "Zachowania poufności danych dostępowych do konta (login, hasło) i nieudostępniania ich osobom trzecim bez wyraźnej zgody.",
                  "Korzystania z usługi wyłącznie w celach zgodnych z prawem i niniejszym Regulaminem.",
                  "Niezwłocznego poinformowania InnowacyjneAI o nieautoryzowanym dostępie do konta.",
                  "Niepodejmowania działań mogących zakłócić działanie usługi lub infrastruktury serwera.",
                ]} />
              </Section>

              <Section id="s7" title="7. Dostępność usługi">
                <p>
                  Dokładamy wszelkich starań, aby OneLink był dostępny przez <Strong>99% czasu</Strong> w skali miesiąca.
                  Planowane przerwy techniczne będą komunikowane z wyprzedzeniem. InnowacyjneAI nie ponosi
                  odpowiedzialności za przerwy spowodowane czynnikami niezależnymi od firmy (awarie sieci,
                  siła wyższa, przerwy u dostawców infrastruktury).
                </p>
              </Section>

              <Section id="s8" title="8. Dane po anulowaniu konta">
                <p>
                  Po anulowaniu subskrypcji konto pozostaje aktywne do końca opłaconego okresu rozliczeniowego.
                  Po jego upływie dane są przechowywane przez <Strong>30 dni</Strong> — w tym czasie możliwe jest
                  przywrócenie konta lub pobranie danych. Po 30 dniach wszystkie dane użytkownika są
                  <Strong> trwale i nieodwracalnie usuwane</Strong> z naszych serwerów.
                </p>
              </Section>

              <Section id="s9" title="9. Odpowiedzialność">
                <p>
                  OneLink dostarcza narzędzia do zarządzania i raportowania. InnowacyjneAI sp. z o.o. nie ponosi
                  odpowiedzialności za decyzje biznesowe podejmowane na podstawie danych wprowadzonych przez
                  użytkownika ani za ewentualne straty wynikające z błędnie wprowadzonych danych. Całkowita
                  odpowiedzialność InnowacyjneAI ograniczona jest do kwoty opłat uiszczonych przez użytkownika
                  w ciągu ostatnich 3 miesięcy.
                </p>
              </Section>

              <Section id="s10" title="10. Prawo właściwe">
                <p>
                  Niniejszy Regulamin podlega <Strong>prawu polskiemu</Strong>. Wszelkie spory wynikające
                  z korzystania z usługi będą rozstrzygane przez właściwy sąd polski. Konsumenci mają
                  prawo do korzystania z pozasądowych metod rozstrzygania sporów zgodnie z obowiązującymi
                  przepisami prawa polskiego i unijnego.
                </p>
              </Section>

              <Section id="s11" title="11. Zmiany regulaminu">
                <p>
                  InnowacyjneAI zastrzega sobie prawo do zmiany niniejszego Regulaminu. O istotnych zmianach
                  poinformujemy Cię z <Strong>co najmniej 14-dniowym wyprzedzeniem</Strong> drogą e-mailową.
                  Kontynuowanie korzystania z usługi po wejściu zmian w życie oznacza ich akceptację.
                </p>
              </Section>

              <Section id="s12" title="12. Kontakt" last>
                <p>
                  W razie pytań dotyczących niniejszego Regulaminu skontaktuj się z nami:{" "}
                  <Email>kontakt@onelink.pl</Email>
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <a href="mailto:kontakt@onelink.pl" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm shadow-blue-500/20">
                    Napisz do nas <ArrowRight className="w-4 h-4" />
                  </a>
                  <Link href="/privacy" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all">
                    Polityka Prywatności
                  </Link>
                </div>
              </Section>

            </div>
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
