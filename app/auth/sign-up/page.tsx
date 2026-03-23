import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex items-center gap-16">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col flex-1 gap-8">
          <div>
            <OneLinkLogo dark={false} className="mb-8" />
            <h1 className="text-[38px] font-bold text-[#111827] leading-[1.15] mb-4">
              Zacznij 7-dniowy<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                okres próbny
              </span>
            </h1>
            <p className="text-[15px] text-[#6B7280] leading-relaxed max-w-sm">
              Pełny dostęp do platformy przez 7 dni. Subskrypcja automatycznie przedłuży się po trialu.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { title: "Krok 1", desc: "Utwórz konto właściciela z nazwą restauracji" },
              { title: "Krok 2", desc: "Wybierz plan i dodaj kartę płatniczą" },
              { title: "Krok 3", desc: "Zaproś zespół i zacznij zarządzać" },
            ].map((step, i) => (
              <div key={step.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-white">{i + 1}</span>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#111827]">{step.title}</div>
                  <div className="text-[12px] text-[#9CA3AF]">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-[#9CA3AF]">
            Masz już konto?{" "}
            <Link href="/auth/login" className="text-amber-500 hover:text-amber-600 transition-colors font-semibold">
              Zaloguj się →
            </Link>
          </p>
        </div>

        {/* Right panel */}
        <div className="w-full max-w-[420px] mx-auto lg:mx-0">
          {/* Logo for mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <OneLinkLogo dark={false} />
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] shadow-sm">
            <div className="mb-7">
              <h2 className="text-[24px] font-bold text-[#111827] mb-1">Utwórz konto</h2>
              <p className="text-[13px] text-[#9CA3AF]">Wypełnij dane i zacznij trial</p>
            </div>

            {/* Trust message */}
            <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[12px] text-amber-700 leading-relaxed">
                <span className="font-semibold text-amber-800">Dlaczego prosimy o kartę?</span> Aktywujemy konto natychmiast i masz pewność, że po trialu nie stracisz danych. Możesz anulować w każdej chwili w ciągu 7 dni — bez żadnych opłat.
              </p>
            </div>

            <SignUpForm />
          </div>
        </div>
      </div>
    </main>
  );
}
