import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";

import { LeafMark } from "@/components/nature";
import { useTheme } from "@/theme/use-theme";

const AGradient = Animated.createAnimatedComponent(LinearGradient);

const LEAVES = [
  { left: "8%", top: "18%", size: 18, rotate: -30 },
  { left: "79%", top: "14%", size: 14, rotate: 38 },
  { left: "88%", top: "42%", size: 21, rotate: 70 },
  { left: "15%", top: "62%", size: 13, rotate: 18 },
  { left: "69%", top: "74%", size: 17, rotate: -55 },
  { left: "42%", top: "34%", size: 11, rotate: 115 },
];

function FloatingLeaf({ leaf, reducedMotion }: { leaf: (typeof LEAVES)[number]; reducedMotion: boolean }) {
  const { C } = useTheme();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    drift.set(withRepeat(withTiming(1, { duration: 9000 + (leaf.size % 4) * 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drift, leaf.size, reducedMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : drift.value * 7 - 3 }, { rotate: `${leaf.rotate + (reducedMotion ? 0 : drift.value * 12 - 6)}deg` }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: leaf.left, top: leaf.top, opacity: 0.35 }, style]}>
      <LeafMark size={leaf.size} color={C.leaf} vein="transparent" />
    </Animated.View>
  );
}

export function Aurora({ progress }: { progress: SharedValue<number> }) {
  const { C } = useTheme();
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    drift.value = withRepeat(withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [drift, reducedMotion]);
  const blob = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * 24 }, { translateY: drift.value * 12 }, { scale: 1 + drift.value * 0.05 }],
  }));
  const second = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * 14 }, { translateY: -drift.value * 10 }, { rotate: `${drift.value * 8 - 4}deg` }],
  }));
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.34 } as never}>
      <AGradient colors={[C.mint, C.bg, C.lime]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ position: "absolute", width: "110%", height: "52%", top: -50, left: "-5%", borderRadius: 260 }, blob]} />
      <AGradient colors={[C.bg, C.mint2, C.bg]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[{ position: "absolute", width: "90%", height: "48%", bottom: -40, left: "12%", borderRadius: 260 }, second]} />
      {!reducedMotion && LEAVES.map((leaf) => <FloatingLeaf key={`${leaf.left}-${leaf.top}`} leaf={leaf} reducedMotion={!!reducedMotion} />)}
    </View>
  );
}
