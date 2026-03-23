import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";

export const metadata = {
  title: "Regulamin — OneLink",
  description: "Regulamin usługi OneLink — zasady korzystania, subskrypcja, prawa i obowiązki użytkownika.",
};

export default function TermsPage() {
  return (
    <div className="bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[#E5E7EB] bg-white/90">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <Link href="/">
            <OneLinkLogo iconSize={24} textSize="text-[14px]" dark={false} />
          </Link>
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
            ← Powrót do strony głównej
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="text-3xl font-bold mb-2 text-[#111827]">Regulamin usługi</h1>
        <p className="text-[#9CA3AF] text-sm mb-10">Data wejścia w życie: marzec 2026</p>

        <div className="space-y-10 text-[#4B5563] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">1. Usługodawca</h2>
            <p>
              Usługę OneLink świadczy <strong className="text-[#111827]">InnowacyjneAI sp. z o.o.</strong> z siedzibą w Polsce.
              Kontakt z usługodawcą możliwy jest pod adresem e-mail:{" "}
              <a href="mailto:kontakt@onelink.pl" className="text-blue-600 hover:text-blue-700 transition-colors">
                kontakt@onelink.pl
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">2. Opis usługi</h2>
            <p>
              <strong className="text-[#111827]">OneLink</strong> to system zarządzania małym biznesem w modelu SaaS (Software as a Service),
              umożliwiający właścicielom restauracji, piekarni, cukierni i innych lokali gastronomicznych zarządzanie
              finansami, magazynem, fakturami i raportami P&amp;L w czasie rzeczywistym. Usługa dostępna jest przez
              przeglądarkę internetową na urządzeniach stacjonarnych i mobilnych.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">3. Rejestracja i konto</h2>
            <p className="mb-3">
              Korzystanie z OneLink wymaga założenia konta. Podczas rejestracji wymagane jest podanie adresu
              e-mail, nazwy firmy oraz danych karty płatniczej. Rejestrując się, użytkownik oświadcza, że:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>podane dane są prawdziwe i aktualne,</li>
              <li>ma ukończone 18 lat i pełną zdolność do czynności prawnych,</li>
              <li>akceptuje niniejszy Regulamin oraz Politykę Prywatności.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">4. Okres próbny</h2>
            <p>
              Każde nowe konto objęte jest <strong className="text-[#111827]">7-dniowym okresem próbnym (trial)</strong>.
              W tym czasie usługa dostępna jest w pełnym zakresie wybranego planu. Podanie danych karty
              płatniczej jest wymagane przy rejestracji, jednak <strong className="text-[#111827]">żadna opłata nie zostanie pobrana
              w trakcie okresu próbnego</strong>. Użytkownik może anulować subskrypcję w dowolnym momencie
              przed upływem 7 dni — bez żadnych kosztów.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">5. Subskrypcja i płatności</h2>
            <p className="mb-3">
              Po zakończeniu okresu próbnego usługa przechodzi automatycznie na wybrany plan subskrypcyjny:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Subskrypcja rozliczana jest <strong className="text-[#111827]">miesięcznie z góry</strong> i odnawia się automatycznie.</li>
              <li>Płatności obsługiwane są wyłącznie przez <strong className="text-[#111827]">Stripe</strong> — bezpiecznego operatora płatności certyfikowanego PCI DSS.</li>
              <li>Użytkownik może <strong className="text-[#111827]">anulować subskrypcję w dowolnym momencie</strong> z poziomu panelu konta. Anulowanie wejdzie w życie z końcem bieżącego okresu rozliczeniowego.</li>
              <li>InnowacyjneAI sp. z o.o. zastrzega sobie prawo do zmiany cennika z <strong className="text-[#111827]">30-dniowym wyprzedzeniem</strong>.</li>
              <li>Faktury VAT wystawiane są automatycznie i dostępne w panelu konta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">6. Obowiązki użytkownika</h2>
            <p className="mb-3">Korzystając z usługi OneLink, użytkownik zobowiązuje się do:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Podawania prawdziwych i aktualnych danych w formularzu rejestracyjnym oraz podczas korzystania z usługi.</li>
              <li>Zachowania poufności danych dostępowych do konta (login, hasło) i nieudostępniania ich osobom trzecim bez wyraźnej zgody.</li>
              <li>Korzystania z usługi wyłącznie w celach zgodnych z prawem i niniejszym Regulaminem.</li>
              <li>Niezwłocznego poinformowania InnowacyjneAI o nieautoryzowanym dostępie do konta.</li>
              <li>Niepodejmowania działań mogących zakłócić działanie usługi lub infrastruktury serwera.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">7. Dostępność usługi</h2>
            <p>
              Dokładamy wszelkich starań, aby OneLink był dostępny przez <strong className="text-[#111827]">99% czasu</strong> w skali miesiąca.
              Planowane przerwy techniczne będą komunikowane z wyprzedzeniem. InnowacyjneAI nie ponosi
              odpowiedzialności za przerwy spowodowane czynnikami niezależnymi od firmy (awarie sieci,
              siła wyższa, przerwy u dostawców infrastruktury).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">8. Dane po anulowaniu konta</h2>
            <p>
              Po anulowaniu subskrypcji konto pozostaje aktywne do końca opłaconego okresu rozliczeniowego.
              Po jego upływie dane są przechowywane przez <strong className="text-[#111827]">30 dni</strong> — w tym czasie możliwe jest
              przywrócenie konta lub pobranie danych. Po 30 dniach wszystkie dane użytkownika są
              <strong className="text-[#111827]"> trwale i nieodwracalnie usuwane</strong> z naszych serwerów.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">9. Odpowiedzialność</h2>
            <p>
              OneLink dostarcza narzędzia do zarządzania i raportowania. InnowacyjneAI sp. z o.o. nie ponosi
              odpowiedzialności za decyzje biznesowe podejmowane na podstawie danych wprowadzonych przez
              użytkownika ani za ewentualne straty wynikające z błędnie wprowadzonych danych. Całkowita
              odpowiedzialność InnowacyjneAI ograniczona jest do kwoty opłat uiszczonych przez użytkownika
              w ciągu ostatnich 3 miesięcy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">10. Prawo właściwe</h2>
            <p>
              Niniejszy Regulamin podlega <strong className="text-[#111827]">prawu polskiemu</strong>. Wszelkie spory wynikające
              z korzystania z usługi będą rozstrzygane przez właściwy sąd polski. Konsumenci mają
              prawo do korzystania z pozasądowych metod rozstrzygania sporów zgodnie z obowiązującymi
              przepisami prawa polskiego i unijnego.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">11. Zmiany regulaminu</h2>
            <p>
              InnowacyjneAI zastrzega sobie prawo do zmiany niniejszego Regulaminu. O istotnych zmianach
              poinformujemy Cię z <strong className="text-[#111827]">co najmniej 14-dniowym wyprzedzeniem</strong> drogą e-mailową.
              Kontynuowanie korzystania z usługi po wejściu zmian w życie oznacza ich akceptację.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">12. Kontakt</h2>
            <p>
              W razie pytań dotyczących niniejszego Regulaminu skontaktuj się z nami:{" "}
              <a href="mailto:kontakt@onelink.pl" className="text-blue-600 hover:text-blue-700 transition-colors">
                kontakt@onelink.pl
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#9CA3AF]">© 2026 OneLink · InnowacyjneAI sp. z o.o.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">O nas</Link>
            <Link href="/contact" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Kontakt</Link>
            <Link href="/security" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Bezpieczeństwo</Link>
            <Link href="/privacy" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Polityka Prywatności</Link>
            <Link href="/terms" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">Regulamin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
