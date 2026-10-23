import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Agenda } from "@/components/profile-agenda";
import { BadgeSheet, BadgeTile } from "@/components/badge-sheet";
import { Icon, type IconName } from "@/components/icon";
import { IconButton, Press } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { BADGES, earnedBadges, type BadgeId } from "@/data/badges";
import type { Post } from "@/data/types";
import { formatDecimal, formatNumber, intlLocale, weekdayInitials } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { badgeStatsOf, sdgsOf, useApp } from "@/store/app-store";
import { F, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";
import { calendarMonth } from "@/utils/profile";
const openPost = (post: Post) => router.push({ pathname: "/post/[id]", params: { id: post.id } });

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
function Empty({ title, text, icon }: { title: string; text: string; icon: IconName }) {
  const { C, T } = useTheme();
  const s = styles(C);
  const { t } = useI18n();
  return (
    <View style={s.empty}>
      <Icon name={icon} color={C.leaf} size={26} />
      <Text style={s.title}>{title}</Text>
      <Text style={[T.caption, { textAlign: "center" }]}>{text}</Text>
      <Press onPress={() => router.push("/capture")} style={s.action} accessibilityLabel={t("feed.now")}>
        <Text style={s.actionText}>{t("feed.now")}</Text>
        <Icon name="arrowRight" color={C.white} size={17} />
      </Press>
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

export function MemoriesPanel({ posts }: { posts: Post[] }) {
  const { C, T } = useTheme();
  const s = styles(C);
  const { t, language } = useI18n();
  const locale = intlLocale(language);
  const caption = T.caption;
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { cells, byDay } = calendarMonth(month, posts);
  const sameMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const visiblePosts = selectedDay ? (byDay.get(selectedDay) ?? []) : [...byDay.values()].flat().sort((a, b) => b.createdAt - a.createdAt);
  const moveMonth = (step: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1));
    setSelectedDay(null);
  };
  return (
    <View style={s.stack}>
      <View style={{ gap: 16 }}>
        <PanelTitle title={t("profile.calendarTitle")} />
        <View style={s.titleRow}>
          <IconButton icon="back" label={t("profile.previousMonth")} bg={C.card} color={C.ink} size={44} onPress={() => moveMonth(-1)} />
          <Text accessibilityRole="header" {...(Platform.OS === "web" ? { "aria-level": 3 } : {})} style={s.month}>
            {month.toLocaleDateString(locale, { month: "long", year: "numeric" })}
          </Text>
          <Pressable
            disabled={sameMonth}
            accessibilityRole="button"
            accessibilityLabel={t("profile.nextMonth")}
            accessibilityState={{ disabled: sameMonth }}
            onPress={() => moveMonth(1)}
            style={s.nextMonth}
          >
            <Icon name="chevron" size={17} color={sameMonth ? C.faint : C.ink} />
          </Pressable>
        </View>
        <View style={s.calendar}>
          {weekdayInitials(language).map((d, i) => (
            <Text key={`day-${i}`} style={s.weekday}>
              {d}
            </Text>
          ))}
          {cells.map((d, i) => {
            const dayPosts = d ? (byDay.get(d) ?? []) : [];
            const today = sameMonth && d === now.getDate();
            return (
              <View key={i} style={s.daySlot}>
                {d && (
                  <Pressable
                    disabled={!dayPosts.length}
                    accessibilityRole={dayPosts.length ? "button" : undefined}
                    accessibilityState={{ selected: selectedDay === d }}
                    accessibilityLabel={t("profile.dayProofs", {
                      date: new Date(month.getFullYear(), month.getMonth(), d).toLocaleDateString(locale),
                      count: dayPosts.length,
                    })}
                    onPress={() => {
                      haptic.tap();
                      setSelectedDay(selectedDay === d ? null : d);
                    }}
                    style={[
                      s.day,
                      today && { borderColor: C.leaf, borderWidth: 2 },
                      selectedDay === d && { borderColor: C.ink, borderWidth: 3 },
                    ]}
                  >
                    {dayPosts[0] && (
                      <Image source={dayPosts[0].photo} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                    )}
                    <Text style={[s.dayNumber, dayPosts.length > 0 && s.photoDayNumber]}>{d}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 14 }}>
        <PanelTitle
          title={selectedDay ? t("profile.dayMemories", { day: selectedDay }) : t("me.memories")}
          detail={t("profile.proofs", { count: visiblePosts.length })}
        />
        {posts.length === 0 ? (
          <Empty icon="calendar" title={t("profile.emptyMemories")} text={t("profile.emptyMemoriesBody")} />
        ) : visiblePosts.length === 0 ? (
          <Text style={caption}>{t("profile.emptyMonth")}</Text>
        ) : (
          <View style={s.photos}>
            {visiblePosts.map((post) => (
              <Pressable
                key={post.id}
                accessibilityRole="button"
                accessibilityLabel={t("profile.openMemory", {
                  act: t(`actions.${post.action}.label`),
                  date: new Date(post.createdAt).toLocaleDateString(locale),
                })}
                onPress={() => openPost(post)}
                style={s.memory}
              >
                <View style={s.memoryMedia}>
                  <Image source={post.photo} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                  <View pointerEvents="none" style={s.memoryDate}>
                    <Text style={s.memoryDateText}>
                      {new Date(post.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  {post.verifiedBy.length >= 3 && (
                    <View pointerEvents="none" style={s.memoryVerified}>
                      <Icon name="checkSeal" size={24} color={C.leaf} />
                    </View>
                  )}
                </View>
                <View style={{ padding: 10 }}>
                  <Text style={s.memoryLabel}>{t(`actions.${post.action}.label`)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
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
    month: { fontFamily: F.medium, fontSize: 16, color: C.ink },
    nextMonth: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: C.card },
    calendar: { flexDirection: "row", flexWrap: "wrap" },
    weekday: { width: "14.285714%", textAlign: "center", paddingBottom: 10, fontFamily: F.medium, fontSize: 12, color: C.mute },
    daySlot: { width: "14.285714%", aspectRatio: 0.86, padding: 2 },
    day: { flex: 1, borderRadius: 10, backgroundColor: C.card, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    dayNumber: { fontFamily: F.medium, fontSize: 13, color: C.mute },
    photoDayNumber: {
      position: "absolute",
      bottom: 3,
      right: 3,
      backgroundColor: C.raised,
      color: C.ink,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontSize: 11,
    },
    photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    memory: { width: "46%", flexGrow: 1, flexBasis: "46%", maxWidth: "49%", backgroundColor: C.card, borderRadius: 16, overflow: "hidden" },
    memoryMedia: { width: "100%", aspectRatio: 1 },
    memoryDate: {
      position: "absolute",
      bottom: 8,
      left: 8,
      backgroundColor: C.scrim,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    memoryDateText: { fontFamily: F.medium, fontSize: 11, lineHeight: 16, color: C.white, fontVariant: ["tabular-nums"] },
    memoryVerified: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: C.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    memoryLabel: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.ink },
    empty: { padding: 24, gap: 12, alignItems: "center", backgroundColor: C.card, borderRadius: 20 },
    action: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 20,
      backgroundColor: C.forest,
      borderRadius: 24,
      marginTop: 8,
    },
    actionText: { fontFamily: F.medium, fontSize: 14, color: C.white },
  });
