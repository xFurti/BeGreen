import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import { Mono, SourceBadge } from "@/components/ui";
import { COMUNI, DATA_YEARS, PM10_STATIONS, PROVINCE } from "@/data/comuni";
import type { SourceId } from "@/data/sources";
import type { ComuneView } from "@/hooks/use-comune";
import {
  askTheComune,
  betterThan,
  levelFromShare,
  nearestStation,
  pm10Level,
  pm25Level,
  RECYCLING_TARGET,
  recyclingLevel,
  sectorText,
} from "@/services/comune-levels";
import type { Pulse } from "@/services/env";
import { aqiBand, type Level } from "@/services/interpret";
import { F, R, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const dot = (C: Palette): Record<Level, string> => ({ good: C.green, ok: C.amber, bad: C.red, info: C.faint });

type Row = { key: string; icon: IconName; label: string; value: string; unit?: string; level: Level; note: string; source: SourceId; when: string; loading?: boolean };

const pct = (share?: number) => (share == null ? "" : ` Better than ${Math.round(share * 100)}% of comuni in the province.`);
const fmt = (n: number, d = 0) => n.toLocaleString("en", { maximumFractionDigits: d, minimumFractionDigits: d });

function rowsFor(view: ComuneView, pulse: Pulse | null) {
  const rows: Row[] = [];
  const levels: Parameters<typeof askTheComune>[1] = {};
  const s = view.stats;

  if (pulse?.air && !pulse.sample) {
    const b = aqiBand(pulse.air.aqi);
    rows.push({
      key: "aqi",
      icon: "air",
      label: "Air today",
      value: String(pulse.air.aqi),
      unit: "EAQI",
      level: b.level,
      note: `${b.label}. Model estimate on a ~10 km grid, not a station.`,
      source: "cams",
      when: "now",
    });
  }

  const ca = view.citizenAir;
  if (ca.status === "loading" || (ca.status === "ok" && ca.value)) {
    const v = ca.status === "ok" ? ca.value : undefined;
    rows.push({
      key: "sensor",
      icon: "people",
      label: "Citizen sensors · PM2.5",
      value: v ? fmt(v.median, 1) : "…",
      unit: "µg/m³",
      level: v ? pm25Level(v.median) : "info",
      note: v ? `Median of ${v.sensors} low-cost sensor${v.sensors === 1 ? "" : "s"} within 10 km. WHO daily guideline: 15.` : "Reading nearby sensors…",
      source: "sensor",
      when: "now",
      loading: !v,
    });
  }

  if (s) {
    const st = nearestStation(PM10_STATIONS, COMUNI, s);
    if (st) {
      levels.pm10 = pm10Level(st.station.pm10Mean, st.station.pm10Days);
      rows.push({
        key: "pm10",
        icon: "chart",
        label: "PM10 · official station",
        value: String(st.station.pm10Mean),
        unit: "µg/m³ / year",
        level: levels.pm10,
        note:
          `${st.station.name}${st.km ? ` (${st.km} km)` : ""}: ${st.station.pm10Days} days over the daily limit. ` +
          `EU limit from 2030: 20 µg/m³ and 18 days.`,
        source: "arpa",
        when: String(st.station.year),
      });
    }
    if (s.co2Kt != null && s.population) {
      const perHead = (s.co2Kt * 1000) / s.population;
      const share = betterThan(COMUNI, perHead, (c) => (c.co2Kt != null && c.population ? (c.co2Kt * 1000) / c.population : undefined), false);
      levels.emissions = levelFromShare(share);
      rows.push({
        key: "co2",
        icon: "bolt",
        label: "CO₂ emitted in the comune",
        value: fmt(perHead, 1),
        unit: "t / resident",
        level: levels.emissions,
        note: `Mostly ${sectorText(s.co2Top)} (${s.co2TopPct}%). ${s.pm10TopPct}% of local PM10 comes from ${sectorText(s.pm10Top)}.${pct(share)}`,
        source: "arpa",
        when: String(DATA_YEARS.emissions),
      });
    }
    if (s.soilSealedPct != null) {
      const share = betterThan(COMUNI, s.soilSealedPct, (c) => c.soilSealedPct, false);
      levels.soil = levelFromShare(share);
      rows.push({
        key: "soil",
        icon: "soil",
        label: "Land sealed",
        value: fmt(s.soilSealedPct, 1),
        unit: "% of area",
        level: levels.soil,
        note: `${s.soilNewHa != null ? `${fmt(s.soilNewHa, 2)} ha newly sealed in the last year (net).` : ""}${pct(share)}`,
        source: "ispra",
        when: String(DATA_YEARS.soil),
      });
    }
    if (s.recyclingPct != null) {
      levels.recycling = recyclingLevel(s.recyclingPct);
      rows.push({
        key: "waste",
        icon: "recycle",
        label: "Separate collection",
        value: fmt(s.recyclingPct, 1),
        unit: "%",
        level: levels.recycling,
        note: `Legal target ${RECYCLING_TARGET}%.${s.wasteKgPerCapita != null ? ` ${fmt(s.wasteKgPerCapita)} kg of urban waste per resident a year.` : ""}`,
        source: "rifiuti",
        when: String(DATA_YEARS.waste),
      });
    }
  }

  const sp = view.species;
  if (sp.status !== "error") {
    const v = sp.status === "ok" ? sp.value : undefined;
    rows.push({
      key: "species",
      icon: "binoculars",
      label: "Species recorded nearby",
      value: v ? (v.species >= 2000 ? "2000+" : fmt(v.species)) : "…",
      level: "info",
      note: v ? `Within 5 km in the last 5 years, from ${fmt(v.records)} records. More records ≠ more nature.` : "Counting species records…",
      source: "gbif",
      when: "5 yrs",
      loading: !v,
    });
  }

  if (pulse?.areas?.length && !pulse.sample) {
    rows.push({
      key: "areas",
      icon: "tree",
      label: "Protected areas",
      value: String(pulse.areas.length),
      unit: "within 25 km",
      level: "info",
      note: `Closest: ${pulse.areas[0].name} (${pulse.areas[0].km} km).`,
      source: "osm",
      when: "map",
    });
  }

  return { rows, ask: s ? askTheComune(s, levels) : undefined };
}

export function ComuneSection({ view, pulse }: { view: ComuneView; pulse: Pulse | null }) {
  const { C, T } = useTheme();
  const { rows, ask } = rowsFor(view, pulse);
  const name = view.stats?.name ?? view.id?.name;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={[T.display, { fontSize: 30 }]}>{name ?? "Finding your comune…"}</Text>
        <Mono>
          {view.stats
            ? `Province of ${PROVINCE} · compared with ${COMUNI.length} comuni`
            : view.id
              ? "Live data only · official comune data covers the Province of Vicenza"
              : "Approximate location (~1 km)"}
        </Mono>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
        {rows.map((r) => (
          <Animated.View key={r.key} entering={FadeIn} style={{ paddingVertical: 14, gap: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name={r.icon} size={15} color={C.ink} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2, color: C.ink }}>{r.label}</Text>
              {r.loading ? <ActivityIndicator size="small" color={C.mute} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot(C)[r.level] }} />}
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, paddingLeft: 25 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 28, letterSpacing: -1.2, color: C.ink, fontVariant: ["tabular-nums"] }}>{r.value}</Text>
              {r.unit && <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{r.unit}</Text>}
            </View>
            <Text style={[T.caption, { paddingLeft: 25, color: C.ink2 }]}>{r.note}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 25 }}>
              <SourceBadge id={r.source} onPress={() => router.push("/sources")} />
              <Mono color={C.faint}>· {r.when}</Mono>
            </View>
          </Animated.View>
        ))}
      </View>

      {ask && (
        <View style={{ backgroundColor: C.card, borderRadius: R.lg, borderCurve: "continuous", padding: 16, gap: 8 }}>
          <Mono color={C.ink}>What to ask your Comune</Mono>
          <Text style={T.callout}>{ask}</Text>
        </View>
      )}
      <Text style={T.caption}>
        Official data is yearly and per comune; sensors and models are live but approximate. Colours compare with legal targets or with the other
        comuni of the province.
      </Text>
    </View>
  );
}
