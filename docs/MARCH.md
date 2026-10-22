# Obliczanie marszu — źródła i zakres

Stan danych: 22 października 2026. Czas marszu korzysta z `movement_secs_per_hex`, nie z zaokrąglonego parametru `speed`.

Źródła oficjalnej wiki Vioska:

- https://vioska.klementewiczdevelopment.com/wiki/combat/units?lang=pl — najwolniejsza jednostka wyznacza tempo całej armii.
- https://vioska.klementewiczdevelopment.com/api/v1/wiki/data — bazowe czasy poszczególnych jednostek; zapisany lokalnie podzbiór znajduje się w `public/march.js`. Jednostki z zerowym czasem (konie) nie są samodzielnym składem marszowym i zostały pominięte.
- https://vioska.klementewiczdevelopment.com/wiki/world/map?lang=pl — obowiązuje rzeczywista możliwa do pokonania trasa.
- https://vioska.klementewiczdevelopment.com/wiki/world/day-night?lang=pl — cykl czterogodzinny UTC: trzy godziny dnia i jedna godzina nocy. W nocy pokonanie tego samego dystansu trwa o 20% dłużej (prędkość 5/6 dziennej).
- https://vioska.klementewiczdevelopment.com/i18n/wiki/pl.json — polskie nazwy oraz teksty zasad, używane przez oficjalną wiki.
- https://vioska.klementewiczdevelopment.com/wiki.js?v=180-wiki — kalkulator wiki mnoży rzeczywistą liczbę pól przez `movement_secs_per_hex`; nie wyznacza trasy. Nasz kalkulator dodatkowo integruje fazy dnia i nocy zgodnie z opisem zegara świata.

Algorytm cofa się od zaplanowanego momentu dotarcia, rozliczając dystans pokonany w każdej godzinowej fazie UTC. Wynik jest zaokrąglany do pełnych sekund w stronę wcześniejszego wysłania (różnica matematyczna poniżej sekundy). Serwer przelicza skład i trasę ponownie; nie ufa czasom ani opisowi jednostek przesłanym przez przeglądarkę.

## Oszacowanie z dwóch pozycji

Gracz przedstawił dwa przykłady marszu samych 1351 rycerzy z wioski (68, 71):

| Cel | Czas z ekranu gry | `ceil(hypot(dx, dy))` | Czas przy 300 s/pole |
| --- | --- | --- | --- |
| (31, −54) | 10:55:00 | 131 | 10:55:00 |
| (65, 72) | 00:20:00 | 4 | 00:20:00 |

To dane obserwacyjne, nie potwierdzenie algorytmu serwera. Faza zegara świata i moment planowanego wysłania nie były widoczne na zdjęciach; porównanie dotyczy bazowego tempa dziennego. Nie dowodzi, że zasady nocy są wyłączone na serwerze gracza.

Tryb domyślny **Z pozycji i jednostek — oszacowanie** oblicza odległość euklidesową i zaokrągla ją do pełnych pól w górę. Oba przykłady są testami regresyjnymi. Dalsza część kalkulacji korzysta ze składu i wybranego zegara świata. Podgląd i zapisany wynik są wyraźnie oznaczone jako szacunkowe. Pozycja celu pochodzi z zapisanego ataku i jest ponownie odczytywana przez serwer — nie ufamy podmienionemu celowi ani długości trasy z przeglądarki. Nie trzeba podawać sektorów; stosujemy współrzędne X i Y widoczne na mapie, np. `68 | 71` i `31 | -54`.

Nie znamy publicznego źródła mapy i pełnego algorytmu tras. Nie gwarantujemy poprawności modelu dla każdej pary pozycji. Gdy model nie pasuje do czasu w grze, można przełączyć tryb na znaną rzeczywistą długość trasy lub ręczny czas z gry. Wcześniejsze wpisy pozostają bez zmian.

Można wybrać stałą prędkość dzienną, jeśli dany serwer gry nie ma aktywnej mechaniki nocy. Zachowano także ręczny czas z gry. Historyczne wpisy nie zmieniają swoich godzin. Przed planowanym atakiem warto porównać wynik z ekranem wysyłania w grze, zwłaszcza jeśli zasady serwera lub parametry jednostek zmienią się po dacie odczytu.

Migracja `0002_march_details.sql` dodaje nullable kolumnę do D1; zachowuje wcześniejsze wpisy. Zastosuj ją **przed publikacją** nowego Workera: `npm run db:remote`, następnie `npm run deploy`. Nie usuwaj bazy ani nie odtwarzaj pierwszej migracji ręcznie.
