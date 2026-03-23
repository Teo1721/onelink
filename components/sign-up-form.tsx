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
        // "User already registered" — friendly message
        if (
          signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("already been registered")
        ) {
          setError("Ten adres email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.");
          return;
        }
        throw signUpError;
      }

      // Supabase returns a user with empty identities when email confirmation is ON
      // and the email already exists — treat as "already registered"
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setError("Ten adres email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.");
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        // Should not happen, but guard anyway
        setError("Rejestracja nie powiodła się. Spróbuj ponownie.");
        return;
      }

      // Create company + profile on the server (uses service role — bypasses RLS,
      // works regardless of email confirmation setting, and also confirms the email
      // so the user can log in immediately without clicking a link).
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companyName: companyName.trim() }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Nie udało się skonfigurować konta.");
      }

      // Auto sign-in now that email is confirmed — the user shouldn't need to
      // go through a separate login step just after registering.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // Sign-in failed for some reason — fall back to the login page
        router.push("/auth/login");
        return;
      }

      // Successfully signed in — send them to pricing to choose a plan
      router.push("/pricing");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">
          Nazwa firmy / restauracji
        </label>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="np. Pizzeria da Marco"
          className="w-full h-12 px-4 rounded-xl bg-white/90 border border-white/20 text-gray-900 placeholder-gray-400 text-[14px] focus:outline-none focus:border-amber-400/70 focus:bg-white transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">
          Adres email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jan@restauracja.pl"
          className="w-full h-12 px-4 rounded-xl bg-white/90 border border-white/20 text-gray-900 placeholder-gray-400 text-[14px] focus:outline-none focus:border-amber-400/70 focus:bg-white transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">
          Hasło
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 znaków"
            className="w-full h-12 px-4 pr-12 rounded-xl bg-white/90 border border-white/20 text-gray-900 placeholder-gray-400 text-[14px] focus:outline-none focus:border-amber-400/70 focus:bg-white transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">
          Powtórz hasło
        </label>
        <div className="relative">
          <input
            type={showPw2 ? "text" : "password"}
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="Powtórz hasło"
            className="w-full h-12 px-4 pr-12 rounded-xl bg-white/90 border border-white/20 text-gray-900 placeholder-gray-400 text-[14px] focus:outline-none focus:border-amber-400/70 focus:bg-white transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPw2(!showPw2)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPw2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 leading-relaxed">
          {error}
          {(error.includes("już zarejestrowany") || error.includes("already registered")) && (
            <span>
              {" "}
              <Link href="/auth/login" className="underline text-amber-400/80 hover:text-amber-400">
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

      <p className="text-center text-[13px] text-white/30 pt-1">
        Masz już konto?{" "}
        <Link href="/auth/login" className="text-amber-400/80 hover:text-amber-400 transition-colors font-medium">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
