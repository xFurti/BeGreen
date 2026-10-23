import { useEffect, useState } from "react";
import { Text } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { C, F, R } from "@/theme/tokens";

export function RotatingWord({ words, active }: { words: string[]; active: boolean }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!active || reducedMotion || words.length < 2) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      opacity.value = withSequence(withTiming(0, { duration: 130 }), withTiming(1, { duration: 220 }));
      swap = setTimeout(() => setIndex((current) => (current + 1) % words.length), 130);
    }, 1800);
    return () => {
      clearInterval(timer);
      if (swap) clearTimeout(swap);
    };
  }, [active, opacity, reducedMotion, words.length]);
  const fade = useAnimatedStyle(() => ({ opacity: reducedMotion ? 1 : opacity.value }));
  return (
    <Animated.View style={[{ backgroundColor: C.mint, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 }, fade]}>
      <Text style={{ fontFamily: F.monoMedium, fontSize: 11, color: C.forest, textTransform: "uppercase" }}>{words[index]}</Text>
    </Animated.View>
  );
}
