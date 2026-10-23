# Idee e backlog

Il prodotto scelto è BeGreen sulla traccia FESAV «La mia sostenibilità» (vedi `docs/traccia.md`, `README.md`, `decisions.md`). Registra qui le proposte fuori dallo scope corrente oppure apri una issue con il template Idea.

Per ogni proposta indica:

- problema concreto e persona che lo incontra;
- soluzione in una frase e risultato osservabile;
- cosa si può mostrare in una demo breve;
- dati, servizi, hardware o permessi necessari;
- MVP realizzabile nel tempo disponibile;
- principale incertezza da verificare subito;
- stato: proposta, selezionata, da rivalutare o scartata, con motivazione.

## MVP scelto

BeGreen: Drop giornaliera generata dai dati locali, foto + prova video di 5 secondi, verifica da parte degli amici, Pulse con dati ambientali live e assistente Leaf con fonti citate. Dettagli e limiti del prototipo in `README.md`.

## Aggiunte future

Da raccogliere man mano. Un'idea interessante non è una promessa di implementazione. Prima di inserirla nell'MVP, valutarne utilità per la demo, tempo e dipendenze.

### Community: le fasi successive (da `BeGreen_Community_Spec.md`)

Stato: proposte. La prima e la seconda fase della specifica sono implementate (vedi `README.md` → Community); queste restano da fare.

- Unificare squad (League) e gruppi (Community): entrambi sono amici con un codice; i gruppi potrebbero ereditare quest e post riservati ai membri.
- Fornitore di tile con chiave per la produzione (MapTiler, Stadia o simili) al posto delle tile standard di OpenStreetMap.
- Sfide tra classi, quartieri e associazioni: oggi le sfide sono di una community; servirebbero sfide condivise tra più community o squadre.
- Percorsi tematici e itinerari creati dalla community (sequenze di luoghi sulla mappa).
- Collaborazioni con enti, negozi e organizzazioni locali (luoghi “ufficiali”, verifiche da parte di enti).
- Riepiloghi dei risultati collettivi basati su dati attendibili (oggi solo conteggi, nessuna stima d’impatto).
- Nomina dei moderatori dall’app e coda di moderazione per le segnalazioni.
- Indicatori da osservare: adesioni, aperture della mappa e interazioni con i segnaposto, luoghi aggiunti, salvataggi e condivisioni, sfide con più partecipanti, ritorni nei giorni successivi, segnalazioni risolte, contenuti che portano a un’interazione reale. Servono un sistema di analytics rispettoso della privacy e una decisione del team su cosa misurare.

### Onboarding «Pianta il tuo seme»: oltre la #13

Stato: proposte, emerse riscrivendo la #13. Fuori scope della prima versione.

- Login reale e recupero dell'account: collegare l'account anonimo a email, Apple o Google (`linkIdentity` di Supabase) e un percorso «Ho già un account». Oggi cambiando telefono si perde il seme.
- Notifica quando esce la Drop del giorno o quando il seme ha sete (richiede `expo-notifications` e una build di sviluppo).
- Suoni brevi per i momenti chiave (piantare, germogliare).
- Personalizzazione della pianta: vasi e accessori sbloccati con i badge.
- Soglie degli stadi da tarare sui dati veri della demo (oggi 1 / 60 / 200 / 500 Seeds).

