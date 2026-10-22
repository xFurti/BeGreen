# Setup GitHub

## Repository e accessi

La repository deve essere **Private**. Invita i cinque collaboratori oltre al responsabile usando gli username che verranno comunicati, senza creare token. In un'organizzazione assegna normalmente `Write`; in una repository personale gli invitati diventano collaboratori. Non assegnare amministrazione senza necessità.

## Secrets e variables

In **Settings → Secrets and variables → Actions**:

| Tipo | Nome | Valore |
| --- | --- | --- |
| Repository secret | `PI_API_KEY` | Chiave API del provider scelto per Pi, inserita dal responsabile |
| Repository variable | `PI_PROVIDER` | Identificatore del provider supportato da Pi |
| Repository variable | `PI_MODEL` | Identificatore esatto del modello disponibile presso quel provider |
| Repository variable facoltativa | `PI_THINKING_LEVEL` | Livello supportato dal modello; default `off` |

Non aggiungere un secret `GITHUB_TOKEN`: GitHub lo genera per ogni esecuzione. Non servono PAT, token per collaboratore o accessi ai secrets del repository per il modello. Non incollare chiavi in chat, issue o commit.

Il workflow termina con un errore esplicito se manca la configurazione del modello. La sua presenza nella repo non dimostra che il provider risponda: la verifica operativa richiede una review completata dopo l'inserimento del secret.

## Regole di main

Applicare la configurazione in [main-protection.json](../.github/main-protection.json) a `main` tramite l'API GitHub di branch protection, oppure riprodurla nelle impostazioni:

- richiedere pull request e almeno un'approvazione;
- invalidare approvazioni precedenti quando cambia il codice;
- richiedere risoluzione delle conversazioni;
- richiedere il check `Verify` e branch aggiornato con `main`;
- applicare le regole anche agli amministratori;
- vietare force push e cancellazione di `main`;
- non prevedere bypass per utenti o bot.

Questo impedisce il push diretto finché la protezione è attiva. Un amministratore può comunque cambiare le impostazioni del repository: non è una garanzia contro chi amministra l'account.

Le protezioni dei branch nelle repo private richiedono un piano GitHub compatibile, per esempio Pro per account personali o Team per organizzazioni. Se GitHub rifiuta il setup, la repo rimane privata e le regole non vanno dichiarate attive. Vedi [documentazione GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Workflow

`CI` esegue `Verify` sulle PR verso `main` e su `main`. `Pi PR Review` usa `pull_request_target` per apertura e uscita dal draft, e `issue_comment` per `/PI review`.

Prima di accedere al secret, il workflow controlla via API che la PR sia aperta, pronta, interna alla repository e diretta a `main`. Per i comandi controlla anche il permesso effettivo dell'autore. Carica soltanto file e istruzioni del branch predefinito, senza checkout o esecuzione del codice della PR. Il modello dispone solo degli strumenti per leggere diff, thread e CI e pubblicare una review. Il token del job ha `contents: read`, `issues: write` e `pull-requests: write`.

La review è limitata al diff e ai suoi strumenti di lettura: se il contesto o il diff sono incompleti deve dichiararlo. Non è un'esecuzione dei test. Se la PR cambia durante la review, il workflow fallisce e richiede una nuova esecuzione. Nessuna sessione viene condivisa in gist o pubblicata fuori dalla repo.

La Pi Action è fissata alla release `v2.30.1`; gli input e la lista degli strumenti seguono la [documentazione ufficiale](https://github.com/shaftoe/pi-coding-agent-action/tree/v2.30.1). La review AI è aggiuntiva; il merge è protetto da CI e approvazione umana, non dal risultato del modello.

## Verifica finale

Controllare visibilità privata, branch predefinito `main`, impostazioni di protezione effettive e CI riuscita. Dopo l'inserimento del secret, aprire una PR non draft e verificare una review associata allo SHA corretto; aggiungere un commento `/PI review` e verificare una seconda esecuzione. Non fare un push di prova su `main` per testare il blocco.
