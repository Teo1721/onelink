import { NextRequest, NextResponse } from "next/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const RESPONSES: Array<{ keywords: string[]; reply: string }> = [
  {
    keywords: ["cena", "cennik", "ile kosztuje", "koszt", "plan", "pakiet", "abonament"],
    reply: "OneLink oferuje 3 plany:\n• **Start** — 19,99 zł/mies. netto: 1 lokal, 1 manager, P&L, alerty\n• **Rozwój** — 39,99 zł/mies. netto: do 2 lokali, magazyn, food cost, faktury ★ najpopularniejszy\n• **Sieć** — 59,99 zł/mies. netto: do 5 lokali, raporty cross-lokalizacyjne\n\nWszystkie plany mają 7-dniowy bezpłatny trial. Więcej na /pricing",
  },
  {
    keywords: ["rejestracja", "zarejestruj", "zacznij", "trial", "wypróbuj", "darmowy", "bezpłatny"],
    reply: "Rejestracja zajmuje 3 minuty i nie wymaga działu IT. Masz 7 dni bezpłatnego trialu — karta jest potrzebna tylko do aktywacji, ale nie pobieramy opłaty przez 7 dni. Zacznij na /auth/sign-up",
  },
  {
    keywords: ["bezpieczeństwo", "rodo", "gdpr", "szyfrowanie", "dane"],
    reply: "Dane są szyfrowane TLS 1.3 w przesyle i AES-256 w spoczynku. Serwery w UE (Supabase), zgodność z RODO. Płatności przez Stripe PCI DSS Level 1. Więcej na /security",
  },
  {
    keywords: ["kontakt", "pomoc", "support", "demo", "spotkanie", "zoom"],
    reply: "Napisz do nas: kontakt@onelink.pl — odpowiadamy w 4 godziny w dni robocze (pon–pt, 9:00–17:00). Możesz też umówić 20-minutowe demo przez Zoom lub Meet na /contact",
  },
  {
    keywords: ["food cost", "faktury", "magazyn", "inwentaryzacja", "sprzedaż", "raport", "przychód"],
    reply: "OneLink to panel do zarządzania P&L, food cost, magazynem i fakturami w czasie rzeczywistym — dostępny z telefonu i komputera. Manager wpisuje dane ze smartfona, właściciel widzi pełny P&L od razu. Sprawdź na /pricing lub zacznij trial na /auth/sign-up",
  },
  {
    keywords: ["co to", "o czym", "czym jest", "onelink", "jak działa", "co robi"],
    reply: "OneLink to system zarządzania dla restauracji, kawiarni, piekarni i sieci MŚP. Główne funkcje: Dashboard P&L na żywo, kontrola food cost, moduł magazynowy, zatwierdzanie faktur, alerty o odchyleniach, multi-lokalizacja. Więcej na /pricing",
  },
]

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: Message[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Brak wiadomości." }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() ?? "";

    for (const { keywords, reply } of RESPONSES) {
      if (keywords.some(k => lastMessage.includes(k))) {
        return NextResponse.json({ message: reply });
      }
    }

    return NextResponse.json({
      message: "Dziękuję za wiadomość! Skontaktuj się z nami przez kontakt@onelink.pl lub umów demo na /contact — odpowiemy w ciągu 4 godzin.",
    });
  } catch {
    return NextResponse.json({ error: "Błąd. Spróbuj ponownie." }, { status: 500 });
  }
}
