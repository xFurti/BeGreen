import { Image } from "expo-image";
import { useRef, type ComponentRef } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Bar, Button, IconButton } from "@/components/ui";
import { BADGE_ART } from "@/data/badge-art";
import type { Badge, BadgeStats } from "@/data/badges";
import { useI18n } from "@/i18n/use-i18n";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

export function BadgeTile({ badge: b, stats, equipped, size, onOpen }: {
  badge: Badge; stats: BadgeStats; equipped: boolean; size: number; onOpen: () => void;
}) {
  const { t } = useI18n();
  const earned = b.earned(stats);
  const progress = b.progress ? t(b.progress.key, { n: Math.min(b.progress.of(stats), b.progress.goal), goal: b.progress.goal }) : t(b.requirement);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: equipped }}
      accessibilityLabel={`${t(b.name)}, ${equipped ? t("badges.active") : earned ? t("badges.earned") : t("badges.locked")}. ${t("badges.details")}`}
      onPress={() => { haptic.tap(); onOpen(); }}
      style={{ width: size, minHeight: size * 1.1, borderRadius: R.md, backgroundColor: earned ? C.forest : C.card,
        borderWidth: equipped ? 2 : 0, borderColor: C.leaf, padding: equipped ? 10 : 12, justifyContent: "space-between", gap: 8 }}>
      <Image source={BADGE_ART[b.id]} style={{ width: size * 0.38, height: size * 0.38, opacity: earned ? 1 : 0.35 }} />
      <View style={{ gap: 3 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: earned ? C.white : C.mute }}>{t(b.name)}</Text>
        {equipped && <Text style={{ fontFamily: F.medium, fontSize: 11, color: C.lime }}>{t("badges.active")}</Text>}
        {!earned && <Text numberOfLines={2} style={{ fontFamily: F.regular, fontSize: 11, color: C.mute }}>{progress}</Text>}
      </View>
    </Pressable>
  );
}

export function BadgeSheet({ badge: b, stats, equipped, onEquip, onUnequip, onClose }: {
  badge: Badge; stats: BadgeStats; equipped: boolean; onEquip: () => void; onUnequip: () => void; onClose: () => void;
}) {
  const titleRef = useRef<ComponentRef<typeof View>>(null);
  const { bottom, top } = useSafeAreaInsets();
  const { t } = useI18n();
  const earned = b.earned(stats);
  const progress = b.progress;
  const current = progress ? Math.min(progress.of(stats), progress.goal) : 0;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose} onShow={() => titleRef.current?.focus()}>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingTop: top + 16, backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Pressable accessible={false} onPress={onClose} style={{ position: "absolute", inset: 0 }} />
        <View role="dialog" accessibilityViewIsModal aria-modal accessibilityLabel={t("badges.sheetA11y", { badge: t(b.name) })}
          style={{ maxHeight: "90%", width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: bottom + 24, gap: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View ref={titleRef} tabIndex={-1} style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={T.title}>{t("badges.details")}</Text>
              </View>
              <IconButton icon="close" label={t("common.close")} onPress={onClose} />
            </View>
            <Image source={BADGE_ART[b.id]} accessibilityLabel={t(b.name)} style={{ width: 140, height: 140, alignSelf: "center" }} />
            <View style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={T.title}>{t(b.name)}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 14, color: earned ? C.leaf : C.mute }}>{earned ? t("badges.earned") : t("badges.locked")}</Text>
              <Text style={T.body}>{t(b.requirement)}</Text>
            </View>
            {progress && (
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: progress.goal, now: current }}
                accessibilityLabel={t(progress.key, { n: current, goal: progress.goal })} style={{ gap: 10 }}>
                <Bar value={current / progress.goal} />
                <Text style={T.callout}>{t(progress.key, { n: current, goal: progress.goal })}</Text>
              </View>
            )}
            {earned ? (
              <Button label={equipped ? t("badges.removeTitle") : t("badges.useTitle")} kind="green"
                onPress={() => { if (equipped) onUnequip(); else onEquip(); onClose(); }} />
            ) : <Text style={T.caption}>{t("badges.lockedHint")}</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
