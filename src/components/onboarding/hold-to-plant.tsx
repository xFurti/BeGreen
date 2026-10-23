import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, runOnJS } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { LeafBurst, Sprout } from "@/components/nature";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

const ACircle = Animated.createAnimatedComponent(Circle);

export function HoldToPlant({
  canStart,
  busy,
  accessibilityLabel,
  holdLabel,
  busyLabel,
  onComplete,
}: {
  canStart: boolean;
  busy: boolean;
  accessibilityLabel?: string;
  holdLabel: string;
  busyLabel: string;
  onComplete: () => void;
}) {
  const { C } = useTheme();
  const reducedMotion = useReducedMotion();
  const [screenReader, setScreenReader] = useState(false);
  const [burst, setBurst] = useState(0);
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);
  const completed = useRef(false);
  const size = 44;
  const radius = 18;
  const length = 2 * Math.PI * radius;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReader(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!busy || reducedMotion) {
      pulse.set(1);
      return;
    }
    pulse.set(withRepeat(withSequence(withTiming(0.72, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true));
  }, [busy, pulse, reducedMotion]);

  const complete = () => {
    if (!canStart || busy || completed.current) return;
    completed.current = true;
    progress.set(1);
    haptic.success();
    if (!reducedMotion) setBurst((id) => id + 1);
    onComplete();
  };
  const begin = () => {
    if (!canStart || busy) return;
    if (screenReader) {
      complete();
      return;
    }
    completed.current = false;
    haptic.tap();
    progress.set(withTiming(1, { duration: 1100 }, (done) => {
      if (done) runOnJS(complete)();
    }));
  };
  const cancel = () => {
    if (screenReader || completed.current || busy) return;
    progress.set(withTiming(0, { duration: 180 }));
  };
  const ring = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: 0.62 + progress.value * 0.38 }], opacity: pulse.value }));
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={screenReader ? undefined : holdLabel}
        disabled={!canStart || busy}
        onPress={screenReader ? complete : undefined}
        onPressIn={begin}
        onPressOut={cancel}
        style={{
          height: 64,
          borderRadius: R.pill,
          backgroundColor: C.forest,
          opacity: canStart && !busy ? 1 : 0.45,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          paddingHorizontal: 16,
          overflow: "hidden",
        }}
      >
        {!busy && (
          <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.forestLine} strokeWidth={3} fill="none" />
              <ACircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={C.lime}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${length} ${length}`}
                fill="none"
                animatedProps={ring}
              />
            </Svg>
            <Animated.View style={grow}>
              <Sprout size={busy ? 20 : 22} color={C.lime} stem={C.lime} />
            </Animated.View>
          </View>
        )}
        {busy && (
          <Animated.View style={grow}>
            <Sprout size={20} color={C.lime} stem={C.lime} />
          </Animated.View>
        )}
        <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.white }}>{busy ? busyLabel : holdLabel}</Text>
      </Pressable>
      {burst > 0 && <LeafBurst id={burst} />}
    </View>
  );
}
