# Publikacja w Cloudflare Free

Ta wersja korzysta z jednego Workera, który obsługuje stronę oraz API, i bazy D1. Nie trzeba tworzyć osobnego projektu Pages ani kupować domeny. Dostaniesz adres `https://vioska-synchro.<twoja-subdomena>.workers.dev`.

## Najprościej: terminal w Cloudflare

W panelu Cloudflare otwórz **Workers & Pages** i terminal **Cloud Shell**, jeśli jest dostępny na Twoim koncie. W przeciwnym razie użyj terminala na komputerze z Node.js 22.13 lub nowszym. Poniższe kroki wymagają, aby pliki aplikacji były wcześniej dodane do repozytorium GitHub; samo utworzenie plików w środowisku Codex nie wysyła ich na GitHub.

```sh
git clone https://github.com/patrykglusek-cell/Vioska-synchro.git
cd Vioska-synchro
npm ci
```

Przy prywatnym repozytorium korzystaj z logowania GitHub dostępnego w terminalu. Nie wpisuj tokenów do instrukcji ani czatu.

Na własnym komputerze wykonaj `npx wrangler login` i zaloguj się w otwartej przeglądarce. Cloud Shell może już mieć uwierzytelnienie; sprawdź `npx wrangler whoami` przed logowaniem.

```sh
npx wrangler d1 create vioska-synchro
```

Skopiuj **database_id** otrzymanej bazy do pola o tej nazwie w `wrangler.jsonc`, zastępując `00000000-0000-0000-0000-000000000000`. To identyfikator, nie hasło. Zachowaj nazwę bindingu `DB`. Jeśli baza już istnieje, użyj jej identyfikatora zamiast tworzyć nową.

```sh
npm run db:remote
npm run deploy
```

Wrangler poda adres strony. Przy pierwszej publikacji może poprosić o wybór subdomeny `workers.dev`. Otwórz ten adres, utwórz klan i skopiuj link dla graczy. Sprawdź link na drugim urządzeniu, dodaj atak oraz udział gracza i potwierdź, że pojawią się na obu urządzeniach. Nikomu poza klanem nie udostępniaj fragmentu linku po `#`.

## Testowanie lokalne

```sh
npm run db:local
npm run dev:cloudflare
```

W drugim terminalu: `node scripts/check-cloudflare.mjs`. Test tworzy dane tylko w lokalnej bazie. Nie uruchamiaj go pod adresem rzeczywistej tablicy. `npm run check:cloudflare` sprawdza pakowanie bez publikacji.

## Ograniczenia

- Wybierz plan Workers **Free**. Darmowe limity mogą czasowo blokować aplikację po ich przekroczeniu.
- Każdy z linkiem klanu może czytać tablicę i dodawać dane. Nie ma jeszcze kont, moderacji ani limitowania żądań aplikacji.
- Dane lokalnego serwera Node.js nie są automatycznie przenoszone do D1.
- Czas marszu jest nadal wpisywany z gry. Automatyczne prędkości jednostek wymagają potwierdzenia danych z wiki.
- Automatyczne odświeżanie działa tylko przy widocznej stronie, co ogranicza zużycie darmowego limitu.
