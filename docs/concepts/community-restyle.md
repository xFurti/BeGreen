# Community · revisione 2

Branch: `design/community-restyle`. Anteprima direttamente nell’app Expo; nessuna PR aperta e nessuna modifica pubblicata su main.

## Riscontro recepito

- Restano le due sezioni **Territorio / Gruppi**. Il selettore rimane visibile durante lo scorrimento, con indicatore animato e dissolvenza del contenuto.
- **Un solo Cambia**, in alto in Territorio, apre la selezione globale del Comune (`/comune`). Eliminati il collegamento «Altre community locali» e l’elenco ripetuto dei Comuni in fondo.
- La scheda mappa è più ampia, con comando esplicito **Esplora la mappa**. Sia la copertina sia il comando aprono la schermata `/map/[id]` già presente su main.
- **La mappa non è stata riscritta**: route, `MapScreen` e `CommunityMap` sono identici a main. Ricerca, categorie, punti d’interesse, filtri, legenda, zoom e posizione rimangono quelli esistenti. Non sono aggiunti punti fittizi per riempirla.
- L’accesso alla community del Comune è separato dalla mappa e apre il dettaglio esistente, dove rimane anche l’adesione. I contributi recenti reali rimangono in Territorio.
- **Gruppi** ha una creazione in evidenza, una riga per il codice d’invito e schede con tipo, numero di membri e privacy. Le schede aprono il dettaglio del gruppo esistente. Nel pannello Gruppi non si ripete il Comune.
- Nuove animazioni disattivate con «Riduci movimento». Colori del tema, traduzioni italiano/inglese e dati dello store esistente; nessuna nuova dipendenza o modifica al backend.

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
- [Gruppi senza iscrizioni](community-restyle-gruppi-vuoti.png)
- [Gruppo locale di esempio](community-restyle-gruppi.png)
- [Tema chiaro, inglese, 320 px](community-restyle-light-en-320.png)

## Verifica

`npm run verify` superato: typecheck, lint e test dei workflow, servizi e migrazioni Supabase.

Controllati nel browser:

- sezioni e stato selezionato; un solo comando Cambia in Territorio, assente in Gruppi;
- apertura della vera mappa di Verona con barra di ricerca, tutte le categorie, filtri, legenda, zoom e ritorno alla Community;
- apertura del selettore del Comune;
- apertura del form gruppo, creazione locale, presenza nell’elenco e apertura del dettaglio;
- apertura dell’inserimento codice;
- tema scuro italiano a 430 px e tema chiaro inglese a 320 px, senza scorrimento orizzontale della pagina.

Verifica visiva web; nessuna prova su dispositivo nativo iOS/Android in questa fase. Storage, permessi e schermate dei dettagli mantengono il comportamento esistente. PR e merge attendono il nuovo riscontro sul design.
