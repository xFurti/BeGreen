import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import type { BinId } from "@/data/guide";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

const Motion = createContext(false);
export const useGuideReducedMotion = () => useContext(Motion);

export function GuideMotion({ children }: { children: ReactNode }) {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => undefined);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return <Motion.Provider value={reduced}>{children}</Motion.Provider>;
}

// Time-based feedback only. Shared Button/Press uses a spring, so guide controls
// deliberately use Pressable instead of changing feedback across the whole app.
export function GuideButton({ label, icon, onPress, secondary = false, disabled = false }: {
  label: string; icon?: IconName; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  const { C } = useTheme();
  const color = secondary ? C.ink : C.onLeaf;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => ({ minHeight: 50, padding: 14, borderRadius: R.md, backgroundColor: secondary ? C.card : C.leaf, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 })}>
      {icon && <Icon name={icon} color={color} size={18} />}
      <Text style={{ fontFamily: F.medium, fontSize: 15, color, flexShrink: 1, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

export function GuideReveal({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useGuideReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: reduced ? 0 : 200, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
    return () => cancelAnimation(progress);
  }, [progress, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: reduced ? 1 : progress.value, transform: [{ translateX: reduced ? 0 : (1 - progress.value) * 6 }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

const MATERIAL_ICONS = { plastic: "bottle-soda-outline", paper: "newspaper-variant-outline", glass: "bottle-wine-outline", organic: "food-apple-outline", residual: "trash-can-outline", special: "battery-outline" } as const;

export function GuideMaterialIcon({ bin, size = 28, color }: { bin: BinId; size?: number; color: string }) {
  return <MaterialCommunityIcons name={MATERIAL_ICONS[bin]} size={size} color={color} />;
}

export function GuideIcon({ name = "leaf", material, selected, color, size = 28 }: { name?: IconName; material?: BinId; selected: boolean; color: string; size?: number }) {
  const reduced = useGuideReducedMotion();
  const angle = useSharedValue(0);
  const wasSelected = useRef(selected);
  useEffect(() => {
    if (reduced || !selected) angle.set(0);
    else if (!wasSelected.current) {
      angle.set(withSequence(
        withTiming(-8, { duration: 140, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
      ));
    }
    wasSelected.current = selected;
    return () => cancelAnimation(angle);
  }, [angle, reduced, selected]);
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${reduced ? 0 : angle.value}deg` }, { translateY: reduced ? 0 : angle.value / 4 }] }));
  return <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={animated}>{material ? <GuideMaterialIcon bin={material} size={size} color={color} /> : <Icon name={name} size={size} color={color} />}</Animated.View>;
}

export function GuideProgress({ filled }: { filled: boolean }) {
  const { C } = useTheme();
  const reduced = useGuideReducedMotion();
  const width = useSharedValue(filled ? 1 : 0);
  useEffect(() => { width.set(withTiming(filled ? 1 : 0, { duration: reduced ? 0 : 220, reduceMotion: ReduceMotion.System })); }, [filled, reduced, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` as `${number}%` }));
  return <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: C.card2, overflow: "hidden" }}><Animated.View style={[{ height: 4, backgroundColor: C.leaf }, animated]} /></View>;
}
