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

## Come registrare una nuova decisione

Indica data, problema, opzioni considerate, scelta, motivo e conseguenza pratica. Collega issue o PR e indica chi ha concordato la scelta. Non usare questo registro come elenco di idee non ancora decise.
