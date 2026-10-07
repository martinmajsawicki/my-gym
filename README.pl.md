# Moja siłownia

Prosta appka treningowa na telefon. Pamięta plan, odlicza przerwy między seriami, zapisuje wyniki i podpowiada, ile nałożyć następnym razem. Jeden plik. Sama appka jest mechaniczna, a myśli za nią Claude: to on wpisuje Twój plan, czyta Twój dziennik i odpowiada na pytania o ciężary.

Powstała jako prywatne narzędzie jednego ćwiczącego, który po latach z trenerem zaczął trenować sam. Technikę znał, brakowało mu planu pod ręką, stopera i dziennika.

## Dla kogo

- Masz abonament Claude (Pro albo Max) i aplikację Claude na komputerze z zakładką **Code**. Bez tego appka nie zapisze wyników i nie odpowie na pytania.
- Znasz technikę swoich ćwiczeń. Appka nie pokazuje filmów ani ilustracji.
- Masz plan treningów od trenera albo potrafisz ułożyć go z Claude'em.

## Jak to działa

**W domu.** Dyktujesz Claude'owi ćwiczenia, serie, ciężary i przerwy. Claude wpisuje je do appki i publikuje Twoją prywatną stronę.

**Na siłowni.** Otwierasz stronę w telefonie. Widzisz plan na dziś z wpisanymi ciężarami. Robisz serię, stukasz „Zrobione”, telefon odlicza przerwę. Jeśli zrobiłeś inaczej, poprawiasz liczby. Zaznaczasz, czy było lekko, czy ciężko, czy coś bolało.

**Po treningu.** Wyniki są już zapisane. Następnym razem przy każdym ćwiczeniu zobaczysz, ile zrobiłeś ostatnio, a appka podpowie, kiedy dołożyć ciężar. W domu możesz poprosić Claude'a, żeby przepisał trening do Twojego dziennika w folderze, podsumował miesiąc albo zmienił plan.

**W appce** jest też przycisk „Zapytaj Claude'a”: proponuje ciężary na dziś na podstawie Twojej historii i odpowiada na pytania, na przykład czym zastąpić ćwiczenie, które boli. Każde takie pytanie zużywa limit Twojego konta Claude.

## Instalacja w pięć kroków

1. **Pobierz plik `moja-silownia.html`.** Na tej stronie kliknij zielony przycisk „Code”, potem „Download ZIP”, i rozpakuj. Zapisz plik w osobnym folderze, na przykład `Dokumenty/silownia`.
2. **Otwórz aplikację Claude na komputerze**, przejdź do zakładki Code i wskaż ten folder jako projekt.
3. **Wklej Claude'owi to zdanie:**

   > Opublikuj plik moja-silownia.html jako moją prywatną stronę, z bazą danych i z możliwością pytania Claude'a. Potem zapytaj mnie o mój plan treningów i wpisz go do pliku.

4. **Claude zwróci link do Twojej strony.** Otwórz go w telefonie, zalogowany na to samo konto Claude. W Safari wybierz „Udostępnij”, potem „Do ekranu początkowego”, żeby mieć ikonę jak w zwykłej aplikacji.
5. **Podyktuj Claude'owi plan:** ćwiczenia, serie, powtórzenia, ciężary, przerwy, które ćwiczenia idą w parach. Claude wpisze plan i opublikuje stronę jeszcze raz pod tym samym adresem.

Plik zawiera dwa przykładowe treningi (klatka z bicepsem, nogi) bez ciężarów. Służą do obejrzenia, jak appka wygląda. Zastąp je swoimi.

## Jak używać na co dzień

- **Przed treningiem** otwórz stronę. Ciężary w polach to podpowiedzi z poprzedniego razu.
- **W trakcie** odhaczaj serie. Po odhaczeniu rusza minutnik przerwy. Przy każdym ćwiczeniu możesz zaznaczyć: lekko, w sam raz, ciężko, boli.
- **Po treningu** stuknij „Zakończ trening”. W zakładce Dziennik zobaczysz wszystkie treningi i wykresy ciężarów.
- **Co jakiś czas** powiedz Claude'owi na komputerze: „przepisz ostatnie treningi do dziennika” albo „podsumuj ostatni miesiąc i zaproponuj zmiany”.
- **Nowy plan od trenera?** Podyktuj go Claude'owi. Stare wyniki zostają w dzienniku.

## Gdzie są Twoje dane

Wyniki zapisują się w bazie Twojej strony na Twoim koncie Claude. Nikt poza Tobą ich nie widzi. Claude ma do nich dostęp tylko w sesji na Twoim koncie, kiedy o to poprosisz. Autor appki nie prowadzi żadnego serwera i nie zbiera żadnych danych.

Jeśli zapisujesz uwagi o bólu albo kontuzjach, pamiętaj, że podpowiedzi Claude'a nie zastępują lekarza ani fizjoterapeuty. Przy bólu, który narasta, przerwij ćwiczenie.

## Czego appka nie umie

- Nie pokazuje techniki ćwiczeń.
- Nie działa bez konta Claude: zapis wyników i pytania wymagają zalogowania.
- Nie ma dyktowania głosem w trakcie treningu. Liczby wpisujesz palcem.
- Nie synchronizuje się z zegarkami ani innymi aplikacjami.

## Aktualizacje

Gdy pojawi się nowa wersja pliku, pobierz ją i powiedz Claude'owi: „zaktualizuj moją stronę nowym plikiem, zachowaj mój plan i wyniki”. Dziennik zostaje w bazie, więc nic nie przepada.

## Jak to zmieniać

To jeden plik HTML. Wszystko, co dotyczy Twojego planu, zmienia Claude na Twoją prośbę. Jeśli chcesz zmienić coś więcej, na przykład długość przerw, wygląd albo zasadę dokładania ciężaru, też powiedz to Claude'owi. Instrukcja dla niego jest w pliku `CLAUDE.md`.

## Autor i licencja

Marcin Sawicki, [rewolucjaai.com](https://rewolucjaai.com). Licencja MIT: możesz używać, zmieniać i udostępniać dalej.
