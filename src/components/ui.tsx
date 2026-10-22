import { Image } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";

import { Icon, type IconName } from "@/components/icon";
import { LeafMark } from "@/components/nature";
import { SOURCE_KINDS, SOURCES, type SourceId } from "@/data/sources";
import type { Media } from "@/data/types";
import { C, F, R, shadow, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

// ---------- Wordmark ----------

// "Be" in ink, "Green" in green, with a leaf growing from the n. On dark, Green turns lime;
// any other ink colour (a muted footer) keeps the wordmark in one colour.
export function Logo({ size = 28, color = C.ink, dark }: { size?: number; color?: string; dark?: boolean }) {
  const green = dark ? C.lime : color === C.ink ? C.leaf : color;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="BeGreen" style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <Text style={{ fontFamily: F.medium, fontSize: size, lineHeight: size * 1.1, letterSpacing: -size * 0.06, color }}>
        Be<Text style={{ color: green }}>Green</Text>
      </Text>
      <View style={{ marginLeft: size * 0.02, marginTop: -size * 0.06 }}>
        <LeafMark size={size * 0.42} color={green} vein={dark ? C.forest : C.white} rotate={8} />
      </View>
    </View>
  );
}

// ---------- Text helpers ----------

// Small monospaced metadata: "SDG 13", "CITTÀ STUDI · 4M", "PROOF 0:05".
export function Mono({ children, color = C.mute, size = 11, style }: { children: ReactNode; color?: string; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text numberOfLines={1} style={[T.label, { color, fontSize: size }, style]}>
      {children}
    </Text>
  );
}

// ---------- Press feedback ----------

export function Press({
  children,
  onPress,
  onLongPress,
  style,
  scale = 0.97,
  disabled,
  hapticOn = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  disabled?: boolean;
  hapticOn?: boolean;
  accessibilityLabel?: string;
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  // How the button sits in its parent (flex, alignSelf, margins) belongs on the Pressable, or `flex: 1` does nothing.
  const { flex, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, ...inner } =
    StyleSheet.flatten(style) ?? {};
  const outer = { flex, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical };
  return (
    <Pressable
      style={outer}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => s.set(withSpring(scale, { damping: 22, stiffness: 420 }))}
      onPressOut={() => s.set(withSpring(1, { damping: 15, stiffness: 300 }))}
      onLongPress={onLongPress}
      onPress={() => {
        if (hapticOn) haptic.tap();
        onPress?.();
      }}
    >
      <Animated.View style={[inner, a, disabled && { opacity: 0.35 }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- Buttons ----------

type BtnKind = "primary" | "green" | "secondary" | "ghost" | "inverse" | "glass";

export function Button({
  label,
  onPress,
  kind = "primary",
  icon,
  trailing,
  loading,
  disabled,
  size = "lg",
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  trailing?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: "lg" | "md" | "sm";
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: C.ink, green: C.forest, secondary: C.mint, ghost: "transparent", inverse: C.white, glass: "rgba(255,255,255,0.12)" }[kind];
  const fg = { primary: C.white, green: C.white, secondary: C.forest, ghost: C.ink, inverse: C.ink, glass: C.white }[kind];
  const h = { lg: 56, md: 46, sm: 34 }[size];
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      style={[
        {
          height: h,
          paddingHorizontal: size === "sm" ? 14 : 22,
          borderRadius: R.pill,
          borderCurve: "continuous",
          backgroundColor: bg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderWidth: kind === "ghost" ? 1 : 0,
          borderColor: C.line,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === "sm" ? 14 : 17} color={kind === "green" ? C.lime : fg} />}
          <Text style={{ color: fg, fontFamily: F.medium, fontSize: size === "sm" ? 14 : 16, letterSpacing: -0.2 }}>{label}</Text>
          {trailing && (
            <Text style={{ color: fg, opacity: 0.55, fontFamily: F.monoMedium, fontSize: size === "sm" ? 12 : 13 }}>{trailing}</Text>
          )}
        </>
      )}
    </Press>
  );
}

export function IconButton({
  icon,
  onPress,
  bg = C.mint,
  color = C.forest,
  size = 40,
  label,
}: {
  icon: IconName;
  onPress?: () => void;
  bg?: string;
  color?: string;
  size?: number;
  label: string;
}) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={icon} size={size * 0.42} color={color} />
    </Press>
  );
}

// ---------- Avatar ----------

// `invert` for monograms sitting on black.
export function Avatar({ src, name, size = 36, ring, invert }: { src?: Media; name: string; size?: number; ring?: string; invert?: boolean }) {
  const inner = src ? (
    <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={150} />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: invert ? C.lime : C.forest,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: F.medium, fontSize: size * 0.42, letterSpacing: -size * 0.02, color: invert ? C.forest : C.white }}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
  if (!ring) return inner;
  return <View style={{ padding: 2, borderRadius: size, backgroundColor: ring }}>{inner}</View>;
}

export function AvatarStack({ people, size = 24, ring = C.bg }: { people: { avatar?: Media; name: string }[]; size?: number; ring?: string }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {people.map((p, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}>
          <Avatar src={p.avatar} name={p.name} size={size} ring={ring} />
        </View>
      ))}
    </View>
  );
}

// ---------- Chips & tags ----------

export function Chip({
  label,
  icon,
  active,
  onPress,
  dark,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress?: () => void;
  dark?: boolean;
}) {
  const bg = active ? (dark ? C.lime : C.forest) : dark ? C.night2 : C.card;
  const fg = active ? (dark ? C.ink : C.white) : dark ? C.white : C.ink;
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 13,
        height: 34,
        borderRadius: R.pill,
        backgroundColor: bg,
      }}
    >
      {icon && <Icon name={icon} size={14} color={fg} />}
      <Text style={{ color: fg, fontFamily: F.medium, fontSize: 14, letterSpacing: -0.15 }}>{label}</Text>
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} accessibilityLabel={label}>
      {body}
    </Press>
  ) : (
    body
  );
}

// Outlined mono tag: "DROP", "SDG 13".
export function Tag({ label, dark, solid }: { label: string; dark?: boolean; solid?: boolean }) {
  const fg = solid ? (dark ? C.ink : C.white) : dark ? C.white : C.forest;
  return (
    <View
      style={{
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 5,
        borderWidth: solid ? 0 : 1,
        borderColor: dark ? "rgba(255,255,255,0.28)" : C.mint2,
        backgroundColor: solid ? (dark ? C.lime : C.forest) : "transparent",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: F.monoMedium, fontSize: 10, letterSpacing: 0.4, color: fg }}>{label}</Text>
    </View>
  );
}

export function SdgTags({ goals, dark }: { goals: number[]; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {goals.map((g) => (
        <Tag key={g} label={`SDG ${g}`} dark={dark} />
      ))}
    </View>
  );
}

export function SourceBadge({ id, onPress, dark }: { id: SourceId; onPress?: () => void; dark?: boolean }) {
  const src = SOURCES[id];
  const k = SOURCE_KINDS[src.kind];
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 22 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: k.color }} />
      <Text style={{ fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.4, color: dark ? C.nightMute : C.mute }}>
        {k.short.toUpperCase()} · {src.provider.split(" ")[0].replace(/[()]/g, "").toUpperCase()}
      </Text>
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} accessibilityLabel={`Source: ${src.name}`}>
      {body}
    </Press>
  ) : (
    body
  );
}

// ---------- Segmented ----------

export function Segmented<V extends string>({
  value,
  options,
  onChange,
  dark,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  dark?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: dark ? C.night2 : C.card, borderRadius: R.pill, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptic.tap();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              height: 34,
              borderRadius: R.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? (dark ? C.white : C.bg) : "transparent",
              boxShadow: on && !dark ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)" : undefined,
            }}
          >
            <Text style={{ fontFamily: F.medium, fontSize: 14, letterSpacing: -0.15, color: on ? C.ink : dark ? C.nightMute : C.mute }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Big editorial text tabs: Friends  Squads  Nearby
export function TextTabs<V extends string>({
  value,
  options,
  onChange,
}: {
  value: V;
  options: { value: V; label: string; count?: number }[];
  onChange: (v: V) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-end" }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            hitSlop={8}
            onPress={() => {
              if (on) return;
              haptic.tap();
              onChange(o.value);
            }}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 3 }}
          >
            <Text style={{ fontFamily: F.medium, fontSize: 22, letterSpacing: -0.8, color: on ? C.ink : C.faint }}>{o.label}</Text>
            {o.count !== undefined && (
              <Text style={{ fontFamily: F.monoMedium, fontSize: 10, color: on ? C.ink : C.faint, marginTop: 2 }}>{o.count}</Text>
            )}
            {on && <LeafMark size={10} color={C.leaf} vein="transparent" />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Layout bits ----------

// Keeps scrolling content from running under the status bar on header-less screens.
export function TopCover() {
  const { top } = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: top, backgroundColor: "rgba(255,255,255,0.96)" }}
    />
  );
}

export function SectionHeader({
  title,
  index,
  action,
  onAction,
}: {
  title: string;
  index?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
      {index && <Mono color={C.leaf}>{index}</Mono>}
      <Text style={[T.title, { flex: 1 }]}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} disabled={!onAction} hitSlop={10} accessibilityRole="button">
          <Mono color={onAction ? C.ink : C.mute}>{action}</Mono>
        </Pressable>
      )}
    </View>
  );
}

export function Hairline({ dark, style }: { dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: dark ? C.nightLine : C.line }, style]} />;
}

export function Bar({
  value,
  color = C.leaf,
  track = C.mint2,
  height = 4,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(Math.max(0.02, Math.min(1, value)), { duration: 900 }));
  }, [value, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: height, backgroundColor: color }, a]} />
    </View>
  );
}

export function Card({
  children,
  style,
  tone = "card",
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "card" | "white" | "ink" | "mint" | "forest";
}) {
  const bg = { card: C.card, white: C.white, ink: C.ink, mint: C.mint, forest: C.forest }[tone];
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: R.lg, borderCurve: "continuous", padding: 18, gap: 12 },
        tone === "white" && { borderWidth: 1, borderColor: C.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function LiveDot({ color = C.leaf, size = 7 }: { color?: string; size?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(0.2, { duration: 800 }), withTiming(1, { duration: 800 })), -1));
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, s]} />;
}

// Counts up to a number: used for Seeds and celebrations.
export function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(target * eased));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, ms]);
  return n;
}

// ---------- Toast ----------

type ToastMsg = { id: number; text: string; icon?: IconName };
const useToast = create<{ msg: ToastMsg | null }>(() => ({ msg: null }));
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, icon?: IconName) {
  clearTimeout(toastTimer);
  useToast.setState({ msg: { id: Date.now(), text, icon } });
  toastTimer = setTimeout(() => useToast.setState({ msg: null }), 2400);
}

export function Toaster() {
  const msg = useToast((s) => s.msg);
  const { top } = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <Animated.View
      key={msg.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={{ position: "absolute", top: top + 8, left: 0, right: 0, alignItems: "center" }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: C.forest,
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 44,
          borderRadius: 22,
          boxShadow: shadow.lift,
          maxWidth: "90%",
        }}
      >
        {msg.icon && <Icon name={msg.icon} size={15} color={C.lime} />}
        <Text numberOfLines={2} style={{ flexShrink: 1, color: C.white, fontFamily: F.medium, fontSize: 14, lineHeight: 19, letterSpacing: -0.1 }}>
          {msg.text}
        </Text>
      </View>
    </Animated.View>
  );
}
