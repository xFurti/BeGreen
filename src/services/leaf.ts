import type { SourceId } from "@/data/sources";
import { SOURCES } from "@/data/sources";
import type { Explain } from "@/data/types";
import { translate, type Translator } from "@/i18n/catalog";
import { formatNumber } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import type { Pulse } from "@/services/env";
import type { Insight } from "@/services/interpret";
import { aqiBand, dominant, weatherText } from "@/services/interpret";

// Leaf: the assistant that answers questions about your local environment,
// always grounded in the Pulse data and always citing where a number comes from.
//
// Two modes:
//  1. Grounded local engine (default, works offline, never invents numbers).
//  2. Remote AI (set EXPO_PUBLIC_LEAF_ENDPOINT). The app POSTs
//     { question, audience, language, pulse, insights } and expects { text, cites: SourceId[] }.
//     The backend is where an LLM reads documents, interprets images and rewrites
//     for the audience; keys never ship inside the app. If it ignores `language`
//     or fails, the app answers with the local engine in the active language.

export type LeafAnswer = { text: string; cites: SourceId[]; mode: "local" | "ai" };

export const SUGGESTED_KEYS = ["answers.suggested.bike", "answers.suggested.pm", "answers.suggested.dry", "answers.suggested.live", "answers.suggested.class", "answers.suggested.trust"] as const;

type Ctx = { pulse: Pulse; insights: Insight[]; audience: Explain; language: Language };

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export function answerLocally(question: string, ctx: Ctx): LeafAnswer {
  const { pulse, insights, audience, language } = ctx;
  const t: Translator = (key, params) => translate(language, key, params);
  const q = question.toLowerCase();
  const find = (k: Insight["key"]) => insights.find((i) => i.key === k);
  const n = (value: number) => formatNumber(value, language);

  if (has(q, "reliab", "trust", "accurate", "source", "data", "fonte", "fonti", "affidabil", "attendibil", "precis", "dati", "fiducia")) {
    const kinds = Array.from(new Set(insights.flatMap((i) => i.sources).map((s) => SOURCES[s].kind)));
    const lines = kinds
      .map((k) =>
        t("answers.kindLine", {
          label: t(`ref.sourceKinds.${k}.label`),
          what: t(`ref.sourceKinds.${k}.what`),
          careful: t(`ref.sourceKinds.${k}.careful`),
        }),
      )
      .join("\n");
    return {
      text: t("answers.intro", { lines }),
      cites: Array.from(new Set(insights.flatMap((i) => i.sources))),
      mode: "local",
    };
  }

  if (has(q, "pm2", "pm10", "no2", "ozone", "ozono", "o3", "pollut", "inquin", "smog", "polver")) {
    const a = pulse.air;
    const base = t("answers.pmBase");
    return {
      text: a
        ? base +
          t("answers.pmNow", {
            place: pulse.place.name,
            pm25: n(a.pm25),
            pm10: n(a.pm10),
            no2: n(a.no2),
            o3: n(a.o3),
            name: dominant(a, language).name,
          })
        : base,
      cites: ["cams"],
      mode: "local",
    };
  }

  if (has(q, "bike", "bici", "walk", "cammin", "pied", "car", "macchina", "auto", "air", "aria", "outside", "fuori", "run", "corsa", "bus", "metro")) {
    const a = pulse.air;
    const w = pulse.weather;
    if (!a || !w) return { text: t("answers.missingAir"), cites: [], mode: "local" };
    const band = aqiBand(a.aqi, language);
    const sky = weatherText(w.code, language).toLowerCase();
    const wet = w.code >= 51;
    const verdict = wet
      ? t("answers.bikeWet", { sky })
      : band.level === "bad"
        ? t("answers.bikeBad", { band: band.label })
        : t("answers.bikeYes", { temp: w.temp, sky, band: band.label });
    return {
      text: verdict + (audience !== "me" ? `\n\n${find("air")?.explain[audience] ?? ""}` : ""),
      cites: ["cams", "openmeteo"],
      mode: "local",
    };
  }

  if (has(q, "dry", "secc", "rain", "piogg", "water", "acqua", "plant", "piant", "soil", "suolo", "terren", "drought", "siccit")) {
    const water = find("water");
    const soil = find("soil");
    return {
      text: [water?.explain[audience], soil?.explain[audience]].filter(Boolean).join("\n\n") || t("answers.noWater"),
      cites: ["openmeteo"],
      mode: "local",
    };
  }

  if (has(q, "species", "specie", "animal", "bird", "uccell", "live", "vive", "vivon", "nature", "natur", "biodivers", "park", "parco", "protected", "protet")) {
    const nature = pulse.nature;
    const areas = pulse.areas ?? [];
    const list = nature?.top
      .slice(0, 5)
      .map((s) => t("answers.sightings", { name: s.common ?? s.name, count: n(s.count) }))
      .join("\n");
    const areaList = areas
      .slice(0, 3)
      .map((a) => t("answers.areaItem", { name: a.name, km: n(a.km) }))
      .join(", ");
    return {
      text:
        (nature ? t("answers.species", { count: n(nature.speciesCount), list: list ?? "" }) : t("answers.speciesMiss")) +
        (areas.length ? t("answers.areas", { list: areaList }) : "") +
        t("answers.speciesCaveat"),
      cites: ["inat", "osm"],
      mode: "local",
    };
  }

  if (has(q, "class", "classe", "school", "scuola", "squad", "squadra", "comune", "project", "progett", "week", "settiman", "teacher", "insegn", "docent")) {
    const air = find("air");
    const top = insights.filter((i) => i.level === "bad")[0] ?? air ?? insights[0];
    return {
      text: t("answers.plan", {
        topic: top?.label.toLowerCase() ?? t("answers.topicFallback"),
        explain: top?.explain.class ?? "",
      }),
      cites: top ? top.sources : [],
      mode: "local",
    };
  }

  const bad = insights.filter((i) => i.level === "bad");
  const lines = insights
    .map((i) => t("answers.summaryLine", { label: i.label, value: i.value, unit: i.unit ? ` ${i.unit}` : "", status: i.status }))
    .join("\n");
  return {
    text:
      t("answers.summary", { place: pulse.place.name, lines }) +
      (bad.length ? t("answers.lever", { label: bad[0].label.toLowerCase(), explain: bad[0].explain[audience] }) : t("answers.calm")),
    cites: Array.from(new Set(insights.flatMap((i) => i.sources))),
    mode: "local",
  };
}

export async function askLeaf(question: string, ctx: Ctx): Promise<LeafAnswer> {
  const endpoint = process.env.EXPO_PUBLIC_LEAF_ENDPOINT;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, audience: ctx.audience, language: ctx.language, pulse: ctx.pulse, insights: ctx.insights }),
      });
      if (res.ok) {
        const j = (await res.json()) as { text: string; cites?: SourceId[] };
        return { text: j.text, cites: j.cites ?? [], mode: "ai" };
      }
    } catch {
      // fall through to the grounded engine
    }
  }
  await new Promise((r) => setTimeout(r, 450));
  return answerLocally(question, ctx);
}
