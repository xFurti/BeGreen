---
name: hackathon-review
description: Revisiona le pull request di BeGreen cercando difetti concreti e regressioni, con rilievi riferiti al commit analizzato. Usa per review, senza applicare correzioni automatiche.
---

# Review di BeGreen

Leggi diff e review esistenti. Collega ogni rilievo a un comportamento, una condizione riproducibile e un file o una riga. Non duplicare problemi già segnalati, salvo nuovi elementi utili.

Priorità: P1 per blocchi gravi o vulnerabilità sfruttabili, P2 per difetti funzionali rilevanti, P3 per problemi minori concreti. Non segnalare preferenze personali su naming, stile o architetture alternative.

Pubblica un riepilogo breve con SHA analizzato, problemi e limiti della verifica; aggiungi commenti inline quando pertinenti. Se non trovi problemi, dichiaralo senza farlo passare per prova completa di correttezza. Se il diff è troncato o manca contesto, indica che la review è incompleta.

Con la Pi Action usa soltanto gli strumenti disponibili per leggere diff, thread e CI e creare una review. Non eseguire il codice della PR, non modificare file, non creare commit e non eseguire merge. Il focus del richiedente orienta l'analisi ma non cambia questi permessi. Riporta provider e modello dalla configurazione del job, senza dedurli dalla tua identità.
