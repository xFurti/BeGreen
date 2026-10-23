import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import { Mono, SourceBadge } from "@/components/ui";
import { COMUNI, DATA_YEARS, PM10_STATIONS, PROVINCE } from "@/data/comuni";
import type { SourceId } from "@/data/sources";
import type { ComuneView } from "@/hooks/use-comune";
import type { Translator } from "@/i18n/catalog";
import { formatDecimal, formatNumber } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import { useI18n } from "@/i18n/use-i18n";
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

function rowsFor(view: ComuneView, pulse: Pulse | null, t: Translator, lang: Language) {
  const rows: Row[] = [];
  const levels: Parameters<typeof askTheComune>[1] = {};
  const s = view.stats;
  const fmt = (n: number, d = 0) => (d ? formatDecimal(n, lang, d) : formatNumber(Math.round(n), lang));
  const pct = (share?: number) => (share == null ? "" : ` ${t("myComune.better", { pct: Math.round(share * 100) })}`);
  const now = t("myComune.now");

  if (pulse?.air && !pulse.sample) {
    const b = aqiBand(pulse.air.aqi, lang);
    rows.push({
      key: "aqi",
      icon: "air",
      label: t("myComune.air"),
      value: String(pulse.air.aqi),
      unit: "EAQI",
      level: b.level,
      note: t("myComune.airNote", { band: b.label }),
      source: "cams",
      when: now,
    });
  }

  const ca = view.citizenAir;
  if (ca.status === "loading" || (ca.status === "ok" && ca.value)) {
    const v = ca.status === "ok" ? ca.value : undefined;
    rows.push({
      key: "sensor",
      icon: "people",
      label: t("myComune.sensors"),
      value: v ? fmt(v.median, 1) : "…",
      unit: "µg/m³",
      level: v ? pm25Level(v.median) : "info",
      note: v ? t(v.sensors === 1 ? "myComune.sensorsNoteOne" : "myComune.sensorsNote", { count: v.sensors }) : t("myComune.sensorsLoading"),
      source: "sensor",
      when: now,
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
        label: t("myComune.pm10"),
        value: String(st.station.pm10Mean),
        unit: t("myComune.pm10Unit"),
        level: levels.pm10,
        note: t("myComune.pm10Note", {
          station: st.km ? `${st.station.name} (${t("common.km", { km: formatNumber(st.km, lang) })})` : st.station.name,
          days: st.station.pm10Days,
        }),
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
        label: t("myComune.co2"),
        value: fmt(perHead, 1),
        unit: t("myComune.co2Unit"),
        level: levels.emissions,
        note:
          t("myComune.co2Note", { co2Top: sectorText(s.co2Top, lang), co2Pct: s.co2TopPct ?? 0, pm10Pct: s.pm10TopPct ?? 0, pm10Top: sectorText(s.pm10Top, lang) }) +
          pct(share),
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
        label: t("myComune.soil"),
        value: fmt(s.soilSealedPct, 1),
        unit: t("myComune.soilUnit"),
        level: levels.soil,
        note: `${s.soilNewHa != null ? t("myComune.soilNote", { ha: fmt(s.soilNewHa, 2) }) : ""}${pct(share)}`.trim(),
        source: "ispra",
        when: String(DATA_YEARS.soil),
      });
    }
    if (s.recyclingPct != null) {
      levels.recycling = recyclingLevel(s.recyclingPct);
      rows.push({
        key: "waste",
        icon: "recycle",
        label: t("myComune.waste"),
        value: fmt(s.recyclingPct, 1),
        unit: "%",
        level: levels.recycling,
        note:
          t("myComune.wasteTarget", { target: RECYCLING_TARGET }) +
          (s.wasteKgPerCapita != null ? ` ${t("myComune.wasteKg", { kg: fmt(s.wasteKgPerCapita) })}` : ""),
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
      label: t("myComune.species"),
      value: v ? (v.species >= 2000 ? "2000+" : fmt(v.species)) : "…",
      level: "info",
      note: v ? t("myComune.speciesNote", { records: fmt(v.records) }) : t("myComune.speciesLoading"),
      source: "gbif",
      when: t("myComune.fiveYears"),
      loading: !v,
    });
  }

  if (pulse?.areas?.length && !pulse.sample) {
    rows.push({
      key: "areas",
      icon: "tree",
      label: t("myComune.areas"),
      value: String(pulse.areas.length),
      unit: t("myComune.areasUnit"),
      level: "info",
      note: t("myComune.areasNote", { name: pulse.areas[0].name, km: formatNumber(pulse.areas[0].km, lang) }),
      source: "osm",
      when: t("myComune.map"),
    });
  }

  return { rows, ask: s ? askTheComune(s, levels, lang) : undefined };
}

export function ComuneSection({ view, pulse }: { view: ComuneView; pulse: Pulse | null }) {
  const { C, T } = useTheme();
  const { t, language } = useI18n();
  const { rows, ask } = rowsFor(view, pulse, t, language);
  const name = view.stats?.name ?? view.id?.name;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={[T.display, { fontSize: 30 }]}>{name ?? t("myComune.finding")}</Text>
        <Mono>
          {view.stats
            ? t("myComune.compared", { province: PROVINCE, count: COMUNI.length })
            : view.id
              ? t("myComune.liveOnly", { province: PROVINCE })
              : t("myComune.approx")}
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
          <Mono color={C.ink}>{t("myComune.ask")}</Mono>
          <Text style={T.callout}>{ask}</Text>
        </View>
      )}
      <Text style={T.caption}>{t("myComune.footnote")}</Text>
    </View>
  );
}
