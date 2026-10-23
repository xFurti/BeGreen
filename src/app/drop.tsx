import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCountdown } from "@/components/drop-card";
import { Icon, type IconName } from "@/components/icon";
import { Blobs, LeafMark } from "@/components/nature";
import { Button, LiveDot, Mono, SdgTags, SourceBadge } from "@/components/ui";
import { usePulse } from "@/hooks/use-pulse";
import type { MessageKey, Translator } from "@/i18n/catalog";
import { actionCopy } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import { useI18n } from "@/i18n/use-i18n";
import type { Drop } from "@/services/drop";
import { canClaimDrop, seedsFor } from "@/services/rewards";
import { hasBackend } from "@/services/supabase";
import { useApp } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const READINGS: { key: string; label: MessageKey; icon: IconName; unit?: string; pct?: boolean; unitKey?: MessageKey }[] = [
  { key: "aqi", label: "dropSheet.readings.aqi", icon: "air", unit: "EAQI" },
  { key: "pm25", label: "dropSheet.readings.pm25", icon: "air", unit: "µg/m³" },
  { key: "no2", label: "dropSheet.readings.no2", icon: "air", unit: "µg/m³" },
  { key: "temp", label: "dropSheet.readings.temp", icon: "thermometer", unit: "°C" },
  { key: "rain7", label: "dropSheet.readings.rain7", icon: "drop", unit: "mm" },
  { key: "dryDays", label: "dropSheet.readings.dryDays", icon: "sun" },
  { key: "soilMoisture", label: "dropSheet.readings.soil", icon: "soil", pct: true },
  { key: "plantSpecies", label: "dropSheet.readings.species", icon: "binoculars", unitKey: "dropSheet.readings.speciesUnit" },
  { key: "area", label: "dropSheet.readings.area", icon: "tree" },
];

function readings(d: Drop["data"], t: Translator, lang: Language) {
  return READINGS.filter((r) => d[r.key] !== undefined).map((r) => {
    const v = d[r.key];
    const value = typeof v === "number" ? (r.pct ? `${Math.round(v * 100)}%` : formatNumber(v, lang)) : v;
    const unit = r.key === "area" && typeof d.areaKm === "number" ? t("common.km", { km: formatNumber(d.areaKm, lang) }) : r.unitKey ? t(r.unitKey) : r.unit;
    return { key: r.key, icon: r.icon, label: t(r.label), value: String(value), unit };
  });
}

// A soft band of light sweeping a surface every few seconds, like the shine loop on uiverse buttons.
function Shine({ color, delay = 0, pause = 2600, sweep = 1100 }: { color: string; delay?: number; pause?: number; sweep?: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced || !width) return;
    t.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: sweep, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System }),
            withDelay(pause, withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System })),
          ),
          -1,
        ),
      ),
    );
    return () => cancelAnimation(t);
  }, [t, width, delay, pause, sweep, reduced]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -90 + t.value * (width + 180) }, { rotate: "14deg" }] }));
  if (reduced) return null;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Animated.View style={[{ position: "absolute", top: -80, bottom: -80, width: 80 }, a]}>
        <LinearGradient colors={["transparent", color, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

// Entrance reveal driven by useEffect instead of `entering`: Reanimated entering animations can get
// stuck at opacity 0 for ScrollView children inside an iOS formSheet (they mount before the sheet's
// animation host is ready). Shared values + withTiming always run.
function Reveal({ children, delay = 0, duration = 340, style }: { children: ReactNode; delay?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    p.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System })));
  }, [p, delay, duration, reduced]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 14 }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Slow sway for decorative leaves, like wind through the card.
function Sway({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true));
    return () => cancelAnimation(t);
  }, [t, reduced]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 7 - 3.5}deg` }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

function StatTile({ icon, label, value, unit, index }: { icon: IconName; label: string; value: string; unit?: string; index: number }) {
  const { C } = useTheme();
  return (
    <Reveal delay={190 + index * 40} duration={320} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: C.card, borderRadius: R.md, borderCurve: "continuous", padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.mint2, alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={14} color={C.forestInk} />
          </View>
          <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.medium, fontSize: 11.5, lineHeight: 14, color: C.ink2 }}>
            {label}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
          <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.medium, fontSize: 22, letterSpacing: -0.8, fontVariant: ["tabular-nums"], color: C.ink }}>
            {value}
          </Text>
          {!!unit && (
            <Text numberOfLines={1} style={{ flexShrink: 0, fontFamily: F.regular, fontSize: 11, color: C.mute }}>
              {unit}
            </Text>
          )}
        </View>
      </View>
    </Reveal>
  );
}

export default function DropSheet() {
  const { C, T } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { drop, pulse } = usePulse();
  const comune = useApp((s) => s.comune);
  const { t, language } = useI18n();
  const place = comune?.name ?? pulse.place.name;
  const a = actionCopy(t, drop.action);
  const left = useCountdown();
  const bonus = useApp((s) => canClaimDrop(drop, s.posts, s.userId, hasBackend));
  const seeds = seedsFor({ action: drop.action, isDrop: bonus });
  const rows = readings(drop.data, t, language);
  const pairs: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += 2) pairs.push(rows.slice(i, i + 2));
  const foot = Math.max(bottom, 10);

  const go = (path: "/capture" | "/guide") => {
    router.back();
    setTimeout(() => router.push({ pathname: path, params: { action: drop.action } }), 250);
  };

  const steps = [
    { icon: "camera" as IconName, title: t("dropSheet.snap"), body: t("dropSheet.snapBody") },
    { icon: "video" as IconName, title: t("dropSheet.prove"), body: a.proofHint },
    { icon: "checkSeal" as IconName, title: t("dropSheet.friends"), body: t("dropSheet.friendsBody") },
  ];

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ padding: 20, paddingTop: 26, gap: 22, paddingBottom: 150 + foot }}
      >
        <Reveal
          duration={360}
          // Leaf-shaped, like the Drop card on the feed it opens from.
          style={{
            backgroundColor: C.forest,
            borderRadius: R.sm,
            borderTopLeftRadius: 36,
            borderBottomRightRadius: 36,
            borderCurve: "continuous",
            padding: 20,
            gap: 16,
            overflow: "hidden",
          }}
        >
          <Blobs colors={[C.leaf, C.lime]} opacity={0.22} />
          <View pointerEvents="none" style={{ position: "absolute", right: -18, bottom: -30, opacity: 0.14 }}>
            <Sway>
              <LeafMark size={150} color={C.lime} vein={C.forest} rotate={-12} />
            </Sway>
          </View>
          <Shine color={C.glass} delay={700} />

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <LiveDot color={C.lime} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.white }}>{t("dropSheet.title")}</Text>
              </View>
              <Mono color={C.forestMute}>{place}</Mono>
            </View>
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.glass, borderRadius: R.pill, paddingHorizontal: 11, height: 30 }}>
                <LiveDot color={C.lime} size={6} />
                <Text style={{ fontFamily: F.monoMedium, fontSize: 12, color: C.white, fontVariant: ["tabular-nums"] }}>{left}</Text>
              </View>
              <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.forestMute }}>{t("dropCard.leftToday")}</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={{ fontFamily: F.medium, fontSize: 34, lineHeight: 37, letterSpacing: -1.4, color: C.white }}>
            {drop.title}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.glass, borderRadius: R.pill, paddingHorizontal: 12, height: 34 }}>
              <Icon name={a.icon} size={15} color={C.lime} />
              <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 14, color: C.white }}>
                {a.label}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.lime, borderRadius: R.pill, paddingHorizontal: 11, height: 34 }}>
              <Icon name="seed" size={13} color={C.forest} />
              <Text style={{ fontFamily: F.monoMedium, fontSize: 12, color: C.forest }}>{t("dropSheet.reward", { n: seeds })}</Text>
            </View>
            <SdgTags goals={a.sdgs} dark />
          </View>
        </Reveal>

        <Reveal
          delay={90}
          style={{ backgroundColor: C.mint, borderRadius: R.lg, borderCurve: "continuous", padding: 18, gap: 10 }}
        >
          <Mono color={C.forestInk}>{t("dropSheet.why")}</Mono>
          <Text style={{ fontFamily: F.regular, fontSize: 16, lineHeight: 23, color: C.ink }}>{drop.why}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 2 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{drop.metric}</Text>
            {drop.sources.map((s) => (
              <SourceBadge key={s} id={s} onPress={() => router.push("/sources")} />
            ))}
          </View>
        </Reveal>

        {rows.length > 0 && (
          <View style={{ gap: 10 }}>
            <Reveal delay={150}>
              <Mono>{t("dropSheet.readings.title", { place })}</Mono>
            </Reveal>
            {pairs.map((pair, ri) => (
              <View key={ri} style={{ flexDirection: "row", gap: 10 }}>
                {pair.map((r, ci) => (
                  <StatTile key={r.key} icon={r.icon} label={r.label} value={r.value} unit={r.unit} index={ri * 2 + ci} />
                ))}
                {pair.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}
          </View>
        )}

        <Reveal
          delay={300}
          style={{ backgroundColor: C.card, borderRadius: R.lg, borderCurve: "continuous", padding: 18, gap: 12 }}
        >
          <Mono>{t("dropSheet.how")}</Mono>
          <View>
            <View pointerEvents="none" style={{ position: "absolute", left: 15, top: 25, bottom: 25, width: 2, borderRadius: 1, backgroundColor: C.band }} />
            {steps.map((s, i) => (
              <Reveal
                key={i}
                delay={340 + i * 70}
                duration={320}
                style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 9 }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.leaf, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.monoMedium, fontSize: 11, color: C.onLeaf }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 2, paddingTop: 1 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.3, color: C.ink }}>{s.title}</Text>
                  <Text style={[T.callout, { fontSize: 13, lineHeight: 18 }]}>{s.body}</Text>
                </View>
                <Icon name={s.icon} size={17} color={C.leaf} />
              </Reveal>
            ))}
          </View>
        </Reveal>

        <Reveal
          delay={380}
          duration={320}
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: "flex-start",
            backgroundColor: C.card,
            borderRadius: R.md,
            borderCurve: "continuous",
            padding: 14,
            borderLeftWidth: 3,
            borderLeftColor: drop.offline ? C.amber : C.leaf,
          }}
        >
          <Icon name="info" size={14} color={C.mute} />
          <Text style={[T.caption, { flex: 1 }]}>
            {drop.offline ? t("dropSheet.noteOffline", { place }) : drop.shared ? t("dropSheet.noteShared", { place }) : t("dropSheet.noteLocal", { place })}
          </Text>
        </Reveal>
      </ScrollView>

      <Reveal
        delay={420}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: foot,
          gap: 8,
          backgroundColor: C.veil,
          borderTopWidth: 1,
          borderTopColor: C.line,
        }}
      >
        <View style={{ borderRadius: R.pill, overflow: "hidden" }}>
          <Button label={t("dropSheet.doIt", { act: a.label })} kind="green" icon={a.icon} trailing={`+${seeds}`} onPress={() => go("/capture")} />
          <Shine color={C.ring} delay={1300} pause={2200} sweep={900} />
        </View>
        <Button label={t("dropSheet.show")} kind="ghost" icon="book" size="md" onPress={() => go("/guide")} />
      </Reveal>
    </View>
  );
}
