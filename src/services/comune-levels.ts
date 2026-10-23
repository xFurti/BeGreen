// Pure logic behind the "My Comune" profile section: no React, no fetch, so it is unit-tested in tests/.
// Levels reuse the Pulse vocabulary: good · ok · bad · info.

import type { Level } from "./interpret";

export type ComuneStats = {
  istat: string; // 6-digit ISTAT code, e.g. "024100" (Schio)
  name: string;
  lat?: number;
  lon?: number;
  population?: number;
  soilSealedPct?: number; // ISPRA: % of the municipal area that is sealed
  soilNewHa?: number; // ISPRA: hectares newly sealed in the last year
  recyclingPct?: number; // ISPRA Catasto rifiuti: separate collection %
  wasteKgPerCapita?: number; // ISPRA Catasto rifiuti: urban waste per resident per year
  co2Kt?: number; // ARPAV INEMAR: CO₂ emitted (absorptions excluded), kt/year
  pm10T?: number; // ARPAV INEMAR: primary PM10 emitted, t/year
  pm10Top?: string; // macro-sector emitting the most PM10
  pm10TopPct?: number;
  co2Top?: string;
  co2TopPct?: number;
};

export type Station = { id: string; name: string; istat: string; pm10Mean: number; pm10Days: number; year: number };

export type SensorReading = { sensor: number; lat: number; lon: number; pm25?: number; pm10?: number; at: string };

export function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestComune(list: ComuneStats[], lat: number, lon: number, maxKm = 12): ComuneStats | undefined {
  let best: ComuneStats | undefined;
  let bestKm = maxKm;
  for (const c of list) {
    if (c.lat == null || c.lon == null) continue;
    const d = km(lat, lon, c.lat, c.lon);
    if (d < bestKm) {
      best = c;
      bestKm = d;
    }
  }
  return best;
}

// Nearest official station, measured between the centroids of the two comuni.
export function nearestStation(stations: Station[], list: ComuneStats[], c: ComuneStats): { station: Station; km: number } | undefined {
  const byId = new Map(list.map((x) => [x.istat, x]));
  let out: { station: Station; km: number } | undefined;
  for (const s of stations) {
    const sc = byId.get(s.istat);
    if (!sc || sc.lat == null || sc.lon == null || c.lat == null || c.lon == null) continue;
    const d = s.istat === c.istat ? 0 : km(c.lat, c.lon, sc.lat, sc.lon);
    if (!out || d < out.km) out = { station: s, km: Math.round(d) };
  }
  return out;
}

// Share of the other comuni that do worse than this one (0–1). `higherIsBetter` flips the comparison.
export function betterThan(list: ComuneStats[], value: number, pick: (c: ComuneStats) => number | undefined, higherIsBetter: boolean) {
  const vals = list.map(pick).filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length < 2) return undefined;
  const worse = vals.filter((v) => (higherIsBetter ? v < value : v > value)).length;
  return worse / (vals.length - 1);
}

// Relative indicators: top third of the province is "good", bottom third "bad".
export function levelFromShare(share: number | undefined): Level {
  if (share == null) return "info";
  return share >= 0.66 ? "good" : share >= 0.33 ? "ok" : "bad";
}

// Separate-collection target of 65% (D.Lgs. 152/2006, art. 205).
export const RECYCLING_TARGET = 65;
export function recyclingLevel(pct: number): Level {
  return pct >= 75 ? "good" : pct >= RECYCLING_TARGET ? "ok" : "bad";
}

// PM10 annual mean: EU limit 40 µg/m³ today, 20 µg/m³ from 2030 (Dir. 2024/2881); WHO guideline 15.
// Daily limit 50 µg/m³ allowed on 35 days a year today, 18 from 2030.
export function pm10Level(mean: number, days: number): Level {
  if (mean <= 15 && days <= 3) return "good";
  if (mean <= 20 && days <= 18) return "ok";
  return "bad";
}

// PM2.5, short term: WHO 24-hour guideline 15 µg/m³.
export function pm25Level(v: number): Level {
  return v <= 15 ? "good" : v <= 25 ? "ok" : "bad";
}

// sensor.community `filter/area` → one latest reading per outdoor PM sensor.
export function parseSensorCommunity(raw: unknown): SensorReading[] {
  const latest = new Map<number, SensorReading>();
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r?.sensor?.id || r.location?.indoor === 1) continue;
    const vals: { value_type: string; value: string }[] = r.sensordatavalues ?? [];
    const num = (t: string) => {
      const v = vals.find((x) => x.value_type === t);
      return v ? Number(v.value) : undefined;
    };
    const pm10 = num("P1");
    const pm25 = num("P2");
    if (pm10 == null && pm25 == null) continue;
    const reading: SensorReading = { sensor: r.sensor.id, lat: Number(r.location.latitude), lon: Number(r.location.longitude), pm10, pm25, at: r.timestamp };
    const prev = latest.get(reading.sensor);
    if (!prev || prev.at < reading.at) latest.set(reading.sensor, reading);
  }
  return [...latest.values()];
}

// Low-cost sensors fail in visible ways (stuck at 0, saturated, fog): drop implausible values, then take the median.
export function citizenPm25(readings: SensorReading[]): { median: number; sensors: number } | undefined {
  const v = readings
    .map((r) => r.pm25)
    .filter((x): x is number => x != null && Number.isFinite(x) && x > 0.1 && x < 300)
    .sort((a, b) => a - b);
  if (!v.length) return undefined;
  const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { median: Math.round(m * 10) / 10, sensors: v.length };
}

// This module runs in plain Node tests without the app's aliases, so its two generated texts carry their own Italian.
type Lang = "en" | "it";

// INEMAR macro-sector names (Italian, as published) → plain words for the card.
const SECTOR: Record<string, { en: string; it: string }> = {
  "Combustione non industriale": { en: "home heating (wood stoves above all)", it: "riscaldamento domestico (soprattutto stufe a legna)" },
  "Trasporto su strada": { en: "road traffic", it: "traffico stradale" },
  "Combustione nell'industria": { en: "industrial combustion", it: "combustione industriale" },
  "Processi produttivi": { en: "industrial processes", it: "processi produttivi" },
  "Trattamento e smaltimento rifiuti": { en: "waste treatment", it: "trattamento dei rifiuti" },
  Agricoltura: { en: "farming", it: "agricoltura" },
  "Altri trasporti e macchinari mobili": { en: "off-road machines", it: "macchine e mezzi non stradali" },
  "Produzione energia e trasformazione combustibili": { en: "power generation", it: "produzione di energia" },
  "Uso di solventi": { en: "solvents", it: "solventi" },
  "Altre sorgenti e assorbimenti": { en: "other sources", it: "altre fonti" },
  "Estrazione e distribuzione combustibili": { en: "fuel distribution", it: "distribuzione dei combustibili" },
};
export const sectorText = (s?: string, lang: Lang = "en") => (s ? (SECTOR[s]?.[lang] ?? s.toLowerCase()) : "");

const ASK = {
  en: {
    heating: (pct?: number) => `Most PM10 here comes from home heating (${pct}%). Ask about incentives to replace old wood stoves and winter burning rules.`,
    recycling: () => `Separate collection is below the ${RECYCLING_TARGET}% legal target. Ask for door-to-door collection and a clear waste calendar.`,
    soil: () => "More land is sealed than in most comuni nearby. Ask that new projects reuse brownfield sites before building on fields.",
    emissions: (sector: string) => `CO₂ per resident is high, mainly from ${sector}. Ask for the Comune's climate plan (PAESC) and its progress.`,
    pm10: () => "PM10 is above the 2030 EU limit. Ask for safe cycling routes to schools and traffic limits on bad-air days.",
    fine: () => "Indicators are in line with the province. Ask the Comune how it plans to meet the 2030 EU air limits, and join a local squad.",
  },
  it: {
    heating: (pct?: number) =>
      `Qui la maggior parte del PM10 viene dal riscaldamento domestico (${pct}%). Chiedi degli incentivi per sostituire le vecchie stufe a legna e delle regole sui fuochi d'inverno.`,
    recycling: () => `La raccolta differenziata è sotto l'obiettivo di legge del ${RECYCLING_TARGET}%. Chiedi la raccolta porta a porta e un calendario chiaro.`,
    soil: () => "Qui il suolo consumato è più che nella maggior parte dei comuni vicini. Chiedi che i nuovi progetti riusino aree dismesse prima di costruire sui campi.",
    emissions: (sector: string) => `La CO₂ per residente è alta, soprattutto da ${sector}. Chiedi il piano clima del Comune (PAESC) e a che punto è.`,
    pm10: () => "Il PM10 supera il limite UE del 2030. Chiedi percorsi ciclabili sicuri verso le scuole e limiti al traffico nei giorni di aria cattiva.",
    fine: () => "Gli indicatori sono in linea con la provincia. Chiedi al Comune come pensa di rispettare i limiti UE sull'aria del 2030, e unisciti a una squad locale.",
  },
};

// The one thing to ask the Comune: driven by the weakest official indicator.
export function askTheComune(
  c: ComuneStats,
  levels: Partial<Record<"pm10" | "emissions" | "soil" | "recycling", Level>>,
  lang: Lang = "en",
): string {
  const a = ASK[lang];
  if (levels.pm10 === "bad" && c.pm10Top === "Combustione non industriale") return a.heating(c.pm10TopPct);
  if (levels.recycling === "bad") return a.recycling();
  if (levels.soil === "bad") return a.soil();
  if (levels.emissions === "bad") return a.emissions(sectorText(c.co2Top, lang));
  if (levels.pm10 === "bad") return a.pm10();
  return a.fine();
}
