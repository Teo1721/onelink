"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const PRODUCT_ROUTES = ["/admin", "/ops", "/finance", "/region", "/employee"];

const WELCOME: Message = {
  role: "assistant",
  content: "Cześć! 👋 Jestem asystentem OneLink. Mogę odpowiedzieć na pytania o funkcje, cennik, bezpieczeństwo lub pomóc Ci zacząć. Czym mogę pomóc?",
};

const QUICK_QUESTIONS = [
  "Ile kosztuje OneLink?",
  "Jak działa trial?",
  "Dla jakiego biznesu to jest?",
];

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ALL hooks must be called before any conditional return
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setHasNew(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Hide on product/dashboard routes — after all hooks
  const isProductRoute = PRODUCT_ROUTES.some((r) => pathname.startsWith(r));
  if (isProductRoute) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply: Message = {
        role: "assistant",
        content: data.message || data.error || "Coś poszło nie tak, spróbuj ponownie.",
      };
      setMessages((prev) => [...prev, reply]);
      if (!open) setHasNew(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Przepraszam, wystąpił błąd. Napisz do nas na kontakt@onelink.pl" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[9997] w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl shadow-black/15 overflow-hidden"
          style={{ height: "min(520px, calc(100vh - 120px))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white leading-none">OneLink Asystent</p>
              <p className="text-[11px] text-white/75 mt-0.5">Odpowiada natychmiast</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white rounded-tr-sm"
                      : "bg-[#F3F4F6] text-[#111827] rounded-tl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-[#F3F4F6] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <Loader2 className="w-4 h-4 text-[#9CA3AF] animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions — show only on first message */}
          {messages.length === 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-[#6B7280] hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-[#F3F4F6] flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Napisz wiadomość..."
              disabled={loading}
              className="flex-1 h-10 px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-blue-400 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Otwórz czat"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-white" />
            {hasNew && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
            )}
          </>
        )}
      </button>
    </>
  );
}
