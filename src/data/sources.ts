import { fixed as C } from "@/theme/tokens";

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
    color: C.grey,
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

export type SourceId = "cams" | "openmeteo" | "inat" | "osm" | "begreen" | "arpa";

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
    name: "Regional monitoring stations",
    kind: "official",
    provider: "ARPA regional agencies (e.g. ARPA Lombardia)",
    url: "https://www.arpalombardia.it",
    terms: "Open data · API access & terms still to be verified per region",
    verified: false,
  },
};
