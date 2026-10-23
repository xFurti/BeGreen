import type { IconName } from "@/components/icon";
import type { ActionId } from "@/data/actions";
import type { SourceId } from "@/data/sources";
import type { Explain } from "@/data/types";
import { formatNumber, monthName } from "@/i18n/format";
import { translate, type Translator } from "@/i18n/catalog";
import type { Language } from "@/i18n/schema";
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

type BandId = "good" | "fair" | "moderate" | "poor" | "veryPoor" | "extreme";

export function aqiBand(aqi: number, lang: Language): { label: string; level: Level; id: BandId } {
  const id: BandId = aqi <= 20 ? "good" : aqi <= 40 ? "fair" : aqi <= 60 ? "moderate" : aqi <= 80 ? "poor" : aqi <= 100 ? "veryPoor" : "extreme";
  const level: Level = id === "good" || id === "fair" ? "good" : id === "moderate" ? "ok" : "bad";
  return { id, level, label: translate(lang, `ref.bands.${id}`) };
}

const POLLUTANTS = [
  { name: "PM2.5", key: "pm25", ref: 25 },
  { name: "PM10", key: "pm10", ref: 50 },
  { name: "NO₂", key: "no2", ref: 120 },
  { name: "O₃", key: "o3", ref: 130 },
] as const;

export function dominant(a: AirData, lang: Language): { name: string; plain: string; value: number; unit: string } {
  const c = [...POLLUTANTS].sort((x, y) => aValue(a, y.key) / y.ref - aValue(a, x.key) / x.ref)[0];
  return { name: c.name, plain: translate(lang, `ref.pollutants.${c.key}`), value: aValue(a, c.key), unit: "µg/m³" };
}

function aValue(a: AirData, key: (typeof POLLUTANTS)[number]["key"]) {
  if (key === "pm25") return a.pm25;
  if (key === "pm10") return a.pm10;
  if (key === "no2") return a.no2;
  return a.o3;
}

const WMO: Record<number, "clear" | "mostlyClear" | "partlyCloudy" | "overcast" | "fog" | "icyFog" | "lightDrizzle" | "drizzle" | "heavyDrizzle" | "lightRain" | "rain" | "heavyRain" | "lightSnow" | "snow" | "heavySnow" | "showers" | "violentShowers" | "thunder" | "hail"> = {
  0: "clear",
  1: "mostlyClear",
  2: "partlyCloudy",
  3: "overcast",
  45: "fog",
  48: "icyFog",
  51: "lightDrizzle",
  53: "drizzle",
  55: "heavyDrizzle",
  61: "lightRain",
  63: "rain",
  65: "heavyRain",
  71: "lightSnow",
  73: "snow",
  75: "heavySnow",
  80: "showers",
  81: "showers",
  82: "violentShowers",
  95: "thunder",
  96: "hail",
  99: "hail",
};

export const weatherText = (code: number, lang: Language) => translate(lang, `ref.weather.${WMO[code] ?? "mixed"}`);
const isWet = (code: number) => code >= 51;

type SoilId = "veryDry" | "dry" | "moist" | "saturated";

export function soilState(m: number, lang: Language): { label: string; level: Level; id: SoilId } {
  const id: SoilId = m < 0.12 ? "veryDry" : m < 0.2 ? "dry" : m < 0.35 ? "moist" : "saturated";
  const level: Level = id === "veryDry" ? "bad" : id === "dry" || id === "saturated" ? "ok" : "good";
  return { id, level, label: translate(lang, `ref.soil.${id}`) };
}

const num = (n: number, lang: Language) => formatNumber(n, lang);

export function buildInsights(p: Pulse, community: { carFree: number; areaName: string }, lang: Language): Insight[] {
  const t: Translator = (key, params) => translate(lang, key, params);
  const out: Insight[] = [];
  const city = p.place.name;

  if (p.air) {
    const a = p.air;
    const b = aqiBand(a.aqi, lang);
    const d = dominant(a, lang);
    const peak = a.next24.reduce((m, h) => (h.aqi > m.aqi ? h : m), a.next24[0] ?? { hour: "--", aqi: a.aqi });
    const later = aqiBand(peak.aqi, lang);
    out.push({
      key: "air",
      label: t("insights.labels.air"),
      icon: "air",
      value: String(a.aqi),
      unit: "EAQI",
      status: b.label,
      level: b.level,
      explain: {
        me:
          b.level === "bad"
            ? t("insights.air.meBad", { city, driver: d.plain, hour: peak.hour })
            : b.level === "ok"
              ? t("insights.air.meOk", { name: d.name })
              : later.level === "bad"
                ? t("insights.air.meLater", { band: later.label.toLowerCase(), hour: peak.hour })
                : t("insights.air.meGood"),
        class: t("insights.air.class", {
          aqi: a.aqi,
          band: b.label,
          name: d.name,
          value: num(d.value, lang),
          unit: d.unit,
          peak: peak.aqi,
          hour: peak.hour,
        }),
        comune: t("insights.air.comune", {
          aqi: a.aqi,
          band: b.label,
          pm25: num(a.pm25, lang),
          pm10: num(a.pm10, lang),
          no2: num(a.no2, lang),
          o3: num(a.o3, lang),
          carFree: num(community.carFree, lang),
          area: community.areaName,
        }),
      },
      act: { action: "move", label: b.level === "good" ? t("insights.air.actRide") : t("insights.air.actCarFree") },
      sources: ["cams", "begreen"],
    });
  }

  if (p.weather) {
    const w = p.weather;
    const nice = !isWet(w.code) && w.temp >= 8 && w.temp <= 30;
    const sky = weatherText(w.code, lang);
    out.push({
      key: "weather",
      label: t("insights.labels.weather"),
      icon: "sun",
      value: `${w.temp}°`,
      status: sky,
      level: "info",
      explain: {
        me: nice
          ? t("insights.weather.meNice", { sky, temp: w.temp, uv: w.uv >= 6 ? t("insights.weather.uv") : "" })
          : t("insights.weather.meOther", { sky, feels: w.feels }),
        class: t("insights.weather.class", {
          temp: w.temp,
          feels: w.feels,
          humidity: w.humidity,
          wind: w.wind,
          uv: num(w.uv, lang),
          tmin: w.tmin,
          tmax: w.tmax,
          month: monthName(new Date(), lang),
        }),
        comune: t("insights.weather.comune", { tmin: w.tmin, tmax: w.tmax, wind: w.wind, uv: num(w.uv, lang) }),
      },
      act: nice
        ? { action: "move", label: t("insights.weather.actBike") }
        : { action: "sort", label: t("insights.weather.actIndoor") },
      sources: ["openmeteo"],
    });
  }

  if (p.water) {
    const r = p.water;
    const dry = r.dryDays >= 5 && r.rain7 < 2;
    out.push({
      key: "water",
      label: t("insights.labels.water"),
      icon: "drop",
      value: num(r.rain7, lang),
      unit: t("insights.units.rain"),
      status: dry ? t("insights.status.dryDays", { days: r.dryDays }) : r.rainNext3 > 5 ? t("insights.status.rainComing") : t("insights.status.normal"),
      level: dry ? "bad" : "good",
      explain: {
        me: dry
          ? t("insights.water.meDry", { days: r.dryDays })
          : t("insights.water.meWet", {
              rain: num(r.rain7, lang),
              more: r.rainNext3 > 0 ? t("insights.water.more", { rain: num(r.rainNext3, lang) }) : "",
            }),
        class: t("insights.water.class", { rain: num(r.rain7, lang), next: num(r.rainNext3, lang), days: r.dryDays }),
        comune: t("insights.water.comune", { rain: num(r.rain7, lang), days: r.dryDays }),
      },
      act: dry
        ? { action: "save", label: t("insights.water.actSave") }
        : { action: "refill", label: t("insights.water.actRefill") },
      sources: ["openmeteo"],
    });
  }

  if (p.soil) {
    const s = soilState(p.soil.moisture, lang);
    const trend = p.soil.moisture - p.soil.weekAgo;
    const trendLabel = `${trend >= 0 ? "+" : ""}${Math.round(trend * 100)}`;
    out.push({
      key: "soil",
      label: t("insights.labels.soil"),
      icon: "soil",
      value: `${Math.round(p.soil.moisture * 100)}%`,
      unit: t("insights.units.moisture"),
      status: s.label,
      level: s.level,
      explain: {
        me: s.level === "good" ? t("insights.soil.meGood") : t("insights.soil.meOther", { state: s.label.toLowerCase() }),
        class: t("insights.soil.class", { moisture: Math.round(p.soil.moisture * 100), trend: trendLabel }),
        comune: t("insights.soil.comune", { raw: num(p.soil.moisture, lang) }),
      },
      act: s.level === "good" ? { action: "plant", label: t("insights.soil.actPlant") } : { action: "save", label: t("insights.soil.actWater") },
      sources: ["openmeteo"],
    });
  }

  if (p.nature) {
    const n = p.nature;
    const top = n.top[0];
    const topName = top?.common ?? top?.name;
    out.push({
      key: "nature",
      label: t("insights.labels.nature"),
      icon: "nature",
      value: num(n.speciesCount, lang),
      unit: t("insights.units.species"),
      status: t("insights.status.within10"),
      level: "info",
      explain: {
        me: n.speciesCount === 0 ? t("insights.nature.empty") : t("insights.nature.me", { count: num(n.speciesCount, lang), top: topName ? t("insights.nature.top", { name: topName }) : "" }),
        class: n.speciesCount === 0 ? t("insights.nature.empty") : t("insights.nature.class", { count: num(n.speciesCount, lang) }),
        comune: n.speciesCount === 0 ? t("insights.nature.empty") : t("insights.nature.comune", { count: num(n.speciesCount, lang) }),
      },
      act: { action: "spot", label: t("insights.nature.act") },
      sources: ["inat"],
    });
  }

  if (!p.areas) {
    out.push({
      key: "areas",
      label: t("insights.labels.areas"),
      icon: "tree",
      value: "—",
      status: p.areasStatus === "loading" ? t("insights.status.loading") : t("insights.status.mapBusy"),
      level: "info",
      explain: {
        me: p.areasStatus === "loading" ? t("insights.areasMissing.meLoading") : t("insights.areasMissing.meError"),
        class: t("insights.areasMissing.class"),
        comune: t("insights.areasMissing.comune"),
      },
      sources: ["osm"],
    });
  } else if (p.areas.length) {
    const a = p.areas[0];
    out.push({
      key: "areas",
      label: t("insights.labels.areas"),
      icon: "tree",
      value: String(p.areas.length),
      unit: t("insights.units.areas"),
      status: t("insights.status.nearest", { km: num(a.km, lang) }),
      level: "info",
      explain: {
        me: t("insights.areas.me", { name: a.name, km: num(a.km, lang) }),
        class: t("insights.areas.class", {
          count: p.areas.length,
          name: a.name,
          title: a.title ? t("insights.areas.title", { title: a.title }) : "",
        }),
        comune: t("insights.areas.comune", { count: p.areas.length }),
      },
      act: { action: "pickup", label: t("insights.areas.act") },
      sources: ["osm"],
    });
  }

  return out;
}
