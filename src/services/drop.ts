import type { ActionId } from "@/data/actions";
import type { SourceId } from "@/data/sources";
import type { Pulse } from "@/services/env";
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
  const d: Drop["data"] = {};
  if (p.air) Object.assign(d, { aqi: p.air.aqi, pm25: p.air.pm25, no2: p.air.no2 });
  if (p.weather) d.temp = p.weather.temp;
  if (p.water) Object.assign(d, { rain7: p.water.rain7, dryDays: p.water.dryDays });
  if (p.soil) d.soilMoisture = p.soil.moisture;
  if (p.nature) d.species = p.nature.speciesCount;
  if (p.areas?.[0]) Object.assign(d, { area: p.areas[0].name, areaKm: p.areas[0].km });
  return d;
}

export function buildDrop(p: Pulse, id: string): Drop {
  return { ...pick(p), id, day: id.slice(id.lastIndexOf(":") + 1), data: snapshot(p) };
}

type Choice = Omit<Drop, "id" | "day" | "data" | "shared" | "offline">;

function pick(p: Pulse): Choice {
  const city = p.place.name;

  if (p.air && aqiBand(p.air.aqi).level === "bad") {
    const d = dominant(p.air);
    return {
      action: "move",
      title: "Leave the car. Own the street.",
      why: `Air in ${city} is “${aqiBand(p.air.aqi).label}” today, driven by ${d.plain}. Every trip on foot, bike or bus takes a car off the road where you breathe.`,
      metric: `EAQI ${p.air.aqi} · ${d.name} ${d.value} µg/m³`,
      sources: ["cams"],
    };
  }

  if (p.water && p.water.dryDays >= 5 && p.water.rain7 < 2) {
    return {
      action: "save",
      title: "Dry week. Make every drop count.",
      why: `${p.water.dryDays} days in a row with almost no rain in ${city}. Cut 2 minutes off your shower or switch off what you're not using — then prove it.`,
      metric: `${p.water.rain7} mm rain in 7 days`,
      sources: ["openmeteo"],
    };
  }

  // Rotate the remaining Drops by day so the feed stays fresh.
  const options: Choice[] = [];
  if (p.soil && soilState(p.soil.moisture).level === "good" && p.weather && p.weather.temp > 6) {
    options.push({
      action: "plant",
      title: "Soil’s ready. Plant something.",
      why: `Top soil moisture is ${Math.round(p.soil.moisture * 100)}% and it's ${p.weather.temp}° — ideal for roots. A pot, a balcony box, a school flowerbed: it all counts.`,
      metric: `Soil moisture ${Math.round(p.soil.moisture * 100)}%`,
      sources: ["openmeteo"],
    });
  }
  if (p.nature && p.nature.speciesCount > 0) {
    options.push({
      action: "spot",
      title: `${p.nature.speciesCount} species live near you. Find one.`,
      why: `People around ${city} logged ${p.nature.speciesCount} species this month. Spot a plant, bird or bug, film it in its habitat, and add a record to the map.`,
      metric: `${p.nature.speciesCount} species · 10 km · 30 days`,
      sources: ["inat"],
    });
  }
  if (p.areas && p.areas[0]) {
    options.push({
      action: "pickup",
      title: `Show ${p.areas[0].name} some love.`,
      why: `${p.areas[0].name} is ${p.areas[0].km} km from ${city}. Grab a bag and a friend — litter there ends up in soil, water and animals.`,
      metric: `${p.areas[0].km} km away`,
      sources: ["osm"],
    });
  }
  options.push({
    action: "refill",
    title: "Refill, don’t landfill.",
    why: `Skip the plastic bottle today. Fill up at a tap or a public fountain and show it.`,
    metric: "1 bottle = 1 Drop",
    sources: ["begreen"],
  });

  // Rotate the data-driven Drops by day; the generic refill only when the Comune's data offers nothing.
  const rotation: ActionId[] = ["plant", "spot", "pickup"];
  const start = Number(dayKey().replace(/-/g, "")) % rotation.length;
  for (let i = 0; i < rotation.length; i++) {
    const hit = options.find((o) => o.action === rotation[(start + i) % rotation.length]);
    if (hit) return hit;
  }
  return options[options.length - 1];
}
