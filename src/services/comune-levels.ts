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

// INEMAR macro-sector names (Italian, as published) → plain English for the card.
const SECTOR: Record<string, string> = {
  "Combustione non industriale": "home heating (wood stoves above all)",
  "Trasporto su strada": "road traffic",
  "Combustione nell'industria": "industrial combustion",
  "Processi produttivi": "industrial processes",
  "Trattamento e smaltimento rifiuti": "waste treatment",
  Agricoltura: "farming",
  "Altri trasporti e macchinari mobili": "off-road machines",
  "Produzione energia e trasformazione combustibili": "power generation",
  "Uso di solventi": "solvents",
  "Altre sorgenti e assorbimenti": "other sources",
  "Estrazione e distribuzione combustibili": "fuel distribution",
};
export const sectorText = (s?: string) => (s ? (SECTOR[s] ?? s.toLowerCase()) : "");

// The one thing to ask the Comune: driven by the weakest official indicator.
export function askTheComune(c: ComuneStats, levels: Partial<Record<"pm10" | "emissions" | "soil" | "recycling", Level>>): string {
  if (levels.pm10 === "bad" && c.pm10Top === "Combustione non industriale")
    return `Most PM10 here comes from home heating (${c.pm10TopPct}%). Ask about incentives to replace old wood stoves and winter burning rules.`;
  if (levels.recycling === "bad") return `Separate collection is below the ${RECYCLING_TARGET}% legal target. Ask for door-to-door collection and a clear waste calendar.`;
  if (levels.soil === "bad") return "More land is sealed than in most comuni nearby. Ask that new projects reuse brownfield sites before building on fields.";
  if (levels.emissions === "bad") return `CO₂ per resident is high, mainly from ${sectorText(c.co2Top)}. Ask for the Comune's climate plan (PAESC) and its progress.`;
  if (levels.pm10 === "bad") return "PM10 is above the 2030 EU limit. Ask for safe cycling routes to schools and traffic limits on bad-air days.";
  return "Indicators are in line with the province. Ask the Comune how it plans to meet the 2030 EU air limits, and join a local squad.";
}
