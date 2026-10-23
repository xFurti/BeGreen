// "My Comune": which comune you're in, plus live citizen data around it.
// Official yearly indicators are bundled (src/data/comuni.ts); these calls only add what changes by the minute.

import { COMUNI, findComune, PROVINCE } from "@/data/comuni";
import type { Comune } from "@/data/types";
import { citizenPm25, nearestComune, parseSensorCommunity, type ComuneStats } from "@/services/comune-levels";
import type { Place } from "@/services/env";

const UA = "BeGreen/1.0 (hackathon prototype)";

async function getJSON<T>(url: string, timeoutMs = 12000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export type ComuneId = { istat?: string; name: string; province?: string };

// OpenStreetMap / Nominatim: one reverse lookup per place, at municipality zoom. Returns the ISTAT code when mapped.
export async function resolveComune(p: Place): Promise<ComuneId> {
  try {
    const j = await getJSON<any>(
      `https://nominatim.openstreetmap.org/reverse?lat=${p.lat}&lon=${p.lon}&format=jsonv2&zoom=10&addressdetails=1&extratags=1&accept-language=it`,
    );
    const a = j.address ?? {};
    return {
      istat: j.extratags?.["ref:ISTAT"],
      name: a.city ?? a.town ?? a.village ?? a.municipality ?? j.name ?? p.name,
      province: a.county,
    };
  } catch {
    const near = nearestComune(COMUNI, p.lat, p.lon);
    return near ? { istat: near.istat, name: near.name, province: "Vicenza" } : { name: p.name };
  }
}

// The Comune picked in the app → the bundled official record, when it's in the province we have data for.
export function identify(c: Comune): ComuneId {
  if (c.province && c.province !== PROVINCE) return { name: c.name, province: c.province };
  const hit = findComune(undefined, c.name) ?? nearestComune(COMUNI, c.lat, c.lon, 3);
  return hit ? { istat: hit.istat, name: hit.name, province: PROVINCE } : { name: c.name, province: c.province };
}

export const statsFor = (id: ComuneId): ComuneStats | undefined => findComune(id.istat, id.name);

// Sensor.Community: latest outdoor PM readings within 10 km, robust median.
export async function fetchCitizenAir(p: Place) {
  const raw = await getJSON<unknown>(`https://data.sensor.community/airrohr/v1/filter/area=${p.lat},${p.lon},10`);
  return citizenPm25(parseSensorCommunity(raw));
}

// GBIF: distinct species recorded within 5 km over the last 5 years (facet count, no records downloaded).
export async function fetchSpecies(p: Place): Promise<{ species: number; records: number }> {
  const y = new Date().getFullYear();
  const j = await getJSON<any>(
    `https://api.gbif.org/v1/occurrence/search?geoDistance=${p.lat},${p.lon},5km&year=${y - 5},${y}` +
      `&occurrenceStatus=PRESENT&limit=0&facet=speciesKey&facetLimit=2000`,
  );
  return { species: j.facets?.[0]?.counts?.length ?? 0, records: j.count ?? 0 };
}
