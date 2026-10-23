import { C } from "@/theme/tokens";

// Not all data is equal. Every number in BeGreen carries one of these kinds,
// so people can tell an official measurement from a model or a citizen report.
// The words live in the language catalog; colour and identity stay here.
export type SourceKind = "official" | "model" | "citizen" | "map" | "community";

export const SOURCE_KINDS: Record<SourceKind, { color: string }> = {
  official: { color: C.blue },
  model: { color: C.violet },
  citizen: { color: C.amber },
  map: { color: C.mute },
  community: { color: C.green },
};

export type SourceId = "cams" | "openmeteo" | "inat" | "osm" | "begreen" | "arpa";

export const SOURCES: Record<SourceId, { kind: SourceKind; url: string; verified: boolean; mark: string }> = {
  cams: {
    kind: "model",
    url: "https://open-meteo.com/en/docs/air-quality-api",
    verified: true,
    mark: "COPERNICUS",
  },
  openmeteo: {
    kind: "model",
    url: "https://open-meteo.com/en/docs",
    verified: true,
    mark: "OPEN-METEO",
  },
  inat: {
    kind: "citizen",
    url: "https://www.inaturalist.org",
    verified: true,
    mark: "INATURALIST",
  },
  osm: {
    kind: "map",
    url: "https://www.openstreetmap.org/copyright",
    verified: true,
    mark: "OPENSTREETMAP",
  },
  begreen: {
    kind: "community",
    url: "https://begreen.app/methodology",
    verified: true,
    mark: "BEGREEN",
  },
  arpa: {
    kind: "official",
    url: "https://www.arpalombardia.it",
    verified: false,
    mark: "ARPA",
  },
};
