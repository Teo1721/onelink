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
