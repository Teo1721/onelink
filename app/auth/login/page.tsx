"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OneLinkLogo } from "@/components/onelink-logo";
import { createClient } from "@/lib/supabase/client";
import { getDashboardRoute } from "@/app/roles";
import { Eye, EyeOff, ArrowRight, BarChart3, Users, Receipt, Brain, Star, ShieldCheck, Zap } from "lucide-react";

const FEATURES = [
  { icon: BarChart3, label: "Raporty P&L w czasie rzeczywistym" },
  { icon: Users,     label: "Zarządzanie zespołem i grafikami" },
  { icon: Receipt,   label: "Faktury, magazyn i food cost" },
  { icon: Brain,     label: "4 Dyrektory AI — CFO, HR, Sprzedaż, Inwestorski" },
];

const STATS = [
  { value: "500+", label: "restauracji" },
  { value: "4.9★", label: "ocena" },
  { value: "-20%", label: "food cost" },
];

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

      if (authErr) {
        if (authErr.message.toLowerCase().includes("not confirmed"))
          throw new Error("Potwierdź adres email — sprawdź skrzynkę i kliknij link aktywacyjny.");
        if (authErr.message.toLowerCase().includes("invalid"))
          throw new Error("Nieprawidłowy email lub hasło.");
        throw authErr;
      }
      if (!user) throw new Error("Brak użytkownika po zalogowaniu.");

      const res = await fetch("/api/auth/profile-role");
      if (!res.ok) throw new Error("Nie udało się pobrać profilu.");
      const { role } = await res.json();
      router.push(role ? getDashboardRoute(role) : "/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Błąd logowania.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 px-12 py-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0D1628 0%, #0F2A5C 50%, #0E3A75 100%)" }}
      >
        {/* Ambient glows */}
        <div className="absolute top-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <OneLinkLogo dark={true} iconSize={28} textSize="text-[16px]" />
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 w-fit mb-6">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-[11px] font-semibold text-white/80">System dla restauratorów</span>
          </div>

          <h1 className="text-[36px] font-black text-white leading-[1.1] mb-4">
            Witaj z powrotem<br />
            <span className="bg-gradient-to-r from-[#60A5FA] to-[#06B6D4] bg-clip-text text-transparent">
              w OneLink
            </span>
          </h1>
          <p className="text-[15px] text-white/55 leading-relaxed mb-10 max-w-xs">
            Twoje dane finansowe, HR i AI gotowe od razu po zalogowaniu.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-300" />
                </div>
                <span className="text-[13px] text-white/70">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: stats + testimonial */}
        <div className="relative z-10">
          {/* Stats */}
          <div className="flex gap-6 mb-6">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-[22px] font-black text-white">{value}</p>
                <p className="text-[11px] text-white/40">{label}</p>
              </div>
            ))}
          </div>

          {/* Mini testimonial */}
          <div className="p-4 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm">
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-[12px] text-white/65 leading-relaxed italic">
              "OneLink wykrył wyciek na food cost, który kosztował mnie 2 000 zł miesięcznie."
            </p>
            <p className="text-[11px] text-white/35 mt-2">Marek W. · Kraków · 2 lokale</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F8FA] px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <OneLinkLogo dark={false} iconSize={26} textSize="text-[15px]" />
        </div>

        <div className="w-full max-w-[400px]">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[30px] font-black text-[#111827] mb-1">Zaloguj się</h2>
            <p className="text-[14px] text-[#9CA3AF]">
              Nie masz konta?{" "}
              <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                Zacznij 7-dniowy trial
              </Link>
            </p>
          </div>

          {/* Social login */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 mb-4 space-y-3">
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
              }}
              className="w-full h-11 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[13px] font-semibold text-[#374151] flex items-center justify-center gap-3 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              Kontynuuj z Google
            </button>
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/auth/callback` } });
              }}
              className="w-full h-11 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[13px] font-semibold text-[#374151] flex items-center justify-center gap-3 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 814 1000"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.1-148.2-97.4C77.5 726 26.6 611.9 26.6 493.6c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              Kontynuuj z Apple
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#F3F4F6]" />
              <span className="text-[11px] text-[#9CA3AF]">lub zaloguj się przez e-mail</span>
              <div className="flex-1 h-px bg-[#F3F4F6]" />
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-7">
            <form onSubmit={handleLogin} className="space-y-5">

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
                  className="w-full h-12 px-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#D1D5DB] text-[14px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-semibold text-[#374151]">Hasło</label>
                  <Link href="/auth/forgot-password" className="text-[12px] text-blue-600 hover:text-blue-700 transition-colors">
                    Zapomniałeś hasła?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 pr-12 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#D1D5DB] text-[14px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[9px] font-black">!</span>
                  </div>
                  <p className="text-[12px] text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-[14px] font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Logowanie...</span></>
                ) : (
                  <><span>Zaloguj się</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-5 mt-6">
            {[
              { icon: ShieldCheck, text: "RODO · Dane w UE" },
              { icon: Zap, text: "Szyfrowanie SSL" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                <Icon className="w-3.5 h-3.5" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
