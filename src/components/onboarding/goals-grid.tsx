import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { LeafBurst, Sprout } from "@/components/nature";
import { SDG_LIST } from "@/data/sdgs";
import { useI18n } from "@/i18n/use-i18n";
import { C, F } from "@/theme/tokens";
import { haptic } from "@/utils/format";

function GoalCell({ goal, size, selected, onPress }: { goal: number; size: number; selected: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    progress.value = reducedMotion ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, { damping: 14, stiffness: 240 });
  }, [progress, reducedMotion, selected]);
  const fill = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.6 + progress.value * 0.4 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("onboarding.goalLabel", { n: goal })}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.mint, overflow: "hidden" }}
    >
      <Text style={{ position: "absolute", top: 8, left: 9, fontFamily: F.medium, fontSize: 18, letterSpacing: -0.6, color: C.forestMute }}>{goal}</Text>
      <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: C.leaf, borderRadius: 12 } as never, fill]}>
        <Text style={{ position: "absolute", top: 8, left: 9, fontFamily: F.medium, fontSize: 18, letterSpacing: -0.6, color: C.white }}>{goal}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function GoalsGrid({ active, width }: { active: boolean; width: number }) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const size = Math.floor((width - 5 * 6) / 6);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const previousCount = useRef(0);
  const select = (goal: number) => {
    if (!active) return;
    setSelected((current) => (current.has(goal) ? current : new Set(current).add(goal)));
  };
  useEffect(() => {
    if (selected.size > previousCount.current) haptic.tap();
    if (selected.size === 17 && previousCount.current < 17) haptic.success();
    previousCount.current = selected.size;
  }, [selected.size]);
  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((event) => {
      const column = Math.floor(event.x / (size + 6));
      const row = Math.floor(event.y / (size + 6));
      const xInCell = event.x - column * (size + 6);
      const yInCell = event.y - row * (size + 6);
      if (column < 0 || column > 5 || row < 0 || xInCell > size || yInCell > size) return;
      const goal = row * 6 + column + 1;
      if (goal >= 1 && goal <= 17) runOnJS(select)(goal);
    });
  const count = selected.size;
  return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          accessibilityRole="text"
          accessibilityLabel={t("onboarding.goalsCount", { n: count })}
          accessibilityValue={{ min: 0, max: 17, now: count }}
          style={{ flex: 1 }}
        >
          <Text style={{ fontFamily: F.monoMedium, fontSize: 13, color: C.forest }}>{count}/17</Text>
        </View>
        <Sprout size={28 + (count / 17) * 28} />
      </View>
      <View style={{ position: "relative" }}>
        <GestureDetector gesture={pan}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {SDG_LIST.map((goal) => (
              <GoalCell key={goal} goal={goal} size={size} selected={selected.has(goal)} onPress={() => select(goal)} />
            ))}
            <View style={{ width: size, height: size, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.medium, fontSize: 13, letterSpacing: -0.4 }}>{t("onboarding.goalsYear")}</Text>
            </View>
          </View>
        </GestureDetector>
        {selected.size === 17 && !reducedMotion && <LeafBurst id={17} />}
      </View>
    </View>
  );
}
