# Classifiche: errore di sincronizzazione e Riprova

Correzione del P2 segnalato nella review della PR #81. Lo store intercettava gli errori della sincronizzazione prima che raggiungessero il componente Classifiche: la schermata passava allo stato pronto e mostrava la cache o lo stato senza contributi anche dopo un errore di rete.

`syncCommunity(id, { throwOnError: true })` ora propaga l’errore al chiamante. Classifiche usa questa modalità per il messaggio con **Riprova**; anche il refresh manuale della tab Community può raggiungere la gestione dell’errore già prevista. I chiamanti automatici continuano a gestire gli errori senza Promise rifiutate non gestite.

La richiesta condivisa mantiene il proprio errore: una classifica che si aggancia a una sincronizzazione automatica in corso riceve lo stesso fallimento, anche se esistono dati in cache. Dopo il completamento, anche in errore, la richiesta in corso viene liberata e Riprova può avviare un nuovo tentativo. Dati, punteggi e permessi non cambiano.

## Verifica

`npm run verify` superato: typecheck, lint e **158 test** (86 + 72).

Sei test di regressione in `src/services/community-sync.test.ts` coprono errori automatici gestiti, propagazione con cache, richieste concorrenti automatiche e visibili in entrambi gli ordini, recupero al secondo tentativo e caricamento di un contesto mancante dopo una richiesta condivisa.

Verifica web a 430 × 932 con l’app collegata esclusivamente a un servizio HTTP di test locale:

1. Risposte REST HTTP 503: Classifiche mostra il messaggio di errore e Riprova; non mostra la classifica vuota.
2. Ripristino delle risposte valide del servizio locale e pressione di Riprova: il messaggio scompare e viene mostrato il risultato valido (in questa prova, nessun contributo).

Schermate: [errore simulato](error.png) e [recupero dopo Riprova](recovered.png).

Il servizio locale usa solo un profilo di test e risposte sintetiche. Nessun account remoto o credenziale reale usati. Non è una verifica dell’infrastruttura Supabase di produzione o di un dispositivo nativo.
