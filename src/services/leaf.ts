import type { SourceId } from "@/data/sources";
import { SOURCE_KINDS, SOURCES } from "@/data/sources";
import type { Explain } from "@/data/types";
import type { Pulse } from "@/services/env";
import type { Insight } from "@/services/interpret";
import { aqiBand, dominant, weatherText } from "@/services/interpret";

// Leaf: the assistant that answers questions about your local environment,
// always grounded in the Pulse data and always citing where a number comes from.
//
// Two modes:
//  1. Grounded local engine (default, works offline, never invents numbers).
//  2. Remote AI (set EXPO_PUBLIC_LEAF_ENDPOINT). The app POSTs
//     { question, audience, pulse, insights } and expects { text, cites: SourceId[] }.
//     The backend is where an LLM reads documents, interprets images and rewrites
//     for the audience; keys never ship inside the app.

export type LeafAnswer = { text: string; cites: SourceId[]; mode: "local" | "ai" };

export const SUGGESTED = [
  "Is today a good day to bike?",
  "What does PM2.5 actually mean?",
  "Is it too dry for plants?",
  "What lives near me?",
  "What can my class do this week?",
  "How reliable is this data?",
];

type Ctx = { pulse: Pulse; insights: Insight[]; audience: Explain };

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

function local(question: string, { pulse, insights, audience }: Ctx): LeafAnswer {
  const q = question.toLowerCase();
  const find = (k: Insight["key"]) => insights.find((i) => i.key === k);

  if (has(q, "reliab", "trust", "accurate", "source", "data", "fonte", "affidabil")) {
    const kinds = Array.from(new Set(insights.flatMap((i) => i.sources).map((s) => SOURCES[s].kind)));
    return {
      text:
        "Not all numbers here are the same kind of thing:\n\n" +
        kinds.map((k) => `• ${SOURCE_KINDS[k].label}: ${SOURCE_KINDS[k].what} Careful: ${SOURCE_KINDS[k].careful}`).join("\n") +
        "\n\nEvery card shows its badge, so you always know if you're looking at a measurement, a model or a report from people.",
      cites: Array.from(new Set(insights.flatMap((i) => i.sources))),
      mode: "local",
    };
  }

  if (has(q, "pm2", "pm10", "no2", "ozone", "o3", "pollut", "smog")) {
    const a = pulse.air;
    const base =
      "PM2.5 are particles smaller than 2.5 micrometres — about 30× thinner than a hair — small enough to get deep into your lungs. " +
      "They come from traffic, heating, industry and farming. NO₂ is a gas mostly from road traffic; O₃ (ozone) forms when sunlight hits pollution.";
    return {
      text: a
        ? `${base}\n\nRight now in ${pulse.place.name}: PM2.5 ${a.pm25}, PM10 ${a.pm10}, NO₂ ${a.no2}, O₃ ${a.o3} µg/m³. The one pushing the index most is ${dominant(a).name}.`
        : base,
      cites: ["cams"],
      mode: "local",
    };
  }

  if (has(q, "bike", "bici", "walk", "car", "air", "aria", "outside", "run")) {
    const a = pulse.air;
    const w = pulse.weather;
    if (!a || !w)
      return { text: "I couldn't load air or weather data just now. Pull to refresh on Pulse and ask again.", cites: [], mode: "local" };
    const band = aqiBand(a.aqi);
    const wet = w.code >= 51;
    const verdict = wet
      ? `It's ${weatherText(w.code).toLowerCase()}, so bus or tram beats the bike today.`
      : band.level === "bad"
        ? `Yes — and it matters more today: air is “${band.label}”, so every car you replace helps. On a busy road, pick a side street to breathe less of it.`
        : `Yes. ${w.temp}°, ${weatherText(w.code).toLowerCase()}, air “${band.label}”. Go.`;
    return {
      text: verdict + (audience !== "me" ? `\n\n${find("air")?.explain[audience] ?? ""}` : ""),
      cites: ["cams", "openmeteo"],
      mode: "local",
    };
  }

  if (has(q, "dry", "rain", "water", "plant", "soil", "acqua", "pioggia", "suolo", "drought")) {
    const water = find("water");
    const soil = find("soil");
    return {
      text:
        [water?.explain[audience], soil?.explain[audience]].filter(Boolean).join("\n\n") || "No water or soil data available right now.",
      cites: ["openmeteo"],
      mode: "local",
    };
  }

  if (has(q, "species", "animal", "bird", "live", "nature", "biodivers", "park", "protected", "specie")) {
    const n = pulse.nature;
    const areas = pulse.areas ?? [];
    const list = n?.top
      .slice(0, 5)
      .map((s) => `• ${s.common ?? s.name} (${s.count} sightings)`)
      .join("\n");
    return {
      text:
        (n
          ? `${n.speciesCount} species were recorded within 10 km in the last 30 days. Most seen:\n${list}`
          : "Species data didn't load.") +
        (areas.length
          ? `\n\nNearest protected/nature areas: ${areas
              .slice(0, 3)
              .map((a) => `${a.name} (${a.km} km)`)
              .join(", ")}.`
          : "") +
        "\n\nRemember: places with more people get more sightings — it says as much about observers as about nature.",
      cites: ["inat", "osm"],
      mode: "local",
    };
  }

  if (has(q, "class", "school", "classe", "squad", "comune", "project", "week", "teacher")) {
    const air = find("air");
    const top = insights.filter((i) => i.level === "bad")[0] ?? air ?? insights[0];
    return {
      text:
        `A 1-week plan based on today's data:\n\n` +
        `1. Measure: everyone logs how they get to school (Mon).\n` +
        `2. Understand: read the ${top?.label.toLowerCase() ?? "local"} card in “Class” mode together — ${top?.explain.class ?? ""}\n` +
        `3. Act: run a Squad Quest — target 5 verified BeGreens each by Friday.\n` +
        `4. Share: export the Community Report from the squad page and send it to your Comune.`,
      cites: top ? top.sources : [],
      mode: "local",
    };
  }

  const bad = insights.filter((i) => i.level === "bad");
  return {
    text:
      `Here's ${pulse.place.name} right now:\n` +
      insights.map((i) => `• ${i.label}: ${i.value}${i.unit ? ` ${i.unit}` : ""} — ${i.status}`).join("\n") +
      (bad.length
        ? `\n\nBiggest lever today: ${bad[0].label.toLowerCase()}. ${bad[0].explain[audience]}`
        : "\n\nNothing alarming today — pick any green move and prove it."),
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
        body: JSON.stringify({ question, audience: ctx.audience, pulse: ctx.pulse, insights: ctx.insights }),
      });
      if (res.ok) {
        const j = (await res.json()) as { text: string; cites?: SourceId[] };
        return { text: j.text, cites: j.cites ?? [], mode: "ai" };
      }
    } catch {
      // fall through to the grounded engine
    }
  }
  await new Promise((r) => setTimeout(r, 450)); // let the typing indicator breathe
  return local(question, ctx);
}
