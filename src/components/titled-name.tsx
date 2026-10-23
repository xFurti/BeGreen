import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { BadgeArt } from "@/components/badge-art";
import { badgeById, isBadgeId, type BadgeId } from "@/data/badges";
import { useI18n } from "@/i18n/use-i18n";
import { useTheme } from "@/theme/use-theme";

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
  const { C } = useTheme();
  const { t } = useI18n();
  if (!isBadgeId(badgeId)) return <Text numberOfLines={lines} style={[{ color: C.ink }, style]}>{name}{after}</Text>;
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 15;
  const h = Math.round(fontSize * 0.8);
  const badge = badgeById(badgeId);
  return (
    <View
      accessible
      accessibilityLabel={t("badges.titled", { name, badge: t(badge.name) })}
      style={{ flexDirection: "row", alignItems: "center", gap: fontSize * 0.3, justifyContent: align === "center" ? "center" : undefined }}
    >
      <BadgeArt id={badgeId} size={h} />
      <Text numberOfLines={lines} style={[{ color: C.ink }, style, { flexShrink: 1 }]}>{name}{after}</Text>
    </View>
  );
}
