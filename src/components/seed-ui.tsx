import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { LeafMark } from "@/components/nature";

import { SeedBuddy } from "@/components/seed-buddy";
import { Bar, Mono } from "@/components/ui";
import { growthOf, moodFromStreak, plantStage, SEED_IDS, seedOf, SEEDS, STAGE_IDS, type Mood, type SeedId } from "@/data/seeds";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { seedsOf, useApp, useMyPosts, type TipId } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// The pieces your seed speaks and grows with: speech bubbles, one-time hints, the growth card,
// the species picker and the hold-to-plant button.

// ---------- Speech bubble ----------

// Words arrive one by one, like the seed is saying them. Reduce Motion shows the text at once.
// Inspired by Split Text on reactbits.dev.
export function Bubble({ text, tone = "light", tail = "top", style }: { text: string; tone?: "light" | "dark"; tail?: "top" | "left" | "none"; style?: StyleProp<ViewStyle> }) {
  const { C } = useTheme();
  const reduced = useReducedMotion();
  const bg = tone === "dark" ? C.forest : C.card;
  const fg = tone === "dark" ? C.white : C.ink;
  const words = text.split(" ");
  return (
    <View accessible accessibilityLabel={text} accessibilityLiveRegion="polite" style={[{ alignSelf: "stretch" }, style]}>
      {tail === "top" && (
        <View style={{ alignSelf: "center", width: 18, height: 18, backgroundColor: bg, transform: [{ rotate: "45deg" }], marginBottom: -10, borderRadius: 3 }} />
      )}
      {tail === "left" && (
        <View style={{ position: "absolute", left: -6, top: 18, width: 16, height: 16, backgroundColor: bg, transform: [{ rotate: "45deg" }], borderRadius: 3 }} />
      )}
      <View
        importantForAccessibility="no-hide-descendants"
        style={{ backgroundColor: bg, borderRadius: R.lg, borderCurve: "continuous", paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", flexWrap: "wrap" }}
      >
        {reduced ? (
          <Text style={{ fontFamily: F.medium, fontSize: 19, lineHeight: 26, letterSpacing: -0.4, color: fg }} maxFontSizeMultiplier={1.6}>
            {text}
          </Text>
        ) : (
          words.map((w, i) => (
            <Animated.Text
              key={`${text}-${i}`}
              entering={FadeInDown.delay(i * 45).duration(260)}
              maxFontSizeMultiplier={1.6}
              style={{ fontFamily: F.medium, fontSize: 19, lineHeight: 26, letterSpacing: -0.4, color: fg }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </Animated.Text>
          ))
        )}
      </View>
    </View>
  );
}

// ---------- One-time hints ----------

export function useMySeed(): SeedId {
  const userId = useApp((s) => s.userId);
  const chosen = useApp((s) => s.profile.seed);
  return seedOf(userId, chosen);
}

// Your seed pops up the first time something matters, says one thing, and never again.
export function SeedTip({ id, text, stage, style }: { id: TipId; text: string; stage?: number; style?: StyleProp<ViewStyle> }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const seen = useApp((s) => !!s.tips[id]);
  const seeTip = useApp((s) => s.seeTip);
  const seed = useMySeed();
  const mine = useMyPosts();
  const verified = useApp((s) => s.verifiedCount);
  if (seen) return null;
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOut.duration(160)}
      accessibilityRole="summary"
      accessibilityLabel={t("seed.tips.a11y")}
      style={[{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.mint, borderRadius: R.lg, padding: 12 }, style]}
    >
      <SeedBuddy seed={seed} stage={stage ?? plantStage(seedsOf(mine, verified))} mood="wow" size={52} animated />
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.2, color: C.forestInk }}>{text}</Text>
        <Pressable
          onPress={() => {
            haptic.tap();
            seeTip(id);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("seed.tips.ok")}
          style={{ alignSelf: "flex-start" }}
        >
          <Mono color={C.leaf}>{t("seed.tips.ok")} ✓</Mono>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ---------- Growth ----------

export function GrowthCard({ seed, seeds, streak, onPress }: { seed: SeedId; seeds: number; streak: number; onPress?: () => void }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const g = growthOf(seeds);
  const mood: Mood = moodFromStreak(seeds, streak);
  const species = t(`seed.species.${seed}`);
  const stage = t(`seed.stages.${g.id}`);
  const nextId = STAGE_IDS[g.stage + 1];
  const next = nextId ? t(`seed.stages.${nextId}`) : null;
  const [hop, setHop] = useState(0);
  return (
    <Pressable
      onPress={() => {
        haptic.soft();
        setHop((h) => h + 1);
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={t("seed.growth.a11y", { species, stage, n: g.stage + 1, seeds: formatNumber(g.seeds, language) })}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.mint, borderRadius: 20, padding: 14, overflow: "hidden" }}
    >
      <SeedBuddy seed={seed} stage={g.stage} mood={mood} size={96} animated hop={hop} />
      <View style={{ flex: 1, gap: 6 }}>
        <Mono color={C.leaf}>
          {t("seed.growth.kicker")} · {t("seed.growth.stageOf", { n: g.stage + 1 })}
        </Mono>
        <Text style={{ fontFamily: F.semibold, fontSize: 20, letterSpacing: -0.6, color: C.forestInk }}>
          {species} · {stage}
        </Text>
        <Bar value={g.progress} color={C.leaf} track={C.mint2} height={6} />
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.ink2 }}>
          {mood === "thirsty" ? t("seed.growth.thirsty") : next ? t("seed.growth.toNext", { count: g.toNext, stage: next }) : t("seed.growth.max")}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------- Species picker ----------

export function SeedPicker({ value, onChange, stage = 0 }: { value: SeedId; onChange: (s: SeedId) => void; stage?: number }) {
  const { C } = useTheme();
  const { t } = useI18n();
  return (
    <View role="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {SEED_IDS.map((id) => {
        const on = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={`${t(`seed.species.${id}`)}. ${t(`seed.speciesHint.${id}`)}`}
            onPress={() => {
              haptic.tap();
              onChange(id);
            }}
            style={{
              width: "31.5%",
              alignItems: "center",
              gap: 2,
              paddingVertical: 8,
              borderRadius: R.md,
              borderWidth: 2,
              borderColor: on ? SEEDS[id].color : C.line,
              backgroundColor: on ? C.mint : C.card,
            }}
          >
            <SeedBuddy seed={id} stage={stage} size={56} mood={on ? "wow" : "happy"} />
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{t(`seed.species.${id}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Hold to plant ----------

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const HOLD_MS = 1100;

// Press and hold: a ring fills, then it plants. Screen readers and Reduce Motion get a plain tap.
// Inspired by Hold Button on reactbits.dev.
export function HoldButton({ label, a11yLabel, onComplete, busy, busyLabel, disabled }: { label: string; a11yLabel: string; onComplete: () => void; busy?: boolean; busyLabel?: string; disabled?: boolean }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [reader, setReader] = useState(false);
  const [holding, setHolding] = useState(false);
  const p = useSharedValue(0);
  const squish = useSharedValue(1);
  const done = useRef(false);
  const tap = reduced || reader;

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setReader).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setReader);
    return () => sub.remove();
  }, []);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setHolding(false);
    haptic.success();
    onComplete();
    setTimeout(() => {
      done.current = false;
    }, 400);
  };

  const start = () => {
    if (disabled || busy || tap) return;
    haptic.soft();
    setHolding(true);
    squish.set(withSpring(0.95));
    p.set(
      withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (ok) => {
        if (ok) scheduleOnRN(finish);
      }),
    );
  };
  const stop = () => {
    if (tap) return;
    squish.set(withSpring(1));
    if (p.value < 1) {
      cancelAnimation(p);
      p.set(withTiming(0, { duration: 220 }));
      setHolding(false);
    }
  };

  const R0 = 21;
  const L = 2 * Math.PI * R0;
  const ring = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - p.value) }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: squish.value }] }));
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      onPress={tap && !disabled && !busy ? finish : undefined}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === "activate" && !disabled && !busy && finish()}
    >
      <Animated.View
        style={[
          {
            height: 64,
            borderRadius: R.pill,
            backgroundColor: C.forest,
            overflow: "hidden",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            gap: 12,
            opacity: disabled ? 0.4 : 1,
          },
          press,
        ]}
      >
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: C.forest2 }, fill]} />
        <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
          <Svg width={48} height={48} viewBox="0 0 48 48" style={{ position: "absolute" }}>
            <Circle cx={24} cy={24} r={R0} stroke={C.forestLine} strokeWidth={4} fill="none" />
            <AnimatedCircle
              cx={24}
              cy={24}
              r={R0}
              stroke={C.lime}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${L} ${L}`}
              animatedProps={ring}
              transform="rotate(-90 24 24)"
            />
          </Svg>
          <Text style={{ fontSize: 20 }}>🌱</Text>
        </View>
        <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, color: C.white }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {busy ? (busyLabel ?? label) : holding ? t("seed.ob.keepHolding") : label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// A soft field of leaves drifting up behind the onboarding. Decorative; gone with Reduce Motion.
export function FloatingLeaves({ count = 7 }: { count?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", inset: 0, overflow: "hidden" } as ViewStyle}>
      {Array.from({ length: count }).map((_, i) => (
        <DriftingLeaf key={i} i={i} />
      ))}
    </View>
  );
}

function DriftingLeaf({ i }: { i: number }) {
  const { C } = useTheme();
  const t = useSharedValue(0);
  const x = ((i * 37) % 90) + 3;
  const size = 10 + ((i * 7) % 12);
  const duration = 9000 + ((i * 1300) % 6000);
  useEffect(() => {
    const loop = () => {
      t.set(0);
      t.set(withTiming(1, { duration, easing: Easing.linear }, (ok) => {
        if (ok) scheduleOnRN(loop);
      }));
    };
    const id = setTimeout(loop, i * 900);
    return () => {
      clearTimeout(id);
      cancelAnimation(t);
    };
  }, [t, duration, i]);
  const a = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 6 : t.value > 0.85 ? (1 - t.value) * 4 : 0.6,
    transform: [{ translateY: (1 - t.value) * 900 - 100 }, { translateX: Math.sin(t.value * Math.PI * 4 + i) * 18 }, { rotate: `${t.value * 360 + i * 40}deg` }],
  }));
  return (
    <Animated.View entering={FadeIn} style={[{ position: "absolute", left: `${x}%`, top: 0 }, a]}>
      <LeafMark size={size} color={i % 3 === 0 ? C.lime : i % 3 === 1 ? C.leaf : C.mint2} vein="transparent" />
    </Animated.View>
  );
}
