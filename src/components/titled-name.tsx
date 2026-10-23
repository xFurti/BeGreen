import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { BADGE_ART } from "@/data/badge-art";
import { badgeById, isBadgeId, type BadgeId } from "@/data/badges";
import { useI18n } from "@/i18n/use-i18n";

// Someone's name with the title they chose: the badge image, then the name. Squads and places have no title.
export function TitledName({
  name,
  badgeId,
  style,
  align,
  after,
  lines = 1,
}: {
  name: string;
  badgeId?: BadgeId | null;
  style: StyleProp<TextStyle>;
  align?: "center";
  after?: ReactNode;
  lines?: number;
}) {
  const { t } = useI18n();
  if (!isBadgeId(badgeId)) return <Text numberOfLines={lines} style={style}>{name}{after}</Text>;
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 15;
  const h = Math.round(fontSize * 0.8);
  const badge = badgeById(badgeId);
  return (
    <View
      accessible
      accessibilityLabel={t("badges.titled", { name, badge: t(badge.name) })}
      style={{ flexDirection: "row", alignItems: "center", gap: fontSize * 0.3, justifyContent: align === "center" ? "center" : undefined }}
    >
      <Image source={BADGE_ART[badgeId]} style={{ width: h, height: h, flexShrink: 0 }} accessible={false} />
      <Text numberOfLines={lines} style={[style, { flexShrink: 1 }]}>{name}{after}</Text>
    </View>
  );
}
