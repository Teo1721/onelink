import { ForgotPasswordForm } from "@/components/forgot-password-form";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <OneLinkLogo dark={false} />
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] shadow-sm">
          <div className="mb-7">
            <h2 className="text-[24px] font-bold text-[#111827] mb-1">Resetuj hasło</h2>
            <p className="text-[13px] text-[#9CA3AF]">Wyślemy Ci link do zmiany hasła</p>
          </div>
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-[12px] text-[#9CA3AF] mt-6">
          <Link href="/auth/login" className="hover:text-[#6B7280] transition-colors">
            ← Wróć do logowania
          </Link>
        </p>
      </div>
    </main>
  );
}
