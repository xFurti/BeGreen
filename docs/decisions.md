# Decisioni

## Impostazione iniziale

- Repository privata, team di sei persone.
- `main` è la base di lavoro e la destinazione delle pull request.
- Si prevede il blocco del push diretto su `main`, un'approvazione e CI obbligatorie; l'applicazione effettiva dipende dalle regole GitHub attive.
- Review con Pi tramite GitHub Actions, ripetibile con `/PI review`.
- Nessun token personale creato; i collaboratori saranno invitati tramite username.
- Provider e modello della review sono configurabili e non ancora selezionati.

## 2026-10-22 — Prodotto e stack: BeGreen

- Problema: scegliere il prodotto per il brief «2. La mia sostenibilità» e sostituire lo scaffold Node.js/TypeScript iniziale.
- Scelta: BeGreen, app Expo/React Native (Expo Router, Zustand, expo-sqlite), introdotta con la PR #1 e portata alla root della repository. La repo è rinominata da AU a BeGreen.
- Conseguenza: lo scaffold `src/index.ts` è rimosso; `npm run verify` esegue typecheck, `expo lint` e i test del workflow di review, ed è il check `Verify` della CI.

## 2026-10-23 — Feed condiviso, profili reali e sfide dal Comune

- Problema: feed, profili, squad e league erano contenuto demo salvato sul singolo dispositivo, quindi più utenti non vedevano i post degli altri. La Drop veniva calcolata localmente dalla posizione GPS, senza un Comune scelto e senza garanzia che fosse uguale per tutti.
- Opzioni considerate: Supabase, Firebase, Neon con API proprie, API custom su Render. Per gli account: email OTP, email e password, account anonimi.
- Scelta (concordata con Leonardo): Supabase (Postgres, Storage, Realtime) con account anonimi (nome e handle pubblici). L'utente sceglie il Comune; ogni giorno c'è una sola sfida per Comune, generata dai dati live di quel Comune e salvata sul backend, con una sola prova per persona. I profili demo sono stati rimossi; restano post d'esempio etichettati DEMO per la sfida del giorno, esclusi da verifiche e conteggi.
- Conseguenza: servono un progetto Supabase con accesso anonimo attivo, la migrazione in `supabase/migrations` e le variabili `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Senza queste variabili l'app resta utilizzabile in locale. `npm test` verifica anche RLS e vincoli della migrazione su PGlite.

## 2026-10-23 — Skill agenti e traccia ufficiale

- Problema: le skill di bootstrap (ideazione generica, GitButler, `/PI review` obbligatorio in chat, istruzioni Pi Action nella skill di review) confondevano gli agenti; mancava in repo il testo della traccia FESAV scelta.
- Scelta: `AGENTS.md` come regola predefinita; skill opzionali `hackathon-track` (allineamento a traccia/regolamento), `hackathon-feature`, `hackathon-review`, `hackathon-pitch`. Rimossa `hackathon-ideas`. Documenti: `docs/traccia.md`, `docs/regolamento.md`, PDF `docs/regolamento-fesav-2026.pdf`. Runtime Pi solo in `.github/pi/review-runtime.md`. VCS: `git` + `gh`, niente GitButler.
- Conseguenza: gli agenti restano sulla traccia «La mia sostenibilità» e sui criteri di giuria; non chiedono `/PI review` in chat né usano `but`.

## 2026-10-23 — Da “Classifica” a “Community”

- Problema: la tab Classifica metteva al centro il punteggio individuale. La specifica `BeGreen_Community_Spec.md` chiede una tab Community che colleghi persone, gruppi e territorio, con una mappa costruita dalla community.
- Opzioni considerate per la mappa: `react-native-maps` (tile Google/Apple, chiave API su Android, poco “illustrata”), tile raster OSM (policy d’uso dei server pubblici), oppure un estratto OpenStreetMap disegnato in SVG e incluso nell’app.
- Scelta: estratto OSM disegnato come mappa illustrata (`scripts/build-community-map.mjs`, `src/data/maps`), pan e zoom con gesture-handler e reanimated, segnaposto BeGreen sopra. Nessuna nuova dipendenza, funziona in Expo Go e sul web. La Classifica resta come schermata secondaria (`/league`). Nuove tabelle Supabase con RLS per community, luoghi, salvataggi, segnalazioni, eventi, sfide collettive e blocchi.
- Conseguenza: la prima community è Alto Vicentino; altre mappe illustrate si aggiungono rigenerando l’estratto. Le community senza mappa illustrata usano una base schematica. I moderatori oltre al fondatore si nominano per ora da database.

## 2026-10-23 — Community: città e gruppi, mappe reali

- Problema: la tab Community era difficile da capire (quattro aree, testi introduttivi lunghi, gruppi e squad mescolati) e la mappa era un disegno illustrato, con una griglia schematica per i territori senza estratto e luoghi d’esempio in posizioni inventate.
- Scelta: la tab mostra subito le community a cui appartieni, in due tipi. **Gruppi** (amici, classi): si entra con un codice, pubblici o privati, classifica settimanale in cima. **Città**: luoghi reali cercabili per nome (qualsiasi Comune italiano), mappa e luoghi in cima, classifica più in basso. Creare un gruppo richiede solo nome e visibilità, poi si condivide il codice. La mappa usa le tile standard di OpenStreetMap in Web Mercator e la ricerca di vie e luoghi di Photon (komoot); niente più estratto illustrato né esempi sulla mappa. Nuova migrazione `20261026000000_community_groups.sql`: tipo `friends`, codice per ogni gruppo, leggibile da ogni membro, `join_by_code`.
- Conseguenza: tile e ricerca vie richiedono connessione e sono servizi gratuiti per uso leggero; in produzione `TILE_URL` va sostituito con un fornitore con chiave. Squad (League) e gruppi si sovrappongono: da unificare.

## Come registrare una nuova decisione

Indica data, problema, opzioni considerate, scelta, motivo e conseguenza pratica. Collega issue o PR e indica chi ha concordato la scelta. Non usare questo registro come elenco di idee non ancora decise.
