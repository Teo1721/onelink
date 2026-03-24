"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { OneLinkLogo } from "@/components/onelink-logo";

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [syncing, setSyncing] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Proactively sync the subscription so the middleware lets the user in.
    // The Stripe webhook is async and may not have fired yet.
    const sync = async () => {
      try {
        await fetch("/api/billing/sync-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // If sync fails, we still let the user proceed —
        // the webhook will catch up, and worst case they hit pricing once more.
      } finally {
        setSyncing(false);
        setReady(true);
      }
    };
    sync();
  }, [sessionId]);

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

          <h1 className="text-[28px] font-bold text-[#111827] mb-3">Subskrypcja aktywna!</h1>
          <p className="text-[14px] text-[#6B7280] leading-relaxed mb-8">
            Dziękujemy! Twoja płatność została przetworzona. Masz pełny dostęp do platformy przez 7 dni trialu, a następnie subskrypcja przedłuży się automatycznie.
          </p>

          {/* Feature highlights */}
          <div className="space-y-2.5 mb-8 text-left">
            {[
              "Pełny dostęp do panelu właściciela",
              "Raporty sprzedaży i P&L w czasie rzeczywistym",
              "Zarządzanie magazynem i zespołem",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5 text-[13px] text-[#4B5563]">
                <div className="w-4 h-4 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5 text-green-500" stroke="currentColor" strokeWidth="2">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </div>
                {feat}
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/admin")}
            disabled={syncing}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[14px] font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-70"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aktywowanie...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Przejdź do panelu</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <BillingSuccessContent />
    </Suspense>
  );
}
