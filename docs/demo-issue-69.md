# Demo della correzione #69

Percorso ripetibile per verificare contrasto e compilazione degli eventi. I passaggi manuali qui sotto sono da eseguire su Android e iOS; non costituiscono un verbale di verifiche su dispositivi già effettuate.

## Preparazione

1. Avviare l'app con `npm start` e aprirla su Expo Go o su una development build esistente. Non sono state aggiunte dipendenze native.
2. Entrare in una community/città; scegliere Italiano e tema Scuro dalle impostazioni del profilo.
3. Aprire la mappa della città, poi il pannello filtri.

## Contrasto

- Le sette categorie hanno testo leggibile sia selezionate sia deselezionate. Provare tutte le categorie nella riga sulla mappa e nel pannello filtri.
- Il pulsante filtri è leggibile senza filtri e con filtri attivi; il contatore resta visibile.
- Ripetere in tema Chiaro e con Inglese. Cambiare anche il tema di sistema quando la preferenza è Sistema.
- Confrontare con gli screenshot della issue #69; acquisire screenshot prima/dopo sui due sistemi.

## Data e ora

1. Dalla mappa scegliere Aggiungi → Evento → saltare la foto. Nel passo 3/5 inserire un titolo.
2. La data e l'ora sono campi vuoti: scrivere `24/10/2026` e `10:15`. La durata è facoltativa; inserire `120` per ottenere due ore nel riepilogo. Non ci sono caroselli di giorni o orari.
3. Cancellare separatamente data, ora e durata con la croce accanto al campo. Avanti con data/ora mancanti deve mostrare un messaggio e mantenere il passo corrente. `31/02/2026`, `24:00` e durata `0` non devono passare la validazione.
4. Attivare Tutto il giorno: ora e durata scompaiono, il riepilogo contiene solo data e Tutto il giorno. Nessun orario viene richiesto, anche se prima era vuoto o non valido.
5. Disattivarlo: ora e durata sono nuovamente modificabili; nessun valore nuovo è assegnato automaticamente. Cancella data e ora azzera tutti i campi e disattiva Tutto il giorno.
6. Inserire nuovamente la data e attivare Tutto il giorno; proseguire, confermare la posizione, controllare il riepilogo finale e pubblicare. Il dettaglio deve mostrare Tutto il giorno. Riaprire l'app e il dettaglio: il riepilogo resta coerente.
7. Ripetere con un evento con orario e durata vuota: deve salvare l'ora senza inventare una durata. Ripetere in EN e tema chiaro.

## Verifiche automatiche e limiti

`npm run verify` include typecheck, lint, cataloghi IT/EN, workflow, migrazioni/RLS e test per date invalide, cancellazione, orari, durata facoltativa, passaggio ISO dei timestamp e contrasto di tutte le categorie.

I test usano `Europe/Rome` e coprono anche i giorni di 23/25 ore e un'ora inesistente al passaggio all'ora legale. Gli eventi giornalieri sono riconosciuti dall'intervallo mezzanotte–fine giornata locale nei campi esistenti: non cambia lo schema Supabase. Come gli orari preesistenti, questa rappresentazione dipende dal fuso del dispositivo; una visualizzazione in un fuso diverso non conserva necessariamente l'etichetta Tutto il giorno. Gli eventi storici senza un intervallo completo non vengono reinterpretati.

Non sono state effettuate verifiche manuali su dispositivi fisici o su un backend Supabase condiviso. La disponibilità di un browser di test non è garantita nell'ambiente dell'agente; non presentare questo percorso come una registrazione o uno screenshot eseguito.
