# My gym (Moja siłownia)

[English](README.md)

Prosta appka treningowa na telefon. Pamięta plan, odlicza przerwy między seriami, zapisuje wyniki i podpowiada, ile nałożyć następnym razem. Jeden plik. Sama appka jest mechaniczna, a myśli za nią Claude: to on wpisuje Twój plan, czyta Twój dziennik i odpowiada na pytania o ciężary.

Powstała jako prywatne narzędzie jednego ćwiczącego, który po latach z trenerem zaczął trenować sam. Technikę znał, brakowało mu planu pod ręką, stopera i dziennika.

Działa w dwóch miejscach: jako prywatna strona na Twoim koncie Claude albo jako prywatna strona ChatGPT Sites z własną bazą i narzędziami dla ChatGPT (opis w części [Wersja na ChatGPT Sites](#wersja-na-chatgpt-sites)).

## Dla kogo

- W wersji Claude: masz abonament Claude (Pro albo Max) i aplikację Claude na komputerze z zakładką **Code**. Bez tego appka nie zapisze wyników i nie odpowie na pytania.
- W wersji ChatGPT Sites: masz płatny plan ChatGPT z Sites i agenta, który umie wdrożyć Site (ChatGPT Work albo Codex).
- Znasz technikę swoich ćwiczeń. Appka nie pokazuje filmów ani ilustracji.
- Masz plan treningów od trenera albo potrafisz ułożyć go z Claude'em.

## Jak to działa

**W domu.** Dyktujesz Claude'owi ćwiczenia, serie, ciężary i przerwy. Claude wpisuje je do appki i publikuje Twoją prywatną stronę.

**Na siłowni.** Otwierasz stronę w telefonie. Widzisz plan na dziś z wpisanymi ciężarami. Robisz serię, stukasz „Zrobione”, telefon odlicza przerwę. Jeśli zrobiłeś inaczej, poprawiasz liczby. Zaznaczasz, czy było lekko, czy ciężko, czy coś bolało.

**Po treningu.** Wyniki są już zapisane. Następnym razem przy każdym ćwiczeniu zobaczysz, ile zrobiłeś ostatnio, a appka podpowie, kiedy dołożyć ciężar. W domu możesz poprosić Claude'a, żeby przepisał trening do Twojego dziennika w folderze, podsumował miesiąc albo zmienił plan.

**W appce** (w wersji Claude) jest też przycisk „Zapytaj Claude'a”: proponuje ciężary na dziś na podstawie Twojej historii i odpowiada na pytania, na przykład czym zastąpić ćwiczenie, które boli. Każde takie pytanie zużywa limit Twojego konta Claude.

## Instalacja

1. **Pobierz repozytorium.** Na tej stronie kliknij zielony przycisk „Code”, potem „Download ZIP”, i rozpakuj do osobnego folderu, na przykład `Dokumenty/silownia`.
2. **Otwórz ten folder w swoim agencie:** w aplikacji Claude na komputerze (zakładka Code) dla wersji Claude albo w ChatGPT Work lub Codex dla wersji ChatGPT Sites.
3. **Napisz jedno zdanie**, na przykład: „Zrób mi tę appkę”. Agent czyta instrukcje z folderu, publikuje Twoją prywatną stronę, daje Ci link i pyta o plan.
4. **Otwórz link w telefonie**, zalogowany na to samo konto. W Safari wybierz „Udostępnij”, potem „Do ekranu początkowego”, żeby mieć ikonę jak w zwykłej aplikacji.
5. **Podyktuj plan:** ćwiczenia, serie, powtórzenia, ciężary, przerwy, które ćwiczenia idą w parach. Agent wpisze plan i strona go pokaże.

Plik zawiera dwa przykładowe treningi (klatka z bicepsem, nogi) bez ciężarów. Służą do obejrzenia, jak appka wygląda. Zastąp je swoimi.

## Wersja na ChatGPT Sites

W folderze `sites/` jest ta sama appka dla ChatGPT Sites: strona, mały backend z bazą (Cloudflare Worker i D1) oraz narzędzia, którymi ChatGPT czyta Twój dziennik i zmienia plan albo cele na następny raz. Sam trening odbywa się na stronie, bez czatu. W stronie nie ma przycisku „Zapytaj ChatGPT”: pytasz w ChatGPT, a on sięga do Twoich danych przez narzędzia.

Instalujesz ją tak samo: otwierasz folder w ChatGPT Work albo w Codex i piszesz jedno zdanie. Agent wdraża stronę, daje Ci link i proponuje plugin strony, dzięki któremu ChatGPT czyta Twój dziennik i zmienia plan. Notatki dla agenta są w [docs/chatgpt-sites.md](docs/chatgpt-sites.md).

## Jak używać na co dzień

- **Przed treningiem** otwórz stronę. Ciężary w polach to podpowiedzi z poprzedniego razu.
- **W trakcie** odhaczaj serie. Po odhaczeniu rusza minutnik przerwy. Przy każdym ćwiczeniu możesz zaznaczyć: lekko, w sam raz, ciężko, boli.
- **Po treningu** stuknij „Zakończ trening”. W zakładce Dziennik zobaczysz wszystkie treningi i wykresy ciężarów.
- **Co jakiś czas** powiedz Claude'owi na komputerze: „przepisz ostatnie treningi do dziennika” albo „podsumuj ostatni miesiąc i zaproponuj zmiany”.
- **Nowy plan od trenera?** Podyktuj go Claude'owi. Stare wyniki zostają w dzienniku.

## Gdzie są Twoje dane

Wyniki zapisują się w bazie Twojej strony na Twoim koncie Claude. Nikt poza Tobą ich nie widzi. Claude ma do nich dostęp tylko w sesji na Twoim koncie, kiedy o to poprosisz. Autor appki nie prowadzi żadnego serwera i nie zbiera żadnych danych.

W wersji ChatGPT Sites wyniki leżą w bazie Twojej strony na platformie OpenAI. Platforma nie obiecuje, w którym kraju trzyma dane, więc nie wpisuj do profilu ani do uwag szczegółów o zdrowiu.

Jeśli zapisujesz uwagi o bólu albo kontuzjach, pamiętaj, że podpowiedzi Claude'a nie zastępują lekarza ani fizjoterapeuty. Przy bólu, który narasta, przerwij ćwiczenie.

## Czego appka nie umie

- Nie pokazuje techniki ćwiczeń.
- Nie działa bez konta na platformie, na której stoi (Claude, a w wersji Sites ChatGPT): zapis wyników wymaga zalogowania.
- Obie wersje mają osobne dzienniki i nie wymieniają się danymi.
- Nie ma dyktowania głosem w trakcie treningu. Liczby wpisujesz palcem.
- Nie synchronizuje się z zegarkami ani innymi aplikacjami.

## Aktualizacje

Gdy pojawi się nowa wersja pliku, pobierz ją i powiedz Claude'owi: „zaktualizuj moją stronę nowym plikiem, zachowaj mój plan i wyniki”. Dziennik zostaje w bazie, więc nic nie przepada.

## Jak to zmieniać

To jeden plik HTML. Wszystko, co dotyczy Twojego planu, zmienia Claude na Twoją prośbę. Jeśli chcesz zmienić coś więcej, na przykład długość przerw, wygląd albo zasadę dokładania ciężaru, też powiedz to Claude'owi. Instrukcja dla niego jest w pliku `CLAUDE.md` (po angielsku, Claude czyta oba języki). Zasady wspólne dla obu wersji i opis danych są w `AGENTS.md`.

## Autor i licencja

Marcin Sawicki, [rewolucjaai.com](https://rewolucjaai.com). Licencja MIT: możesz używać, zmieniać i udostępniać dalej.
