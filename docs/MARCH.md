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

Nie znamy jeszcze publicznego źródła mapy, przeszkód i sposobu dekodowania oznaczeń HEX. Dlatego pozycja wioski startowej jest zapisywana informacyjnie, a gracz musi podać **rzeczywistą liczbę pól trasy**. Nie utożsamiamy różnicy numerów HEX ani odległości w linii prostej z długością marszu. Automatyczne wyznaczanie trasy z dwóch pozycji pozostaje do wykonania po uzyskaniu tych danych. Nie jest to połączenie z kontem gry.

Można wybrać stałą prędkość dzienną, jeśli dany serwer gry nie ma aktywnej mechaniki nocy. Zachowano także ręczny czas z gry. Historyczne wpisy nie zmieniają swoich godzin. Przed planowanym atakiem warto porównać wynik z ekranem wysyłania w grze, zwłaszcza jeśli zasady serwera lub parametry jednostek zmienią się po dacie odczytu.

Migracja `0002_march_details.sql` dodaje nullable kolumnę do D1; zachowuje wcześniejsze wpisy. Zastosuj ją **przed publikacją** nowego Workera: `npm run db:remote`, następnie `npm run deploy`. Nie usuwaj bazy ani nie odtwarzaj pierwszej migracji ręcznie.
