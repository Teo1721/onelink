"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowRight, TrendingUp, Users, BarChart3, Zap } from "lucide-react";

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

export default function InvestorsPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';

  const [formData, setFormData] = useState({ name: '', company: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to API route or email service
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F3F4F6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link href="/auth/login" className="h-9 px-4 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:shadow-sm transition-all flex items-center">
              {pl ? 'Zaloguj' : 'Log in'}
            </Link>
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all flex items-center">
              {pl ? 'Zacznij za darmo' : 'Start for free'}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — text only, no CTA */}
      <section className="py-24 px-5 bg-gradient-to-b from-[#F0F4FF] to-white">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#1D4ED8] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-6">
              {pl ? 'Informacje dla inwestorów' : 'Investor Information'}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[44px] md:text-[60px] font-black text-[#111827] leading-[1.05] tracking-tight mb-6">
              {pl ? (
                <>Budujemy system operacyjny<br />dla polskiego MŚP.</>
              ) : (
                <>We're building the operating system<br />for Polish SMBs.</>
              )}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-[18px] text-[#6B7280] leading-relaxed max-w-2xl mx-auto">
              {pl
                ? 'OneLink to nie kolejne narzędzie SaaS. To warstwa danych między właścicielem a jego biznesem — zbieramy sygnały, które nigdzie indziej nie istnieją, i zamieniamy je w decyzje.'
                : 'OneLink is not another SaaS tool. It\'s the data layer between an owner and their business — we collect signals that exist nowhere else and turn them into decisions.'}
            </p>
          </Reveal>
        </div>
      </section>

      {/* MARKET */}
      <section className="py-20 px-5 bg-white border-y border-[#F3F4F6]">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">
              {pl ? 'Rynek' : 'Market'}
            </span>
            <h2 className="text-[34px] md:text-[44px] font-black text-[#111827] tracking-tight">
              {pl ? 'Ogromny rynek. Zerowa digitalizacja.' : 'Massive market. Zero digitisation.'}
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                value: '~101 000',
                label: pl ? 'punktów gastronomicznych i handlowych w Polsce' : 'food & retail points in Poland',
                color: '#3B82F6',
              },
              {
                icon: BarChart3,
                value: '85,2 mld zł',
                label: pl ? 'roczne przychody sektora gastronomicznego' : 'annual revenue in the food service sector',
                color: '#10B981',
              },
              {
                icon: Zap,
                value: '<5%',
                label: pl ? 'penetracja narzędzi klasy ERP/BI w MŚP poniżej 10 lokali' : 'ERP/BI tool penetration in SMBs with <10 locations',
                color: '#F59E0B',
              },
              {
                icon: TrendingUp,
                value: '2025–2027',
                label: pl ? 'okno pełnej digitalizacji sektora — przed wejściem globalnych graczy' : 'full-sector digitisation window — before global players arrive',
                color: '#8B5CF6',
              },
            ].map(({ icon: Icon, value, label, color }) => (
              <Reveal key={value} className="rounded-2xl border border-[#E5E7EB] p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="text-[28px] font-black text-[#111827] mb-2">{value}</div>
                <div className="text-[12px] text-[#6B7280] leading-relaxed">{label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT IN 60 SECONDS */}
      <section className="py-20 px-5">
        <div className="max-w-[900px] mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">
              {pl ? 'Produkt w 60 sekund' : 'Product in 60 seconds'}
            </span>
            <h2 className="text-[34px] md:text-[44px] font-black text-[#111827] tracking-tight">
              {pl ? 'Co robi OneLink?' : 'What does OneLink do?'}
            </h2>
          </Reveal>
          <div className="space-y-6 text-[16px] text-[#374151] leading-relaxed">
            <Reveal>
              <p>
                {pl
                  ? 'OneLink to system operacyjny dla właściciela małego biznesu. Zastępuje rozproszony zestaw Exceli, SMSów i telefonów do managera jednym panelem, w którym właściciel widzi P&L każdego lokalu w czasie rzeczywistym — sprzedaż, food cost, koszty pracy, stany magazynowe, faktury i grafiki. Wszystko w jednym miejscu, aktualizowane codziennie przez managerów przez prosty formularz na telefonie.'
                  : 'OneLink is the operating system for small business owners. It replaces a scattered set of spreadsheets, texts and calls to managers with one dashboard where the owner sees real-time P&L for every location — sales, food cost, labour costs, stock levels, invoices and schedules. Everything in one place, updated daily by managers through a simple mobile form.'}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                {pl
                  ? 'Na tej warstwie danych działają Dyrektorzy AI — autonomiczne agenty, które monitorują anomalie 24/7 i proaktywnie informują właściciela: kiedy food cost rośnie, kiedy brakuje ludzi w peaku, kiedy wygasają certyfikaty pracowników. Właściciel dostaje alert — nie raport do analizowania.'
                  : 'On top of this data layer run the AI Directors — autonomous agents that monitor anomalies 24/7 and proactively inform the owner: when food cost rises, when staffing is thin during peak hours, when employee certifications are expiring. The owner gets an alert — not a report to analyse.'}
              </p>
            </Reveal>
          </div>

          {/* Quote */}
          <Reveal delay={0.2} className="mt-10">
            <blockquote className="rounded-2xl border-l-4 border-[#1D4ED8] bg-blue-50 px-7 py-6">
              <p className="text-[15px] italic text-[#374151] leading-relaxed mb-3">
                {pl
                  ? '"Wcześniej konsolidacja P&L 4 kawiarni zajmowała mi cały piątek. Teraz mam raport gotowy rano w 30 sekund. OneLink zwrócił się w ciągu pierwszego miesiąca."'
                  : '"Before, consolidating P&L across 4 cafés took me all Friday. Now I have the report ready in 30 seconds in the morning. OneLink paid for itself in the first month."'}
              </p>
              <footer className="text-[12px] font-bold text-[#1D4ED8]">Ewelina K. — CFO, AKAB Group</footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* COMPETITIVE ADVANTAGE */}
      <section className="py-20 px-5 bg-[#F7F8FA]">
        <div className="max-w-[1000px] mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">
              {pl ? 'Przewaga' : 'Advantage'}
            </span>
            <h2 className="text-[34px] md:text-[44px] font-black text-[#111827] tracking-tight">
              {pl ? 'Dlaczego OneLink wygrywa.' : 'Why OneLink wins.'}
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                n: '01',
                color: '#3B82F6',
                title: pl ? 'Problem zbyt duży na Excela, zbyt mały na SAP' : 'Too big for Excel, too small for SAP',
                desc: pl
                  ? 'Właściciel 3 restauracji nie może sobie pozwolić na wdrożenie ERP za 200 000 zł. Excel przestał wystarczać przy pierwszym dodatkowym lokalu. OneLink trafia dokładnie w tę lukę — od 49,99 zł/mies.'
                  : 'The owner of 3 restaurants can\'t afford a €50k ERP implementation. Excel stopped being enough at the first additional location. OneLink hits exactly that gap — from 49.99 PLN/month.',
              },
              {
                n: '02',
                color: '#10B981',
                title: pl ? 'Efekt sieciowy danych' : 'Data network effect',
                desc: pl
                  ? 'Każdy nowy lokal w systemie zasila nasze modele danymi o food cost, rotacji, sezonowości i benchmarkach branżowych. Im więcej biznesów korzysta z OneLink, tym trafniejsze stają się alerty i rekomendacje Dyrektorów AI — bariera nie do skopiowania.'
                  : 'Every new location in the system feeds our models with food cost, turnover, seasonality and industry benchmark data. The more businesses use OneLink, the more accurate the AI Director alerts and recommendations become — a moat that can\'t be copied.',
              },
              {
                n: '03',
                color: '#F59E0B',
                title: pl ? 'Beachhead: gastronomia → cały MŚP' : 'Beachhead: food service → all SMBs',
                desc: pl
                  ? 'Restauracje i piekarnie to najtrudniejszy możliwy klient — wiele zmiennych, wysokie tempo, cienkie marże. System, który działa dla nich, działa dla każdego innego MŚP. Już teraz obsługujemy siłownie, salony, apteki i warsztaty na tej samej platformie.'
                  : 'Restaurants and bakeries are the hardest possible customer — many variables, high pace, thin margins. A system that works for them works for any other SMB. We already serve gyms, salons, pharmacies and workshops on the same platform.',
              },
              {
                n: '04',
                color: '#8B5CF6',
                title: pl ? 'Zbudowany przez właścicieli MŚP' : 'Built by SMB owners',
                desc: pl
                  ? 'Założyciele mają bezpośrednie doświadczenie operacyjne w branży. Pierwsze wdrożenia powstały wewnętrznie — w realnych lokalizacjach, z realnymi managerami. Żadna agencja, żaden hackathon — iteracje na żywym produkcie.'
                  : 'The founders have direct operational experience in the industry. The first deployments were built internally — in real locations, with real managers. No agency, no hackathon — iterations on a live product.',
              },
            ].map(({ n, color, title, desc }) => (
              <Reveal key={n} className="rounded-2xl bg-white border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-black shrink-0" style={{ background: color }}>
                    {n}
                  </div>
                  <p className="text-[15px] font-bold text-[#111827]">{title}</p>
                </div>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRACTION */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">
              {pl ? 'Trakcja' : 'Traction'}
            </span>
            <h2 className="text-[34px] md:text-[44px] font-black text-[#111827] tracking-tight">
              {pl ? 'Liczby mówią same za siebie.' : 'The numbers speak for themselves.'}
            </h2>
          </Reveal>
          <div className="space-y-5 text-[16px] text-[#374151] leading-relaxed">
            <Reveal>
              <p>
                {pl
                  ? 'OneLink działa aktywnie w ponad 30 lokalizacjach należących do 6 firm — od piekarni przez siłownie po sieci kawiarni. Klienci raportują średnio −4,2 pp redukcji food cost w ciągu 90 dni od wdrożenia i 97 minut zaoszczędzonych dziennie per lokal na operacjach administracyjnych.'
                  : 'OneLink is actively running in over 30 locations across 6 companies — from bakeries and gyms to café chains. Clients report an average −4.2pp food cost reduction within 90 days of deployment and 97 minutes saved daily per location on admin operations.'}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                {pl
                  ? 'Rozwijamy się organicznie — bez budżetu marketingowego. Cały growth to rekomendacje i direct outreach do sieci branżowych. Retention po 90 dniach wynosi powyżej 90%. Płacimy za siebie od pierwszego kwartału działalności. Teraz szukamy kapitału, który pozwoli nam przyspieszyć rozwój Dyrektorów AI i wejście na rynki CEE.'
                  : 'We grow organically — without a marketing budget. All growth comes from referrals and direct outreach to industry networks. 90-day retention is above 90%. We\'ve been cash-flow positive since our first quarter of operation. We\'re now looking for capital to accelerate AI Director development and expansion into CEE markets.'}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="py-20 px-5 bg-gradient-to-br from-[#0D1628] to-[#1E3A8A]">
        <div className="max-w-[640px] mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-[34px] md:text-[42px] font-black text-white mb-4">
              {pl ? 'Porozmawiajmy.' : 'Let\'s talk.'}
            </h2>
            <p className="text-[15px] text-blue-200 leading-relaxed">
              {pl
                ? 'Jeśli budujesz portfel w sektorze MŚP / SaaS lub masz doświadczenie w skalowaniu software\'u w Polsce i CEE — chętnie porozmawiamy.'
                : 'If you build a portfolio in SMB / SaaS or have experience scaling software in Poland and CEE — we\'d love to connect.'}
            </p>
          </Reveal>

          {submitted ? (
            <Reveal>
              <div className="rounded-2xl bg-white/10 border border-white/20 p-10 text-center">
                <div className="text-[40px] mb-4">✓</div>
                <p className="text-[18px] font-bold text-white mb-2">
                  {pl ? 'Dziękujemy — odezwiemy się wkrótce.' : 'Thank you — we\'ll be in touch soon.'}
                </p>
                <p className="text-[14px] text-blue-200">
                  {pl ? 'Zazwyczaj odpowiadamy w ciągu 24 godzin.' : 'We typically respond within 24 hours.'}
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <form onSubmit={handleSubmit} className="rounded-2xl bg-white/10 border border-white/20 p-8 space-y-4 backdrop-blur-sm">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-blue-200 mb-1.5">
                      {pl ? 'Imię i nazwisko' : 'Full name'} *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder={pl ? 'Jan Kowalski' : 'John Smith'}
                      className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-[14px] focus:outline-none focus:border-white/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-blue-200 mb-1.5">
                      {pl ? 'Firma / Fundusz' : 'Company / Fund'} *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.company}
                      onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                      placeholder={pl ? 'Nazwa funduszu lub firmy' : 'Fund or company name'}
                      className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-[14px] focus:outline-none focus:border-white/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-blue-200 mb-1.5">
                    {pl ? 'Adres e-mail' : 'Email address'} *
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="jan@fundusz.pl"
                    className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-[14px] focus:outline-none focus:border-white/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-blue-200 mb-1.5">
                    {pl ? 'Wiadomość (opcjonalnie)' : 'Message (optional)'}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder={pl ? 'Czym się zajmujesz, jakie masz pytania...' : 'What you do, any questions...'}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-[14px] focus:outline-none focus:border-white/50 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-white text-[14px] font-bold text-[#1D4ED8] hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  {pl ? 'Napisz do nas' : 'Get in touch'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </Reveal>
          )}
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
