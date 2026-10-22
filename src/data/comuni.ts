import type { ComuneStats, Station } from "@/services/comune-levels";

import COMUNI_VI from "./comuni-vicenza.json";

// Official per-comune indicators for the 113 comuni of the Province of Vicenza (the hackathon area).
// Built from the open datasets listed in docs/dati-comune.md; regenerate rather than edit by hand.
export const COMUNI: ComuneStats[] = COMUNI_VI as ComuneStats[];
export const PROVINCE = "Vicenza";

export const DATA_YEARS = { soil: 2024, waste: 2024, emissions: 2019, pm10: 2025 } as const;

// ARPAV fixed stations in the province measuring PM10, 2025 validated values
// (annual mean µg/m³, days above the 50 µg/m³ daily limit). Source: ARPAV open data "PM10, anni 2002-2025".
export const PM10_STATIONS: Station[] = [
  { id: "IT1177A", name: "Vicenza · Quartiere Italia", istat: "024116", pm10Mean: 27, pm10Days: 24, year: 2025 },
  { id: "IT1838A", name: "Vicenza · San Felice", istat: "024116", pm10Mean: 28, pm10Days: 26, year: 2025 },
  { id: "IT1905A", name: "Vicenza · Ferrovieri", istat: "024116", pm10Mean: 28, pm10Days: 23, year: 2025 },
  { id: "IT0663A", name: "Schio", istat: "024100", pm10Mean: 21, pm10Days: 13, year: 2025 },
  { id: "IT1065A", name: "Bassano del Grappa", istat: "024012", pm10Mean: 20, pm10Days: 11, year: 2025 },
];

export const findComune = (istat?: string, name?: string) =>
  COMUNI.find((c) => c.istat === istat) ?? (name ? COMUNI.find((c) => c.name.toLowerCase() === name.toLowerCase()) : undefined);
