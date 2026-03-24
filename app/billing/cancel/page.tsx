"use client";

import { useRouter } from "next/navigation";
import { XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { OneLinkLogo } from "@/components/onelink-logo";

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-10 text-center border border-[#E5E7EB] shadow-sm">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <OneLinkLogo dark={false} />
          </div>

          {/* Cancel icon */}
          <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>

          <h1 className="text-[28px] font-bold text-[#111827] mb-3">Płatność anulowana</h1>
          <p className="text-[14px] text-[#6B7280] leading-relaxed mb-8">
            Nie dokończyłeś procesu płatności. Twoja subskrypcja nie została aktywowana. Możesz spróbować ponownie w dowolnym momencie.
          </p>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 mb-8">
            <p className="text-[13px] text-blue-700">
              Pamiętaj — 7-dniowy trial jest w pełni funkcjonalny. Nie stracisz nic, próbując ponownie.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/pricing")}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Spróbuj ponownie</span>
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full h-11 rounded-xl text-[14px] font-medium text-[#9CA3AF] hover:text-[#6B7280] transition-colors flex items-center justify-center gap-2"
            >
              <span>Wróć do logowania</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
