import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex items-center gap-16">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col flex-1 gap-8">
          <div>
            <OneLinkLogo dark={false} className="mb-8" />
            <h1 className="text-[38px] font-bold text-[#111827] leading-[1.15] mb-4">
              Zarządzaj restauracją<br />
              <span className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] bg-clip-text text-transparent">
                na wyższym poziomie
              </span>
            </h1>
            <p className="text-[15px] text-[#6B7280] leading-relaxed max-w-sm">
              Kontroluj sprzedaż, koszty, magazyn i zespół w jednym miejscu. Dane w czasie rzeczywistym.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: "📊", title: "Raporty P&L", desc: "Rentowność każdego dnia, tygodnia i miesiąca" },
              { icon: "🏪", title: "Multi-lokal", desc: "Zarządzaj siecią z jednego panelu" },
              { icon: "👥", title: "Zarządzanie zespołem", desc: "Role, grafiki i uprawnienia dla całego personelu" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
                <span className="text-[20px] mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-[13px] font-semibold text-[#111827]">{item.title}</div>
                  <div className="text-[12px] text-[#9CA3AF]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-[#9CA3AF]">
            Nie masz konta?{" "}
            <Link href="/pricing" className="text-blue-600 hover:text-blue-700 transition-colors font-semibold">
              Sprawdź plany cenowe →
            </Link>
          </p>
        </div>

        {/* Right panel — form card */}
        <div className="w-full max-w-[420px] mx-auto lg:mx-0">
          {/* Logo for mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <OneLinkLogo dark={false} />
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] shadow-sm">
            <div className="mb-7">
              <h2 className="text-[24px] font-bold text-[#111827] mb-1">Zaloguj się</h2>
              <p className="text-[13px] text-[#9CA3AF]">Witaj z powrotem w OneLink</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
