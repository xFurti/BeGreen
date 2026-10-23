# Traccia scelta: La mia sostenibilità

Fonte: brief ufficiale dell'hackathon Good Vibes / FESAV 2026 (traccia 2).  
Regolamento dell'evento: [`regolamento.md`](regolamento.md) e PDF [`regolamento-fesav-2026.pdf`](regolamento-fesav-2026.pdf).  
Prodotto del team su questa traccia: BeGreen (`README.md`, `docs/decisions.md`).

## Il tema

La sostenibilità sembra sempre una questione di altri: governi, aziende, scienziati. Questa sfida parte dal contrario: che cosa può fare una persona, una classe, un'associazione o un Comune del nostro territorio, e come dati aperti e AI possono renderlo visibile e concreto? Aria, suolo, acqua, biodiversità, consumi, mobilità, comunità: come possiamo costruire strumenti che aiutino qualcuno a capire la situazione locale e ad agire?

## Domanda guida

Come trasformiamo i dati ambientali del nostro territorio in decisioni e azioni alla portata di chi le deve prendere?

## Piste di partenza (a scelta, non vincolanti)

- **Aree protette e specie:** mappa narrata dei siti Natura 2000 dell'Alto Vicentino con le specie osservate, per scuole e visitatori; segnalazione di specie e riconoscimento da foto.
- **Aria e clima locale:** assistente che spiega cosa significano oggi le misure di qualità dell'aria e meteo, con consigli personalizzati e confronto tra zone.
- **Suolo e territorio:** strumento per capire come cambia il paesaggio intorno a noi e cosa si può chiedere al Comune.
- **Comportamenti e comunità:** app per sfide collettive di una classe o di un quartiere, che misura l'impatto di piccole azioni.

## Ruolo dell'AI

Spiegazione dei dati in linguaggio semplice, Q&A con citazione della fonte, riconoscimento di specie e immagini, sintesi di documenti tecnici, personalizzazione dei consigli.

## Dataset del kit (solo di esempio)

Non sono obbligatori: sono esempi del kit. Preferire fonti aperte, citare licenze e limiti, non inventare dati.

### Meteo e clima

- **Open-Meteo:** API di previsioni e dati storici, download CSV/XLSX. Uso non commerciale libero; chiave API solo per uso commerciale. Documentazione: [open-meteo.com/en/docs](https://open-meteo.com/en/docs). Include sezione Air Quality.

### Aria (sensori dei cittadini)

- **sensor.community:** endpoint senza credenziali (es. media sensori ultima ora o filtri per area), aggiornamento ogni pochi minuti, archivio CSV giornaliero. Richiede user agent identificabile. Storico: [archive.sensor.community](https://archive.sensor.community). Sensori cittadini, non centraline ufficiali.

### Biodiversità e specie

- **GBIF:** API REST su `api.gbif.org`, senza autenticazione per la maggior parte degli usi; ricerca in tempo reale e download asincroni per grandi estrazioni. Rate limit sulle richieste frequenti. Docs: [techdocs.gbif.org/en/openapi](https://techdocs.gbif.org/en/openapi). Licenza per singolo dataset: da controllare.

### Aree protette

- **Rete Natura 2000 (Alto Vicentino):** sito IT3210040 «Monti Lessini - Pasubio - Piccole Dolomiti Vicentine», 13.872 ettari, ZPS dal 2003. Scheda ufficiale (PDF) e pagina Regione Veneto su biodiversità e aree protette.
- **Geoportale Regione Veneto (IDT 2.0):** ricerca, consultazione e download; WMS e dataset territoriali. Accesso: [idt2.regione.veneto.it](https://idt2.regione.veneto.it). Licenze per dataset (es. CC-BY, IODL 2.0).

### Qualità dell'aria ufficiale

- **ARPAV via Regione Veneto:** dati giornalieri validati della rete di monitoraggio e rapporti annuali (formato scaricabile da verificare).

### Altri dataset possibili

| Dataset | Perché interessa |
| --- | --- |
| iNaturalist (API pubblica) | Osservazioni di specie con foto; riconoscimento e citizen science |
| EEA, Natura 2000 | Perimetri GIS dei siti e liste di specie/habitat a livello europeo |
| ISPRA, consumo di suolo | Cambiamento di uso del suolo fino a livello comunale |
| Cartografia regionale (uso del suolo, habitat) | Contesto per le aree protette |
| Carta degli habitat e cataloghi delle specie del Veneto | Contenuti per riconoscimento e narrazione |

## Come BeGreen risponde (scelta del team)

BeGreen combina piste del brief (comportamenti/comunità + aria/clima + territorio) in un loop dimostrabile: Drop giornaliera dai dati locali, foto + prova video, verifica tra pari, Pulse e Leaf con fonti citate. Dettaglio schermate e copertura del brief in `README.md`. Nuove idee fuori da questa risposta restano in `docs/ideas.md`, non entrano automaticamente nello scope.
