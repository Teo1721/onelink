import { UpdatePasswordForm } from "@/components/update-password-form";
import { OneLinkLogo } from "@/components/onelink-logo";

export default function SetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] mx-auto">
        <div className="flex justify-center mb-10">
          <OneLinkLogo dark={false} />
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] shadow-sm">
          <div className="mb-7">
            <h2 className="text-[24px] font-bold text-[#111827] mb-1">Witaj w OneLink!</h2>
            <p className="text-[13px] text-[#9CA3AF]">Ustaw hasło, aby móc się logować do swojego konta pracownika.</p>
          </div>
          <UpdatePasswordForm redirectTo="/employee" />
        </div>
      </div>
    </main>
  );
}
