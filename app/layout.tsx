import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "OneLink — System Zarządzania Małym Biznesem | P&L, Koszty, Magazyn",
  description: "OneLink to system zarządzania małym biznesem — P&L w czasie rzeczywistym, kontrola kosztów, magazyn i faktury. Zacznij bezpłatny 7-dniowy trial.",
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin", "latin-ext"],
});

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Co to jest OneLink i dla kogo jest przeznaczony?", "acceptedAnswer": { "@type": "Answer", "text": "OneLink to system zarządzania małym biznesem, który pozwala właścicielom kontrolować P&L, koszty, magazyn i faktury z jednego panelu — w czasie rzeczywistym. Przeznaczony dla właścicieli restauracji, piekarni, cukierni, delikatesów i każdego biznesu, który chce widzieć swoje liczby na bieżąco." } },
    { "@type": "Question", "name": "Czy muszę podawać kartę kredytową przy rejestracji?", "acceptedAnswer": { "@type": "Answer", "text": "Tak, przy rejestracji prosimy o dane karty przez Stripe. Nie pobieramy żadnej opłaty przez 7 dni. Karta jest potrzebna do natychmiastowej aktywacji konta i zabezpieczenia Twoich danych po zakończeniu trialu. Możesz anulować w dowolnym momencie przed upływem 7 dni — żadna płatność nie zostanie pobrana." } },
    { "@type": "Question", "name": "Ile kosztuje OneLink po zakończeniu bezpłatnego trialu?", "acceptedAnswer": { "@type": "Answer", "text": "Plany zaczynają się od 299 zł miesięcznie. Szczegóły wszystkich planów znajdziesz na stronie /pricing. Możesz anulować w dowolnym momencie — bez okresu wypowiedzenia." } },
    { "@type": "Question", "name": "Jak długo trwa wdrożenie i konfiguracja systemu?", "acceptedAnswer": { "@type": "Answer", "text": "Pierwsze konto jest gotowe w około 3 minuty. Pełna konfiguracja z zaproszeniem managerów i połączeniem danych zajmuje do 20 minut. Nie potrzebujesz działu IT ani technicznej wiedzy." } },
    { "@type": "Question", "name": "Czy OneLink integruje się z moim systemem kasowym lub POS?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. OneLink obsługuje import danych z popularnych systemów kasowych oraz import plików CSV. Jeśli korzystasz z konkretnego systemu POS, skontaktuj się z nami — aktywnie rozwijamy integracje." } },
    { "@type": "Question", "name": "Czy managerowie muszą instalować aplikację?", "acceptedAnswer": { "@type": "Answer", "text": "Nie. Managerowie korzystają z aplikacji webowej dostępnej przez przeglądarkę na telefonie lub tablecie — bez instalacji. Dostępna jest też wersja mobilna w App Store i Google Play (wkrótce)." } },
    { "@type": "Question", "name": "Jak działa kontrola food cost w OneLink?", "acceptedAnswer": { "@type": "Answer", "text": "OneLink śledzi zużycie teoretyczne składników (na podstawie receptur i sprzedaży) i porównuje je z rzeczywistymi stanami magazynowymi. Odchylenia są automatycznie wykrywane i sygnalizowane alertem. Dzięki temu wiesz, gdzie znika towar — zanim zorientujesz się na koniec miesiąca." } },
    { "@type": "Question", "name": "Czy mogę zarządzać kilkoma lokalami z jednego konta?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. OneLink jest zaprojektowany do zarządzania wieloma lokalizacjami z jednego panelu właściciela. Możesz porównywać wyniki, transferować stany między lokalami i zatwierdzać faktury z każdego z nich." } },
    { "@type": "Question", "name": "Czy moje dane są bezpieczne?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. Dane są szyfrowane i przechowywane na bezpiecznych serwerach. Płatności obsługuje Stripe — jeden z najbardziej zaufanych procesorów płatności na świecie. Nie udostępniamy danych podmiotom trzecim." } },
    { "@type": "Question", "name": "Jak działa workflow zatwierdzania faktur?", "acceptedAnswer": { "@type": "Answer", "text": "Manager przesyła fakturę (zdjęcie lub PDF) przez aplikację. Ty otrzymujesz powiadomienie, przeglądasz fakturę i zatwierdzasz lub odrzucasz jednym kliknięciem. Pełna historia zatwierdzeń jest dostępna w każdej chwili i gotowa do eksportu do księgowości." } },
    { "@type": "Question", "name": "Czy OneLink działa dla piekarni, cukierni albo delikatesów — nie tylko restauracji?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. OneLink działa dla każdego małego biznesu, który zarządza kosztami surowców, stanami magazynowymi i fakturami. Piekarnie, cukiernie, delikatesy, kawiarnie, catering — wszystkie te biznesy korzystają z tych samych funkcji." } },
    { "@type": "Question", "name": "Co to jest P&L i po co mi to?", "acceptedAnswer": { "@type": "Answer", "text": "P&L (Profit & Loss, rachunek zysków i strat) pokazuje Twoje przychody minus wszystkie koszty = zysk netto. W OneLink widzisz P&L każdego dnia, a nie raz w miesiącu na spotkaniu z księgową. Dzięki temu możesz reagować na bieżąco." } },
    { "@type": "Question", "name": "Czy mogę eksportować dane do programu księgowego?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. OneLink umożliwia eksport faktur i zestawień kosztów w formatach kompatybilnych z popularnymi programami księgowymi. Szczegółowy wykaz formatów dostępny po zalogowaniu." } },
    { "@type": "Question", "name": "Jak OneLink pomaga obniżyć food cost?", "acceptedAnswer": { "@type": "Answer", "text": "System automatycznie wykrywa odchylenia między zużyciem teoretycznym a rzeczywistym. Gdy składnik 'znika' ponad normę — system wysyła alert. Nasi klienci odnotowują średnio 2–4 pp. obniżenia food cost w ciągu 90 dni od wdrożeniu." } },
    { "@type": "Question", "name": "Czy jest wsparcie techniczne po polsku?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. Wsparcie techniczne jest dostępne w języku polskim — przez czat, e-mail i telefon. Czas odpowiedzi w godzinach roboczych: do 4 godzin." } },
    { "@type": "Question", "name": "Co się stanie z moimi danymi po anulowaniu subskrypcji?", "acceptedAnswer": { "@type": "Answer", "text": "Twoje dane są przechowywane przez 30 dni po anulowaniu. W tym czasie możesz je wyeksportować. Po upływie 30 dni dane są trwale usuwane z naszych serwerów." } },
    { "@type": "Question", "name": "Ile kont managerów mogę dodać?", "acceptedAnswer": { "@type": "Answer", "text": "Liczba kont zależy od planu. Plan Starter zawiera 2 konta managerów, plan Business — bez ograniczeń. Szczegóły na stronie cennika." } },
    { "@type": "Question", "name": "Czy mogę zmienić plan w trakcie subskrypcji?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. Możesz zmienić plan w dowolnym momencie — zarówno na wyższy, jak i niższy. Zmiana wchodzi w życie od następnego okresu rozliczeniowego. Nie ma żadnych kar za zmianę." } },
    { "@type": "Question", "name": "Jak OneLink porównuje się do arkuszy Excel?", "acceptedAnswer": { "@type": "Answer", "text": "Excel wymaga ręcznego wprowadzania danych, formuł i nie daje alertów w czasie rzeczywistym. OneLink automatyzuje zbieranie danych od managerów, oblicza P&L na bieżąco i alarmuje przy odchyleniach — bez żadnych formuł. Zamknięcie dnia trwa 10 minut zamiast godziny." } },
    { "@type": "Question", "name": "Czy OneLink działa na telefonie?", "acceptedAnswer": { "@type": "Answer", "text": "Tak. Panel właściciela działa w przeglądarce na telefonie, tablecie i komputerze. Aplikacja mobilna dla pracowników (iOS i Android) jest dostępna wkrótce — już teraz działa jako wersja webowa pod adresem /employee." } }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#F7F8FA] text-[#111827]`}>
        {children}
      </body>
    </html>
  );
}
