# PR #56 — profilo compatibile con main

Commit verificato: `69d7e0e51cf30eed8a607f52759c183b6192ec74`, con main `d3f3805cc0d0b041294517de8b30f90fff9d2d5b` integrato.

Verifiche eseguite il 23 ottobre 2026 in checkout isolato:

- `npm run verify` con Node 24.13.1: typecheck, lint e 85 test passati (63 + 22), inclusa tutta la suite di main e le migrazioni Supabase in PGlite.
- Expo Doctor: 20/20.
- Export Expo web, iOS e Android completati. Export web ripetuto dopo la correzione del CSS dei marker per browser senza animazioni 3D.
- Chromium desktop 1440×1000 e mobile 390×844, più viewport 320×700; italiano/inglese, chiaro/scuro, focus/tastiera/Escape e preferenza reduced motion. Nessun errore JavaScript nei flussi controllati. Non sono misure di fluidità o prestazioni.
- Il backend Supabase è simulato e intercettato nel browser, su un dominio `.invalid`: nessuna scrittura di verifica in produzione. Provati handle occupato, indisponibilità, riprova, update dei soli campi identità, titolo conservato, pubblicazione con nuovo ID e ripristino dell’area dopo reload/sync.
- Cattura di prova con media demo: interruttore area disattivato/attivato, badge canonici, ricordi con più prove in un giorno, mesi precedenti, mappa senza punti fittizi, pin sovrapposti accessibili dalle foto, fullscreen con centro/zoom conservati, preferenze e reset.

I JSON contengono gli esiti dettagliati. Gli screenshot sono acquisizioni reali dell’app con profili/prove sintetici e media demo del repository. I dati ambientali di prova sono locali o intercettati; non attestano dati live di Verona. Le tile sono OpenStreetMap. `edit-handle-taken-en.png` mostra l’errore simulato del server.

Limiti: nessun test su dispositivo iOS/Android e nessuna build nativa firmata. L’export controlla il bundle, non le mappe Google/Apple su un telefono. Expo Go, iOS <18 e Android senza chiave usano l’anteprima a tile; la mappa nativa interattiva richiede una development/store build configurata. Le aree sono centri dei Comuni registrati sul dispositivo, non posizioni GPS dei gesti né uno storico condiviso nel backend.

Le vecchie immagini `docs/concepts/` sulla PR documentano soltanto il concept originale. Queste immagini mostrano la versione integrata; non è stato ricostruito un prima con gli stessi dati del prototipo precedente.
