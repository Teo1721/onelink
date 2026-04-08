'use client'

import { useState, useMemo } from 'react'
import { HelpCircle, X, Search, ChevronDown, ChevronRight } from 'lucide-react'

/* ================================================================== */
/* HELP CONTENT — one entry per sidebar view key                       */
/* ================================================================== */
type HelpStep = { title: string; text: string }
type HelpEntry = { title: string; icon: string; description: string; steps: HelpStep[] }

const HELP: Record<string, HelpEntry> = {
  dashboard: {
    title: 'Dashboard', icon: '📊',
    description: 'Główny ekran z podsumowaniem sprzedaży, kosztów i zadań do zatwierdzenia.',
    steps: [
      { title: 'Karty zadań', text: 'Cztery karty u góry pokazują liczbę oczekujących raportów dziennych, faktur, inwentaryzacji i alertów. Kliknij kartę, aby przejść bezpośrednio do listy.' },
      { title: 'Filtrowanie po lokalizacji', text: 'W lewym górnym rogu wybierz konkretny lokal lub "Wszystkie" aby zobaczyć dane zbiorcze dla całej sieci.' },
      { title: 'Zmiana okresu', text: 'Przycisk "Dziś / Tydzień / Miesiąc" zmienia zakres dat wykresów i kart KPI.' },
      { title: 'Wykresy sprzedaży', text: 'Wykres liniowy prezentuje trend sprzedaży netto. Czerwona linia oznacza próg planu. Słupki porównują lokale.' },
      { title: 'Alerty', text: 'Żółte i czerwone alerty informują o przekroczeniu progu kosztów pracy (>40%) lub odchyleniu sprzedaży poniżej 80% planu.' },
    ],
  },
  pnl: {
    title: 'P&L (Zyski i Straty)', icon: '💰',
    description: 'Pełne zestawienie przychodów, kosztów i marży dla wybranego okresu.',
    steps: [
      { title: 'Wybierz okres', text: 'Ustaw daty "Od" i "Do" w górnym filtrze. Dane pobierane są z zatwierdzonych raportów dziennych i faktur.' },
      { title: 'Przychody', text: 'Sprzedaż brutto i netto pochodzi z zatwierdzonych raportów dziennych. Upewnij się, że menedżerowie zatwierdzili wszystkie dni.' },
      { title: 'Koszty jedzenia (Food Cost)', text: 'Faktury COS przypisane do okresu. Procent food cost = koszt / sprzedaż netto × 100.' },
      { title: 'Koszty operacyjne (SEMIS)', text: 'Koszty stałe i zmienne z faktur SEMIS — czynsz, media, serwis, inne.' },
      { title: 'Koszty pracy', text: 'Suma wynagrodzeń z ewidencji czasu pracy (stawka × godziny). Uzupełnij stawki pracowników w zakładce Pracownicy.' },
      { title: 'Eksport', text: 'Przycisk "Eksportuj Excel" pobiera pełny arkusz P&L gotowy do księgowości.' },
    ],
  },
  notifications: {
    title: 'Powiadomienia', icon: '🔔',
    description: 'Centrum powiadomień — alerty systemowe, zadania do zatwierdzenia i komunikaty.',
    steps: [
      { title: 'Typy powiadomień', text: 'Alerty (odchylenia od planu), zadania (oczekujące zatwierdzenia) i komunikaty ogólne.' },
      { title: 'Oznaczanie jako przeczytane', text: 'Kliknij powiadomienie, aby oznaczyć je jako przeczytane. Licznik w sidebarze spadnie do zera.' },
      { title: 'Usuwanie', text: 'Kliknij ikonę kosza przy powiadomieniu, aby je usunąć. Można też usunąć wszystkie naraz.' },
    ],
  },
  ingredients: {
    title: 'Składniki', icon: '🧂',
    description: 'Baza składników używanych w recepturach — ceny, jednostki miary i dostawcy.',
    steps: [
      { title: 'Dodaj składnik', text: 'Kliknij "Dodaj składnik", wpisz nazwę, jednostkę miary (kg, l, szt.) i aktualną cenę netto za jednostkę.' },
      { title: 'Aktualizacja cen', text: 'Po zmianie ceny u dostawcy kliknij ikonę edycji przy składniku i zaktualizuj cenę. System automatycznie przeliczy koszt receptur.' },
      { title: 'Historia cen', text: 'Ikona zegara przy składniku pokazuje historię zmian cen. Przydatne do analizy inflacji kosztów.' },
      { title: 'Import', text: 'Możesz zaimportować składniki z arkusza Excel. Kolumny: nazwa, jednostka, cena.' },
    ],
  },
  dishes: {
    title: 'Receptury', icon: '👨‍🍳',
    description: 'Receptury dań — lista składników, gramatura i automatyczny koszt produkcji.',
    steps: [
      { title: 'Utwórz recepturę', text: 'Kliknij "Nowa receptura", wpisz nazwę dania i dodaj składniki z bazy. Podaj gramaturę każdego składnika w gramach.' },
      { title: 'Koszt produkcji', text: 'System automatycznie liczy koszt na podstawie grammatur i cen składników. Widoczny jest koszt surowców i sugerowana cena sprzedaży.' },
      { title: 'Marża', text: 'Ustaw docelową marżę procentową — kalkulator pokaże minimalną cenę menu.' },
      { title: 'Aktualizacja', text: 'Gdy zmienisz cenę składnika, koszt receptury aktualizuje się automatycznie.' },
    ],
  },
  menu_calculator: {
    title: 'Kalkulator ceny', icon: '🧮',
    description: 'Kalkulator optymalnej ceny sprzedaży na podstawie kosztu surowców i docelowej marży.',
    steps: [
      { title: 'Wybierz recepturę', text: 'Wybierz danie z listy lub wpisz ręcznie koszt surowców.' },
      { title: 'Ustaw marżę', text: 'Wpisz docelowy procent food cost (np. 28%) lub docelową marżę. Kalkulator wyliczy cenę netto i brutto.' },
      { title: 'VAT', text: 'Wybierz stawkę VAT (5%, 8%, 23%). Cena brutto jest automatycznie obliczana.' },
      { title: 'Porównanie', text: 'Zestawienie pokazuje aktualne ceny menu vs zalecane ceny. Czerwone pozycje oznaczają zaniżone ceny.' },
    ],
  },
  menu_pricing: {
    title: 'Wycena menu', icon: '📋',
    description: 'Tabela wszystkich dań z aktualnymi cenami, kosztami i marżami.',
    steps: [
      { title: 'Przegląd marż', text: 'Tabela pokazuje dla każdego dania: cena menu, koszt surowców, marża %. Czerwone wiersze = marża poniżej progu.' },
      { title: 'Filtrowanie', text: 'Filtruj po kategorii (przystawki, dania główne, desery) lub po lokalu.' },
      { title: 'Masowa zmiana cen', text: 'Zaznacz kilka dań i użyj "Zmień ceny o %" aby podnieść/obniżyć ceny zbiorczo.' },
      { title: 'Eksport', text: 'Pobierz tabelę cenową jako PDF lub Excel do druku lub importu do kasy fiskalnej.' },
    ],
  },
  products: {
    title: 'Produkty', icon: '📦',
    description: 'Katalog produktów magazynowych — artykuły kupowane i przechowywane w magazynie.',
    steps: [
      { title: 'Dodaj produkt', text: 'Kliknij "Nowy produkt", wpisz nazwę, kategorię, jednostkę miary i minimalny stan magazynowy.' },
      { title: 'Kategorie', text: 'Przypisz produkt do kategorii (napoje, mięso, warzywa itp.) aby łatwiej zarządzać inwentaryzacjami.' },
      { title: 'Minimalny stan', text: 'Ustaw minimalny poziom zapasów. System wyśle alert gdy stan spadnie poniżej minimum.' },
      { title: 'Powiązanie ze składnikiem', text: 'Jeśli produkt jest też składnikiem receptur, powiąż go ze składnikiem aby ceny były spójne.' },
    ],
  },
  central_warehouse: {
    title: 'Stan magazynu', icon: '🏭',
    description: 'Centralny podgląd stanów magazynowych we wszystkich lokalizacjach.',
    steps: [
      { title: 'Przegląd stanów', text: 'Tabela pokazuje aktualny stan każdego produktu w każdej lokalizacji. Czerwone komórki = poniżej minimum.' },
      { title: 'Transakcje', text: 'Każde przyjęcie towaru (dostawa) lub rozchód (zużycie) jest logowane. Historia dostępna po kliknięciu produktu.' },
      { title: 'Transfer między lokalami', text: 'Możesz przesunąć towar między lokalizacjami — wpisz ilość i lokalizację docelową.' },
      { title: 'Korekta stanu', text: 'Jeśli stan w systemie różni się od fizycznego, użyj korekty z podaniem przyczyny.' },
    ],
  },
  warehouse_deviations: {
    title: 'Odchylenia magazynowe', icon: '⚠️',
    description: 'Raport różnic między zużyciem teoretycznym (receptury) a faktycznym (inwentaryzacje).',
    steps: [
      { title: 'Jak działa', text: 'System porównuje ile towarów "powinno" zostać zużyte (sprzedaż × receptury) vs ile faktycznie zniknęło z magazynu.' },
      { title: 'Odchylenie dodatnie', text: 'Zużyto mniej niż teoretycznie — możliwa nadprodukcja lub błąd receptury.' },
      { title: 'Odchylenie ujemne', text: 'Zużyto więcej niż teoretycznie — możliwe marnowanie, kradzież lub błąd w recepturze.' },
      { title: 'Próg alertu', text: 'Odchylenia powyżej 5% są zaznaczone na czerwono. Zbadaj przyczynę i skoryguj receptury lub stan magazynu.' },
    ],
  },
  daily_reports: {
    title: 'Raporty dzienne', icon: '📝',
    description: 'Lista raportów dziennych przesłanych przez menedżerów lokali — przeglądaj i zatwierdzaj.',
    steps: [
      { title: 'Lista raportów', text: 'Raporty sortowane od najnowszych. Kolory: szary = oczekujący, zielony = zatwierdzony, czerwony = odrzucony.' },
      { title: 'Podgląd raportu', text: 'Kliknij raport aby zobaczyć szczegóły: sprzedaż brutto/netto, płatności karta/gotówka/online, koszty pracy, zdarzenia.' },
      { title: 'Zatwierdzanie', text: 'Po weryfikacji kliknij "Zatwierdź". Dane trafią do P&L. Możesz odrzucić raport z komentarzem.' },
      { title: 'Odchylenia', text: 'Czerwone flagi oznaczają: sprzedaż < 80% planu, koszt pracy > 40%, różnica w kasie > 20 zł.' },
    ],
  },
  approvals: {
    title: 'Zatwierdzanie faktur', icon: '🧾',
    description: 'Faktury przesłane przez menedżerów lokali czekające na zatwierdzenie przez centralę.',
    steps: [
      { title: 'Typy faktur', text: 'COS (koszt surowców — jedzenie, napoje) i SEMIS (koszty operacyjne — czynsz, media, serwis).' },
      { title: 'Weryfikacja', text: 'Sprawdź dostawcę, numer faktury, datę i kwotę. Kliknij ikonę oka aby zobaczyć skan faktury.' },
      { title: 'Zatwierdzenie', text: 'Kliknij "Zatwierdź" — faktura trafi do P&L w odpowiednim miesiącu.' },
      { title: 'Odrzucenie', text: 'Kliknij "Odrzuć" i podaj powód. Menedżer otrzyma powiadomienie i będzie musiał przesłać poprawioną wersję.' },
      { title: 'Historia', text: 'Zakładka "Historia" pokazuje wszystkie zatwierdzone faktury z możliwością filtrowania po dacie i lokalu.' },
    ],
  },
  inv_approvals: {
    title: 'Zatwierdzanie inwentaryzacji', icon: '✅',
    description: 'Inwentaryzacje przesłane przez lokale czekające na zatwierdzenie.',
    steps: [
      { title: 'Podgląd', text: 'Kliknij inwentaryzację aby zobaczyć wszystkie zliczone produkty vs stan oczekiwany.' },
      { title: 'Odchylenia', text: 'Tabela wyróżnia produkty z dużymi różnicami. Sprawdź czy różnice są uzasadnione (np. dostawa w trakcie).' },
      { title: 'Zatwierdzenie', text: 'Zatwierdź jeśli dane są poprawne — stan magazynu zostanie zaktualizowany.' },
      { title: 'Odrzucenie', text: 'Odrzuć z komentarzem jeśli dane wymagają korekty. Menedżer będzie musiał poprawić i przesłać ponownie.' },
    ],
  },
  semis_verification: {
    title: 'Weryfikacja SEMIS', icon: '🔄',
    description: 'Uzgodnienie kosztów operacyjnych (SEMIS) — porównanie faktur z wpisami w raportach dziennych.',
    steps: [
      { title: 'Co to SEMIS', text: 'SEMIS to koszty operacyjne powtarzalne: czynsz, media, wywóz śmieci, serwis maszyn, abonament itp.' },
      { title: 'Dopasowanie', text: 'System łączy faktury SEMIS z wpisami w raportach dziennych. Zielone = dopasowane, czerwone = brakujące.' },
      { title: 'Korekta', text: 'Jeśli wpis nie pasuje do faktury, popraw kategorię lub kwotę i zatwierdź ponownie.' },
    ],
  },
  monthly: {
    title: 'Inwentaryzacja miesięczna', icon: '📅',
    description: 'Pełna inwentaryzacja wykonywana raz w miesiącu — zliczenie wszystkich produktów.',
    steps: [
      { title: 'Tworzenie inwentaryzacji', text: 'Kliknij "Nowa inwentaryzacja", wybierz lokal i datę. System wygeneruje listę wszystkich produktów.' },
      { title: 'Zliczanie', text: 'Menedżer lokalu zlicza fizycznie każdy produkt i wpisuje ilość w aplikacji mobilnej lub na tablecie.' },
      { title: 'Przesyłanie', text: 'Po zliczeniu wszystkich produktów menedżer klika "Prześlij do zatwierdzenia".' },
      { title: 'Zatwierdzenie', text: 'W zakładce "Zatwierdzenia → Inwentaryzacje" centralnie zatwierdź lub odrzuć z komentarzem.' },
      { title: 'Zamknięcie miesiąca', text: 'Zatwierdzona inwentaryzacja jest wymagana do zamknięcia miesiąca w zakładce "Zamknięcie m-ca".' },
    ],
  },
  weekly: {
    title: 'Inwentaryzacja tygodniowa', icon: '📆',
    description: 'Szybka inwentaryzacja kluczowych produktów wykonywana co tydzień.',
    steps: [
      { title: 'Klucz produkty', text: 'Tygodniowa inwentaryzacja obejmuje tylko wybrane produkty o wysokim koszcie (mięso, ryby, alkohole).' },
      { title: 'Tworzenie', text: 'Kliknij "Nowa inwentaryzacja tygodniowa" i wybierz tydzień. Lista produktów jest predefiniowana.' },
      { title: 'Przepływ', text: 'Taki sam jak miesięczna: lokal zlicza → przesyła → central zatwierdza.' },
    ],
  },
  reports: {
    title: 'Raporty', icon: '📈',
    description: 'Zaawansowane raporty analityczne — sprzedaż, food cost, praca, inwentaryzacje.',
    steps: [
      { title: 'Typy raportów', text: 'Sprzedaż dzienna/tygodniowa/miesięczna, porównanie lokali, food cost trend, koszt pracy, odchylenia magazynowe.' },
      { title: 'Filtry', text: 'Wybierz typ raportu, zakres dat i lokalizację. Kliknij "Generuj".' },
      { title: 'Eksport', text: 'Każdy raport można pobrać jako Excel lub PDF. Przycisk eksportu w prawym górnym rogu raportu.' },
      { title: 'Wykresy', text: 'Kliknij zakładkę "Wykres" obok "Tabela" aby zobaczyć dane wizualnie.' },
    ],
  },
  history: {
    title: 'Historia', icon: '🕐',
    description: 'Archiwum wszystkich zatwierdzonych raportów, faktur i inwentaryzacji.',
    steps: [
      { title: 'Wyszukiwanie', text: 'Użyj pola wyszukiwania i filtrów daty aby znaleźć konkretne rekordy.' },
      { title: 'Podgląd', text: 'Kliknij dowolny rekord aby zobaczyć jego szczegóły i status.' },
      { title: 'Eksport', text: 'Zaznacz wiele rekordów i kliknij "Eksportuj zaznaczone" aby pobrać zbiorczo.' },
    ],
  },
  imported: {
    title: 'Import Excel', icon: '📊',
    description: 'Importuj historyczne dane sprzedaży z arkuszy Excel.',
    steps: [
      { title: 'Format pliku', text: 'Przygotuj arkusz Excel z kolumnami: data, lokalizacja, sprzedaż brutto, transakcje. Pobierz szablon klikając "Pobierz szablon".' },
      { title: 'Import', text: 'Przeciągnij plik lub kliknij "Wybierz plik". System sprawdzi format i pokaże podgląd danych.' },
      { title: 'Weryfikacja', text: 'Przejrzyj podgląd — zielone wiersze zostaną zaimportowane, czerwone mają błędy (np. nieprawidłowa data).' },
      { title: 'Zatwierdzenie', text: 'Kliknij "Importuj" aby zatwierdzić. Dane pojawią się w raportach i P&L.' },
    ],
  },
  schedule: {
    title: 'Grafik pracy', icon: '📅',
    description: 'Planowanie zmian pracowników — tygodniowy widok kalendarza dla każdego lokalu.',
    steps: [
      { title: 'Wybierz lokal i tydzień', text: 'Wybierz lokal w górnym filtrze i przejdź do odpowiedniego tygodnia strzałkami.' },
      { title: 'Dodaj zmianę', text: 'Kliknij komórkę w siatce (pracownik × dzień) i wpisz godziny zmiany (np. 08:00–16:00). Zatwierdź Enterem.' },
      { title: 'Kopiuj tydzień', text: 'Kliknij "Kopiuj poprzedni tydzień" aby skopiować cały grafik z poprzedniego tygodnia.' },
      { title: 'Zmiany nocne', text: 'Wpisz godziny przekraczające północ (np. 22:00–04:00) — system automatycznie oznaczy zmianę jako nocną 🌙.' },
      { title: 'Publikacja', text: 'Kliknij "Opublikuj grafik" aby pracownicy zobaczyli swoje zmiany w aplikacji mobilnej.' },
      { title: 'Koszt pracy', text: 'Dół siatki pokazuje całkowite godziny i szacowany koszt pracy dla każdego dnia.' },
    ],
  },
  hr_dashboard: {
    title: 'Dashboard HR', icon: '👥',
    description: 'Przegląd wskaźników HR — obecność, urlopy, certyfikaty dla wszystkich lokali.',
    steps: [
      { title: 'Obecność dziś', text: 'Karta "Dziś w pracy" pokazuje ilu pracowników jest aktualnie zalogowanych. Zielona kropka = aktywna zmiana.' },
      { title: 'Oczekujące urlopy', text: 'Liczba wniosków urlopowych czekających na zatwierdzenie. Kliknij aby przejść do listy.' },
      { title: 'Wygasające certyfikaty', text: 'Lista certyfikatów wygasających w ciągu 30 dni. Zareaguj zanim wygasną.' },
      { title: 'Porównanie lokali', text: 'Tabela porównuje wskaźniki obecności między lokalami — znajdź lokale z wysoką absencją.' },
    ],
  },
  hr_attendance: {
    title: 'Ewidencja czasu pracy', icon: '⏱️',
    description: 'Rejestr wejść i wyjść pracowników — z możliwością ręcznej korekty i eksportu.',
    steps: [
      { title: 'Wybierz lokal i miesiąc', text: 'Filtruj po lokalizacji i miesiącu. Tabela pokazuje każdego pracownika z sumą przepracowanych godzin.' },
      { title: 'Podgląd szczegółów', text: 'Kliknij pracownika aby rozwinąć szczegóły — każdy dzień z godziną wejścia, wyjścia i przerwą.' },
      { title: 'Korekta ręczna', text: 'Kliknij ikonę edycji przy wpisie aby poprawić godzinę wejścia/wyjścia. Dodaj nowy wpis przyciskiem "+".' },
      { title: 'Godziny nocne', text: 'Kolumna "Nocne" pokazuje godziny przepracowane między 23:00 a 06:00. Wprowadź stawkę nocną w polu powyżej tabeli.' },
      { title: 'Eksport PDF', text: 'Kliknij "Eksport PDF" aby pobrać kartę pracy gotową do podpisu. Zawiera godziny dzienne, nocne i urlopy.' },
      { title: 'Eksport Excel', text: 'Kliknij "Eksport Excel" aby pobrać arkusz z trzema zakładkami: podsumowanie, szczegóły i urlopy.' },
    ],
  },
  hr_leave: {
    title: 'Urlopy', icon: '🏖️',
    description: 'Zarządzanie wnioskami urlopowymi pracowników.',
    steps: [
      { title: 'Lista wniosków', text: 'Widoczne są wszystkie wnioski: oczekujące (żółte), zatwierdzone (zielone), odrzucone (czerwone).' },
      { title: 'Zatwierdzanie', text: 'Kliknij wniosek i zatwierdź lub odrzuć z komentarzem. Pracownik otrzyma powiadomienie.' },
      { title: 'Typy urlopów', text: 'Urlop wypoczynkowy, chorobowy, macierzyński, ojcowski, okolicznościowy. Każdy typ jest inaczej oznaczony.' },
      { title: 'Konflikt zmian', text: 'System ostrzega jeśli urlop pokrywa się z zaplanowaną zmianą w grafiku.' },
      { title: 'Eksport', text: 'Urlopy pojawiają się automatycznie w eksporcie ewidencji czasu pracy jako osobna kolumna.' },
    ],
  },
  hr_swaps: {
    title: 'Zamiany zmian', icon: '🔄',
    description: 'Wnioski pracowników o zamianę zmian między sobą.',
    steps: [
      { title: 'Jak działa', text: 'Pracownik A prosi pracownika B o zamianę zmian. B akceptuje lub odrzuca w aplikacji mobilnej. Manager zatwierdza finalnie.' },
      { title: 'Zatwierdzanie', text: 'Kliknij wniosek aby zobaczyć szczegóły: kto z kim, która zmiana. Zatwierdź lub odrzuć.' },
      { title: 'Po zatwierdzeniu', text: 'Grafik aktualizuje się automatycznie — zmiana jest przeniesiona.' },
    ],
  },
  hr_certs: {
    title: 'Certyfikaty', icon: '🎓',
    description: 'Rejestr certyfikatów i szkoleń pracowników z datami ważności.',
    steps: [
      { title: 'Dodaj certyfikat', text: 'Kliknij "Dodaj" przy pracowniku, wpisz nazwę certyfikatu, datę wystawienia i datę ważności.' },
      { title: 'Alerty wygaśnięcia', text: 'Certyfikaty wygasające w ciągu 30 dni są oznaczone żółto, wygasłe — czerwono.' },
      { title: 'Typy', text: 'Sanepid, BHP, uprawnienia do obsługi sprzętu, alkohol, kasa fiskalna itp.' },
      { title: 'Dokumenty', text: 'Skany certyfikatów przechowuj w zakładce Dokumenty powiązanej z pracownikiem.' },
    ],
  },
  hr_documents: {
    title: 'Dokumenty pracowników', icon: '📁',
    description: 'Przechowywanie skanów umów, certyfikatów i innych dokumentów pracowniczych.',
    steps: [
      { title: 'Dodaj dokument', text: 'Kliknij "Dodaj plik" przy pracowniku, wybierz plik, ustaw typ dokumentu i opcjonalną datę ważności.' },
      { title: 'Typy dokumentów', text: 'Umowa o pracę, certyfikat, badania medyczne, zaświadczenie, inne.' },
      { title: 'Data ważności', text: 'Ustaw datę ważności dla umów i certyfikatów. System pokaże alert 30 dni przed wygaśnięciem.' },
      { title: 'Alerty', text: 'Pomarańczowy baner u góry pokazuje dokumenty wygasające w ciągu 30 dni. Kliknij dokument aby pobrać lub podejrzeć.' },
    ],
  },
  hr_tips: {
    title: 'Napiwki', icon: '💵',
    description: 'Ewidencja i rozliczanie napiwków między pracownikami.',
    steps: [
      { title: 'Dodaj napiwki', text: 'Wpisz datę i łączną kwotę napiwków za dany dzień lub zmianę.' },
      { title: 'Dystrybucja', text: 'Ustaw klucz podziału (np. równo / proporcjonalnie do godzin). System wyliczy ile dostaje każdy pracownik.' },
      { title: 'Historia', text: 'Tabela historii pokazuje wszystkie wypłacone napiwki z podziałem na pracowników.' },
      { title: 'Eksport', text: 'Pobierz zestawienie napiwków jako Excel do rozliczenia podatkowego.' },
    ],
  },
  hr_onboarding: {
    title: 'Onboarding', icon: '🎯',
    description: 'Lista zadań wdrożeniowych dla nowych pracowników.',
    steps: [
      { title: 'Nowy pracownik', text: 'Gdy dodajesz nowego pracownika, kliknij "Utwórz onboarding" — system doda domyślną listę zadań wdrożeniowych.' },
      { title: 'Lista zadań', text: 'Domyślne zadania: podpisanie umowy, szkolenie BHP, zapoznanie z procedurami, dostęp do aplikacji, badania, strój.' },
      { title: 'Zaznaczanie', text: 'Kliknij checkbox przy każdym zadaniu gdy jest ukończone. Pasek postępu aktualizuje się na żywo.' },
      { title: 'Własne zadania', text: 'Dodaj własne zadania klikając "Dodaj zadanie" pod listą — np. "Szkolenie z obsługi kasy".' },
      { title: 'Ukończenie', text: 'Gdy pasek postępu osiągnie 100%, pracownik jest uznany za wdrożonego. Możesz archiwizować kartę.' },
    ],
  },
  employees: {
    title: 'Pracownicy', icon: '👤',
    description: 'Baza danych pracowników — dane kontaktowe, stanowiska, stawki i konta aplikacji.',
    steps: [
      { title: 'Dodaj pracownika', text: 'Kliknij "Dodaj pracownika", wypełnij: imię i nazwisko, stanowisko, lokalizację i stawkę godzinową.' },
      { title: 'Zaproszenie do aplikacji', text: 'Po dodaniu kliknij "Zaproś" — pracownik dostanie e-mail z linkiem do aktywacji konta mobilnego.' },
      { title: 'Stawka godzinowa', text: 'Stawka jest używana do automatycznego liczenia kosztów pracy w P&L i eksportach ewidencji.' },
      { title: 'PIN kiosku', text: 'Kliknij ikonę 🔑 przy pracowniku aby ustawić 4-cyfrowy PIN do kiosku odbić. Pracownicy bez PIN nie mogą używać kiosku PIN.' },
      { title: 'Reset hasła', text: 'Jeśli pracownik zapomniał hasła, kliknij "Reset hasła" — dostanie nowe tymczasowe hasło.' },
      { title: 'Import CSV', text: 'W zakładce "Import CSV" możesz zaimportować wielu pracowników jednocześnie z arkusza Excel.' },
    ],
  },
  monthclose: {
    title: 'Zamknięcie miesiąca', icon: '🔒',
    description: 'Formalne zamknięcie miesiąca — blokuje edycję danych i generuje podsumowanie.',
    steps: [
      { title: 'Wymagania', text: 'Przed zamknięciem sprawdź czy: wszystkie raporty dzienne są zatwierdzone, wszystkie faktury są zatwierdzone, inwentaryzacja miesięczna jest zatwierdzona.' },
      { title: 'Zamknięcie', text: 'Kliknij "Zamknij miesiąc" i potwierdź. System sprawdzi czy wszystkie dane są kompletne.' },
      { title: 'Po zamknięciu', text: 'Dane z zamkniętego miesiąca są zablokowane — nie można edytować raportów ani faktur. P&L jest finalizowany.' },
      { title: 'Otwarcie korekty', text: 'W wyjątkowych sytuacjach administrator może otworzyć zamknięty miesiąc do korekty. Wymaga uprawnień Owner/Superadmin.' },
    ],
  },
  admin_users: {
    title: 'Użytkownicy', icon: '👥',
    description: 'Zarządzanie kontami użytkowników systemu — role i dostępy.',
    steps: [
      { title: 'Role', text: 'Superadmin — pełny dostęp. Owner — właściciel, dostęp do OPS i Admin. Manager — dostęp do OPS jednego lokalu. Pracownik — tylko aplikacja mobilna.' },
      { title: 'Dodaj użytkownika', text: 'Kliknij "Dodaj użytkownika", wpisz e-mail, wybierz rolę i przypisz do lokalizacji.' },
      { title: 'Zmiana roli', text: 'Kliknij ikonę edycji przy użytkowniku aby zmienić jego rolę lub przypisane lokalizacje.' },
      { title: 'Dezaktywacja', text: 'Dezaktywowany użytkownik nie może się zalogować — jego dane historyczne są zachowane.' },
    ],
  },
  account: {
    title: 'Konto', icon: '⚙️',
    description: 'Ustawienia konta, subskrypcja Stripe i bezpieczeństwo.',
    steps: [
      { title: 'Dane profilu', text: 'Imię, nazwisko i adres e-mail powiązany z kontem.' },
      { title: 'Subskrypcja', text: 'Kliknij "Otwórz portal Stripe" aby zmienić plan, zaktualizować kartę płatniczą lub anulować subskrypcję.' },
      { title: 'Twój plan', text: 'Karta "Twój plan" pokazuje jakie funkcje są dostępne w aktualnym planie. Kliknij "Ulepsz plan" aby odblokować więcej funkcji.' },
      { title: 'Wylogowanie', text: 'Kliknij "Wyloguj" aby zakończyć sesję na wszystkich urządzeniach.' },
      { title: 'Usunięcie konta', text: 'W strefie niebezpiecznej możesz trwale usunąć konto. Operacja jest nieodwracalna.' },
    ],
  },

  /* ── Ops-page specific views ── */
  reporting: {
    title: 'Raport dzienny', icon: '📋',
    description: 'Formularz zamknięcia dnia — wprowadź sprzedaż, gotówkę, koszty pracy i obsadę.',
    steps: [
      { title: 'Wybierz datę', text: 'Domyślnie ustawiona jest dzisiejsza data. Możesz cofnąć się do poprzednich dni, jeśli zapomniano złożyć raport.' },
      { title: 'Sprzedaż brutto', text: 'Wpisz całkowitą sprzedaż brutto z kasy / systemu POS. System automatycznie wyliczy netto.' },
      { title: 'Podział płatności', text: 'Podziel sprzedaż na: karty, gotówkę i płatności online. Suma musi być równa sprzedaży brutto.' },
      { title: 'Gotówka w szufladzie', text: 'Wpisz faktyczną gotówkę przeliczoną na koniec zmiany. System wyliczy różnicę i poprosi o wyjaśnienie.' },
      { title: 'Koszty pracy', text: 'Dodaj każdego pracownika, liczbę godzin i stawkę. Procent kosztów pracy jest wyliczany automatycznie.' },
      { title: 'Obsada zmian', text: 'Wpisz liczbę pracowników na każdej zmianie (rano / popołudniu / wieczorem).' },
      { title: 'Wyślij do centrali', text: 'Kliknij "Wyślij raport" — trafi do kolejki zatwierdzeń w panelu admina. Zatwierdzonego raportu nie można edytować.' },
    ],
  },
  invoices: {
    title: 'Faktury', icon: '🧾',
    description: 'Wprowadzanie faktur od dostawców — COS (food cost) i SEMIS (koszty operacyjne).',
    steps: [
      { title: 'Typ faktury', text: 'Wybierz COS dla faktur za żywność i napoje lub SEMIS dla kosztów stałych (czynsz, media, serwis).' },
      { title: 'Dane podstawowe', text: 'Wpisz numer faktury, nazwę dostawcy, datę usługi i datę dokumentu.' },
      { title: 'Pozycje faktury (COS)', text: 'Dodaj linie z produktem, kategorią, ilością, jednostką i ceną netto. Użyj podpowiedzi składników, aby powiązać z bazą.' },
      { title: 'Pozycje faktury (SEMIS)', text: 'Dla SEMIS podaj opis, kategorię i kwotę netto każdej pozycji.' },
      { title: 'Załącznik', text: 'Opcjonalnie prześlij skan lub zdjęcie faktury (PDF, JPG) jako dowód.' },
      { title: 'Wyślij do zatwierdzenia', text: 'Kliknij "Wyślij fakturę". Admin zatwierdza lub odrzuca — zobaczysz status w historii.' },
      { title: 'Historia', text: 'Zakładka Historia pokazuje wszystkie przesłane faktury z bieżącego okresu i ich statusy.' },
    ],
  },
  inventory: {
    title: 'Inwentaryzacja', icon: '📦',
    description: 'Zliczanie stanów magazynowych — miesięczna lub tygodniowa kontrola zapasów.',
    steps: [
      { title: 'Aktywne zadania', text: 'Na ekranie głównym widać zadania inwentaryzacyjne przydzielone przez centralę. Kliknij zadanie, aby je wypełnić.' },
      { title: 'Wypełnianie pozycji', text: 'Dla każdego produktu wpisz faktycznie policzony stan. Pole "Oczekiwany" pokazuje stan wg systemu.' },
      { title: 'Notatki do pozycji', text: 'Jeśli ilość jest inna niż oczekiwana, dodaj krótki komentarz — ułatwi to zatwierdzenie przez admina.' },
      { title: 'Produkty (zakładka)', text: 'Tutaj możesz przeglądać i zarządzać produktami przypisanymi do Twojego lokalu.' },
      { title: 'Wyślij inwentaryzację', text: 'Kliknij "Wyślij do weryfikacji". Admin sprawdzi odchylenia i zatwierdzi lub odeśle z korektą.' },
    ],
  },
  my_schedule: {
    title: 'Mój grafik', icon: '📅',
    description: 'Podgląd Twoich zaplanowanych zmian na bieżący tydzień i zgłaszanie próśb.',
    steps: [
      { title: 'Widok tygodniowy', text: 'Każdy rząd to jeden dzień tygodnia. Zmiany są wyświetlone z godziną rozpoczęcia i zakończenia.' },
      { title: 'Kolor zmiany', text: 'Zielony = opublikowana zmiana. Żółty = wersja robocza. Szary = wolny dzień.' },
      { title: 'Prośba o zamianę', text: 'Kliknij zmianę i wybierz "Zgłoś zamianę". Wskaż kolegę, który mógłby Cię zastąpić.' },
      { title: 'Prośba o urlop', text: 'Przejdź do zakładki Urlopy, aby złożyć wniosek urlopowy.' },
    ],
  },
  kiosk: {
    title: 'Kiosk rejestracji czasu', icon: '🖥️',
    description: 'Konfiguracja kiosku na urządzeniu firmowym — pracownicy rejestrują wejście/wyjście przez QR lub PIN.',
    steps: [
      { title: 'Kiosk QR', text: 'Skopiuj link QR i otwórz go na firmowym urządzeniu. Pracownik skanuje swój osobisty kod QR, aby zarejestrować wejście lub wyjście.' },
      { title: 'Kiosk PIN', text: 'Otwórz link PIN na firmowym urządzeniu. Pracownik wybiera swoje imię z listy i wpisuje 4-cyfrowy PIN.' },
      { title: 'Zdjęcie', text: 'Przy każdej rejestracji kamera urządzenia firmowego automatycznie robi zdjęcie — dowód obecności.' },
      { title: 'Ustawianie PIN dla pracownika', text: 'Przejdź do zakładki Pracownicy i kliknij ikonę klucza przy pracowniku, aby nadać mu PIN.' },
      { title: 'Ewidencja', text: 'Wszystkie odbicia czasu trafiają do zakładki Ewidencja, gdzie można je przeglądać i korygować.' },
    ],
  },
}

/* ================================================================== */
/* COMPONENT                                                           */
/* ================================================================== */
type Props = { activeView: string; keyMap?: Record<string, string> }

export function HelpDrawer({ activeView, keyMap }: Props) {
  const [open,        setOpen]        = useState(false)
  const [search,      setSearch]      = useState('')
  const [expanded,    setExpanded]    = useState<string | null>(null)

  const resolvedKey = HELP[activeView] ? activeView : (keyMap?.[activeView] ?? activeView)
  const current = HELP[resolvedKey] ?? null

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return Object.entries(HELP).filter(([k]) => k !== resolvedKey)
    return Object.entries(HELP).filter(([k, v]) =>
      k !== resolvedKey && (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.steps.some(s => s.title.toLowerCase().includes(q) || s.text.toLowerCase().includes(q))
      )
    )
  }, [search, activeView])

  return (
    <>
      {/* ── Floating ? button ── */}
      <button
        onClick={() => { setOpen(true); setSearch(''); setExpanded(null) }}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#2563EB] text-white shadow-lg shadow-blue-500/30 hover:bg-[#1D4ED8] transition-all hover:scale-105 flex items-center justify-center"
        title="Pomoc"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
      )}

      {/* ── Drawer ── */}
      <div className={`fixed top-0 right-0 h-screen w-[360px] bg-white border-l border-[#E5E7EB] z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <p className="text-[14px] font-bold text-[#111827]">Centrum pomocy</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Current view help */}
          {current && (
            <div className="px-5 py-4 border-b border-[#E5E7EB] bg-blue-50/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[18px]">{current.icon}</span>
                <p className="text-[14px] font-bold text-[#111827]">{current.title}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 ml-auto shrink-0">Aktualny widok</span>
              </div>
              <p className="text-[12px] text-[#6B7280] mb-3">{current.description}</p>
              <div className="space-y-2">
                {current.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <div>
                      <p className="text-[12px] font-semibold text-[#374151]">{step.title}</p>
                      <p className="text-[12px] text-[#6B7280] leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-3 border-b border-[#E5E7EB] shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Szukaj w pomocy…"
                className="w-full h-8 pl-9 pr-3 rounded-lg border border-[#E5E7EB] text-[12px] bg-[#F9FAFB] text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* All other topics */}
          <div className="px-3 py-2">
            {!search && <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-2 py-1">Wszystkie tematy</p>}
            {filtered.length === 0 && search && (
              <p className="text-[13px] text-[#9CA3AF] text-center py-8">Brak wyników dla „{search}"</p>
            )}
            {filtered.map(([key, entry]) => (
              <div key={key} className="rounded-lg overflow-hidden mb-1">
                <button
                  onClick={() => setExpanded(expanded === key ? null : key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left"
                >
                  <span className="text-[15px]">{entry.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#374151] truncate">{entry.title}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{entry.description}</p>
                  </div>
                  {expanded === key
                    ? <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                  }
                </button>
                {expanded === key && (
                  <div className="px-3 pb-3 space-y-2 bg-[#FAFAFA]">
                    {entry.steps.map((step, i) => (
                      <div key={i} className="flex gap-2.5 pt-1">
                        <span className="w-4 h-4 rounded-full bg-[#E5E7EB] text-[#6B7280] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="text-[11px] font-semibold text-[#374151]">{step.title}</p>
                          <p className="text-[11px] text-[#6B7280] leading-relaxed">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] shrink-0">
          <p className="text-[11px] text-[#9CA3AF] text-center">OneLink — System zarządzania restauracją</p>
        </div>
      </div>
    </>
  )
}
