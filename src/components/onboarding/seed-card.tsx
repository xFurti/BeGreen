import { Pressable, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import { Blobs, LeafMark } from "@/components/nature";
import { SeedBuddy } from "@/components/seed-buddy";
import { Mono } from "@/components/ui";
import type { SeedId } from "@/data/seeds";
import type { Role } from "@/data/types";
import type { MessageKey } from "@/i18n/catalog";
import { useI18n } from "@/i18n/use-i18n";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export const ROLES: { value: Role; icon: IconName; label: MessageKey; hint: MessageKey }[] = [
  { value: "student", icon: "school", label: "roles.student", hint: "roles.studentHint" },
  { value: "teacher", icon: "book", label: "roles.teacher", hint: "roles.teacherHint" },
  { value: "association", icon: "people", label: "roles.association", hint: "roles.associationHint" },
  { value: "comune", icon: "building", label: "roles.comune", hint: "roles.comuneHint" },
];

// Four big answers instead of chips. Inspired by the radio cards on uiverse.io.
export function RoleStep({ value, onPick }: { value: Role | null; onPick: (r: Role) => void }) {
  const { C } = useTheme();
  const { t } = useI18n();
  return (
    <View role="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {ROLES.map((r, i) => {
        const on = value === r.value;
        return (
          <Animated.View key={r.value} entering={FadeInDown.delay(i * 70).springify().damping(18)} style={{ width: "48.5%" }}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`${t(r.label)}. ${t(r.hint)}`}
              onPress={() => {
                haptic.tap();
                onPick(r.value);
              }}
              style={{
                minHeight: 118,
                padding: 14,
                gap: 8,
                borderRadius: R.lg,
                borderWidth: 2,
                borderColor: on ? C.leaf : C.line,
                backgroundColor: on ? C.mint : C.card,
              }}
            >
              <Icon name={r.icon} size={22} color={C.leaf} />
              <Text style={{ fontFamily: F.semibold, fontSize: 17, letterSpacing: -0.3, color: C.ink }}>{t(r.label)}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 17, color: C.ink2 }}>{t(r.hint)}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

// How friends will see you: a collectible card you can tilt with a finger.
// Inspired by Tilted Card and Profile Card on reactbits.dev.
export function SeedCard({ name, handle, role, place, seed }: { name: string; handle: string; role: Role; place: string; seed: SeedId }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const pan = usePanGesture({
    enabled: !reduced,
    onUpdate: (e) => {
      "worklet";
      ry.set(Math.max(-14, Math.min(14, e.translationX / 8)));
      rx.set(Math.max(-14, Math.min(14, -e.translationY / 8)));
    },
    onDeactivate: () => {
      "worklet";
      rx.set(withSpring(0, { damping: 10 }));
      ry.set(withSpring(0, { damping: 10 }));
    },
  });
  const tilt = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }],
  }));
  const r = ROLES.find((x) => x.value === role) ?? ROLES[0];
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityLabel={`${name}, @${handle}, ${t(r.label)}, ${place}. ${t("seed.growth.stageOf", { n: 1 })}`}
        style={[
          {
            borderRadius: R.xl,
            borderCurve: "continuous",
            backgroundColor: C.forest,
            padding: 18,
            gap: 14,
            overflow: "hidden",
            borderWidth: 3,
            borderColor: C.forest2,
            boxShadow: "0 18px 40px rgba(11,61,42,0.28)",
          },
          tilt,
        ]}
      >
        <Blobs colors={[C.leaf, C.lime]} opacity={0.22} size={260} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <LeafMark size={14} color={C.lime} vein={C.forest} />
          <Mono color={C.lime} style={{ flex: 1 }}>
            BeGreen · {place}
          </Mono>
          <Mono color={C.forestMute}>{t("seed.growth.stageOf", { n: 1 })}</Mono>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: C.mint, alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
            <SeedBuddy seed={seed} stage={0} mood="wow" size={98} animated />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontFamily: F.semibold, fontSize: 26, lineHeight: 29, letterSpacing: -0.9, color: C.white }}>
              {name}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: F.monoMedium, fontSize: 15, color: C.lime }}>
              @{handle}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 28, borderRadius: R.pill, backgroundColor: C.glass }}>
            <Icon name={r.icon} size={13} color={C.lime} />
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.white }}>{t(r.label)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 28, borderRadius: R.pill, backgroundColor: C.glass }}>
            <Icon name="seed" size={13} color={C.lime} />
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.white }}>
              {t(`seed.species.${seed}`)} · 0 Seeds
            </Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
