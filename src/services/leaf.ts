import type { SourceId } from "@/data/sources";
import { SOURCES } from "@/data/sources";
import type { Explain } from "@/data/types";
import type { IconName } from "@/components/icon";
import { translate, type MessageKey, type Translator } from "@/i18n/catalog";
import { formatNumber } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import type { Pulse } from "@/services/env";
import { aqiBand, dominant, soilState, weatherText, type Insight, type Level } from "@/services/interpret";

// Leaf: the assistant that answers questions about your local environment,
// always grounded in the Pulse data and always citing where a number comes from.
//
// Two modes:
//  1. Grounded local engine (default, works offline, never invents numbers).
//  2. Remote AI (set EXPO_PUBLIC_LEAF_ENDPOINT). The app POSTs
//     { question, audience, language, pulse, insights } and expects
//     { text, cites: SourceId[], headline?, facts?: LeafFact[], followUps?: string[] }.
//     Only `text` is required; the optional fields drive the structured answer
//     (verdict, number chips, follow-up questions) when the backend provides them.
//     The backend is where an LLM reads documents, interprets images and rewrites
//     for the audience; keys never ship inside the app. If it ignores `language`
//     or fails, the app answers with the local engine in the active language.

export type LeafFact = { label: string; value: string; unit?: string; level?: Level };

export type LeafAnswer = {
  text: string;
  cites: SourceId[];
  mode: "local" | "ai";
  // The verdict, shown first and in bold.
  headline?: string;
  // Numbers worth reading at a glance, shown as chips under the text.
  facts?: LeafFact[];
  // Questions that make sense next, shown as chips under the latest answer.
  followUps?: string[];
  // Whether asking again for another audience gives a different answer.
  tailored: boolean;
};

type SuggestionId = "bike" | "pm" | "dry" | "live" | "class" | "trust" | "today";

export type Suggestion = { key: MessageKey; icon: IconName };

const SUGGESTIONS: Record<SuggestionId, Suggestion> = {
  bike: { key: "answers.suggested.bike", icon: "bike" },
  pm: { key: "answers.suggested.pm", icon: "air" },
  dry: { key: "answers.suggested.dry", icon: "drop" },
  live: { key: "answers.suggested.live", icon: "plant" },
  class: { key: "answers.suggested.class", icon: "people" },
  trust: { key: "answers.suggested.trust", icon: "info" },
  today: { key: "answers.suggested.today", icon: "sparkle" },
};

export const SUGGESTED_KEYS = Object.values(SUGGESTIONS).map((s) => s.key);

// The first three questions, picked from what is going on today: a problem in
// the data comes first, so the most useful question is one tap away.
// Only offer questions the data on screen can answer.
function answerable(id: SuggestionId, insights: Insight[]) {
  const known = (k: Insight["key"]) => insights.some((i) => i.key === k);
  if (id === "bike") return known("air") && known("weather");
  if (id === "pm") return known("air");
  if (id === "dry") return known("water") || known("soil");
  if (id === "live") return known("nature");
  return true;
}

export function suggestionsFor(insights: Insight[]): Suggestion[] {
  const level = (k: Insight["key"]) => insights.find((i) => i.key === k)?.level;
  const ids: (SuggestionId | false)[] = [
    level("air") === "bad" && "bike",
    level("air") === "bad" && "pm",
    (level("water") === "bad" || level("soil") === "bad") && "dry",
    "bike",
    "live",
    "class",
    "pm",
    "trust",
  ];
  return Array.from(new Set(ids.filter((id): id is SuggestionId => !!id && answerable(id, insights))))
    .slice(0, 3)
    .map((id) => SUGGESTIONS[id]);
}

// The one line Leaf opens with: what matters most in this place today.
export function todayVerdict(insights: Insight[], place: string, language: Language) {
  const bad = insights.find((i) => i.level === "bad");
  return bad
    ? translate(language, "answers.todayBad", { place, label: bad.label.toLowerCase(), status: bad.status.toLowerCase() })
    : translate(language, "answers.calmHead", { place });
}

type Ctx = { pulse: Pulse; insights: Insight[]; audience: Explain; language: Language };

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));
const asksForAnimals = (q: string) => has(q, "animal", "bird", "uccell", "insect", "insett", "bug", "mammal", "reptil", "rettil", "fish", "pesci", "amphib", "anfib", "arachn", "aracn", "mollusc", "mollusk", "fauna");
const asksForNature = (q: string) => asksForAnimals(q) || has(q, "species", "specie", "live", "vive", "vivon", "nature", "natur", "biodivers", "park", "parco", "protected", "protet", "flora", "plants near", "plants grow", "piante vicin", "quali piante");

const fact = (i: Insight): LeafFact => ({ label: i.label, value: i.value, unit: i.unit, level: i.level });

export function answerLocally(question: string, ctx: Ctx): LeafAnswer {
  const { pulse, insights, audience, language } = ctx;
  const t: Translator = (key, params) => translate(language, key, params);
  const q = question.toLowerCase();
  const find = (k: Insight["key"]) => insights.find((i) => i.key === k);
  const n = (value: number) => formatNumber(value, language);
  const follow = (...ids: SuggestionId[]) => ids.filter((id) => answerable(id, insights)).map((id) => t(SUGGESTIONS[id].key));
  // For a class or a Comune, add the insight written for them under the answer.
  const forAudience = (...keys: Insight["key"][]) =>
    audience === "me" ? "" : keys.map((k) => find(k)?.explain[audience]).filter(Boolean).join("\n\n");

  if (asksForNature(q)) {
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
      headline: nature ? (nature.speciesCount === 0 ? t("answers.speciesEmpty") : t("answers.speciesHead", { count: n(nature.speciesCount) })) : t("answers.speciesMiss"),
      text: [
        asksForAnimals(q) && t("answers.animalsOutside"),
        nature && nature.speciesCount > 0 && t("answers.species", { list: list ?? "" }),
        areas.length > 0 && t("answers.areas", { list: areaList }),
        t("answers.speciesCaveat"),
      ]
        .filter(Boolean)
        .join("\n\n"),
      cites: ["inat", "osm"],
      mode: "local",
      followUps: follow("dry", "trust"),
      tailored: false,
    };
  }

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
      headline: t("answers.introHead"),
      text: t("answers.intro", { lines }),
      cites: Array.from(new Set(insights.flatMap((i) => i.sources))),
      mode: "local",
      followUps: follow("pm", "today"),
      tailored: false,
    };
  }

  if (has(q, "pm2", "pm10", "no2", "ozone", "ozono", "o3", "pollut", "inquin", "smog", "polver")) {
    const a = pulse.air;
    const air = find("air");
    return {
      headline: a ? t("answers.pmHead", { place: pulse.place.name, name: dominant(a, language).name }) : t("answers.pmHeadMiss"),
      text: t("answers.pmBase"),
      facts: a
        ? [
            ...(air ? [fact(air)] : []),
            { label: "PM2.5", value: n(a.pm25), unit: "µg/m³" },
            { label: "PM10", value: n(a.pm10), unit: "µg/m³" },
            { label: "NO₂", value: n(a.no2), unit: "µg/m³" },
            { label: "O₃", value: n(a.o3), unit: "µg/m³" },
          ]
        : undefined,
      cites: ["cams"],
      mode: "local",
      followUps: follow("bike", "class"),
      tailored: false,
    };
  }

  if (has(q, "bike", "bici", "walk", "cammin", "pied", "car", "macchina", "auto", "air", "aria", "outside", "fuori", "run", "corsa", "bus", "metro")) {
    const a = pulse.air;
    const w = pulse.weather;
    if (!a || !w) return { text: t("answers.missingAir"), cites: [], mode: "local", followUps: follow("trust"), tailored: false };
    const band = aqiBand(a.aqi, language);
    const sky = weatherText(w.code, language).toLowerCase();
    const wet = w.code >= 51;
    const verdict = wet ? "Wet" : band.level === "bad" ? "Bad" : "Yes";
    const extra = forAudience("air");
    return {
      headline: t(`answers.bike${verdict}Head`),
      text: t(`answers.bike${verdict}`, { temp: w.temp, sky, band: band.label }) + (extra ? `\n\n${extra}` : ""),
      facts: [find("air"), find("weather")].filter((i): i is Insight => !!i).map(fact),
      cites: ["cams", "openmeteo"],
      mode: "local",
      followUps: follow("pm", "class"),
      tailored: true,
    };
  }

  if (has(q, "dry", "secc", "rain", "piogg", "water", "acqua", "plant", "piant", "soil", "suolo", "terren", "drought", "siccit")) {
    const water = find("water");
    const soil = find("soil");
    if (!water && !soil) return { text: t("answers.noWater"), cites: [], mode: "local", followUps: follow("trust"), tailored: false };
    // "Dry" soil is only amber in Pulse, but it is still dry for a plant.
    const soilDry = pulse.soil ? ["veryDry", "dry"].includes(soilState(pulse.soil.moisture, language).id) : false;
    const dry = water?.level === "bad" || soilDry;
    return {
      headline: t(dry ? "answers.dryYesHead" : "answers.dryNoHead"),
      text: [water?.explain[audience], soil?.explain[audience]].filter(Boolean).join("\n\n"),
      facts: [water, soil].filter((i): i is Insight => !!i).map(fact),
      cites: ["openmeteo"],
      mode: "local",
      followUps: follow("live", "class"),
      tailored: true,
    };
  }

  if (has(q, "class", "classe", "school", "scuola", "squad", "squadra", "comune", "project", "progett", "week", "settiman", "teacher", "insegn", "docent")) {
    const air = find("air");
    const top = insights.filter((i) => i.level === "bad")[0] ?? air ?? insights[0];
    return {
      headline: t("answers.planHead"),
      text: t("answers.plan", {
        topic: top?.label.toLowerCase() ?? t("answers.topicFallback"),
        explain: top?.explain.class ?? "",
      }),
      facts: top ? [fact(top)] : undefined,
      cites: top ? top.sources : [],
      mode: "local",
      followUps: follow("trust", "today"),
      tailored: false,
    };
  }

  const bad = insights.filter((i) => i.level === "bad");
  return {
    headline: bad.length ? t("answers.leverHead", { label: bad[0].label.toLowerCase() }) : t("answers.calmHead", { place: pulse.place.name }),
    text: bad.length ? bad[0].explain[audience] : t("answers.calm"),
    facts: insights.filter((i) => i.key !== "areas").map(fact),
    cites: Array.from(new Set(insights.flatMap((i) => i.sources))),
    mode: "local",
    followUps: follow("bike", "class"),
    tailored: true,
  };
}

const LEVELS: Level[] = ["good", "ok", "bad", "info"];

// The backend owns its wording; keep only the fields the app knows how to show.
function fromRemote(j: unknown): LeafAnswer | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.text !== "string" || !r.text.trim()) return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const facts = Array.isArray(r.facts)
    ? r.facts.flatMap((f): LeafFact[] => {
        const x = (f ?? {}) as Record<string, unknown>;
        const label = str(x.label);
        const value = typeof x.value === "number" ? String(x.value) : str(x.value);
        if (!label || !value) return [];
        return [{ label, value, unit: str(x.unit), level: LEVELS.includes(x.level as Level) ? (x.level as Level) : undefined }];
      })
    : undefined;
  return {
    text: r.text,
    cites: Array.isArray(r.cites) ? (r.cites.filter((c) => typeof c === "string" && Object.hasOwn(SOURCES, c)) as SourceId[]) : [],
    mode: "ai",
    headline: str(r.headline),
    facts: facts?.length ? facts : undefined,
    followUps: Array.isArray(r.followUps) ? r.followUps.map(str).filter((f): f is string => !!f).slice(0, 2) : undefined,
    tailored: true,
  };
}

export async function askLeaf(question: string, ctx: Ctx): Promise<LeafAnswer> {
  // Keep biodiversity answers in this view's plant-only scope, even with an AI endpoint.
  if (asksForNature(question.toLowerCase())) return answerLocally(question, ctx);
  const endpoint = process.env.EXPO_PUBLIC_LEAF_ENDPOINT;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, audience: ctx.audience, language: ctx.language, pulse: ctx.pulse, insights: ctx.insights }),
      });
      const answer = res.ok ? fromRemote(await res.json()) : null;
      if (answer) return answer;
    } catch {
      // fall through to the grounded engine
    }
  }
  await new Promise((r) => setTimeout(r, 450));
  return answerLocally(question, ctx);
}
