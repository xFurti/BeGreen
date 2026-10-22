---
name: hackathon-feature
description: Implementa funzionalità, bug fix e aggiunte future in AU, coordinando il lavoro del team e consegnando una modifica verificata per una PR verso main.
---

# Sviluppo in AU

Leggi `AGENTS.md`, l'issue e i documenti pertinenti. Ricava il comportamento atteso e una condizione osservabile di completamento; se la richiesta amplia l'MVP, rendi esplicita la scelta prima di includere il lavoro aggiuntivo.

Controlla chi sta lavorando sugli stessi file. Parti da `main` aggiornato su un branch dedicato e riusa struttura e dipendenze già presenti. In un workspace gestito da GitButler usa `but`. Non spostare o includere modifiche di altri partecipanti nel tuo commit.

Implementa la più piccola modifica che completa il comportamento richiesto. Verifica il percorso interessato e gli errori significativi; aggiungi test quando proteggono un comportamento reale. Esegui `npm run verify`, oppure il comando sostitutivo documentato se il team ha cambiato stack.

Aggiorna la documentazione che cambia per l'utente. Consegna un riepilogo di risultato, controlli e limiti, con PR verso `main` quando richiesta. La review Pi e l'approvazione umana precedono il merge; non eseguire pubblicazione o deploy fuori dall'autorizzazione del compito.
