import { useEffect } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// Nature motifs: a leaf, a sprout, slow organic blobs and a scatter of leaves.
// They decorate, never carry information, so they stay hidden from screen readers.

const LEAF = "M21 3C11 3 4 8.5 4 15.5c0 1.9.5 3.5 1.2 4.6 1.2.8 2.7 1.1 4.3 1.1C16.5 21.2 21 13.4 21 3Z";
const VEIN = "M5.2 20.1C8.8 15.2 12.6 11 17 7";

// The vein defaults to the page colour, as if cut through the leaf.
export function LeafMark({ size = 18, color, vein, rotate = 0 }: { size?: number; color?: string; vein?: string; rotate?: number }) {
  const { C } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}>
      <Path d={LEAF} fill={color ?? C.leaf} />
      <Path d={VEIN} stroke={vein ?? C.bg} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// Two leaves on a stem: empty states and the "grow" moments.
export function Sprout({ size = 48, color, stem: stemColor }: { size?: number; color?: string; stem?: string }) {
  const { C } = useTheme();
  const stem = stemColor ?? C.forestInk;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 44V22" stroke={stem} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M24 26C24 16 17 10 6 10c0 10 7 16 18 16Z" fill={color ?? C.leaf} />
      <Path d="M24 22c0-9 6-15 18-15 0 9-6 15-18 15Z" fill={stem} />
      <Path d="M14 44h20" stroke={stem} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

// Slowly breathing organic shapes, like light through leaves. Place inside a view with overflow hidden.
const BLOBS = [
  "M60 8c26-6 52 10 56 36s-12 52-40 58S10 92 6 64 34 14 60 8Z",
  "M52 4c30 2 58 26 54 56s-34 48-62 42S0 74 4 46 22 2 52 4Z",
];

function Blob({ d, color, size, x, y, duration, flip }: { d: string; color: string; size: number; x: number | `${number}%`; y: number | `${number}%`; duration: number; flip?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, duration]);
  const a = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(flip ? -1 : 1) * t.value * 24}deg` }, { scale: 1 + t.value * 0.08 }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, width: size, height: size }, a]}>
      <Svg width={size} height={size} viewBox="0 0 120 110">
        <Path d={d} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export function Blobs({ colors, opacity = 0.35, size = 220 }: { colors?: [string, string]; opacity?: number; size?: number }) {
  const { C } = useTheme();
  const [a, b] = colors ?? [C.leaf, C.lime];
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", inset: 0, opacity } as never}>
      <Blob d={BLOBS[0]} color={a} size={size} x="58%" y={-size * 0.45} duration={9000} />
      <Blob d={BLOBS[1]} color={b} size={size * 0.7} x={-size * 0.3} y="62%" duration={11000} flip />
    </View>
  );
}

// A loose drift of leaves for card corners and empty space.
const SCATTER = [
  { x: 0, y: 6, s: 22, r: -20, o: 1 },
  { x: 26, y: 0, s: 14, r: 35, o: 0.7 },
  { x: 18, y: 28, s: 12, r: 120, o: 0.5 },
];

export function LeafScatter({ color, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: 44, height: 44 }, style]}>
      {SCATTER.map((l, i) => (
        <View key={i} style={{ position: "absolute", left: l.x, top: l.y, opacity: l.o }}>
          <LeafMark size={l.s} color={color} vein="transparent" rotate={l.r} />
        </View>
      ))}
    </View>
  );
}

// A leaf moving in a light breeze, pivoting on its stem.
export function SwayingLeaf({ size = 18, color, vein, rotate = 0 }: { size?: number; color?: string; vein?: string; rotate?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t]);
  // Rotate around the bottom-left stem rather than the centre.
  const a = useAnimatedStyle(() => ({
    transform: [
      { translateX: -size / 2 },
      { translateY: size / 2 },
      { rotate: `${rotate - 8 + t.value * 16}deg` },
      { translateX: size / 2 },
      { translateY: -size / 2 },
    ],
  }));
  return (
    <Animated.View style={a}>
      <LeafMark size={size} color={color} vein={vein} />
    </Animated.View>
  );
}

// A switch whose knob turns green and sprouts a leaf when on.
// Inspired by Creatlydev's leaf toggle on uiverse.io (white-vampirebat-27).
export function LeafSwitch({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  const { C } = useTheme();
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(value ? 1 : 0, { damping: 16, stiffness: 220 }));
  }, [value, t]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(t.value, [0, 1], [C.card2, C.mint2]) }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 22 }],
    backgroundColor: interpolateColor(t.value, [0, 1], [C.white, C.leaf]),
  }));
  const sprout = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 8 }, { scale: 0.4 + t.value * 0.6 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onValueChange(!value);
      }}
    >
      <Animated.View style={[{ width: 52, height: 30, borderRadius: 15, padding: 3 }, track]}>
        <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }, knob]}>
          <Animated.View style={[{ position: "absolute", top: -11, left: 5 }, sprout]}>
            <Svg width={14} height={12} viewBox="0 0 14 12">
              <Path d="M7 12C7 6 4 3 0 3c0 4 3 7 7 7Z" fill={C.leaf} />
              <Path d="M7 10c0-5 3-8 7-8 0 4-3 7-7 7Z" fill={C.forest} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// Leaves flying out from the centre: the verify moment.
// Inspired by Click Spark on reactbits.dev, with leaves instead of sparks.
function FlyingLeaf({ angle, delay, color }: { angle: number; delay: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [t, delay]);
  const a = useAnimatedStyle(() => {
    const r = 8 + t.value * 52;
    return {
      opacity: 1 - t.value * t.value,
      transform: [
        { translateX: Math.cos(angle) * r },
        { translateY: Math.sin(angle) * r + t.value * t.value * 18 },
        { rotate: `${(angle * 180) / Math.PI + t.value * 120}deg` },
        { scale: 0.7 + (1 - t.value) * 0.6 },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: -8, top: -8 }, a]}>
      <LeafMark size={16} color={color} vein="transparent" />
    </Animated.View>
  );
}

export function LeafBurst({ id, count = 9 }: { id: number; count?: number }) {
  const { C } = useTheme();
  const colors = [C.leaf, C.lime, C.forestInk];
  return (
    <View key={id} pointerEvents="none" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <FlyingLeaf key={i} angle={(i / count) * Math.PI * 2 - Math.PI / 2} delay={i * 18} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}
