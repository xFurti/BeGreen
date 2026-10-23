import type { ActionId } from "@/data/actions";
import type { SourceId } from "@/data/sources";
import { formatNumber } from "@/i18n/format";
import { translate } from "@/i18n/catalog";
import type { Language } from "@/i18n/schema";
import type { Pulse } from "@/services/env";
import { aqiBand, dominant, soilState } from "@/services/interpret";

// The Drop: one shared mission per day per place, generated from local data.
// Everyone in town gets the same Drop, so the feed has a common thread —
// but you post it when YOU are doing it, not when a random notification fires.

export type Drop = {
  id: string; // date + place, stable for the whole day
  action: ActionId;
  title: string;
  why: string;
  metric: string;
  sources: SourceId[];
};

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function buildDrop(p: Pulse, lang: Language): Drop {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(lang, key, params);
  const id = `${dayKey()}:${p.place.name}`;
  const city = p.place.name;
  const n = (value: number) => formatNumber(value, lang);

  if (p.air && aqiBand(p.air.aqi, lang).level === "bad") {
    const band = aqiBand(p.air.aqi, lang);
    const d = dominant(p.air, lang);
    return {
      id,
      action: "move",
      title: t("drop.badAir.title"),
      why: t("drop.badAir.why", { city, band: band.label, driver: d.plain }),
      metric: t("drop.badAir.metric", { aqi: p.air.aqi, name: d.name, value: n(d.value) }),
      sources: ["cams"],
    };
  }

  if (p.water && p.water.dryDays >= 5 && p.water.rain7 < 2) {
    return {
      id,
      action: "save",
      title: t("drop.dry.title"),
      why: t("drop.dry.why", { days: p.water.dryDays, city }),
      metric: t("drop.dry.metric", { rain: n(p.water.rain7) }),
      sources: ["openmeteo"],
    };
  }

  // Rotate the remaining Drops by day so the feed stays fresh.
  const options: Drop[] = [];
  if (p.soil && soilState(p.soil.moisture, lang).level === "good" && p.weather && p.weather.temp > 6) {
    const moisture = Math.round(p.soil.moisture * 100);
    options.push({
      id,
      action: "plant",
      title: t("drop.plant.title"),
      why: t("drop.plant.why", { moisture, temp: p.weather.temp }),
      metric: t("drop.plant.metric", { moisture }),
      sources: ["openmeteo"],
    });
  }
  if (p.nature && p.nature.speciesCount > 0) {
    options.push({
      id,
      action: "spot",
      title: t("drop.spot.title", { count: n(p.nature.speciesCount) }),
      why: t("drop.spot.why", { city, count: n(p.nature.speciesCount) }),
      metric: t("drop.spot.metric", { count: n(p.nature.speciesCount) }),
      sources: ["inat"],
    });
  }
  if (p.areas && p.areas[0]) {
    options.push({
      id,
      action: "pickup",
      title: t("drop.pickup.title", { name: p.areas[0].name }),
      why: t("drop.pickup.why", { name: p.areas[0].name, km: n(p.areas[0].km) }),
      metric: t("drop.pickup.metric", { km: n(p.areas[0].km) }),
      sources: ["osm"],
    });
  }
  options.push({
    id,
    action: "refill",
    title: t("drop.refill.title"),
    why: t("drop.refill.why"),
    metric: t("drop.refill.metric"),
    sources: ["begreen"],
  });

  // Pick from a fixed rotation so the Drop doesn't change when slower data (e.g. the map) arrives later.
  const rotation: ActionId[] = ["plant", "spot", "pickup", "refill"];
  const start = Number(dayKey().replace(/-/g, "")) % rotation.length;
  for (let i = 0; i < rotation.length; i++) {
    const hit = options.find((o) => o.action === rotation[(start + i) % rotation.length]);
    if (hit) return hit;
  }
  return options[options.length - 1];
}
