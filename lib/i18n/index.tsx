"use client";

import {
  createContext, useContext, useState, useEffect, type ReactNode,
} from "react";

export type Lang = "pl" | "en";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangCtx = createContext<Ctx>({ lang: "pl", setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pl");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ol_lang") as Lang | null;
      if (saved === "en" || saved === "pl") setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("ol_lang", l); } catch {}
  };

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLanguage() {
  return useContext(LangCtx);
}

/** Tiny helper — pick from a {pl, en} object based on current language */
export function useT<T>(t: { pl: T; en: T }): T {
  const { lang } = useLanguage();
  return t[lang];
}
