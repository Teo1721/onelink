"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OneLinkLogo } from "@/components/onelink-logo";
import { createClient } from "@/lib/supabase/client";
import {
  Eye, EyeOff, ArrowRight, Check,
  ShieldCheck, Zap, Star,
  BarChart3, Users, Brain, Receipt,
} from "lucide-react";

const STEPS = [
  { n: "1", title: "Utwórz konto",      desc: "Podaj email i ustaw hasło — 30 sekund" },
  { n: "2", title: "Konfiguracja",       desc: "Dodaj lokal i zaproś zespół" },
  { n: "3", title: "Pełny dostęp 7 dni", desc: "Żadna opłata nie jest pobrana w trakcie trialu" },
];

const PERKS = [
  { icon: BarChart3, text: "Raporty P&L każdego dnia" },
  { icon: Brain,     text: "4 Dyrektory AI (CFO, HR, Sprzedaż, Inwestorski)" },
  { icon: Users,     text: "Grafik, urlopy i kiosk pracowniczy" },
  { icon: Receipt,   text: "Faktury, magazyn i food cost" },
];

export default function SignUpPage() {
  const [companyName, setCompanyName]     = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPw, setShowPw]               = useState(false);
  const [showPw2, setShowPw2]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const router = useRouter();

  const pwStrength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 && !/[^a-zA-Z0-9]/.test(password) ? 2
    : 3;
  const pwColors = ["", "bg-red-400", "bg-yellow-400", "bg-emerald-500"];
  const pwLabels = ["", "Za krótkie", "Średnie", "Silne"];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) { setError("Podaj nazwę firmy."); return; }
    if (password.length < 8) { setError("Hasło musi mieć co najmniej 8 znaków."); return; }
    if (password !== repeatPassword) { setError("Hasła się nie zgadzają."); return; }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/login` },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already"))
          return setError("Ten email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.");
        throw signUpError;
      }

      if (data.user && (data.user.identities?.length ?? 0) === 0)
        return setError("Ten email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.");

      const userId = data.user?.id;
      if (!userId) return setError("Rejestracja nie powiodła się. Spróbuj ponownie.");

      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companyName: companyName.trim() }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Nie udało się skonfigurować konta.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      router.push(signInError ? "/auth/login" : "/admin/setup");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full h-12 px-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#D1D5DB] text-[14px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all";

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 px-12 py-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0D1628 0%, #0F2A5C 50%, #0E3A75 100%)" }}
      >
        {/* Ambient glows */}
        <div className="absolute top-[-80px] right-[-40px] w-[320px] h-[320px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />
        <div className="absolute bottom-[80px] left-[-60px] w-[240px] h-[240px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <OneLinkLogo dark={true} iconSize={28} textSize="text-[16px]" />
        </div>

        {/* Center */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 w-fit mb-6">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-300">7 DNI ZA DARMO · BEZ RYZYKA</span>
          </div>

          <h1 className="text-[34px] font-black text-white leading-[1.1] mb-4">
            Zacznij zarządzać<br />
            <span className="bg-gradient-to-r from-[#60A5FA] to-[#06B6D4] bg-clip-text text-transparent">
              jak pro
            </span>
          </h1>
          <p className="text-[14px] text-white/50 leading-relaxed mb-8 max-w-xs">
            Pełny dostęp do platformy przez 7 dni. Karta wymagana — ale żadna opłata nie zostanie pobrana przed upływem trialu.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-white">{n}</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white/85">{title}</p>
                  <p className="text-[11px] text-white/40">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Perks */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            {PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[12px] text-white/60">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="text-[12px] text-white/55 italic leading-relaxed">
            "Plan Rozwój spłacił się w pierwszym miesiącu — dyrektory AI wykryły anomalię w magazynie."
          </p>
          <p className="text-[11px] text-white/30 mt-1.5">Tomasz R. · Poznań · restauracja</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F8FA] px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <OneLinkLogo dark={false} iconSize={26} textSize="text-[15px]" />
        </div>

        <div className="w-full max-w-[400px]">

          {/* Header */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 mb-4">
              <Zap className="w-3 h-3" />
              7 dni za darmo · anuluj kiedy chcesz
            </div>
            <h2 className="text-[28px] font-black text-[#111827] mb-1">Utwórz konto</h2>
            <p className="text-[14px] text-[#9CA3AF]">
              Masz już konto?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                Zaloguj się
              </Link>
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-7">
            <form onSubmit={handleSignUp} className="space-y-4">

              {/* Company */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                  Nazwa firmy / restauracji
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="np. Pizzeria da Marco"
                  className={inp}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                  Adres email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jan@restauracja.pl"
                  className={inp}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                  Hasło
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 znaków"
                    className={inp + " pr-12"}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwStrength ? pwColors[pwStrength] : "bg-[#E5E7EB]"}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-semibold ${pwStrength === 1 ? "text-red-500" : pwStrength === 2 ? "text-yellow-600" : "text-emerald-600"}`}>
                      {pwLabels[pwStrength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Repeat password */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                  Powtórz hasło
                </label>
                <div className="relative">
                  <input
                    type={showPw2 ? "text" : "password"}
                    required
                    value={repeatPassword}
                    onChange={e => setRepeatPassword(e.target.value)}
                    placeholder="Powtórz hasło"
                    className={inp + " pr-12"}
                  />
                  <button type="button" onClick={() => setShowPw2(!showPw2)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                    {showPw2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {repeatPassword.length > 0 && repeatPassword === password && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[9px] font-black">!</span>
                  </div>
                  <p className="text-[12px] text-red-700 leading-relaxed">
                    {error}
                    {error.includes("zarejestrowany") && (
                      <>{" "}<Link href="/auth/login" className="underline font-semibold">Zaloguj się →</Link></>
                    )}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-[14px] font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Tworzenie konta...</span></>
                ) : (
                  <><span>Utwórz konto i zacznij trial</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed">
                Rejestrując się, akceptujesz{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">Regulamin</Link>
                {" "}i{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">Politykę prywatności</Link>.
              </p>
            </form>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-5 mt-5">
            {[
              { icon: ShieldCheck, text: "RODO · Dane w UE" },
              { icon: Zap,         text: "Szyfrowanie SSL" },
              { icon: Check,       text: "Anuluj kiedy chcesz" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                <Icon className="w-3 h-3" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
