"use client";

import { useLanguage, type Lang } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "pl", label: "Polski",  flag: "🇵🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

interface Props {
  /** "light" = white nav, "dark" = dark/navy nav */
  variant?: "light" | "dark";
  className?: string;
}

export function LanguageSwitcher({ variant = "light", className = "" }: Props) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGS.find(l => l.code === lang) ?? LANGS[0];

  const btnCls = variant === "dark"
    ? "border-white/20 text-white/80 hover:bg-white/10"
    : "border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]";

  const dropCls = "absolute right-0 mt-1.5 w-36 rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-[200] overflow-hidden";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-semibold transition-colors ${btnCls}`}
        aria-label="Switch language"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span>{current.flag} {current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className={dropCls}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-[#F9FAFB] ${
                l.code === lang ? "text-[#111827] font-bold" : "text-[#6B7280]"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              {l.label}
              {l.code === lang && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
