import { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { SEEDS, type Mood, type SeedId } from "@/data/seeds";
import { seedArt as A } from "@/theme/tokens";

// Your seed, drawn: a seed with a face at stage 0, then a pot with a face and the plant growing out of it.
// The same drawing is the onboarding buddy (animated) and everyone's avatar (still).

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const INK = A.ink;
const CHEEK = A.cheek;
const POT = A.pot;
const RIM = A.rim;
const LEAF_A = A.leafA;
const LEAF_B = A.leafB;
const STEM = A.stem;

// A leaf growing from (x, y) to one side; d = -1 left, 1 right.
function leaf(x: number, y: number, d: number, L: number) {
  return (
    `M${x} ${y} C${x + d * L * 0.25} ${y + L * 0.1} ${x + d * L * 0.85} ${y - L * 0.2} ${x + d * L} ${y - L * 0.6} ` +
    `C${x + d * L * 0.55} ${y - L * 0.62} ${x + d * L * 0.1} ${y - L * 0.35} ${x} ${y}Z`
  );
}

function Eye({ cx, cy, r, blink, closed }: { cx: number; cy: number; r: number; blink: SharedValue<number>; closed?: boolean }) {
  const props = useAnimatedProps(() => ({ ry: r * (1 - blink.value * 0.9) }));
  if (closed) return <Path d={`M${cx - r} ${cy} Q${cx} ${cy + r * 0.9} ${cx + r} ${cy}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />;
  return (
    <G>
      <AnimatedEllipse cx={cx} cy={cy} rx={r * 0.86} ry={r} fill={INK} animatedProps={props} />
      <Circle cx={cx + r * 0.3} cy={cy - r * 0.35} r={r * 0.3} fill={A.shine} />
    </G>
  );
}

function Face({ x, y, mood, blink, scale = 1 }: { x: number; y: number; mood: Mood; blink: SharedValue<number>; scale?: number }) {
  const r = (mood === "wow" ? 4 : 3.4) * scale;
  const gap = 9 * scale;
  const closed = mood === "sleepy";
  const mouthY = y + 7 * scale;
  return (
    <G>
      <Eye cx={x - gap} cy={y} r={r} blink={blink} closed={closed} />
      <Eye cx={x + gap} cy={y} r={r} blink={blink} closed={closed} />
      <Ellipse cx={x - gap - 4 * scale} cy={y + 5 * scale} rx={3 * scale} ry={1.8 * scale} fill={CHEEK} opacity={0.75} />
      <Ellipse cx={x + gap + 4 * scale} cy={y + 5 * scale} rx={3 * scale} ry={1.8 * scale} fill={CHEEK} opacity={0.75} />
      {mood === "happy" && <Path d={`M${x - 4.5 * scale} ${mouthY - 1} Q${x} ${mouthY + 4 * scale} ${x + 4.5 * scale} ${mouthY - 1}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />}
      {mood === "wow" && <Ellipse cx={x} cy={mouthY + scale} rx={3 * scale} ry={3.6 * scale} fill={INK} />}
      {mood === "cough" && <Circle cx={x} cy={mouthY} r={2 * scale} fill={INK} />}
      {mood === "sleepy" && <Path d={`M${x - 3 * scale} ${mouthY} L${x + 3 * scale} ${mouthY}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />}
      {mood === "thirsty" && (
        <Path
          d={`M${x - 5 * scale} ${mouthY + 1} q${1.25 * scale} ${-2 * scale} ${2.5 * scale} 0 t${2.5 * scale} 0 t${2.5 * scale} 0 t${2.5 * scale} 0`}
          stroke={INK}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </G>
  );
}

// Little signs around the buddy that say how it feels.
function MoodMarks({ mood, x, y }: { mood: Mood; x: number; y: number }) {
  if (mood === "thirsty") return <Path d={`M${x + 22} ${y - 10} q4 6 0 9 q-4 -3 0 -9Z`} fill={A.sweat} />;
  if (mood === "cough")
    return (
      <G opacity={0.7}>
        <Circle cx={x - 24} cy={y + 8} r={4} fill={A.puff[0]} />
        <Circle cx={x - 31} cy={y + 4} r={3} fill={A.puff[1]} />
        <Circle cx={x - 36} cy={y - 1} r={2} fill={A.puff[2]} />
      </G>
    );
  if (mood === "wow")
    return (
      <G stroke={A.spark} strokeWidth={2} strokeLinecap="round">
        <Path d={`M${x - 26} ${y - 14} l-5 -5`} />
        <Path d={`M${x + 26} ${y - 14} l5 -5`} />
        <Path d={`M${x} ${y - 26} l0 -6`} />
      </G>
    );
  if (mood === "sleepy")
    return (
      <Path d={`M${x + 20} ${y - 18} h6 l-6 7 h6`} stroke={A.zzz} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    );
  return null;
}

function Bloom({ seed }: { seed: SeedId }) {
  const s = SEEDS[seed];
  switch (s.bloom) {
    case "flower": {
      const n = seed === "poppy" ? 5 : 10;
      const rx = seed === "poppy" ? 9 : 5;
      const ry = seed === "poppy" ? 10 : 9;
      const off = seed === "poppy" ? 8 : 11;
      return (
        <G>
          {Array.from({ length: n }).map((_, i) => (
            <Ellipse key={i} cx={60} cy={26 - off} rx={rx} ry={ry} fill={s.color} transform={`rotate(${(i * 360) / n} 60 26)`} />
          ))}
          <Circle cx={60} cy={26} r={seed === "poppy" ? 6 : 8} fill={s.heart} />
        </G>
      );
    }
    case "spikes":
      return (
        <G>
          {[
            [48, 16],
            [60, 8],
            [72, 16],
          ].map(([tx, ty], i) => (
            <G key={i}>
              <Path d={`M60 44 Q${(60 + tx) / 2} ${(44 + ty) / 2 + 4} ${tx} ${ty}`} stroke={STEM} strokeWidth={2} fill="none" />
              {[0, 1, 2, 3].map((k) => {
                const t = 0.35 + k * 0.2;
                return <Ellipse key={k} cx={60 + (tx - 60) * t} cy={44 + (ty - 44) * t} rx={3.4} ry={4} fill={k % 2 ? s.heart : s.color} />;
              })}
            </G>
          ))}
        </G>
      );
    case "fruit":
      return (
        <G>
          <Path d={leaf(60, 40, -1, 18)} fill={LEAF_A} />
          <Path d={leaf(60, 34, 1, 18)} fill={LEAF_B} />
          {[
            [44, 48],
            [76, 44],
            [60, 24],
          ].map(([cx, cy], i) => (
            <G key={i}>
              <Circle cx={cx} cy={cy} r={7} fill={s.color} />
              <Path d={`M${cx - 3} ${cy - 6} l3 2 l3 -2`} stroke={s.heart} strokeWidth={1.6} strokeLinecap="round" fill="none" />
              <Circle cx={cx - 2.5} cy={cy - 2} r={1.6} fill={A.shine} opacity={0.6} />
            </G>
          ))}
        </G>
      );
    case "canopy":
      return (
        <G>
          <Rect x={57} y={40} width={6} height={40} rx={2} fill={s.heart} />
          <Circle cx={46} cy={38} r={16} fill={LEAF_B} />
          <Circle cx={74} cy={38} r={16} fill={LEAF_B} />
          <Circle cx={60} cy={24} r={19} fill={s.color} />
          <Circle cx={52} cy={20} r={4} fill={A.shine} opacity={0.18} />
          <Ellipse cx={48} cy={46} rx={3} ry={3.6} fill={s.coat} />
          <Ellipse cx={72} cy={44} rx={3} ry={3.6} fill={s.coat} />
        </G>
      );
    case "cone":
      return (
        <G>
          <Rect x={57} y={62} width={6} height={18} rx={2} fill={s.heart} />
          <Path d="M60 36 L90 68 L30 68Z" fill={LEAF_B} />
          <Path d="M60 22 L84 52 L36 52Z" fill={s.color} />
          <Path d="M60 8 L78 36 L42 36Z" fill={LEAF_A} />
          <Circle cx={60} cy={8} r={3} fill={A.spark} />
        </G>
      );
  }
}

// Stem height and leaves for stages 1–3; stage 4 adds the species' bloom.
function Plant({ seed, stage }: { seed: SeedId; stage: number }) {
  const s = SEEDS[seed];
  const tree = s.bloom === "canopy" || s.bloom === "cone";
  if (stage >= 4 && tree) return <Bloom seed={seed} />;
  const top = [0, 60, 46, 34, 32][stage];
  const leaves: [number, number, number][] =
    stage === 1
      ? [
          [64, -1, 14],
          [62, 1, 14],
        ]
      : stage === 2
        ? [
            [68, -1, 12],
            [66, 1, 12],
            [54, -1, 16],
            [52, 1, 16],
          ]
        : [
            [70, -1, 13],
            [68, 1, 13],
            [56, -1, 17],
            [54, 1, 17],
            [44, -1, 14],
            [42, 1, 14],
          ];
  return (
    <G>
      <Path d={`M60 80 C58 ${(80 + top) / 2} 62 ${(80 + top) / 2} 60 ${top}`} stroke={STEM} strokeWidth={3} strokeLinecap="round" fill="none" />
      {leaves.map(([y, d, L], i) => (
        <Path key={i} d={leaf(60, y, d, L)} fill={i % 2 ? LEAF_B : LEAF_A} />
      ))}
      {stage === 3 && <Circle cx={60} cy={top - 2} r={5} fill={s.color} />}
      {stage >= 4 && <Bloom seed={seed} />}
    </G>
  );
}

export type SeedBuddyProps = {
  seed: SeedId;
  stage?: number;
  mood?: Mood;
  size?: number;
  // Idle life: blink, bob and sway. Off for avatars; always off with Reduce Motion.
  animated?: boolean;
  // Change it to make the buddy hop (a reaction to a tap or an answer).
  hop?: number;
  style?: StyleProp<ViewStyle>;
};

export function SeedBuddy({ seed, stage = 0, mood = "happy", size = 120, animated = false, hop = 0, style }: SeedBuddyProps) {
  const reduced = useReducedMotion();
  const live = animated && !reduced;
  const blink = useSharedValue(0);
  const bob = useSharedValue(0);
  const jump = useSharedValue(0);
  const grow = useSharedValue(1);
  const lastStage = useRef(stage);
  const s = SEEDS[seed];

  useEffect(() => {
    if (!live) {
      blink.set(0);
      bob.set(0);
      return;
    }
    blink.set(
      withRepeat(withSequence(withDelay(2600, withTiming(1, { duration: 80 })), withTiming(0, { duration: 120 }), withDelay(1400, withTiming(0, { duration: 1 }))), -1),
    );
    bob.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [live, blink, bob]);

  useEffect(() => {
    if (!hop || !live) return;
    jump.set(withSequence(withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 7, stiffness: 180 })));
  }, [hop, live, jump]);

  useEffect(() => {
    if (stage > lastStage.current && !reduced) {
      grow.set(0.7);
      grow.set(withSpring(1, { damping: 8, stiffness: 120 }));
    }
    lastStage.current = stage;
  }, [stage, reduced, grow]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: -bob.value * size * 0.025 - jump.value * size * 0.12 },
      { rotate: `${(bob.value - 0.5) * 4}deg` },
      { scaleY: 1 - jump.value * 0.04 + (grow.value - 1) * 0.4 },
      { scaleX: 1 + jump.value * 0.03 + (grow.value - 1) * 0.2 },
    ],
  }));

  const isSeed = stage <= 0;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[{ width: size, height: size, transformOrigin: "50% 92%" } as ViewStyle, body]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Ellipse cx={60} cy={114} rx={isSeed ? 22 : 28} ry={4} fill={A.shadow} opacity={0.08} />
          {isSeed ? (
            <G>
              <Path d="M60 34 C82 34 92 62 90 82 C88 102 74 112 60 112 C46 112 32 102 30 82 C28 62 38 34 60 34Z" fill={s.coat} />
              <Path d="M60 40 C70 42 76 52 78 60" stroke={A.shine} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" fill="none" />
              <Path d="M60 34 C60 28 64 24 69 23" stroke={STEM} strokeWidth={2.6} strokeLinecap="round" fill="none" />
              <Path d={leaf(68, 24, 1, 10)} fill={LEAF_A} />
              <Face x={60} y={80} mood={mood} blink={blink} scale={1.15} />
              <MoodMarks mood={mood} x={60} y={78} />
            </G>
          ) : (
            <G>
              <Plant seed={seed} stage={Math.min(stage, 4)} />
              <Path d="M34 84 L86 84 L80 114 C79.5 116 78 117 76 117 L44 117 C42 117 40.5 116 40 114Z" fill={POT} />
              <Rect x={28} y={76} width={64} height={11} rx={5} fill={RIM} />
              <Face x={60} y={97} mood={mood} blink={blink} />
              <MoodMarks mood={mood} x={60} y={96} />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}
