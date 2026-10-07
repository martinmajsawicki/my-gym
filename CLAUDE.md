# Instrukcja dla Claude'a: Moja siłownia

Ten folder zawiera jedną stronę treningową (`moja-silownia.html`) należącą do użytkownika, który ją pobrał. Twoje zadania: opublikować ją jako prywatną stronę użytkownika, wpisać jego plan, czytać jego wyniki i pomagać w planowaniu. Zanim cokolwiek zmienisz, przeczytaj komentarz na początku pliku HTML.

## Publikacja

- Publikuj narzędziem Artifact z `capabilities: {"db": {}, "sample": {}}`. Bez `db` nie zapiszą się wyniki, bez `sample` nie zadziała przycisk „Zapytaj Claude'a”.
- Przy każdej kolejnej publikacji używaj tego samego pliku i tego samego adresu, żeby użytkownik nie musiał zmieniać linku w telefonie.
- Po pierwszej publikacji podaj użytkownikowi link i powiedz, że ma go otworzyć w telefonie zalogowany na swoje konto Claude.

## Plan treningów

- Plan jest w obiekcie `PLAN` w sekcji między komentarzami `CZYSTE START` i `CZYSTE KONIEC`. Jeden trening to jeden obiekt (`t1`, `t2`, `t3`...). Zakładki buduje tablica `TABS`; trening bez wpisu w `PLAN` pokazuje zaślepkę z `SOON`.
- Grupa w `supersets` z jednym ćwiczeniem to zwykłe serie. Grupa z dwoma ćwiczeniami to superseria: najpierw pierwsze, zaraz potem drugie, przerwa dopiero po parze. Ta sama konstrukcja obsługuje dobicie (seria robocza i od razu lżejsza seria).
- Pola ćwiczenia: `id` (unikalne w treningu, np. `A1`), `name`, `short`, `sets`, `kg` (ciężar wyjściowy; `null`, gdy nieznany; `0` dla ćwiczeń bez obciążenia), `lo` i `hi` (zakres powtórzeń), `step` (krok progresji w jednostce; `null`, gdy krokiem jest „+1 płytka”), `stepLabel`, `unit` (`"szt."` dla maszyn z odciążeniem, wtedy `assist: true` i `step` ujemny, bo mniej sztabek znaczy trudniej), `perHand` (ciężar na rękę), `perSide` (powtórzenia na stronę), `bar` (rysuje talerze na gryf 20 kg), `cue` (jedno zdanie wskazówki).
- Pola grupy: `id` (litera), `station`, `sub` (opis pod nagłówkiem), `rest` (przerwa w sekundach po grupie).
- Przy wpisywaniu planu z dyktowania: pytaj o to, czego użytkownik nie podał (ciężary, przerwy, które ćwiczenia idą w parach). Nie wymyślaj ciężarów. Zakresy powtórzeń i kroki progresji możesz zaproponować, ale powiedz, że to Twoja propozycja.
- Stały `PROFIL` uzupełnij z rozmowy: staż, cel, ile dni w tygodniu, ograniczenia zdrowotne, skąd pochodzi plan. Trafia do każdego pytania zadawanego w appce.
- Rozgrzewkę i schłodzenie dobierz do partii. Trzymaj je krótkie.
- Stary plan nie musi znikać: dodaj mu `archived: true`, a zostanie widoczny w Dzienniku i na wykresach, bez zakładki.

## Wyniki

- Zapisują się w bazie strony: kolekcja `sesje`, dokument `RRRR-MM-DD_tN`. Pola: `sets` (per ćwiczenie tablica serii `{kg, reps, done}`), `fb` (oceny: `feel` lekko/ok/ciezko, `pain` lista miejsc), `warm`, `cool`, `notes`, `finished`, `updatedAt`.
- Czytaj je narzędziem ArtifactData. Gdy użytkownik poprosi o przepisanie treningu, zapisz go w czytelnej formie do pliku dziennika w jego folderze (np. `dziennik.md`) i zaproponuj ciężary na następny raz. Liczby bierz z zapisanych serii, nie z pamięci.
- Gdy wpisujesz trening za użytkownika (np. zrobił go bez telefonu), utwórz dokument w tym samym kształcie, z `finished: true`.

## Zasady

- Słowa użytkownika mają pierwszeństwo. Nazwy ćwiczeń zapisuj tak, jak je nazywa.
- Przy bólu albo kontuzji radź ostrożnie: lżejszy wariant albo zamiennik, a przy bólu narastającym przerwę i konsultację z fizjoterapeutą lub lekarzem. Nie stawiaj diagnoz.
- Sekcji z logiką strony (poza `PLAN`, `PROFIL`, `SOON`, `TABS`) nie zmieniaj bez wyraźnej prośby. Jeśli zmieniasz, sprawdź składnię (`node --check` na wyciętym skrypcie) i opublikuj ponownie.
- Nie dodawaj zewnętrznych skryptów ani usług. Strona ma zostać jednym plikiem.
