---
name: hackathon-review
description: Revisiona una PR di BeGreen con rilievi concreti legati a commit e file. Solo analisi: non applicare fix, salvo richiesta esplicita di correggere.
---

# Review di BeGreen

Leggi diff e review esistenti con `gh` (o gli strumenti del job CI). Ogni rilievo: comportamento, come riprodurlo, file/riga. Priorità P1 bloccante/sicurezza, P2 funzionale, P3 minore concreto. Niente preferenze di stile.

Se la PR cambia prodotto o pitch, verifica anche allineamento a `docs/traccia.md` (domanda guida, scala locale, dati+AI, criteri di giuria) senza inventare vincoli.

Riepilogo breve con SHA, problemi e limiti; commenti inline se utili. Diff troncato → review incompleta. Non eseguire codice della PR, non modificare file, non commit/merge, salvo richiesta esplicita diversa. Non menzionare `/PI review` in chat.
