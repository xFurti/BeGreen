import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useCountdown } from "@/components/drop-card";
import { Icon } from "@/components/icon";
import { Button, LiveDot, Mono, SdgTags, SourceBadge } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { usePulse } from "@/hooks/use-pulse";
import type { Drop } from "@/services/drop";
import { useApp } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const READINGS: Record<string, { label: string; fmt?: (v: number) => string; unit?: string }> = {
  aqi: { label: "Air quality", unit: "EAQI" },
  pm25: { label: "PM2.5", unit: "µg/m³" },
  no2: { label: "NO₂", unit: "µg/m³" },
  temp: { label: "Temperature", unit: "°C" },
  rain7: { label: "Rain, last 7 days", unit: "mm" },
  dryDays: { label: "Dry days in a row" },
  soilMoisture: { label: "Top-soil moisture", fmt: (v) => `${Math.round(v * 100)}%` },
  species: { label: "Species seen · 30 days", unit: "within 10 km" },
  area: { label: "Nearest protected area" },
};

function readings(d: Drop["data"]) {
  return Object.entries(READINGS)
    .filter(([k]) => d[k] !== undefined)
    .map(([k, r]) => {
      const v = d[k];
      const value = typeof v === "number" ? (r.fmt ? r.fmt(v) : v.toLocaleString("en")) : v;
      const unit = k === "area" && d.areaKm !== undefined ? `${d.areaKm} km` : r.unit;
      return { key: k, label: r.label, value, unit };
    });
}

export default function DropSheet() {
  const { C, T } = useTheme();
  const { drop, pulse } = usePulse();
  const comune = useApp((s) => s.comune);
  const place = comune?.name ?? pulse.place.name;
  const a = ACTIONS[drop.action];
  const left = useCountdown();
  const rows = readings(drop.data);

  const go = (path: "/capture" | "/guide") => {
    router.back();
    setTimeout(() => router.push({ pathname: path, params: { action: drop.action } }), 250);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 30 }}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LiveDot color={C.leaf} />
          <Mono color={C.forestInk}>Today’s Drop</Mono>
          <Mono>· {place}</Mono>
          <View style={{ flex: 1 }} />
          <Mono color={C.forestInk} style={{ fontVariant: ["tabular-nums"] }}>
            {left}
          </Mono>
        </View>
        <Text style={[T.hero, { fontSize: 40, lineHeight: 42 }]}>{drop.title}</Text>
        <SdgTags goals={a.sdgs} />
      </View>

      <Animated.View entering={FadeInDown.delay(80)} style={{ gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
        <Mono>Why this, why today</Mono>
        <Text style={[T.body, { fontSize: 17, lineHeight: 25 }]}>{drop.why}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{drop.metric}</Text>
          {drop.sources.map((s) => (
            <SourceBadge key={s} id={s} onPress={() => router.push("/sources")} />
          ))}
        </View>
      </Animated.View>

      {rows.length > 0 && (
        <Animated.View entering={FadeInDown.delay(120)} style={{ gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
          <Mono style={{ marginBottom: 8 }}>The readings behind it · {place}</Mono>
          {rows.map((r) => (
            <View key={r.key} style={{ flexDirection: "row", alignItems: "baseline", gap: 10, paddingVertical: 7 }}>
              <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 15, color: C.ink2 }}>{r.label}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, fontVariant: ["tabular-nums"], color: C.ink }} numberOfLines={1}>
                {r.value}
              </Text>
              {r.unit && <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.mute }}>{r.unit}</Text>}
            </View>
          ))}
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(160)} style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
        <Mono style={{ marginBottom: 10 }}>How it works</Mono>
        {[
          { icon: "camera" as const, t: "Snap the thing", d: "The bike, the bin, the bottle, the plant." },
          { icon: "video" as const, t: "Prove it in 5 seconds", d: a.proofHint },
          {
            icon: "checkSeal" as const,
            t: "3 people verify",
            d: "Others in your Comune or squad check it. Then it counts for your streak, squad and city.",
          },
        ].map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 10 }}>
            <Mono color={C.leaf} style={{ width: 20, paddingTop: 3 }}>
              {String(i + 1).padStart(2, "0")}
            </Mono>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>{s.t}</Text>
              <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{s.d}</Text>
            </View>
            <Icon name={s.icon} size={16} color={C.leaf} />
          </View>
        ))}
      </Animated.View>

      <Text style={T.caption}>
        {drop.offline
          ? `Offline: this Drop uses sample data and isn’t ${place}’s shared challenge yet. Pull to refresh on the feed.`
          : drop.shared
            ? `No alarm, no panic. Built from ${place}’s live data, and everyone in ${place} gets this same Drop today. One proof each, whenever you actually do it, before midnight.`
            : `Built from ${place}’s live data. No BeGreen server is set up, so this Drop lives on this phone only.`}
      </Text>

      <View style={{ gap: 8 }}>
        <Button label={`Do it: ${a.label}`} kind="green" trailing={`+${a.seeds + 10}`} icon={a.icon} onPress={() => go("/capture")} />
        <Button label="Show me how" kind="ghost" icon="book" onPress={() => go("/guide")} />
      </View>
    </ScrollView>
  );
}
