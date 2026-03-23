"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export function SignUpForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError("Podaj nazwę firmy.");
      return;
    }
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== repeatPassword) {
      setError("Hasła się nie zgadzają.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (signUpError) {
        if (
          signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("already been registered")
        ) {
          setError("Ten adres email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.");
          return;
        }
        throw signUpError;
      }

      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setError("Ten adres email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.");
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Rejestracja nie powiodła się. Spróbuj ponownie.");
        return;
      }

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

      if (signInError) {
        router.push("/auth/login");
        return;
      }

      router.push("/pricing");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full h-12 px-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] text-[14px] focus:outline-none focus:border-amber-400 focus:bg-white transition-all";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5";

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-1.5">
        <label className={labelClass}>Nazwa firmy / restauracji</label>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="np. Pizzeria da Marco"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Adres email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jan@restauracja.pl"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Hasło</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 znaków"
            className={inputClass + " pr-12"}
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

      <div className="space-y-1.5">
        <label className={labelClass}>Powtórz hasło</label>
        <div className="relative">
          <input
            type={showPw2 ? "text" : "password"}
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="Powtórz hasło"
            className={inputClass + " pr-12"}
          />
          <button
            type="button"
            onClick={() => setShowPw2(!showPw2)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            {showPw2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 leading-relaxed">
          {error}
          {(error.includes("już zarejestrowany") || error.includes("already registered")) && (
            <span>
              {" "}
              <Link href="/auth/login" className="underline text-amber-500 hover:text-amber-600">
                Zaloguj się →
              </Link>
            </span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-[14px] font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-60"
      >
        {isLoading ? "Tworzenie konta..." : <><span>Utwórz konto</span><ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className="text-center text-[13px] text-[#9CA3AF] pt-1">
        Masz już konto?{" "}
        <Link href="/auth/login" className="text-amber-500 hover:text-amber-600 transition-colors font-semibold">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
