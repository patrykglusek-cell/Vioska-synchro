# Vioska Synchro

Wspólna tablica klanu do synchronizacji ataków. Tworzy cele z godziną dotarcia, zapisuje uczestników i ich jednostki oraz oblicza godzinę wysłania. Tablica jest dostępna przez nieprzewidywalny link; każda osoba posiadająca link może odczytać i dodawać dane. To pierwsza wersja bez kont i podziału uprawnień.

## Uruchomienie

Wymagany Node.js >=22.13 z modułem `node:sqlite` (sprawdzono na 24.19).

```sh
cd /workspace/Vioska-synchro
npm ci
npm test
npm start
```

Serwer domyślnie nasłuchuje na porcie 3000. Opcjonalne zmienne: `PORT`, `HOST`, `DATA_DIR`. Baza SQLite jest w `data/vioska.db`; należy zachowywać cały katalog danych i wykonywać kopie bezpieczeństwa. Testy używają osobnej tymczasowej bazy.

## Planowanie

1. Utwórz tablicę klanu i udostępnij jej link członkom klanu.
2. Dodaj nazwę i współrzędne celu, datę oraz godzinę dotarcia z dokładnością do sekund.
3. Dołączając, podaj nick, jednostki i czas marszu tej grupy odczytany z gry.
4. Aplikacja wylicza: godzina wysłania = godzina dotarcia − czas marszu.

Daty są przechowywane w UTC, a wyświetlane w strefie urządzenia gracza. Tablica odświeża się co 5 sekund. Licznik koryguje zegar urządzenia względem zegara serwera; serwer powinien mieć poprawny czas. Nie wysyła ataków w grze ani powiadomień systemowych.

Prędkości jednostek i wzór marszu nie są jeszcze potwierdzone ze źródła wiki; nie są zgadywane. Obecnie czas marszu trzeba wpisać ręcznie. Udostępnienie klanowi wymaga uruchomienia serwera pod publicznym adresem z HTTPS; samo lokalne uruchomienie nie publikuje strony. Przed publicznym wdrożeniem potrzebne są także limity żądań i uzgodnienie uprawnień do tablic.
