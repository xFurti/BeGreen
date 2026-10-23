import { defineMessages } from "@/i18n/schema";

export const generatedMessages = defineMessages(
  {
    drop: {
      badAir: {
        title: "Leave the car. Own the street.",
        why: "Air in {city} is “{band}” today, driven by {driver}. Every trip on foot, bike or bus takes a car off the road where you breathe.",
        metric: "EAQI {aqi} · {name} {value} µg/m³",
      },
      dry: {
        title: "Dry week. Make every drop count.",
        why: "{days} days in a row with almost no rain in {city}. Cut 2 minutes off your shower or switch off what you're not using — then prove it.",
        metric: "{rain} mm rain in 7 days",
      },
      plant: {
        title: "Soil’s ready. Plant something.",
        why: "Top soil moisture is {moisture}% and it's {temp}° — ideal for roots. A pot, a balcony box, a school flowerbed: it all counts.",
        metric: "Soil moisture {moisture}%",
      },
      spot: {
        title: "{count} species live near you. Find one.",
        why: "People around {city} logged {count} species this month. Spot a plant, bird or bug, film it in its habitat, and add a record to the map.",
        metric: "{count} species · 10 km · 30 days",
      },
      pickup: {
        title: "Show {name} some love.",
        why: "{name} is {km} km from you. Grab a bag and a friend — litter there ends up in soil, water and animals.",
        metric: "{km} km away",
      },
      refill: {
        title: "Refill, don’t landfill.",
        why: "Skip the plastic bottle today. Fill up at a tap or a public fountain and show it.",
        metric: "1 bottle = 1 Drop",
      },
    },
    insights: {
      labels: {
        air: "Air",
        weather: "Weather",
        water: "Water",
        soil: "Soil",
        nature: "Nature",
        areas: "Protected areas",
      },
      units: {
        rain: "mm / 7 days",
        moisture: "moisture",
        species: "species · 30 days",
        areas: "within 25 km",
      },
      status: {
        dryDays: "{days} dry days",
        rainComing: "Rain coming",
        normal: "Normal",
        within10: "Within 10 km",
        loading: "Loading…",
        mapBusy: "Map busy",
        nearest: "Nearest {km} km",
      },
      air: {
        meBad: "Air's rough in {city} today. The main problem is {driver}. Skip the car ride — walk, bike or bus. Worst around {hour}:00.",
        meOk: "Air is okay-ish today. {name} is the one to watch. Short trips? Do them on foot or bike.",
        meLater: "Air's clean right now, but the forecast turns “{band}” around {hour}:00. Ride now, skip the car tonight.",
        meGood: "Air's clean today. Perfect day to be outside — bike it, walk it, breathe it.",
        class:
          "European Air Quality Index {aqi}/100 → “{band}”. Driver right now: {name} at {value} {unit}. Lesson idea: plot the next 24 h (peak {peak} at {hour}:00) and explain why NO₂ follows rush hours while O₃ follows sunshine.",
        comune:
          "Modelled EAQI {aqi} ({band}). PM2.5 {pm25}, PM10 {pm10}, NO₂ {no2}, O₃ {o3} µg/m³. Source is the CAMS ensemble on a ~10 km grid: indicative, not a substitute for ARPA reference stations. Community response: {carFree} verified car-free trips logged in {area} this month.",
        actRide: "Ride it",
        actCarFree: "Go car-free",
      },
      weather: {
        meNice: "{sky}, {temp}°. No excuses — this is bike weather.{uv}",
        uv: " UV is high, grab sunscreen.",
        meOther: "{sky}, feels like {feels}°. Indoor green move today: sort the recycling or fix something.",
        class:
          "Now {temp}°C (feels {feels}°C), humidity {humidity}%, wind {wind} km/h, UV {uv}. Today {tmin}–{tmax}°C. Compare with the 30-year average for {month} to talk about local climate trends.",
        comune:
          "Forecast model data (Open-Meteo). Today {tmin}–{tmax}°C, wind {wind} km/h, UV {uv}. Use for planning outdoor community actions; for climate records rely on official station series.",
        actBike: "Bike weather",
        actIndoor: "Indoor move",
      },
      water: {
        meDry: "{days} days without real rain. Plants and rivers feel it. Shorter shower today, and refill instead of buying bottles.",
        meWet: "{rain} mm of rain this week{more}. Free water for the plants — skip the hose.",
        more: ", {rain} mm more coming",
        class:
          "Rain over the past 7 days: {rain} mm; next 3 days: {next} mm; consecutive dry days: {days}. Activity: measure your school's water use for a week and compare with the rainfall.",
        comune:
          "Precipitation (model reanalysis + forecast): {rain} mm in 7 days, {days} consecutive days < 1 mm. Indicative of short-term dryness only; drought status requires official hydrological bulletins.",
        actSave: "Save water",
        actRefill: "Refill",
      },
      soil: {
        meGood: "Top soil is moist — best moment to plant something. Seeds, herbs, a tree with your squad.",
        meOther: "Top soil is {state}. If you water plants, do it at sunset so less evaporates.",
        class:
          "Top-centimetre soil moisture {moisture}% vol ({trend} pts vs a week ago). Pair it with a soil-sealing walk: how much of your school's block is asphalt?",
        comune:
          "Modelled volumetric soil moisture 0–1 cm: {raw} m³/m³. Useful as a short-term signal for green-area irrigation planning; land-use change and soil sealing need ISPRA/regional cartography (access to be verified).",
        actPlant: "Plant now",
        actWater: "Water smart",
      },
      nature: {
        me: "{count} species were spotted near you this month{top}. Spot one more and it goes on the map.",
        top: " — most seen: {name}",
        class: "{count} research-grade species within 10 km in 30 days. Field trip idea: a 1-hour bioblitz in the nearest park, then compare your list with iNaturalist's.",
        comune:
          "Citizen-science records (iNaturalist, research grade): {count} species / 30 days / 10 km. Observation effort is uneven — absence of records is not absence of species. Useful for engaging residents and flagging invasive species.",
        act: "Spot one",
      },
      areasMissing: {
        meLoading: "Looking up parks and nature reserves around you…",
        meError: "The open map server is busy right now. Pull down to try again in a minute.",
        class: "OpenStreetMap's public Overpass servers are overloaded. A good moment to discuss why open data needs open infrastructure — and who pays for it.",
        comune:
          "Protected-area layer temporarily unavailable (Overpass API at capacity). For production use, mirror the data or use the regional protected-areas register.",
      },
      areas: {
        me: "{name} is {km} km away. Take the squad, take a bag, leave it cleaner than you found it.",
        class: "{count} protected or nature areas within 25 km. Nearest: {name}{title}. Map them together and pick one to adopt for the year.",
        title: " ({title})",
        comune:
          "OpenStreetMap lists {count} protected/nature-reserve areas within 25 km. Boundaries are community-mapped; cross-check with the official regional register before formal use.",
        act: "Clean it up",
      },
    },
    leaf: {
      suggested: {
        bike: "Is today a good day to bike?",
        pm: "What does PM2.5 actually mean?",
        dry: "Is it too dry for plants?",
        live: "What lives near me?",
        class: "What can my class do this week?",
        trust: "How reliable is this data?",
      },
      intro:
        "Not all numbers here are the same kind of thing:\n\n{lines}\n\nEvery card shows its badge, so you always know if you're looking at a measurement, a model or a report from people.",
      kindLine: "• {label}: {what} Careful: {careful}",
      pmBase:
        "PM2.5 are particles smaller than 2.5 micrometres — about 30× thinner than a hair — small enough to get deep into your lungs. They come from traffic, heating, industry and farming. NO₂ is a gas mostly from road traffic; O₃ (ozone) forms when sunlight hits pollution.",
      pmNow: "\n\nRight now in {place}: PM2.5 {pm25}, PM10 {pm10}, NO₂ {no2}, O₃ {o3} µg/m³. The one pushing the index most is {name}.",
      missingAir: "I couldn't load air or weather data just now. Pull to refresh on Pulse and ask again.",
      bikeWet: "It's {sky}, so bus or tram beats the bike today.",
      bikeBad: "Yes — and it matters more today: air is “{band}”, so every car you replace helps. On a busy road, pick a side street to breathe less of it.",
      bikeYes: "Yes. {temp}°, {sky}, air “{band}”. Go.",
      noWater: "No water or soil data available right now.",
      species: "{count} species were recorded within 10 km in the last 30 days. Most seen:\n{list}",
      speciesMiss: "Species data didn't load.",
      sightings: "• {name} ({count} sightings)",
      areas: "\n\nNearest protected/nature areas: {list}.",
      areaItem: "{name} ({km} km)",
      speciesCaveat: "\n\nRemember: places with more people get more sightings — it says as much about observers as about nature.",
      plan: "A 1-week plan based on today's data:\n\n1. Measure: everyone logs how they get to school (Mon).\n2. Understand: read the {topic} card in “Class” mode together — {explain}\n3. Act: run a Squad Quest — target 5 verified BeGreens each by Friday.\n4. Share: export the Community Report from the squad page and send it to your Comune.",
      topicFallback: "local",
      summary: "Here's {place} right now:\n{lines}",
      summaryLine: "• {label}: {value}{unit} — {status}",
      lever: "\n\nBiggest lever today: {label}. {explain}",
      calm: "\n\nNothing alarming today — pick any green move and prove it.",
    },
  },
  {
    drop: {
      badAir: {
        title: "Lascia l’auto. La strada è tua.",
        why: "Oggi l’aria a {city} è “{band}”, spinta da {driver}. Ogni tragitto a piedi, in bici o in autobus toglie un’auto dalla strada in cui respiri.",
        metric: "EAQI {aqi} · {name} {value} µg/m³",
      },
      dry: {
        title: "Settimana secca. Ogni goccia conta.",
        why: "{days} giorni di fila quasi senza pioggia a {city}. Togli 2 minuti alla doccia o spegni quello che non usi — poi dimostralo.",
        metric: "{rain} mm di pioggia in 7 giorni",
      },
      plant: {
        title: "Il suolo è pronto. Pianta qualcosa.",
        why: "L’umidità del suolo superficiale è {moisture}% e ci sono {temp}° — ideale per le radici. Un vaso, una balconiera, un’aiuola a scuola: conta tutto.",
        metric: "Umidità del suolo {moisture}%",
      },
      spot: {
        title: "{count} specie vivono vicino a te. Trovane una.",
        why: "Intorno a {city} questo mese sono state registrate {count} specie. Osserva una pianta, un uccello o un insetto, filmalo nel suo habitat e aggiungi una segnalazione alla mappa.",
        metric: "{count} specie · 10 km · 30 giorni",
      },
      pickup: {
        title: "Prenditi cura di {name}.",
        why: "{name} è a {km} km da te. Prendi un sacco e un amico: i rifiuti lì finiscono nel suolo, nell’acqua e negli animali.",
        metric: "a {km} km",
      },
      refill: {
        title: "Ricarica, non buttare.",
        why: "Oggi salta la bottiglia di plastica. Riempi al rubinetto o a una fontana pubblica e mostralo.",
        metric: "1 bottiglia = 1 Drop",
      },
    },
    insights: {
      labels: {
        air: "Aria",
        weather: "Meteo",
        water: "Acqua",
        soil: "Suolo",
        nature: "Natura",
        areas: "Aree protette",
      },
      units: {
        rain: "mm / 7 giorni",
        moisture: "umidità",
        species: "specie · 30 giorni",
        areas: "entro 25 km",
      },
      status: {
        dryDays: "{days} giorni secchi",
        rainComing: "Arriva pioggia",
        normal: "Nella norma",
        within10: "Entro 10 km",
        loading: "Caricamento…",
        mapBusy: "Mappa occupata",
        nearest: "La più vicina a {km} km",
      },
      air: {
        meBad: "Oggi l’aria a {city} è pesante. Il problema principale è {driver}. Lascia l’auto: vai a piedi, in bici o in autobus. Il peggio intorno alle {hour}:00.",
        meOk: "Oggi l’aria è così così. Da tenere d’occhio: {name}. Tratti brevi? Falli a piedi o in bici.",
        meLater: "Adesso l’aria è pulita, ma la previsione diventa “{band}” intorno alle {hour}:00. Esci ora, stasera lascia l’auto.",
        meGood: "Oggi l’aria è pulita. Giornata perfetta per stare fuori: in bici, a piedi, a pieni polmoni.",
        class:
          "Indice europeo della qualità dell’aria {aqi}/100 → “{band}”. A spingere adesso: {name} a {value} {unit}. Idea per la lezione: disegnate le prossime 24 h (picco {peak} alle {hour}:00) e spiegate perché NO₂ segue le ore di punta e O₃ segue il sole.",
        comune:
          "EAQI modellizzato {aqi} ({band}). PM2.5 {pm25}, PM10 {pm10}, NO₂ {no2}, O₃ {o3} µg/m³. La fonte è l’ensemble CAMS su una griglia di circa 10 km: indicativo, non sostituisce le stazioni di riferimento ARPA. Risposta della comunità: {carFree} spostamenti senza auto verificati registrati a {area} questo mese.",
        actRide: "Pedala",
        actCarFree: "Senza auto",
      },
      weather: {
        meNice: "{sky}, {temp}°. Niente scuse: è tempo da bici.{uv}",
        uv: " UV alto, porta la crema solare.",
        meOther: "{sky}, percepiti {feels}°. Gesto green al chiuso, oggi: differenzia o ripara qualcosa.",
        class:
          "Adesso {temp}°C (percepiti {feels}°C), umidità {humidity}%, vento {wind} km/h, UV {uv}. Oggi {tmin}–{tmax}°C. Confrontate con la media trentennale di {month} per parlare del clima locale.",
        comune:
          "Dati di modello di previsione (Open-Meteo). Oggi {tmin}–{tmax}°C, vento {wind} km/h, UV {uv}. Utili per programmare azioni all’aperto; per le serie climatiche usare le stazioni ufficiali.",
        actBike: "Tempo da bici",
        actIndoor: "Gesto al chiuso",
      },
      water: {
        meDry: "{days} giorni senza pioggia vera. Piante e fiumi se ne accorgono. Doccia più corta oggi, e ricarica invece di comprare bottiglie.",
        meWet: "{rain} mm di pioggia questa settimana{more}. Acqua gratis per le piante: lascia il tubo.",
        more: ", ne arrivano altri {rain} mm",
        class:
          "Pioggia degli ultimi 7 giorni: {rain} mm; prossimi 3 giorni: {next} mm; giorni secchi di fila: {days}. Attività: misurate i consumi d’acqua della scuola per una settimana e confrontateli con la pioggia.",
        comune:
          "Precipitazioni (rianalisi di modello + previsione): {rain} mm in 7 giorni, {days} giorni consecutivi sotto 1 mm. Indica solo la secchezza di breve periodo; lo stato di siccità richiede i bollettini idrologici ufficiali.",
        actSave: "Risparmia acqua",
        actRefill: "Ricarica",
      },
      soil: {
        meGood: "Il suolo superficiale è umido: è il momento migliore per piantare. Semi, erbe, un albero con la squadra.",
        meOther: "Il suolo superficiale è {state}. Se annaffi, fallo al tramonto: evapora di meno.",
        class:
          "Umidità del primo centimetro di suolo {moisture}% vol ({trend} punti rispetto a una settimana fa). Abbinala a una camminata sul consumo di suolo: quanto dell’isolato della scuola è asfalto?",
        comune:
          "Umidità volumetrica del suolo modellizzata 0–1 cm: {raw} m³/m³. Utile come segnale di breve periodo per l’irrigazione del verde; consumo di suolo e impermeabilizzazione richiedono la cartografia ISPRA/regionale (accesso da verificare).",
        actPlant: "Pianta ora",
        actWater: "Annaffia con criterio",
      },
      nature: {
        me: "Questo mese vicino a te sono state osservate {count} specie{top}. Osservane un’altra e finisce sulla mappa.",
        top: ": la più vista è {name}",
        class:
          "{count} specie di grado ricerca entro 10 km in 30 giorni. Idea di uscita: un bioblitz di un’ora nel parco più vicino, poi confrontate l’elenco con quello di iNaturalist.",
        comune:
          "Segnalazioni di scienza dei cittadini (iNaturalist, grado ricerca): {count} specie / 30 giorni / 10 km. Lo sforzo di osservazione non è uniforme: assenza di segnalazioni non vuol dire assenza di specie. Utile per coinvolgere chi abita qui e notare le specie invasive.",
        act: "Osservane una",
      },
      areasMissing: {
        meLoading: "Sto cercando parchi e riserve naturali intorno a te…",
        meError: "Il server della mappa aperta è occupato. Tira giù per riprovare tra un minuto.",
        class:
          "I server pubblici Overpass di OpenStreetMap sono sovraccarichi. Buon momento per discutere perché i dati aperti hanno bisogno di infrastruttura aperta, e chi la paga.",
        comune:
          "Lo strato delle aree protette non è disponibile (Overpass API al limite). Per un uso continuativo, replicare i dati o usare il registro regionale delle aree protette.",
      },
      areas: {
        me: "{name} è a {km} km. Porta la squadra, porta un sacco, lasciala più pulita di come l’hai trovata.",
        class: "{count} aree protette o naturali entro 25 km. La più vicina: {name}{title}. Mappatele insieme e sceglietene una da adottare per l’anno.",
        title: " ({title})",
        comune:
          "OpenStreetMap elenca {count} aree protette o riserve naturali entro 25 km. I confini sono mappati dalla comunità: verificarli con il registro regionale ufficiale prima di un uso formale.",
        act: "Puliscila",
      },
    },
    leaf: {
      suggested: {
        bike: "Oggi è una buona giornata per la bici?",
        pm: "Che cosa significa davvero il PM2.5?",
        dry: "È troppo secco per le piante?",
        live: "Che cosa vive vicino a me?",
        class: "Che cosa può fare la mia classe questa settimana?",
        trust: "Quanto sono affidabili questi dati?",
      },
      intro:
        "Non tutti i numeri qui sono lo stesso tipo di cosa:\n\n{lines}\n\nOgni scheda mostra il suo bollino, così sai sempre se stai guardando una misura, un modello o una segnalazione di persone.",
      kindLine: "• {label}: {what} Attenzione: {careful}",
      pmBase:
        "Il PM2.5 sono particelle più piccole di 2,5 micrometri — circa 30 volte più sottili di un capello — abbastanza piccole da arrivare in fondo ai polmoni. Vengono da traffico, riscaldamento, industria e agricoltura. NO₂ è un gas soprattutto del traffico stradale; l’O₃ (ozono) si forma quando il sole colpisce l’inquinamento.",
      pmNow: "\n\nAdesso a {place}: PM2.5 {pm25}, PM10 {pm10}, NO₂ {no2}, O₃ {o3} µg/m³. Quello che spinge di più l’indice è {name}.",
      missingAir: "Non sono riuscito a caricare aria o meteo, adesso. Tira per aggiornare in Dati e chiedi di nuovo.",
      bikeWet: "C’è {sky}, quindi oggi bus o tram battono la bici.",
      bikeBad: "Sì, e oggi conta di più: l’aria è “{band}”, quindi ogni auto che sostituisci aiuta. Su una strada trafficata, scegli una laterale per respirarne di meno.",
      bikeYes: "Sì. {temp}°, {sky}, aria “{band}”. Vai.",
      noWater: "Adesso non ci sono dati su acqua o suolo.",
      species: "Negli ultimi 30 giorni, entro 10 km, sono state registrate {count} specie. Le più viste:\n{list}",
      speciesMiss: "I dati sulle specie non si sono caricati.",
      sightings: "• {name} ({count} avvistamenti)",
      areas: "\n\nAree protette o naturali più vicine: {list}.",
      areaItem: "{name} ({km} km)",
      speciesCaveat: "\n\nRicorda: i posti con più persone ricevono più avvistamenti. Dice tanto di chi osserva quanto della natura.",
      plan: "Un piano da 1 settimana sui dati di oggi:\n\n1. Misura: ognuno annota come arriva a scuola (lun).\n2. Capire: leggete insieme la scheda {topic} in modalità “Classe” — {explain}\n3. Agire: lanciate una missione di squadra — obiettivo 5 BeGreen verificati a testa entro venerdì.\n4. Condividere: esportate il rapporto di comunità dalla pagina della squadra e mandatelo al Comune.",
      topicFallback: "locale",
      summary: "Ecco {place} adesso:\n{lines}",
      summaryLine: "• {label}: {value}{unit} — {status}",
      lever: "\n\nLa leva più grande oggi: {label}. {explain}",
      calm: "\n\nOggi niente di allarmante: scegli un gesto green e dimostralo.",
    },
  },
);
