import type { Translator } from "@/i18n/catalog";
import type { Pulse } from "@/services/env";
import type { Insight } from "@/services/interpret";

export type PulseCard = Insight & { state: "ready" | "loading" | "unavailable" };

const DOMAINS = [
  { key: "air", icon: "air", source: "cams" },
  { key: "weather", icon: "sun", source: "openmeteo" },
  { key: "water", icon: "drop", source: "openmeteo" },
  { key: "soil", icon: "soil", source: "openmeteo" },
  { key: "nature", icon: "nature", source: "inat" },
  { key: "areas", icon: "tree", source: "osm" },
] as const;

// Keep every domain discoverable, distinguishing a successful empty response
// from an unavailable source. Never fill a missing reading with a sample or zero.
export function pulseCards(pulse: Pulse, insights: Insight[], t: Translator): PulseCard[] {
  return DOMAINS.map(({ key, icon, source }) => {
    const insight = insights.find((i) => i.key === key);
    const state = key === "areas" && !pulse.areas
      ? pulse.areasStatus === "loading" ? "loading" : "unavailable"
      : pulse[key] == null ? "unavailable" : "ready";
    const label = key === "water" ? t("pulse.rain") : t(`insights.labels.${key}`);
    if (insight) return { ...insight, label, state };
    const empty = key === "areas" && pulse.areas?.length === 0;
    const explanation = empty ? t("pulse.noAreasBody") : t("pulse.unavailableBody");
    return {
      key, icon, label, state, value: empty ? "0" : "—",
      status: empty ? t("pulse.noAreas") : t("pulse.unavailable"),
      level: "info", sources: [source],
      explain: { me: explanation, class: explanation, comune: explanation },
    };
  });
}
