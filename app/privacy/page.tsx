import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";

export const metadata = {
  title: "Polityka Prywatności — OneLink",
  description: "Dowiedz się jak OneLink przetwarza i chroni Twoje dane osobowe zgodnie z RODO.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2 text-[#111827]">Polityka Prywatności</h1>
        <p className="text-[#9CA3AF] text-sm mb-10">Ostatnia aktualizacja: marzec 2026</p>

        <div className="space-y-10 text-[#4B5563] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">1. Administrator danych</h2>
            <p>
              Administratorem Twoich danych osobowych jest <strong className="text-[#111827]">InnowacyjneAI sp. z o.o.</strong>,
              świadcząca usługę OneLink. W sprawach dotyczących danych osobowych możesz skontaktować się z nami pod adresem:{" "}
              <a href="mailto:kontakt@onelink.pl" className="text-blue-600 hover:text-blue-700 transition-colors">
                kontakt@onelink.pl
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">2. Jakie dane zbieramy</h2>
            <p className="mb-3">W ramach świadczenia usługi OneLink przetwarzamy następujące dane:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong className="text-[#111827]">Adres e-mail</strong> — niezbędny do założenia konta i komunikacji z Tobą.</li>
              <li><strong className="text-[#111827]">Nazwa firmy</strong> — wykorzystywana do personalizacji konta i fakturowania.</li>
              <li><strong className="text-[#111827]">Dane płatnicze</strong> — obsługiwane wyłącznie przez Stripe. Nie przechowujemy numerów kart ani pełnych danych płatniczych na naszych serwerach. Stripe przetwarza płatności zgodnie z własną polityką prywatności oraz standardem PCI DSS.</li>
              <li><strong className="text-[#111827]">Dane operacyjne</strong> — dane wprowadzane przez Ciebie lub Twoich pracowników w aplikacji (sprzedaż, faktury, stany magazynowe), niezbędne do świadczenia usługi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">3. Cel przetwarzania danych</h2>
            <p className="mb-3">Twoje dane przetwarzamy w następujących celach:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Świadczenie usługi OneLink oraz umożliwienie logowania i korzystania z aplikacji.</li>
              <li>Wystawianie faktur i obsługa płatności za pośrednictwem Stripe.</li>
              <li>Komunikacja z Tobą — odpowiadanie na pytania, wysyłanie powiadomień dotyczących konta i aktualizacji usługi.</li>
              <li>Zapewnienie bezpieczeństwa konta i wykrywanie nadużyć.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">4. Przechowywanie danych</h2>
            <p className="mb-3">Twoje dane są przechowywane na bezpiecznych serwerach:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-[#111827]">Supabase</strong> — dane aplikacji przechowywane są na serwerach w Unii Europejskiej,
                co zapewnia zgodność z wymogami RODO.
              </li>
              <li>
                <strong className="text-[#111827]">Stripe</strong> — dane płatnicze przetwarzane i przechowywane przez Stripe zgodnie
                z normą PCI DSS. Więcej informacji:{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors">stripe.com/privacy</a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">5. Okres przechowywania danych</h2>
            <p>
              Twoje dane przechowujemy przez czas trwania subskrypcji. Po anulowaniu konta dane są
              przechowywane przez <strong className="text-[#111827]">30 dni</strong>, w ciągu których możesz przywrócić konto lub
              pobrać swoje dane. Po upływie tego okresu wszystkie dane są trwale i nieodwracalnie usuwane
              z naszych serwerów.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">6. Twoje prawa (RODO)</h2>
            <p className="mb-3">Zgodnie z Rozporządzeniem o Ochronie Danych Osobowych (RODO) przysługują Ci następujące prawa:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong className="text-[#111827]">Prawo dostępu</strong> — możesz w każdej chwili zażądać informacji o tym, jakie dane na Twój temat przetwarzamy.</li>
              <li><strong className="text-[#111827]">Prawo do sprostowania</strong> — możesz poprawić nieprawidłowe lub niekompletne dane.</li>
              <li><strong className="text-[#111827]">Prawo do usunięcia</strong> — możesz zażądać usunięcia swoich danych (tzw. &quot;prawo do bycia zapomnianym&quot;).</li>
              <li><strong className="text-[#111827]">Prawo do przenoszenia danych</strong> — możesz otrzymać swoje dane w ustrukturyzowanym formacie.</li>
              <li><strong className="text-[#111827]">Prawo do sprzeciwu</strong> — możesz sprzeciwić się przetwarzaniu danych w określonych celach.</li>
            </ul>
            <p className="mt-4">
              Aby skorzystać z powyższych praw, skontaktuj się z nami:{" "}
              <a href="mailto:kontakt@onelink.pl" className="text-blue-600 hover:text-blue-700 transition-colors">
                kontakt@onelink.pl
              </a>.
              Odpowiemy w ciągu 30 dni od otrzymania żądania.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">7. Pliki cookies</h2>
            <p>
              Używamy wyłącznie <strong className="text-[#111827]">niezbędnych plików cookies</strong> służących do uwierzytelniania użytkownika
              i utrzymania sesji w aplikacji. Nie używamy cookies analitycznych, reklamowych ani cookies stron trzecich
              (z wyjątkiem Stripe, które może ustawiać własne cookies w celu przetwarzania płatności).
              Korzystając z OneLink, wyrażasz zgodę na używanie tych niezbędnych plików cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">8. Zgodność z RODO</h2>
            <p>
              InnowacyjneAI sp. z o.o. przetwarza dane osobowe zgodnie z Rozporządzeniem Parlamentu Europejskiego
              i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO). Jako podstawę prawną przetwarzania
              stosujemy: wykonanie umowy (art. 6 ust. 1 lit. b RODO) oraz uzasadniony interes administratora
              (art. 6 ust. 1 lit. f RODO). Twoje dane nie są przekazywane poza Europejski Obszar Gospodarczy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#111827] mb-3">9. Kontakt</h2>
            <p>
              W razie pytań dotyczących niniejszej Polityki Prywatności lub przetwarzania Twoich danych
              osobowych, skontaktuj się z nami:{" "}
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
