# Dati per «Il mio Comune»

Sezione **02 · My Comune** nella schermata *Me*: il comune dell'utente (posizione approssimata ~1 km), i suoi indicatori di sostenibilità ufficiali confrontati con gli altri comuni della provincia, i dati live da sensori e osservazioni, e una domanda concreta da portare al Comune. Risponde alla domanda guida della traccia: trasformare i dati del territorio in azioni alla portata di chi decide.

## Dataset del kit: cosa abbiamo verificato

| Dataset del kit | Esito | Uso in BeGreen |
| --- | --- | --- |
| Open-Meteo (meteo + Air Quality CAMS) | API senza chiave, CORS aperto | Già nel Pulse; riga «Air today» (EAQI) |
| sensor.community | `data.sensor.community/airrohr/v1/filter/area=lat,lon,km`, senza chiave, CORS aperto, chiede user agent identificabile | Riga «Citizen sensors · PM2.5»: ultima lettura per sensore entro 10 km, valori anomali scartati (0, >300 µg/m³, indoor), mediana |
| GBIF | `api.gbif.org/v1/occurrence/search` con `geoDistance` e `facet=speciesKey`, `limit=0`: conta le specie senza scaricare record | Riga «Species recorded nearby» (5 km, ultimi 5 anni) |
| Rete Natura 2000 / IDT2 Regione Veneto | PDF e WMS/shapefile: niente API JSON leggera | Non integrati; le aree protette restano da OpenStreetMap (Overpass) come nel Pulse |
| ARPAV via Regione Veneto | **Open data scaricabili (CSV, CC BY 4.0)** su arpa.veneto.it/dati-ambientali/open-data/atmosfera. Nessuna API live trovata | PM10 annuale per stazione e emissioni comunali INEMAR (sotto) |
| iNaturalist | API pubblica | Già nel Pulse (specie con foto) |
| ISPRA, consumo di suolo | xlsx comunale, CC BY 4.0 | Riga «Land sealed» |

## Altre fonti aggiunte

| Fonte | Dato | Anno | Licenza | Uso |
| --- | --- | --- | --- | --- |
| ARPAV, «PM10 anni 2002-2025» (`polveri-pm10_trend.csv`) | Media annua e giorni oltre 50 µg/m³ per stazione | 2025 | CC BY 4.0 | Stazione più vicina tra Vicenza (3), Schio, Bassano |
| ARPAV, INEMAR Veneto 2019 (`inemarveneto2019_emisscom.csv`) | Emissioni per comune e macrosettore | 2019 | CC BY 4.0 | CO₂ per residente (solo emissioni, assorbimenti esclusi), settore principale di CO₂ e PM10 |
| ISPRA/SNPA, Consumo di suolo, estratto dati comunali 2006-2024 | % suolo consumato, incremento netto 2023-2024 | 2024 | CC BY 4.0 | Riga «Land sealed» |
| ISPRA Catasto Rifiuti, dettaglio comunale | % raccolta differenziata, rifiuti urbani totali, popolazione | 2024 | **Da verificare**: la pagina non indica una licenza | Riga «Separate collection»; kg/abitante = RU totali × 1000 / popolazione |
| OpenStreetMap Nominatim (reverse) | Nome del comune e codice ISTAT (`ref:ISTAT`) | live | ODbL, max 1 richiesta/s | Una richiesta per luogo; se fallisce si usa il centroide più vicino |
| opendatasicilia/comuni-italiani | Centroidi dei comuni | ~2021 | Da verificare | Fallback di localizzazione e distanza dalla stazione |

Il dataset statico è `src/data/comuni-vicenza.json` (113 comuni della provincia di Vicenza, chiave ISTAT). Nota: Sovizzo ha il codice 024128 nei dati ISPRA 2024 e include l'ex Gambugliano; le emissioni INEMAR 2019 dei due comuni sono sommate.

## Come si leggono i colori

- **Soglie di legge** dove esistono: raccolta differenziata 65% (D.Lgs. 152/2006); PM10 rispetto ai limiti UE dal 2030 (20 µg/m³ di media annua, 18 giorni oltre 50 µg/m³) e alla linea guida OMS (15); PM2.5 giornaliero OMS 15 µg/m³.
- **Confronto provinciale** dove non c'è una soglia (suolo, CO₂ per residente): terzo migliore verde, terzo centrale ambra, terzo peggiore rosso, con la frase «Better than N% of comuni in the province».
- **Informativo** (grigio) per specie e aree protette: più record non significano più natura.

La logica è in `src/services/comune-levels.ts`, coperta da `tests/comune.test.ts`.

## Limiti

- Gli indicatori ufficiali coprono solo la provincia di Vicenza (area dell'hackathon). Fuori provincia la sezione mostra solo i dati live.
- INEMAR è del 2019: è l'ultima edizione comunale pubblicata come open data trovata.
- I sensori cittadini sono economici e pochi: utili per l'andamento, non per il confronto con i limiti di legge.
- Le stazioni ARPAV con PM10 in provincia sono cinque: per gran parte dei comuni la stazione è a qualche chilometro.

## Idee successive

- Altre province venete con lo stesso procedimento (stessi file ARPAV e ISPRA).
- Passare il blocco «My Comune» a Leaf, per domande con citazione della fonte.
- Esportare la sezione nel Community Report per la classe o il Comune.
