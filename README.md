# Issue #29 — prove visive

App in esecuzione sul commit `271de9e322fb8f64e488933becdc9f25f8c22cf8` del branch `fix/29-plants-only`. Le immagini sono screenshot del browser Chromium, non mockup. Viewport mobile 390×844 e desktop 1280×844.

- `live-pulse-it.png`, `drop-it.png`: richiesta iNaturalist live per Milano con `iconic_taxa=Plantae`, 110 specie; foto e attribuzioni dalla stessa risposta. Gli altri servizi ambientali sono bloccati nel test per isolare Nature (la scheda aree mostra l'indisponibilità).
- `offline-pulse-it.png`, `offline-pulse-en.png`: il campione offline dell'app, con Pratolina, Tarassaco, Edera. Il campione non contiene foto: i riquadri neutri non sono errori di caricamento.
- `empty-pulse-it.png`: risposta iNaturalist simulata con `total_results: 0`, nessun carosello né sostituzione con campioni. Gli altri servizi sono bloccati.
- `leaf-it.png`, `leaf-en.png`: domanda esplicita sugli uccelli, risposta sulle piante del campione offline e nota di perimetro.
- `capture-it.png`, `capture-en.png`: review della cattura demo con foto/clip incluse nell'app, etichetta e suggerimenti sulle piante.
- `guide-it.png`, `guide-en.png`: istruzioni dell'atto `spot`.
- `desktop-pulse-en.png`: campione offline in viewport desktop.

Profilo e stato iniziale sono fixture locali. Nessun backend Supabase, nessun post remoto. La fotocamera nativa e una build iOS/Android non sono state provate.

Verificati anche: filtro `taxonKey=6` nella richiesta GBIF in Me; apertura di un post salvato con `action: spot` e didascalia invariata; stato vuoto in Leaf. Nessun errore JavaScript nelle sessioni browser.
