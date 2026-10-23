# Community · revisione 3

Branch: `design/community-restyle`. Anteprima direttamente nell’app Expo; nessuna PR aperta e nessuna modifica pubblicata su main.

## Riscontro recepito

- Le sezioni sono **Territorio / Gruppi / Classifiche**. Il selettore rimane visibile durante lo scorrimento, con indicatore animato e dissolvenza del contenuto.
- **Un solo Cambia**, in alto in Territorio, apre la selezione globale del Comune (`/comune`). Eliminati il collegamento «Altre community locali» e l’elenco ripetuto dei Comuni in fondo.
- La scheda mappa è più ampia, con comando esplicito **Esplora la mappa**. Sia la copertina sia il comando aprono la schermata `/map/[id]` già presente su main.
- **La mappa non è stata riscritta**: route, `MapScreen` e `CommunityMap` sono identici a main. Ricerca, categorie, punti d’interesse, filtri, legenda, zoom e posizione rimangono quelli esistenti. Non sono aggiunti punti fittizi per riempirla.
- L’accesso alla community del Comune è separato dalla mappa e apre il dettaglio esistente, dove rimane anche l’adesione. I contributi recenti reali rimangono in Territorio.
- **Gruppi** ha una creazione in evidenza, una riga per il codice d’invito e schede con tipo, numero di membri e privacy. Le schede aprono il dettaglio del gruppo esistente. Nel pannello Gruppi non si ripete il Comune.
- Nuove animazioni disattivate con «Riduci movimento». Colori del tema, traduzioni italiano/inglese e dati dello store esistente; nessuna nuova dipendenza o modifica al backend.

## Classifiche: verifica e integrazione

Le classifiche erano ancora raggiungibili dal dettaglio di un Comune o gruppo tramite `/community-ranking?id=…`; `/league` rimanda già alla Community. La nuova sezione le raccoglie senza cambiare i criteri di punteggio.

- Il selettore della classifica offre il Comune dell’app e i gruppi di cui si è membri. Cambiare classifica non cambia il Comune globale o le iscrizioni. Uscire da un gruppo, o perdere l’accesso, lo rimuove dalle scelte e riporta al Comune.
- L’anteprima mostra fino a cinque righe e include sempre la propria, anche se più in basso. «Vedi l’elenco completo» apre la classifica esistente con lo stesso ID.
- I Seeds derivano dalle prove caricate degli ultimi sette giorni, non dalla settimana di calendario. Le prove demo non contano; i duplicati sono esclusi. Le prove condivise con un gruppo contano solo lì e non entrano nel confronto comunale. Gli utenti bloccati sono esclusi.
- La classifica non è un aggregato completo dal server: il limite del campione è visibile. Caricamento ed errore hanno stati dedicati con possibilità di riprovare.
- Nessuna prova reale recente: stato vuoto, senza «#1» con zero punti. Questa correzione vale anche per la schermata completa, che usa lo stesso componente.
- La terza voce si adatta agli schermi stretti: a 320 px rimangono le tre etichette complete, senza icone o conteggi che le comprimano.

## Aprire l’anteprima

Dalla radice del worktree `/home/xfurti/Projects/BeGreen-community-restyle`, con le dipendenze installate:

```bash
EXPO_NO_DOTENV=1 npm run web -- --port 8095
```

Aprire <http://localhost:8095/community>. Il vecchio HTML contiene soltanto un rimando a questa anteprima: il pannello con la mappa statica della prima proposta è stato rimosso.

L’anteprima locale senza backend usa le normali schermate dell’app. Per un browser nuovo occorre completare l’onboarding. Le schermate salvate usano un profilo locale di anteprima a Verona e un gruppo creato localmente dal nome **Amici in verde · Demo**, con un membro. Nessun account o gruppo remoto è stato modificato.

## Schermate

- [Territorio](community-restyle-territorio.png)
- [Mappa esistente aperta dalla scheda](community-restyle-mappa.png)
- [Gruppo locale di esempio](community-restyle-gruppi.png)
- [Classifiche](community-restyle-classifiche.png)
- [Scelta del Comune o gruppo](community-restyle-scelta-classifica.png)
- [Classifiche, 320 px](community-restyle-classifiche-320.png)
- [Tema chiaro, inglese, 320 px](community-restyle-light-en-320.png)

## Verifica

`npm run verify` superato (152 test): typecheck, lint e test dei workflow, servizi e migrazioni Supabase.

Controllati nel browser:

- tre sezioni e stato selezionato; un solo comando Cambia in Territorio, assente in Gruppi;
- apertura della vera mappa di Verona con barra di ricerca, tutte le categorie, filtri, legenda, zoom e ritorno alla Community;
- apertura del selettore del Comune;
- apertura del form gruppo, creazione locale, presenza nell’elenco e apertura del dettaglio;
- apertura dell’inserimento codice;
- scelta della classifica del gruppo lasciando Verona come Comune, apertura dell’elenco completo con lo stesso ID e assenza di piazzamenti fittizi nello stato vuoto;
- tema scuro italiano a 430 px e tema chiaro inglese a 320 px, senza scorrimento orizzontale della pagina.

Verifica visiva web; nessuna prova su dispositivo nativo iOS/Android in questa fase. Storage, permessi e schermate dei dettagli mantengono il comportamento esistente. PR e merge attendono il nuovo riscontro sul design.
