---
name: hackathon-feature
description: Implementa una funzionalità o un bug fix in BeGreen (Expo/React Native) e consegna una modifica verificata, con PR verso main solo se richiesta.
---

# Sviluppo in BeGreen

Usa `AGENTS.md` come regole di base. Per lo scope rispetto all'hackathon, leggi `skills/hackathon-track/SKILL.md` (o almeno `docs/traccia.md`) se la richiesta rischia di uscire dalla traccia.

Ricava comportamento atteso e criterio osservabile di completamento; se amplia l'MVP o la traccia, rendilo esplicito prima di procedere.

Parti da `main` aggiornato su un branch dedicato. Strumenti: `git` e `gh`. Non usare GitButler. Non dire che manca l'accesso a GitHub senza un comando `gh` fallito. Non includere modifiche di altri nel tuo commit.

Implementa la modifica più piccola che completa il comportamento. Test solo se proteggono un comportamento reale. Esegui `npm run verify` prima di consegnare.

Documenta ciò che cambia per l'utente. Riepiloga risultato, controlli e limiti. Apri o aggiorna una PR verso `main` solo se richiesta. Non chiedere `/PI review` in chat.
