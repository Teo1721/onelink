"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { OneLinkLogo } from "@/components/onelink-logo";

export default function SignUpSuccessPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-10 text-center border border-[#E5E7EB] shadow-sm">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <OneLinkLogo dark={false} />
          </div>

          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-[28px] font-bold text-[#111827] mb-3">Konto utworzone!</h1>
          <p className="text-[14px] text-[#6B7280] leading-relaxed mb-2">
            Sprawdź swoją skrzynkę e-mail i potwierdź adres, aby aktywować konto.
          </p>
          <p className="text-[13px] text-[#9CA3AF] mb-8">
            Sprawdź też folder spam, jeśli wiadomość nie dotarła.
          </p>

          {/* Email icon strip */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 mb-8">
            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="text-[13px] font-semibold text-[#111827]">Link potwierdzający wysłany</div>
              <div className="text-[12px] text-[#9CA3AF]">Kliknij link w emailu, aby aktywować konto</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => router.push("/pricing")}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <span>Wybierz plan subskrypcji</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full h-11 rounded-xl text-[14px] font-medium text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              Przejdź do logowania
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
