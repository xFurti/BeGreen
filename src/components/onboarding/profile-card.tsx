import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Icon } from "@/components/icon";
import { LeafMark } from "@/components/nature";
import { Avatar, Mono } from "@/components/ui";
import { AVATARS, type AvatarId } from "@/data/avatars";
import type { Comune } from "@/data/types";
import type { MessageKey } from "@/i18n/catalog";
import { useI18n } from "@/i18n/use-i18n";
import { aqiBand } from "@/services/interpret";
import { comuneLabel } from "@/services/comuni";
import { usePulse } from "@/hooks/use-pulse";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

function ComuneAir() {
  const { C } = useTheme();
  const { pulse } = usePulse();
  const { language, t } = useI18n();
  if (!pulse.air) return null;
  const band = aqiBand(pulse.air.aqi, language);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, borderTopColor: C.forestLine, paddingTop: 10 }}>
      <Icon name="air" size={14} color={C.lime} />
      <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>
        {t("welcome.airToday", { value: band.label })}
      </Text>
    </View>
  );
}

export function ProfileCard({
  name,
  handle,
  avatarId,
  comune,
}: {
  name: string;
  handle: string;
  avatarId: AvatarId | null;
  comune: Comune | null;
}) {
  const { C } = useTheme();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const tilt = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateX: `${rotateX.value}deg` }, { rotateY: `${rotateY.value}deg` }],
  }));
  const pan = Gesture.Pan()
    .enabled(!reducedMotion)
    .onUpdate((event) => {
      rotateY.set(Math.max(-8, Math.min(8, event.translationX / 14)));
      rotateX.set(Math.max(-8, Math.min(8, -event.translationY / 14)));
    })
    .onEnd(() => {
      rotateX.set(withSpring(0, { damping: 16, stiffness: 220 }));
      rotateY.set(withSpring(0, { damping: 16, stiffness: 220 }));
    });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ backgroundColor: C.forest, borderRadius: R.lg, padding: 18, gap: 16 }, tilt]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar avatarId={avatarId} name={name || t("onboarding.profilePlaceholder")} size={56} invert={!avatarId} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 23, letterSpacing: -0.7, color: C.white }}>
              {name || t("onboarding.profilePlaceholder")}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: F.monoMedium, fontSize: 12, color: C.forestMute }}>
              @{handle || t("onboarding.profileHandlePlaceholder")}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name="location" size={14} color={C.lime} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.forestMute }}>
            {comune ? comuneLabel(comune) : t("onboarding.profileComune")}
          </Text>
        </View>
        {comune && <ComuneAir />}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, borderTopColor: C.forestLine, paddingTop: 10 }}>
          <LeafMark size={14} color={C.lime} vein="transparent" />
          <Mono color={C.forestMute}>{t("onboarding.profileStats")}</Mono>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function AvatarChoice({ id, selected, onPress }: { id: AvatarId; selected: boolean; onPress: () => void }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(selected ? 1.08 : 1);
  useEffect(() => {
    scale.set(reducedMotion ? (selected ? 1.08 : 1) : withSpring(selected ? 1.08 : 1, { damping: 14, stiffness: 260 }));
  }, [reducedMotion, scale, selected]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t(`avatars.${id}` as MessageKey)}
      onPress={onPress}
      style={{ width: 42, height: 48, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={[{ padding: selected ? 2 : 0, borderRadius: 24, borderWidth: selected ? 2 : 0, borderColor: C.leaf }, animated]}>
        <Avatar avatarId={id} name={t(`avatars.${id}` as MessageKey)} size={38} />
      </Animated.View>
    </Pressable>
  );
}

export function AvatarPicker({ value, onChange }: { value: AvatarId | null; onChange: (id: AvatarId) => void }) {
  const { C } = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ gap: 8 }}>
      <Mono color={C.forest}>{t("onboarding.chooseAvatar")}</Mono>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {AVATARS.map((avatar) => (
          <AvatarChoice
            key={avatar.id}
            id={avatar.id}
            selected={value === avatar.id}
            onPress={() => {
              haptic.tap();
              onChange(avatar.id);
            }}
          />
        ))}
      </View>
    </View>
  );
}
