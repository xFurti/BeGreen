import type { BBox } from "@/data/community";
import type { LatLon } from "@/services/geo";

// Real streets and places inside a community's area, from OpenStreetMap through Photon (komoot), no key.
// Used by the map search next to BeGreen's own places.

export type PlaceHit = { id: string; name: string; detail: string; lat: number; lon: number };

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    locality?: string;
  };
};

// "Via Roma 3" when the hit is an address, otherwise its name; the detail says where it is.
export function toPlaceHit(f: Feature): PlaceHit | null {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const address = [p.street, p.housenumber].filter(Boolean).join(" ");
  const name = p.name ?? address;
  if (!name) return null;
  const parts = [p.name && address !== name ? address : "", p.district ?? p.locality, p.city].filter((x): x is string => !!x && x !== name);
  const detail = [...new Set(parts)].join(" · ");
  return { id: `${p.osm_type ?? "x"}${p.osm_id ?? `${lat},${lon}`}`, name, detail, lat, lon };
}

export async function searchPlaces(q: string, b: BBox, near?: LatLon | null, signal?: AbortSignal): Promise<PlaceHit[]> {
  const text = q.trim();
  if (text.length < 3) return [];
  const c = near ?? { lat: (b.s + b.n) / 2, lon: (b.w + b.e) / 2 };
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=8&bbox=${b.w},${b.s},${b.e},${b.n}&lat=${c.lat}&lon=${c.lon}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const j = (await res.json()) as { features?: Feature[] };
  const seen = new Set<string>();
  const out: PlaceHit[] = [];
  for (const f of j.features ?? []) {
    const hit = toPlaceHit(f);
    if (!hit || seen.has(`${hit.name}|${hit.detail}`)) continue;
    seen.add(`${hit.name}|${hit.detail}`);
    out.push(hit);
  }
  return out.slice(0, 6);
}
