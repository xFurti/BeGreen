# Restyle Dati — issue #78

La pagina passa dai sei approfondimenti aperti a una panoramica di sei schede. Il chip del comune apre la ricerca geografica; Io / La mia classe / Il Comune cambia solo il destinatario della spiegazione nel dettaglio. Il riquadro del gesto usa il Drop reale già selezionato dall’app e mantiene il collegamento alla cattura.

Ogni scheda apre un pannello con il valore, le fonti, la spiegazione, i limiti e l’azione esistente. Restano disponibili le foto delle piante con attribuzione e l’elenco delle aree vicine. “Acqua” viene presentata come “Pioggia” perché il dato riguarda le precipitazioni.

Il caricamento usa segnaposto con una pulsazione di opacità; le schede entrano in successione, i valori aggiornati sfumano e le barre dei grafici crescono fino alla lettura effettiva. Il dettaglio entra ed esce dal basso. Cambiando destinatario la spiegazione sfuma brevemente. Con Riduci movimento queste animazioni vengono disabilitate. I valori numerici non vengono interpolati attraverso letture inventate.

Le fonti mancanti restano visibili e possono essere ricaricate. Una ricerca cartografica riuscita senza risultati mostra zero e il limite di copertura; un errore mostra un dato indisponibile. Le integrazioni dati, il backend e l’assegnazione dei punti restano quelli esistenti.

## Prova locale

Avviare `EXPO_NO_DOTENV=1 npm run web -- --port 8092`, completare l’onboarding scegliendo un comune e aprire Dati.

1. Toccare ciascuna delle sei schede e cambiare Io / La mia classe / Il Comune.
2. Nei grafici di aria e pioggia toccare una barra: il valore selezionato viene mostrato sopra il grafico.
3. Aprire Fonte e limiti del dato e il collegamento alla pagina Fonti.
4. Tornare a Dati, cambiare comune dal chip in alto e verificare il contesto aggiornato.
5. Verificare l’apertura della cattura dal Drop o dall’azione del dettaglio.
6. Ripetere con tema chiaro/scuro, italiano/inglese e Riduci movimento attivo.

## Verifiche eseguite

- `npm run verify`: typecheck, lint e tutti i test del progetto, inclusi quattro nuovi test per fonti mancanti, mappa vuota/in caricamento/in errore, conservazione di letture e azioni e titolo localizzato delle precipitazioni.
- Browser Chromium a 390 px: sei dettagli, cambio destinatario, selezione delle barre, nomi delle piante e aree, pannello fonti e navigazione alla pagina Fonti.
- Browser a 320 px: italiano/inglese, chiaro/scuro, Riduci movimento, apertura/chiusura del dettaglio e nome lungo del comune senza uscire dal viewport.
- Richieste ambientali bloccate e poi interrotte: segnaposto animati, passaggio ai dati di esempio dichiarati e opacità statica con Riduci movimento.
- Fonti mancanti e aree vuote: stato corretto e presenza/assenza del comando Riprova.

Le prove browser usano dati di esempio e risposte controllate, senza Supabase. Non costituiscono una verifica dell’accuratezza delle fonti live o della resa su un dispositivo iOS/Android. Su iOS l’apertura delle schermate dalla scheda viene attesa fino alla chiusura del Modal nativo; questo percorso richiede ancora la verifica su dispositivo.

## Schermate dell’app

Le schermate riportano dati di esempio, indicati nell’interfaccia.

- [Panoramica scura](overview-dark.png)
- [Griglia dei dati](grid-dark.png)
- [Dettaglio Aria](detail-air.png)
- [Schermata stretta, inglese e tema chiaro](overview-light-en-320.png)
- [Caricamento](loading.png)

Il [concept iniziale](../concepts/dati-restyle.html) è una proposta separata, basata sugli screenshot forniti, e non viene eseguito dall’app.
