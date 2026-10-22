import type { IconName } from "@/components/icon";
import type { ActionId } from "@/data/actions";
import type { SourceId } from "@/data/sources";
import type { Explain } from "@/data/types";
import type { AirData, Pulse } from "@/services/env";

// Turns raw numbers into plain language, adapted to who is reading:
//   me      → a teenager deciding what to do today
//   class   → a teacher / class turning it into a lesson or project
//   comune  → an administrator who needs caveats, units and the community response

export type Level = "good" | "ok" | "bad" | "info";

export type Insight = {
  key: "air" | "weather" | "water" | "soil" | "nature" | "areas";
  label: string;
  icon: IconName;
  value: string;
  unit?: string;
  status: string;
  level: Level;
  explain: Record<Explain, string>;
  act?: { action: ActionId; label: string };
  sources: SourceId[];
};

// European Air Quality Index bands (EEA).
export function aqiBand(aqi: number): { label: string; level: Level } {
  if (aqi <= 20) return { label: "Good", level: "good" };
  if (aqi <= 40) return { label: "Fair", level: "good" };
  if (aqi <= 60) return { label: "Moderate", level: "ok" };
  if (aqi <= 80) return { label: "Poor", level: "bad" };
  if (aqi <= 100) return { label: "Very poor", level: "bad" };
  return { label: "Extremely poor", level: "bad" };
}

// Which pollutant drives the index right now (ratio to its EEA "moderate" upper bound).
export function dominant(a: AirData): { name: string; plain: string; value: number; unit: string } {
  const c = [
    { name: "PM2.5", plain: "fine dust (PM2.5)", value: a.pm25, ref: 25 },
    { name: "PM10", plain: "dust (PM10)", value: a.pm10, ref: 50 },
    { name: "NO₂", plain: "nitrogen dioxide, mostly from traffic", value: a.no2, ref: 120 },
    { name: "O₃", plain: "ozone, made by sunlight + pollution", value: a.o3, ref: 130 },
  ].sort((x, y) => y.value / y.ref - x.value / x.ref)[0];
  return { name: c.name, plain: c.plain, value: c.value, unit: "µg/m³" };
}

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Thunderstorm + hail",
};
export const weatherText = (code: number) => WMO[code] ?? "Mixed";
const isWet = (code: number) => code >= 51;

export function soilState(m: number): { label: string; level: Level } {
  if (m < 0.12) return { label: "Very dry", level: "bad" };
  if (m < 0.2) return { label: "Dry", level: "ok" };
  if (m < 0.35) return { label: "Moist", level: "good" };
  return { label: "Saturated", level: "ok" };
}

export function buildInsights(p: Pulse, community: { carFree: number; areaName: string }): Insight[] {
  const out: Insight[] = [];
  const city = p.place.name;

  if (p.air) {
    const a = p.air;
    const b = aqiBand(a.aqi);
    const d = dominant(a);
    const peak = a.next24.reduce((m, h) => (h.aqi > m.aqi ? h : m), a.next24[0] ?? { hour: "--", aqi: a.aqi });
    out.push({
      key: "air",
      label: "Air",
      icon: "air",
      value: String(a.aqi),
      unit: "EAQI",
      status: b.label,
      level: b.level,
      explain: {
        me:
          b.level === "bad"
            ? `Air's rough in ${city} today. The main problem is ${d.plain}. Skip the car ride — walk, bike or bus. Worst around ${peak.hour}:00.`
            : b.level === "ok"
              ? `Air is okay-ish today. ${d.name} is the one to watch. Short trips? Do them on foot or bike.`
              : aqiBand(peak.aqi).level === "bad"
                ? `Air's clean right now, but the forecast turns “${aqiBand(peak.aqi).label.toLowerCase()}” around ${peak.hour}:00. Ride now, skip the car tonight.`
                : `Air's clean today. Perfect day to be outside — bike it, walk it, breathe it.`,
        class:
          `European Air Quality Index ${a.aqi}/100 → “${b.label}”. Driver right now: ${d.name} at ${d.value} ${d.unit}. ` +
          `Lesson idea: plot the next 24 h (peak ${peak.aqi} at ${peak.hour}:00) and explain why NO₂ follows rush hours while O₃ follows sunshine.`,
        comune:
          `Modelled EAQI ${a.aqi} (${b.label}). PM2.5 ${a.pm25}, PM10 ${a.pm10}, NO₂ ${a.no2}, O₃ ${a.o3} µg/m³. ` +
          `Source is the CAMS ensemble on a ~10 km grid: indicative, not a substitute for ARPA reference stations. ` +
          `Community response: ${community.carFree.toLocaleString("en")} verified car-free trips logged in ${community.areaName} this month.`,
      },
      act: { action: "move", label: b.level === "good" ? "Ride it" : "Go car-free" },
      sources: ["cams", "begreen"],
    });
  }

  if (p.weather) {
    const w = p.weather;
    const nice = !isWet(w.code) && w.temp >= 8 && w.temp <= 30;
    out.push({
      key: "weather",
      label: "Weather",
      icon: "sun",
      value: `${w.temp}°`,
      status: weatherText(w.code),
      level: "info",
      explain: {
        me: nice
          ? `${weatherText(w.code)}, ${w.temp}°. No excuses — this is bike weather.${w.uv >= 6 ? " UV is high, grab sunscreen." : ""}`
          : `${weatherText(w.code)}, feels like ${w.feels}°. Indoor green move today: sort the recycling or fix something.`,
        class: `Now ${w.temp}°C (feels ${w.feels}°C), humidity ${w.humidity}%, wind ${w.wind} km/h, UV ${w.uv}. Today ${w.tmin}–${w.tmax}°C. Compare with the 30-year average for October to talk about local climate trends.`,
        comune: `Forecast model data (Open-Meteo). Today ${w.tmin}–${w.tmax}°C, wind ${w.wind} km/h, UV ${w.uv}. Use for planning outdoor community actions; for climate records rely on official station series.`,
      },
      act: nice ? { action: "move", label: "Bike weather" } : { action: "sort", label: "Indoor move" },
      sources: ["openmeteo"],
    });
  }

  if (p.water) {
    const r = p.water;
    const dry = r.dryDays >= 5 && r.rain7 < 2;
    out.push({
      key: "water",
      label: "Water",
      icon: "drop",
      value: String(r.rain7),
      unit: "mm / 7 days",
      status: dry ? `${r.dryDays} dry days` : r.rainNext3 > 5 ? "Rain coming" : "Normal",
      level: dry ? "bad" : "good",
      explain: {
        me: dry
          ? `${r.dryDays} days without real rain. Plants and rivers feel it. Shorter shower today, and refill instead of buying bottles.`
          : `${r.rain7} mm of rain this week${r.rainNext3 > 0 ? `, ${r.rainNext3} mm more coming` : ""}. Free water for the plants — skip the hose.`,
        class: `Rain over the past 7 days: ${r.rain7} mm; next 3 days: ${r.rainNext3} mm; consecutive dry days: ${r.dryDays}. Activity: measure your school's water use for a week and compare with the rainfall.`,
        comune: `Precipitation (model reanalysis + forecast): ${r.rain7} mm in 7 days, ${r.dryDays} consecutive days < 1 mm. Indicative of short-term dryness only; drought status requires official hydrological bulletins.`,
      },
      act: dry ? { action: "save", label: "Save water" } : { action: "refill", label: "Refill" },
      sources: ["openmeteo"],
    });
  }

  if (p.soil) {
    const s = soilState(p.soil.moisture);
    const trend = p.soil.moisture - p.soil.weekAgo;
    out.push({
      key: "soil",
      label: "Soil",
      icon: "soil",
      value: `${Math.round(p.soil.moisture * 100)}%`,
      unit: "moisture",
      status: s.label,
      level: s.level,
      explain: {
        me:
          s.level === "good"
            ? `Top soil is moist — best moment to plant something. Seeds, herbs, a tree with your squad.`
            : `Top soil is ${s.label.toLowerCase()}. If you water plants, do it at sunset so less evaporates.`,
        class: `Top-centimetre soil moisture ${Math.round(p.soil.moisture * 100)}% vol (${trend >= 0 ? "+" : ""}${Math.round(trend * 100)} pts vs a week ago). Pair it with a soil-sealing walk: how much of your school's block is asphalt?`,
        comune: `Modelled volumetric soil moisture 0–1 cm: ${p.soil.moisture} m³/m³. Useful as a short-term signal for green-area irrigation planning; land-use change and soil sealing need ISPRA/regional cartography (access to be verified).`,
      },
      act: s.level === "good" ? { action: "plant", label: "Plant now" } : { action: "save", label: "Water smart" },
      sources: ["openmeteo"],
    });
  }

  if (p.nature) {
    const n = p.nature;
    const top = n.top[0];
    out.push({
      key: "nature",
      label: "Nature",
      icon: "nature",
      value: String(n.speciesCount),
      unit: "species · 30 days",
      status: "Within 10 km",
      level: "info",
      explain: {
        me: `${n.speciesCount} species were spotted near you this month${top ? ` — most seen: ${top.common ?? top.name}` : ""}. Spot one more and it goes on the map.`,
        class: `${n.speciesCount} research-grade species within 10 km in 30 days. Field trip idea: a 1-hour bioblitz in the nearest park, then compare your list with iNaturalist's.`,
        comune: `Citizen-science records (iNaturalist, research grade): ${n.speciesCount} species / 30 days / 10 km. Observation effort is uneven — absence of records is not absence of species. Useful for engaging residents and flagging invasive species.`,
      },
      act: { action: "spot", label: "Spot one" },
      sources: ["inat"],
    });
  }

  if (!p.areas) {
    out.push({
      key: "areas",
      label: "Protected areas",
      icon: "tree",
      value: "—",
      status: p.areasStatus === "loading" ? "Loading…" : "Map busy",
      level: "info",
      explain: {
        me:
          p.areasStatus === "loading"
            ? "Looking up parks and nature reserves around you…"
            : "The open map server is busy right now. Pull down to try again in a minute.",
        class:
          "OpenStreetMap's public Overpass servers are overloaded. A good moment to discuss why open data needs open infrastructure — and who pays for it.",
        comune:
          "Protected-area layer temporarily unavailable (Overpass API at capacity). For production use, mirror the data or use the regional protected-areas register.",
      },
      sources: ["osm"],
    });
  } else if (p.areas.length) {
    const a = p.areas[0];
    out.push({
      key: "areas",
      label: "Protected areas",
      icon: "tree",
      value: String(p.areas.length),
      unit: "within 25 km",
      status: `Nearest ${a.km} km`,
      level: "info",
      explain: {
        me: `${a.name} is ${a.km} km away. Take the squad, take a bag, leave it cleaner than you found it.`,
        class: `${p.areas.length} protected or nature areas within 25 km. Nearest: ${a.name}${a.title ? ` (${a.title})` : ""}. Map them together and pick one to adopt for the year.`,
        comune: `OpenStreetMap lists ${p.areas.length} protected/nature-reserve areas within 25 km. Boundaries are community-mapped; cross-check with the official regional register before formal use.`,
      },
      act: { action: "pickup", label: "Clean it up" },
      sources: ["osm"],
    });
  }

  return out;
}
