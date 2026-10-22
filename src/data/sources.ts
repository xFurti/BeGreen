import { C } from "@/theme/tokens";

// Not all data is equal. Every number in BeGreen carries one of these kinds,
// so people can tell an official measurement from a model or a citizen report.
export type SourceKind = "official" | "model" | "citizen" | "map" | "community";

export const SOURCE_KINDS: Record<
  SourceKind,
  { label: string; short: string; color: string; what: string; goodFor: string; careful: string }
> = {
  official: {
    label: "Official measurement",
    short: "Official",
    color: C.blue,
    what: "Measured by a certified station run by a public agency (e.g. ARPA, ISPRA).",
    goodFor: "Comparing with legal limits and official reports.",
    careful: "Stations are few, so they may be kilometres away from you.",
  },
  model: {
    label: "Model / forecast",
    short: "Model",
    color: C.violet,
    what: "Computed by a physical model from satellites, stations and weather (e.g. Copernicus CAMS, weather models).",
    goodFor: "Seeing patterns everywhere, including tomorrow.",
    careful: "It's an estimate on a ~10 km grid, not a measurement on your street.",
  },
  citizen: {
    label: "Citizen science",
    short: "Citizen",
    color: C.amber,
    what: "Observations made by people like you, then checked by a community (e.g. iNaturalist).",
    goodFor: "Knowing what lives where, at a level no agency can cover alone.",
    careful: "Busy places get more reports. Fewer sightings ≠ less nature.",
  },
  map: {
    label: "Open map",
    short: "Map",
    color: C.mute,
    what: "Places and boundaries drawn by mappers (OpenStreetMap).",
    goodFor: "Finding parks, reserves and protected areas around you.",
    careful: "Boundaries can be incomplete or out of date.",
  },
  community: {
    label: "BeGreen community",
    short: "BeGreen",
    color: C.green,
    what: "Acts posted with photo + video proof and verified by friends.",
    goodFor: "Seeing what your class, squad or town actually does.",
    careful: "Shows participation, not environmental outcomes.",
  },
};

export type SourceId = "cams" | "openmeteo" | "inat" | "osm" | "begreen" | "arpa" | "ispra" | "rifiuti" | "sensor" | "gbif";

export const SOURCES: Record<
  SourceId,
  { name: string; kind: SourceKind; provider: string; url: string; terms: string; verified: boolean }
> = {
  cams: {
    name: "European air quality (CAMS)",
    kind: "model",
    provider: "Copernicus Atmosphere Monitoring Service via Open-Meteo",
    url: "https://open-meteo.com/en/docs/air-quality-api",
    terms: "CC BY 4.0 · attribution to Copernicus & Open-Meteo",
    verified: true,
  },
  openmeteo: {
    name: "Weather, rain & soil moisture",
    kind: "model",
    provider: "Open-Meteo (national weather service models)",
    url: "https://open-meteo.com/en/docs",
    terms: "CC BY 4.0 · non-commercial free tier",
    verified: true,
  },
  inat: {
    name: "Species observations",
    kind: "citizen",
    provider: "iNaturalist (research-grade only)",
    url: "https://www.inaturalist.org",
    terms: "Per-photo Creative Commons licences · attribution shown",
    verified: true,
  },
  osm: {
    name: "Protected areas & parks",
    kind: "map",
    provider: "OpenStreetMap contributors via Overpass API",
    url: "https://www.openstreetmap.org/copyright",
    terms: "ODbL · attribution required",
    verified: true,
  },
  begreen: {
    name: "Verified BeGreen acts",
    kind: "community",
    provider: "BeGreen users in your area",
    url: "https://begreen.app/methodology",
    terms: "Aggregated & anonymised before sharing with schools or Comuni",
    verified: true,
  },
  arpa: {
    name: "Air stations & municipal emissions",
    kind: "official",
    provider: "ARPAV open data (PM10 2002-2025, INEMAR Veneto 2019 emissions per comune)",
    url: "https://www.arpa.veneto.it/dati-ambientali/open-data/atmosfera",
    terms: "CC BY 4.0 · Veneto only; other regions' ARPA still to be verified",
    verified: true,
  },
  ispra: {
    name: "Land take per comune",
    kind: "official",
    provider: "ISPRA/SNPA Consumo di suolo, edition 2025 (data 2024)",
    url: "https://www.isprambiente.gov.it/it/attivita/suolo-e-territorio/suolo/il-consumo-di-suolo/i-dati-sul-consumo-di-suolo",
    terms: "CC BY 4.0 · attribution to ISPRA/SNPA",
    verified: true,
  },
  rifiuti: {
    name: "Waste & separate collection per comune",
    kind: "official",
    provider: "ISPRA Catasto Rifiuti, year 2024",
    url: "https://www.catasto-rifiuti.isprambiente.it/index.php?pg=downloadComune",
    terms: "Public ISPRA data · reuse licence not stated on the page, to verify",
    verified: false,
  },
  sensor: {
    name: "Citizen air sensors",
    kind: "citizen",
    provider: "Sensor.Community (low-cost PM sensors run by citizens)",
    url: "https://sensor.community",
    terms: "ODbL · identifiable user agent required · not official stations",
    verified: true,
  },
  gbif: {
    name: "Species records",
    kind: "citizen",
    provider: "GBIF (museums, surveys and citizen science)",
    url: "https://techdocs.gbif.org/en/openapi/",
    terms: "Licence per dataset (CC0 / CC BY / CC BY-NC) · cite GBIF.org",
    verified: true,
  },
};
