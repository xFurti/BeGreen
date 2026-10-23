# Restyle «Come si fa» — issue #82

La guida ora separa **Gesti green** e **Dove lo butto?**. L’intestazione è più compatta e le istruzioni non usano più animazioni elastiche.

I quattro gesti iniziali sono schede con icona, nome e semi. La sintesi presenta preparazione, azione e prova da cinque secondi; «Guidami passo per passo» rende disponibili tutte le tre istruzioni originali, con avanzamento, ritorno e panoramica. «Altri gesti» mantiene disponibili gli altri sei gesti. Un collegamento con `action` apre direttamente il gesto richiesto, anche fra quelli aggiuntivi; parametri sconosciuti usano il primo gesto.

La raccolta usa sei materiali su due righe, icone riconoscibili ed esempi selezionabili dal catalogo esistente. Nome e consiglio dell’oggetto compaiono sotto la selezione. Le indicazioni complete «Cosa va qui» e «Cosa non va qui» sono apribili; resta visibile il richiamo alle regole del Comune. La ricerca continua a consultare l’intero catalogo in italiano e inglese. Cambiare scheda conserva ricerca, materiale e posizione nella guida.

Le icone fanno un piccolo movimento al tocco; i contenuti sfumano con uno spostamento di sei punti e la barra dei passaggi si aggiorna con una transizione temporizzata. Non ci sono spring o loop. Riduci movimento disattiva queste animazioni, anche quando cambia a schermata aperta. I controlli della guida usano feedback di opacità, senza modificare i pulsanti condivisi delle altre schermate.

«Fallo ora» sostituisce la guida con la cattura del gesto, senza timer di navigazione. Se la guida è stata aperta dalla cattura, «Capito» torna alla stessa schermata mantenendola nello stack. La lettura delle istruzioni non assegna punti e non modifica le prove.

## Prova locale

Avviare `EXPO_NO_DOTENV=1 npm run web -- --port 8092` e aprire `http://localhost:8092/guide`.

1. Scegliere uno dei quattro gesti; aprire «Altri gesti» e scegliere uno dei sei aggiuntivi.
2. Aprire la guida passo per passo, avanzare, tornare indietro e visualizzare tutte le istruzioni.
3. Cambiare scheda durante la guida e verificare che il passaggio selezionato resti quello precedente.
4. Provare ogni materiale, selezionare un esempio, aprire le indicazioni sì/no e cercare «scontrino» o «pizza».
5. Provare «Fallo ora», aprire nuovamente la guida dalla cattura e tornare con «Capito».
6. Ripetere in inglese, tema chiaro/scuro e con Riduci movimento.

## Verifiche

- `npm run verify`: typecheck, lint e 155 test del repository. I nuovi test coprono link ai dieci gesti e parametri non validi, coerenza degli esempi con il contenitore e disponibilità delle istruzioni in entrambe le lingue.
- Aggiornato il controllo della tastiera: il componente raccolta eredita lo scorrimento con `useKeyboardCover` dalla schermata guida, come gli altri campi estratti in componenti.
- Chromium a 390 px: schede, ricerca e cancellazione, materiale/esempio, indicazioni sì/no, mantenimento dello stato fra schede, passaggi, sei gesti aggiuntivi e apertura/ritorno dalla cattura.
- Chromium a 320 px: italiano/scuro e inglese/chiaro, tutti i materiali, ricerca, collegamento diretto a un gesto aggiuntivo e Riduci movimento; nessun controllo esce orizzontalmente dal viewport.
- Preferenza di movimento cambiata durante l’animazione: l’icona torna alla trasformazione identità. Verificato anche lo stato di ricerca senza risultati.

Le prove browser sono locali, senza Supabase. La resa e il ritorno dalla form sheet con una foto/video in corso su iOS e Android richiedono ancora una verifica su dispositivo; il browser verifica lo stack di navigazione, non la registrazione della fotocamera nativa.

## Schermate dell’app

- [Gesti green](gestures-dark.png)
- [Guida passo per passo](walkthrough-dark.png)
- [Raccolta](sorting-dark.png)
- [Raccolta a 320 px, italiano e scuro](sorting-dark-it-320.png)
- [Raccolta a 320 px, inglese e chiaro](sorting-light-en-320.png)
