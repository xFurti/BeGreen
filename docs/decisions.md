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

## 2026-10-22 — Caccia verde: «Le mura parlano» dentro BeGreen

- Problema: il progetto «Le mura parlano» (traccia 2, patrimonio) va reso compatibile con «La mia sostenibilità» e portato dentro BeGreen come funzione.
- Opzioni: (a) stessi 6 luoghi riletti in chiave green; (b) solo i luoghi con un legame ambientale solido più una tappa natura da dati aperti live. La prima versione (a) restava patrimonio industriale con un'etichetta green: Fabbrica Alta, Quartiere operaio e Monumento al Tessitore avevano legami deboli e gli indizi erano dettagli storici.
- Scelta (b): percorso unico in 4 tappe, dall'acqua alla natura. Roggia Maestra (acqua bene comune ed energia), Lanificio Conte (energia idroelettrica e riuso), Giardino Jacquard (da area di fabbrica a giardino, verde urbano), poi «Natura intorno a te» con le specie osservate entro 10 km (iNaturalist) e l'area protetta più vicina (OpenStreetMap). Indizi e domande di controllo riscritti su dettagli ambientali. Ogni tappa suggerisce un gesto BeGreen e la fine apre la fotocamera sul gesto del filo. Il filo scelto dall'atto postato cambia enfasi dei racconti, SDG e gesto finale. Testi in italiano, curiosità «Lo sapevi?» con audio (TTS sul dispositivo). Non portati: «Chiedi al luogo», pannello trasparenza AI, mappa condivisibile, lettura facile.
- Conseguenza: Seeds extra (+15 a tappa, −5 per aiuto, +25 a filo, una sola volta), contati anche nella classifica settimanale. Nuova dipendenza `expo-speech` (inclusa in Expo Go). I test della caccia girano con `node --test` dentro `npm run verify`.

## Come registrare una nuova decisione

Indica data, problema, opzioni considerate, scelta, motivo e conseguenza pratica. Collega issue o PR e indica chi ha concordato la scelta. Non usare questo registro come elenco di idee non ancora decise.
