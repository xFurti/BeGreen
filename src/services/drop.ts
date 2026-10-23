import type { ActionId } from "@/data/actions";
import type { SourceId } from "@/data/sources";
import { translate } from "@/i18n/catalog";
import { formatNumber } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import type { AirData, Pulse } from "@/services/env";
import { aqiBand, dominant, soilState } from "@/services/interpret";

// The Drop: one shared challenge per day per Comune, generated from that Comune's live data.
// Everyone in town gets the same Drop, so the feed has a common thread —
// but you post it when YOU are doing it, not when a random notification fires.

export type Drop = {
  id: string; // "<comuneId>:<day>", stable for the whole day
  day: string;
  action: ActionId;
  title: string;
  why: string;
  metric: string;
  sources: SourceId[];
  // The readings the challenge was built from, so everyone sees the same numbers.
  data: Record<string, number | string>;
  // Stored on the shared backend, so the whole Comune has it.
  shared?: boolean;
  // Built from sample data while offline: replaced as soon as live data arrives.
  offline?: boolean;
};

// Local calendar day: the Drop resets at your midnight, not UTC's.
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function challengeId(comuneId: string, day = dayKey()) {
  return `${comuneId}:${day}`;
}

function snapshot(p: Pulse): Drop["data"] {
  const d: Drop["data"] = { city: p.place.name };
  if (p.air) Object.assign(d, { aqi: p.air.aqi, pm25: p.air.pm25, pm10: p.air.pm10, no2: p.air.no2, o3: p.air.o3 });
  if (p.weather) d.temp = p.weather.temp;
  if (p.water) Object.assign(d, { rain7: p.water.rain7, dryDays: p.water.dryDays });
  if (p.soil) d.soilMoisture = p.soil.moisture;
  if (p.nature) d.species = p.nature.speciesCount;
  if (p.areas?.[0]) Object.assign(d, { area: p.areas[0].name, areaKm: p.areas[0].km });
  return d;
}

type Text = Pick<Drop, "title" | "why" | "metric">;

// Title and text come from the readings, in the reader's language: a shared Drop reads the same in Italian and English.
function render(action: ActionId, d: Drop["data"], lang: Language): Text | null {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(lang, key, params);
  const n = (value: number) => formatNumber(value, lang);
  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : undefined);
  const city = String(d.city ?? "");

  if (action === "move") {
    const aqi = num("aqi");
    const [pm25, pm10, no2, o3] = [num("pm25"), num("pm10"), num("no2"), num("o3")];
    if (aqi == null || pm25 == null || pm10 == null || no2 == null || o3 == null) return null;
    const air: AirData = { aqi, pm25, pm10, no2, o3, next24: [] };
    const dom = dominant(air, lang);
    return {
      title: t("drop.badAir.title"),
      why: t("drop.badAir.why", { city, band: aqiBand(aqi, lang).label, driver: dom.plain }),
      metric: t("drop.badAir.metric", { aqi, name: dom.name, value: n(dom.value) }),
    };
  }
  if (action === "save") {
    const [days, rain] = [num("dryDays"), num("rain7")];
    if (days == null || rain == null) return null;
    return { title: t("drop.dry.title"), why: t("drop.dry.why", { days, city }), metric: t("drop.dry.metric", { rain: n(rain) }) };
  }
  if (action === "plant") {
    const [soil, temp] = [num("soilMoisture"), num("temp")];
    if (soil == null || temp == null) return null;
    const moisture = Math.round(soil * 100);
    return { title: t("drop.plant.title"), why: t("drop.plant.why", { moisture, temp }), metric: t("drop.plant.metric", { moisture }) };
  }
  if (action === "spot") {
    const species = num("species");
    if (species == null) return null;
    const count = n(species);
    return { title: t("drop.spot.title", { count }), why: t("drop.spot.why", { city, count }), metric: t("drop.spot.metric", { count }) };
  }
  if (action === "pickup") {
    const km = num("areaKm");
    if (d.area == null || km == null) return null;
    const name = String(d.area);
    return { title: t("drop.pickup.title", { name }), why: t("drop.pickup.why", { name, km: n(km), city }), metric: t("drop.pickup.metric", { km: n(km) }) };
  }
  if (action === "refill") return { title: t("drop.refill.title"), why: t("drop.refill.why"), metric: t("drop.refill.metric") };
  return null;
}

// Rewrites a stored Drop in the reader's language. Falls back to the stored text when readings are missing.
// Rows created before readings carried the city name take it from the Comune being shown.
export function localizeDrop(drop: Drop, lang: Language, city?: string): Drop {
  const data = drop.data.city || !city ? drop.data : { ...drop.data, city };
  const text = render(drop.action, data, lang);
  return text ? { ...drop, ...text } : drop;
}

const SOURCES: Record<ActionId, SourceId[]> = {
  move: ["cams"],
  save: ["openmeteo"],
  plant: ["openmeteo"],
  spot: ["inat"],
  pickup: ["osm"],
  refill: ["begreen"],
  sort: ["begreen"],
  plate: ["begreen"],
  rewear: ["begreen"],
  crew: ["begreen"],
};

function pick(p: Pulse, lang: Language): ActionId {
  if (p.air && aqiBand(p.air.aqi, lang).level === "bad") return "move";
  if (p.water && p.water.dryDays >= 5 && p.water.rain7 < 2) return "save";

  const options: ActionId[] = [];
  if (p.soil && soilState(p.soil.moisture, lang).level === "good" && p.weather && p.weather.temp > 6) options.push("plant");
  if (p.nature && p.nature.speciesCount > 0) options.push("spot");
  if (p.areas && p.areas[0]) options.push("pickup");

  // Rotate the data-driven Drops by day; the generic refill only when the Comune's data offers nothing.
  const rotation: ActionId[] = ["plant", "spot", "pickup"];
  const start = Number(dayKey().replace(/-/g, "")) % rotation.length;
  for (let i = 0; i < rotation.length; i++) {
    const hit = options.find((o) => o === rotation[(start + i) % rotation.length]);
    if (hit) return hit;
  }
  return "refill";
}

export function buildDrop(p: Pulse, id: string, lang: Language): Drop {
  const action = pick(p, lang);
  const data = snapshot(p);
  const text = render(action, data, lang) ?? render("refill", data, lang)!;
  return { action, ...text, sources: SOURCES[action], id, day: id.slice(id.lastIndexOf(":") + 1), data };
}
