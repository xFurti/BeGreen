import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { Segmented, SourceBadge, useCountUp } from "@/components/ui";
import { SOURCE_KINDS, type SourceId } from "@/data/sources";
import type { MessageKey } from "@/i18n/catalog";
import { sourceKindCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { C, F, R } from "@/theme/tokens";
import { haptic } from "@/utils/format";

type Lens = "me" | "class" | "comune";
type RowId = "air" | "species" | "dryDays" | "park";

const ROWS: { id: RowId; value: number; source: SourceId; kind: "model" | "citizen" | "map" }[] = [
  { id: "air", value: 24, source: "cams", kind: "model" },
  { id: "species", value: 287, source: "inat", kind: "citizen" },
  { id: "dryDays", value: 6, source: "openmeteo", kind: "model" },
  { id: "park", value: 9, source: "osm", kind: "map" },
];

function FlipRow({
  id,
  value,
  source,
  kind,
  label,
  unit,
  explanation,
  active,
}: {
  id: RowId;
  value: number;
  source: SourceId;
  kind: "model" | "citizen" | "map";
  label: string;
  unit: string;
  explanation: string;
  active: boolean;
}) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);
  const count = useCountUp(active ? value : 0);
  const front = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 - rotation.value : 1,
    transform: reducedMotion ? [] : [{ perspective: 800 }, { rotateY: `${rotation.value * 180}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: reducedMotion ? rotation.value : 1,
    transform: reducedMotion ? [] : [{ perspective: 800 }, { rotateY: `${180 + rotation.value * 180}deg` }],
  }));
  const toggle = () => {
    if (!active) return;
    haptic.tap();
    setFlipped((current) => !current);
    rotation.set(withTiming(flipped ? 0 : 1, { duration: reducedMotion ? 180 : 420 }));
  };
  const faceLabel = flipped ? explanation : `${label} ${value} ${unit}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={faceLabel}
      accessibilityHint={t("onboarding.city.flipHint")}
      onPress={toggle}
      style={{ height: 82, borderTopWidth: 1, borderTopColor: C.line }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, backfaceVisibility: "hidden" }, front]}>
        <Text style={{ width: 20, fontFamily: F.monoMedium, fontSize: 11, color: C.mute }}>{String(ROWS.findIndex((row) => row.id === id) + 1).padStart(2, "0")}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.ink }}>{label}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SOURCE_KINDS[kind].color }} />
            <Text style={{ fontFamily: F.monoMedium, fontSize: 10, color: C.mute }}>{sourceKindCopy(t, kind).short}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: F.medium, fontSize: 38, letterSpacing: -2, fontVariant: ["tabular-nums"], color: C.ink }}>{reducedMotion ? value : count}</Text>
        <Text style={{ width: 78, fontFamily: F.regular, fontSize: 13, color: C.mute }}>{unit}</Text>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { padding: 14, justifyContent: "center", backgroundColor: C.mint, borderRadius: R.sm, gap: 3, backfaceVisibility: "hidden" }, back]}>
        <Text numberOfLines={3} maxFontSizeMultiplier={1.2} style={{ fontFamily: F.medium, fontSize: 14, color: C.forest }}>{explanation}</Text>
        <SourceBadge id={source} />
      </Animated.View>
    </Pressable>
  );
}

export function CityFlip({ active }: { active: boolean }) {
  const { t } = useI18n();
  const [lens, setLens] = useState<Lens>("me");
  const labels: Record<RowId, string> = {
    air: t("onboarding.air"),
    species: t("onboarding.species"),
    dryDays: t("onboarding.dryDays"),
    park: "Parco Nord",
  };
  const units: Record<RowId, string> = {
    air: t("onboarding.fair"),
    species: t("onboarding.days30"),
    dryDays: t("onboarding.inARow"),
    park: "km",
  };
  return (
    <View style={{ paddingTop: 4, gap: 10 }}>
      <Segmented
        value={lens}
        onChange={setLens}
        options={[
          { value: "me", label: t("common.me") },
          { value: "class", label: t("common.myClass") },
          { value: "comune", label: t("common.comune") },
        ]}
      />
      <View>
        {ROWS.map((row) => (
          <FlipRow
            key={row.id}
            {...row}
            label={labels[row.id]}
            unit={units[row.id]}
            explanation={t(`onboarding.city.${row.id}.${lens}` as MessageKey)}
            active={active}
          />
        ))}
      </View>
    </View>
  );
}
