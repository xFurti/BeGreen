# Profilo Mi

Il profilo usa cover con avatar sovrapposto, identità centrata, statistiche compatte e tre schede. La cover riutilizza `assets/demo/forest.jpg`; la palette segue il tema dell’app.

- **Impatto**: conteggi calcolati sulle proprie prove reali, con avvertenza sulle stime. Include Agenda 2030, il conto alla rovescia fino al 1° gennaio 2030, badge e scelta esplicita del titolo. I badge usano il catalogo condiviso, senza traguardi paralleli. I dati ambientali locali si consultano nella scheda Dati: il profilo non contiene il blocco «Il mio Comune».
- **Ricordi**: calendario da lunedì, navigazione fra mesi, filtro per giorno e foto che aprono la prova originale. Più prove nello stesso giorno restano accessibili. Nomi, date e testi seguono italiano/inglese.
- **Mappa**: aree delle prove salvate su questo dispositivo. Nessun segnaposto fittizio per le prove precedenti o con zona nascosta. Ogni nuova prova con «Mostra zona» attivo registra il **centro del Comune scelto**, non la posizione del gesto. Le coordinate restano sul dispositivo e sopravvivono alla pubblicazione e alla sincronizzazione del post. Il backend attuale continua a ricevere soltanto i campi già supportati: non servono migrazioni. Dopo un reset o su un altro telefono le vecchie aree non sono disponibili.

Più prove nello stesso Comune condividono la posizione. La striscia delle foto sotto la mappa permette di aprirle tutte, anche quando i segnaposto si sovrappongono. La vista a schermo intero conserva centro e zoom durante apertura/chiusura.

Dalla cover si aprono condivisione e impostazioni: modifica nome/handle/ruolo, tema sistema/chiaro/scuro, pubblico delle spiegazioni, Comune, lingua, guida, fonti e Leaf. La modifica del profilo mantiene il titolo e usa il salvataggio Supabase esistente: errori di rete e handle occupati lasciano i dati precedenti e consentono di riprovare. Senza backend il salvataggio è locale. Gli handle seguono le regole dell’onboarding (2–24 lettere, numeri, punti o trattini bassi).

Uscita e reset richiedono conferma, spiegano il limite degli account anonimi e mantengono lingua/tema. Un errore di uscita dal server non viene presentato come successo.

## Mappe e compatibilità

- Web: Leaflet e tile OpenStreetMap, con attribuzione e collegamenti accessibili alle prove.
- Expo Go, iOS precedente al 18 o Android senza configurazione Google: anteprima statica a tile, fullscreen e foto apribili. Non richiede una chiave Google.
- Development/store build: Expo Maps. Apple Maps da iOS 18 per usare i callback sui segnaposto; Android richiede Maps SDK for Android abilitato e una chiave limitata al package e certificato della build. Impostare `GOOGLE_MAPS_API_KEY` nell’ambiente di build: `app.config.ts` configura `android.config.googleMaps.apiKey` e abilita la mappa interattiva. Richiede una nuova build nativa; un aggiornamento JavaScript non aggiunge moduli nativi. Non inserire la chiave nel repository.

Le tile online richiedono connessione. Se la mappa web non si carica, le foto sotto restano utilizzabili. Le build native e i servizi Google/Apple richiedono verifica su dispositivo; i controlli web non dimostrano il loro funzionamento.

## Prova

`npm ci`, `npm run web`, onboarding con Comune, poi `/me`. Le prove precedenti restano nei Ricordi. Per popolare la mappa pubblicare una nuova prova con zona visibile; con zona nascosta non compare alcun segnaposto.

`npm run verify` include la suite completa di main e i test del profilo: salvataggio/errore e conservazione del titolo, validazione degli handle, calendario e giorni con più prove, assenza di segnaposto inventati, coordinate valide, inquadratura e tile.

Le immagini in `docs/concepts/` documentano il concept originale e i suoi vecchi dati dimostrativi; non rappresentano la versione integrata. Le prove visive attuali e gli esiti dei flussi sono collegati nella PR #56.
