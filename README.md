# AU

Repository privata per un team di sei persone che prepara un hackathon. Raccoglie idee, sviluppo, demo e presentazione; il prodotto e lo stack definitivo verranno scelti dal team.

## Da dove partire

1. Leggi [AGENTS.md](AGENTS.md), valido anche per gli assistenti AI.
2. Registra le proposte in [docs/ideas.md](docs/ideas.md) e concorda un MVP.
3. Assegna attività e referenti in [docs/team.md](docs/team.md).
4. Parti da `main` aggiornato, lavora su un branch e apri una PR verso `main`.
5. Richiedi la review con `/PI review` nei commenti della PR; correggi i problemi e chiedi l'approvazione di un compagno.

`main` contiene il lavoro integrato. La configurazione prevista richiede una PR, almeno un'approvazione e il check `Verify`, senza push diretti, force push o cancellazione di `main`, anche per gli amministratori. Le regole effettive sono nelle impostazioni GitHub: [setup e verifica](docs/github-setup.md).

## Skills condivise

I file mantenuti dal team sono in [`skills/`](skills/). Codex li trova anche tramite `.agents/skills`; Pi tramite `.pi/skills`. Entrambi sono collegamenti alla stessa cartella. Gli altri agenti possono leggere il percorso indicato in `AGENTS.md`.

| Serve a | Skill |
| --- | --- |
| Proporre e confrontare idee per l'hackathon | [hackathon-ideas](skills/hackathon-ideas/SKILL.md) |
| Realizzare una funzionalità o un'aggiunta futura | [hackathon-feature](skills/hackathon-feature/SKILL.md) |
| Revisionare una PR con rilievi verificabili | [hackathon-review](skills/hackathon-review/SKILL.md) |
| Preparare pitch, slide e demo | [hackathon-pitch](skills/hackathon-pitch/SKILL.md) |

Esempi per un agent: «Usa hackathon-ideas per confrontare queste proposte», «Usa hackathon-feature per implementare questa issue», «Usa hackathon-pitch per preparare una demo di tre minuti».

## Sviluppo

Il punto di partenza tecnico è minimale: Node.js 24 e TypeScript strict. Non è ancora un'applicazione. Il team può scegliere un altro stack prima di sviluppare il prodotto, aggiornando istruzioni e CI nella stessa PR.

```sh
npm ci
npm run dev
npm run verify
```

`verify` esegue typecheck, build e i test delle regole del workflow di review. Le nuove funzionalità aggiungeranno i propri controlli pertinenti.

## Pull request e review Pi

- Una PR non draft verso `main` avvia una review Pi; una draft la avvia quando diventa pronta.
- Nuovi commit eseguono la CI, senza rilanciare automaticamente il modello.
- `/PI review` oppure `/pi review` ripete la review sullo stato corrente.
- È possibile aggiungere un focus: `/PI review controlla soprattutto autenticazione e permessi`.
- Il comando è riservato a chi ha accesso `write`, `maintain` o `admin` e funziona nei commenti della conversazione della PR.
- Pi pubblica una review, con lo SHA analizzato; non applica modifiche e non esegue merge.
- Dopo nuovi commit, richiedi una nuova review. La review AI non sostituisce l'approvazione umana; il suo esito non è un check obbligatorio.

Per attivarla servono `PI_API_KEY` nei secrets e `PI_PROVIDER` / `PI_MODEL` nelle variables di GitHub Actions: [istruzioni complete](docs/github-setup.md). `GITHUB_TOKEN` è fornito automaticamente da GitHub, senza token personali.

## Documentazione

- [Team, ruoli e collaborazione](docs/team.md)
- [Idee, MVP e aggiunte future](docs/ideas.md)
- [Decisioni del progetto](docs/decisions.md)
- [Presentazione e percorso della demo](docs/presentation.md)
- [Configurazione GitHub, secrets e protezioni](docs/github-setup.md)

Inviti e username dei partecipanti verranno aggiunti quando comunicati dal responsabile. Non committare chiavi, token, credenziali o dati personali reali per la demo.
