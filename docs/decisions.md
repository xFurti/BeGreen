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

## Come registrare una nuova decisione

Indica data, problema, opzioni considerate, scelta, motivo e conseguenza pratica. Collega issue o PR e indica chi ha concordato la scelta. Non usare questo registro come elenco di idee non ancora decise.
