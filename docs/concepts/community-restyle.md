# Proposta Community

Branch: `design/community-restyle`, da `main` aggiornato (`148b5e4`).

Richiesta: proporre e mostrare un restyle della Community, prima di aprire una PR. La pagina attuale alterna territorio, gruppi e di nuovo Comune; la proposta raccoglie questi contenuti in due sezioni selezionabili.

## Struttura proposta

- **Territorio**, all’apertura: Comune con comando **Cambia**, una scheda per mappa e community locale, contributi vicini e ricerca di altre community locali.
- **Gruppi**: comandi **Nuovo gruppo** e **Ho un codice** sempre in cima, seguiti dallo stato vuoto oppure dall’elenco. Si apre ogni gruppo dalla sua scheda; inviti, membri e impostazioni restano nel dettaglio esistente.
- Il selettore Territorio / Gruppi resta visibile durante lo scorrimento. La navigazione principale e il pulsante di cattura conservano il loro posto.

Il Comune non viene ripetuto in fondo alla pagina. L’adesione resta nel dettaglio locale, già accessibile con **Esplora Verona**. Il comando **Cambia** riguarda il Comune selezionato per tutta l’app; la ricerca delle altre community permette invece di esplorare senza cambiare selezione.

## Anteprima

Il prototipo è separato dall’app Expo: nessun componente, servizio, traduzione o dato reale è stato modificato. Usa i colori e il carattere Geist del progetto. I pannelli dimostrativi rendono verificabile il percorso prima dell’implementazione; non definiscono una riscrittura delle schermate di dettaglio.

Dopo aver installato le dipendenze del progetto, dalla radice di questo worktree:

```bash
python -m http.server 8094 --bind 127.0.0.1
```

Aprire <http://127.0.0.1:8094/docs/concepts/community-restyle.html>.

Da provare:

1. Passare tra **Territorio** e **Gruppi**.
2. In Gruppi, scegliere **Mostra gruppi di esempio**. Su desktop ci sono anche i comandi di scenario nel pannello laterale.
3. Aprire un gruppo; provare la creazione e l’ingresso con `DEMO123`. Gli altri codici mostrano un errore esplicito.
4. Aprire mappa, Comune e ricerca. Solo Verona è disponibile in questa anteprima.

Tutti i dati dei gruppi sono marcati come esempi. Le simulazioni restano in memoria e si azzerano ricaricando la pagina. La mappa è una vista statica di Verona: non presenta segnaposti o contributi inventati e non simula zoom o trascinamento. Le categorie nel pannello mappa mostrano solo lo stato dimostrativo. La barra principale è rappresentata per valutare gli spazi; la navigazione dell’app non è simulata.

Screenshot:

- [Territorio](community-restyle-territorio.png)
- [Gruppi, stato vuoto](community-restyle-gruppi-vuoti.png)
- [Gruppi, con esempi](community-restyle-gruppi.png)

## Collegamenti per l’implementazione successiva

Da confermare dopo il riscontro sulla proposta. I percorsi esistenti sono:

| Comando | Destinazione esistente |
| --- | --- |
| Cambia Comune | `/comune` (selezione globale) |
| Apri mappa | `/map/[id]` del Comune selezionato |
| Esplora Verona | `/community/[id]` del Comune selezionato |
| Aggiungi un contributo | Mappa e percorso di aggiunta esistente, con gli attuali requisiti di accesso |
| Altre community locali | `/communities` |
| Nuovo gruppo | `/new-community` |
| Ho un codice | `/join` |
| Scheda di un gruppo | `/community/[id]` del gruppo scelto |

L’implementazione dovrà mantenere i Comuni già seguiti, la ricerca completa, visibilità e autorizzazioni, aggiornamento dei dati, localizzazione, entrambi i temi e accessibilità. Nessuna nuova funzione backend o modifica delle iscrizioni è prevista per questo restyle.

## Verifica di questa proposta

- `npm run verify`: superato (typecheck, lint, 86 + 62 test).
- `node --check docs/concepts/community-restyle.js`: superato.
- Anteprima osservata nel browser a larghezza mobile, con font e immagini caricati; controllati cambio sezione, elenco con esempi, creazione simulata, errore codice e ingresso dimostrativo. Screenshot salvati a 430 × 1000.
- Nessuna verifica nativa iOS/Android: il risultato di questa fase è un prototipo HTML, non una modifica all’app.

PR e merge attendono il riscontro richiesto dall’utente.
