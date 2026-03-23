"use client";

import { useState } from "react";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { Mail, MessageSquare, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate send — replace with actual endpoint when ready
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <Link href="/">
            <OneLinkLogo iconSize={24} textSize="text-[14px]" dark={false} />
          </Link>
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
            ← Powrót do strony głównej
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 mb-6">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-[40px] font-black tracking-tight mb-3 text-[#111827]">Skontaktuj się z nami</h1>
          <p className="text-[16px] text-[#6B7280] max-w-lg mx-auto">
            Masz pytania przed zakupem? Chcesz zobaczyć demo? Napisz — odpowiadamy w ciągu 4 godzin w dni robocze.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Contact info */}
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-[15px] font-bold text-[#111827] mb-1">E-mail</h3>
              <a
                href="mailto:kontakt@onelink.pl"
                className="text-[14px] text-blue-600 hover:text-blue-700 transition-colors"
              >
                kontakt@onelink.pl
              </a>
              <p className="text-[12px] text-[#9CA3AF] mt-2">Odpowiedź w ciągu 4 godz. w dni robocze</p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-[#111827] mb-3">Chcesz zobaczyć demo?</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed mb-4">
                Możemy umówić 20-minutową sesję demo przez Zoom lub Meet — pokażemy Ci system na żywo i odpowiemy na pytania.
              </p>
              <a
                href="mailto:kontakt@onelink.pl?subject=Demo OneLink"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-amber-500 hover:text-amber-600 transition-colors"
              >
                Umów demo →
              </a>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Dane firmy</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">
                InnowacyjneAI sp. z o.o.<br />
                kontakt@onelink.pl<br />
                Polska
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-3">
            {sent ? (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center gap-4 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <h2 className="text-[22px] font-bold text-[#111827]">Wiadomość wysłana!</h2>
                <p className="text-[14px] text-[#6B7280] max-w-sm">
                  Dziękujemy za kontakt. Odpiszemy na podany adres e-mail w ciągu 4 godzin roboczych.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="mt-2 text-[13px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  Wyślij kolejną wiadomość
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-5 shadow-sm"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">
                      Imię i nazwisko *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jan Kowalski"
                      className="w-full h-11 px-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">
                      Adres e-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jan@restauracja.pl"
                      className="w-full h-11 px-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">
                    Temat
                  </label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                  >
                    <option value="">Wybierz temat...</option>
                    <option value="demo">Chcę zobaczyć demo</option>
                    <option value="pricing">Pytanie o cennik</option>
                    <option value="technical">Pytanie techniczne</option>
                    <option value="billing">Rozliczenia i faktura</option>
                    <option value="other">Inne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">
                    Wiadomość *
                  </label>
                  <textarea
                    required
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={5}
                    placeholder="Opisz czego szukasz lub jakie masz pytanie..."
                    className="w-full px-4 py-3 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-[14px] font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60"
                >
                  {sending ? "Wysyłanie..." : "Wyślij wiadomość"}
                </button>
                <p className="text-[11px] text-[#9CA3AF] text-center">
                  Odpowiadamy w ciągu 4 godzin w dni robocze (pon–pt, 9:00–17:00)
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#9CA3AF]">© 2026 OneLink · InnowacyjneAI sp. z o.o.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">O nas</Link>
            <Link href="/contact" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Kontakt</Link>
            <Link href="/security" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Bezpieczeństwo</Link>
            <Link href="/privacy" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Polityka Prywatności</Link>
            <Link href="/terms" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Regulamin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
