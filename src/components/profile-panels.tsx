import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Agenda } from "@/components/profile-agenda";
import { BadgeSheet, BadgeTile } from "@/components/badge-sheet";
import { IconButton } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { BADGES, earnedBadges, type BadgeId } from "@/data/badges";
import type { Post } from "@/data/types";
import { formatDecimal, formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { badgeStatsOf, sdgsOf, useApp } from "@/store/app-store";
import { F, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export function PanelTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  const { C, T } = useTheme();
  const s = styles(C);
  return (
    <View style={s.titleRow}>
      <Text accessibilityRole="header" {...(Platform.OS === "web" ? { "aria-level": 2 } : {})} style={s.title}>
        {title}
      </Text>
      {action ?? (detail && <Text style={T.caption}>{detail}</Text>)}
    </View>
  );
}
function impact(posts: Post[]) {
  const t = { co2: 0, items: 0, litres: 0, records: 0 };
  for (const p of posts) {
    const i = ACTIONS[p.action].impact;
    if (i.unit === "kg CO₂e") t.co2 += i.value;
    if (i.unit === "items") t.items += i.value;
    if (i.unit === "litres") t.litres += i.value;
    if (i.unit === "records") t.records += i.value;
  }
  return t;
}

export function ImpactPanel({
  posts,
  verifications,
  onBadgeOpen,
}: {
  posts: Post[];
  verifications: number;
  onBadgeOpen: (open: boolean) => void;
}) {
  const { C, T } = useTheme();
  const s = styles(C);
  const { t, language } = useI18n();
  const [selected, setSelected] = useState<BadgeId | null>(null);
  const [width, setWidth] = useState(0);
  const profile = useApp((s) => s.profile);
  const equip = useApp((s) => s.equipBadge);
  const totals = impact(posts);
  const stats = badgeStatsOf(posts, verifications);
  const badge = BADGES.find((b) => b.id === selected);
  const choose = (id: BadgeId | null) => {
    setSelected(id);
    onBadgeOpen(id !== null);
  };
  return (
    <View style={s.stack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ gap: 14 }}>
        <PanelTitle
          title={t("me.impact")}
          action={
            <IconButton icon="info" label={t("me.howCount")} bg="transparent" color={C.mute} onPress={() => router.push("/sources")} />
          }
        />
        <View style={s.metrics}>
          {[
            [formatDecimal(totals.co2, language, 1), t("me.co2")],
            [formatNumber(totals.items, language), t("me.items")],
            [formatNumber(totals.litres, language), t("me.litres")],
            [formatNumber(totals.records, language), t("me.records")],
          ].map(([value, label]) => (
            <View key={label} style={s.metric}>
              <Text style={s.figure}>{value}</Text>
              <Text style={T.caption}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={T.caption}>{t("me.estimates")}</Text>
      </View>
      <View style={{ gap: 16 }}>
        <PanelTitle title={t("me.agenda")} detail={`${sdgsOf(posts).size}/17`} />
        <Agenda posts={posts} />
      </View>
      <View style={{ gap: 16 }}>
        <PanelTitle title={t("me.badges")} detail={`${earnedBadges(stats).length}/${BADGES.length}`} />
        <View style={s.badges}>
          {width > 0 &&
            BADGES.map((b) => (
              <BadgeTile
                key={b.id}
                badge={b}
                stats={stats}
                equipped={profile.badgeId === b.id}
                size={Math.floor((width - 16) / 3)}
                onOpen={() => choose(b.id)}
              />
            ))}
        </View>
      </View>
      {badge && (
        <BadgeSheet
          badge={badge}
          stats={stats}
          equipped={profile.badgeId === badge.id}
          onEquip={() => equip(badge.id)}
          onUnequip={() => equip(null)}
          onClose={() => choose(null)}
        />
      )}
    </View>
  );
}

const styles = (C: Palette) =>
  StyleSheet.create({
    stack: { gap: 30 },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    title: { fontFamily: F.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.5, color: C.ink, flexShrink: 1 },
    metrics: { flexDirection: "row", flexWrap: "wrap", backgroundColor: C.card, borderRadius: 20, padding: 6 },
    metric: { width: "50%", padding: 16, gap: 5 },
    figure: { fontFamily: F.regular, fontSize: 28, letterSpacing: -1.2, color: C.ink, fontVariant: ["tabular-nums"] },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  });
