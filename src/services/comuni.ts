import * as Location from "expo-location";

import type { Comune } from "@/data/types";
import { km, type Place } from "@/services/env";
import { supabase } from "@/services/supabase";

// Italian Comuni from the Open-Meteo geocoding API (GeoNames data, no key).
// Results are places; we collapse them to the Comune they belong to (GeoNames admin3).

type GeoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin3_id?: number;
};

const SEAT = /^PPL(A\d?|C)$/; // the Comune's own seat, not a hamlet

function toComune(r: GeoResult): Comune {
  const name = r.admin3 ? r.admin3.replace(/^Comune di /i, "") : r.name;
  return {
    id: String(r.admin3_id ?? r.id),
    name,
    province: r.admin2?.replace(/^(Provincia|Città metropolitana) di /i, ""),
    region: r.admin1,
    lat: Math.round(r.latitude * 1e4) / 1e4,
    lon: Math.round(r.longitude * 1e4) / 1e4,
  };
}

export async function searchComuni(q: string, signal?: AbortSignal): Promise<Comune[]> {
  const name = q.trim();
  if (name.length < 2) return [];
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20&language=it&countryCode=IT&format=json`,
    { signal },
  );
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const j = (await res.json()) as { results?: GeoResult[] };
  const results = (j.results ?? []).filter((r) => r.feature_code?.startsWith("PPL"));
  // Seats first, so "Segrate" maps to the town centre rather than one of its hamlets.
  results.sort((a, b) => Number(SEAT.test(b.feature_code ?? "")) - Number(SEAT.test(a.feature_code ?? "")));
  const seen = new Set<string>();
  const out: Comune[] = [];
  for (const r of results) {
    const c = toComune(r);
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out.slice(0, 8);
}

export async function locate(): Promise<Place | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    // Coarsen to ~1 km: enough to find the Comune, kinder to privacy.
    const lat = Math.round(pos.coords.latitude * 100) / 100;
    const lon = Math.round(pos.coords.longitude * 100) / 100;
    return { lat, lon, name: await placeName(lat, lon) };
  } catch {
    return null;
  }
}

async function placeName(lat: number, lon: number): Promise<string> {
  if (process.env.EXPO_OS !== "web") {
    const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }).catch(() => []);
    const n = g?.city ?? g?.subregion;
    if (n) return n;
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=it`);
  const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
  return a.city ?? a.town ?? a.village ?? a.municipality ?? "";
}

// GPS → town name → the matching Comune closest to you.
export async function comuneNearMe(): Promise<Comune | null> {
  const here = await locate();
  if (!here?.name) return null;
  const found = await searchComuni(here.name).catch(() => []);
  return found.sort((a, b) => km(here, a.lat, a.lon) - km(here, b.lat, b.lon))[0] ?? null;
}

export async function saveComune(c: Comune) {
  if (!supabase) return;
  const { error } = await supabase
    .from("comuni")
    .upsert(
      { id: c.id, name: c.name, province: c.province ?? null, region: c.region ?? null, lat: c.lat, lon: c.lon },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export function comuneLabel(c: Comune) {
  return c.province && c.province !== c.name ? `${c.name} · ${c.province}` : c.name;
}
