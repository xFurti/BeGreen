import type { BottomTabBarProps } from "expo-router/js-tabs";
import { router, useFocusEffect, useNavigation, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { LeafMark } from "@/components/nature";
import { Press } from "@/components/ui";
import type { MessageKey } from "@/i18n/catalog";
import { useI18n } from "@/i18n/use-i18n";
import { postedToday, useMyPosts } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

const TABS: Record<string, { label: MessageKey; icon: IconName; on: IconName }> = {
  index: { label: "tabs.feed", icon: "home", on: "homeFill" },
  pulse: { label: "tabs.pulse", icon: "pulse", on: "pulseFill" },
  community: { label: "tabs.community", icon: "community", on: "communityFill" },
  me: { label: "tabs.me", icon: "me", on: "meFill" },
};

// Tapped, the plus turns away and a sprout grows in its place: stem first, then one leaf, then the other.
// Then the camera opens. Still when nobody touches it.
const STEM = "M12 21V12";
const LEFT = "M12 14.5C12 10 8.8 7.5 4.5 7.5c0 4.3 3 7 7.5 7Z";
const RIGHT = "M12 12.5c0-4 2.8-6.5 7.5-6.5 0 4-2.8 6.5-7.5 6.5Z";
const GROW_MS = 420;

function Part({ d, color, stroke, origin, style }: { d: string; color: string; stroke?: boolean; origin: string; style: object }) {
  return (
    <Animated.View style={[{ position: "absolute", width: 24, height: 24, transformOrigin: origin }, style]}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        {stroke ? <Path d={d} stroke={color} strokeWidth={2.4} strokeLinecap="round" /> : <Path d={d} fill={color} />}
      </Svg>
    </Animated.View>
  );
}

// The shutter. Looks like the camera it opens, in deep green with a lime ring.
function CaptureButton({ tabIndex }: { tabIndex: number }) {
  const done = postedToday(useMyPosts());
  const { C } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const navigation = useNavigation();
  const pathname = usePathname();
  const g = useSharedValue(0);
  const plus = useAnimatedStyle(() => ({
    opacity: interpolate(g.value, [0, 0.3], [1, 0], "clamp"),
    transform: [{ rotate: `${interpolate(g.value, [0, 0.3], [0, 90], "clamp")}deg` }, { scale: interpolate(g.value, [0, 0.3], [1, 0.4], "clamp") }],
  }));
  const stem = useAnimatedStyle(() => ({ transform: [{ scaleY: interpolate(g.value, [0.15, 0.5], [0, 1], "clamp") }] }));
  const left = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(g.value, [0.4, 0.65, 0.8], [0, 1.15, 1], "clamp") }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(g.value, [0.55, 0.85, 1], [0, 1.15, 1], "clamp") }] }));
  // One open in flight. Leaving the tabs, or switching tab, drops it before the camera can open.
  const pending = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tabIndexRef = useRef(tabIndex);
  const pathRef = useRef(pathname);
  const [held, setHeld] = useState(false);

  const drop = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current = [];
    if (!pending.current) return;
    pending.current = false;
    setHeld(false);
    g.set(0);
  }, [g]);

  useEffect(
    () => () => {
      for (const id of timers.current) clearTimeout(id);
      timers.current = [];
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      return () => drop();
    }, [drop]),
  );

  const seenTab = useRef(tabIndex);
  useEffect(() => {
    tabIndexRef.current = tabIndex;
    if (seenTab.current === tabIndex) return;
    seenTab.current = tabIndex;
    drop();
  }, [tabIndex, drop]);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    drop();
  }, [pathname, drop]);

  return (
    <Press
      scale={0.9}
      hapticOn={false}
      disabled={held}
      dimDisabled={false}
      accessibilityLabel={t("tabs.capture")}
      onPress={() => {
        if (pending.current) return;
        haptic.thud();
        if (reduced) return router.push("/capture");
        pending.current = true;
        setHeld(true);
        const startedOn = tabIndexRef.current;
        const startedPath = pathRef.current;
        g.set(withTiming(1, { duration: GROW_MS, easing: Easing.out(Easing.quad) }));
        timers.current.push(
          setTimeout(() => {
            if (!pending.current) return;
            const left = tabIndexRef.current !== startedOn || pathRef.current !== startedPath || !navigation.isFocused();
            if (left) {
              drop();
              return;
            }
            router.push("/capture");
            // Plus again once the camera covers the bar, if blur did not already reset it.
            timers.current.push(
              setTimeout(() => {
                pending.current = false;
                setHeld(false);
                g.set(0);
              }, 600),
            );
          }, GROW_MS),
        );
      }}
      style={{
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: C.forest,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -14,
        boxShadow: "0 6px 20px rgba(11,61,42,0.32)",
      }}
    >
      <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: C.lime, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={plus}>
          <Icon name="plus" size={20} color={C.white} />
        </Animated.View>
        <Part d={STEM} color={C.white} stroke origin="50% 87.5%" style={stem} />
        <Part d={LEFT} color={C.lime} origin="50% 60%" style={left} />
        <Part d={RIGHT} color={C.lime} origin="50% 52%" style={right} />
      </View>
      {!done && (
        <View
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.red,
            borderWidth: 2,
            borderColor: C.bg,
          }}
        />
      )}
    </Press>
  );
}

// Selected, the icon hops and the leaf by its label sprouts.
function TabItem({ label, icon, focused, onPress }: { label: string; icon: IconName; focused: boolean; onPress: () => void }) {
  const { C } = useTheme();
  const reduced = useReducedMotion();
  const on = useSharedValue(focused ? 1 : 0);
  const hop = useSharedValue(0);
  useEffect(() => {
    on.set(reduced ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, { damping: 12, stiffness: 180 }));
    if (focused && !reduced) hop.set(withSequence(withTiming(-4, { duration: 110 }), withSpring(0, { damping: 8, stiffness: 260 })));
  }, [focused, reduced, on, hop]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
  const leaf = useAnimatedStyle(() => ({
    width: interpolate(on.value, [0, 1], [0, 11], "clamp"),
    opacity: interpolate(on.value, [0, 0.4], [0, 1], "clamp"),
    transform: [{ scale: on.value }, { rotate: `${interpolate(on.value, [0, 1], [-50, 0])}deg` }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 10 }}
    >
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={22} color={focused ? C.forestInk : C.mute} />
      </Animated.View>
      <View style={{ flexDirection: "row", alignItems: "center", maxWidth: "100%" }}>
        <Animated.View style={[{ alignItems: "flex-start", transformOrigin: "0% 100%" }, leaf]}>
          <LeafMark size={8} color={C.leaf} vein="transparent" />
        </Animated.View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ flexShrink: 1, fontFamily: F.medium, fontSize: 11, letterSpacing: -0.1, color: focused ? C.forestInk : C.mute }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useI18n();
  const items = state.routes.map((route, i) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === i;
    return (
      <TabItem
        key={route.key}
        label={t(meta.label)}
        icon={focused ? meta.on : meta.icon}
        focused={focused}
        onPress={() => {
          const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) {
            haptic.tap();
            navigateToTab(route.key);
          }
        }}
      />
    );
  });

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: C.bar,
        borderTopWidth: 1,
        borderTopColor: C.line,
        paddingBottom: Math.max(bottom, 10),
        paddingHorizontal: 6,
      }}
    >
      {items.slice(0, 2)}
      <View style={{ width: 78, alignItems: "center" }}>
        <CaptureButton tabIndex={state.index} />
      </View>
      {items.slice(2)}
    </View>
  );
}
