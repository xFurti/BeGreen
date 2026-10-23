import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ComuneSection } from "@/components/comune-card";
import { Icon, type IconName } from "@/components/icon";
import { LanguageSwitch } from "@/components/language-switch";
import { TitledName } from "@/components/titled-name";
import { Avatar, IconButton, Logo, Mono, Press, SectionHeader, TopCover, useCountUp } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { BADGE_ART } from "@/data/badge-art";
import { BADGES, earnedBadges } from "@/data/badges";
import { daysTo2030, SDG_LIST } from "@/data/sdgs";
import type { Post } from "@/data/types";
import { useComune } from "@/hooks/use-comune";
import type { MessageKey } from "@/i18n/catalog";
import { profileName, sdgTitle } from "@/i18n/content";
import { formatDecimal, formatNumber, monthName, weekdayInitials } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { supabase } from "@/services/supabase";
import { badgeStatsOf, dropStaleBadge, sdgsOf, seedsOf, streakOf, useApp, useLeague, useMyPosts } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const ROLE_LABEL = { student: "roles.student", teacher: "roles.teacher", association: "roles.association", comune: "roles.comune" } as const satisfies Record<string, MessageKey>;

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

function Agenda({ posts }: { posts: Post[] }) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const touched = sdgsOf(posts);
  const [sel, setSel] = useState<number | null>(null);
  const gap = 6;
  const cell = Math.floor((width - 40 - gap * 5) / 6);
  const counts = new Map<number, number>();
  posts.forEach((p) => ACTIONS[p.action].sdgs.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)));

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        {SDG_LIST.map((g, i) => {
          const on = touched.has(g);
          const active = sel === g;
          return (
            <Animated.View key={g} entering={FadeIn.delay(i * 25)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t("me.sdg", { n: g, title: sdgTitle(t, g) })}${on ? t("common.sdgMoved") : ""}`}
                onPress={() => {
                  haptic.tap();
                  setSel(active ? null : g);
                }}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: on ? C.leaf : C.mint,
                  borderWidth: active ? 2 : 0,
                  borderColor: on ? C.forest : C.leaf,
                  padding: 8,
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.8, color: on ? C.white : C.forestMute }}>{g}</Text>
                {on && <Text style={{ fontFamily: F.monoMedium, fontSize: 9, color: C.mint, alignSelf: "flex-end" }}>×{counts.get(g)}</Text>}
              </Pressable>
            </Animated.View>
          );
        })}
        <View style={{ width: cell, height: cell, borderRadius: 12, backgroundColor: C.forest, padding: 7, justifyContent: "space-between" }}>
          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.7, color: C.lime }}>
            {daysTo2030()}
          </Text>
          <Text style={{ fontFamily: F.monoMedium, fontSize: 8, color: C.forestMute, lineHeight: 10 }}>{t("me.daysTo")}</Text>
        </View>
      </View>
      <Text style={[T.callout, { minHeight: 42 }]}>
        {sel ? (
          <>
            <Text style={{ fontFamily: F.medium, color: C.ink }}>
              SDG {sel} · {sdgTitle(t, sel)}.
            </Text>{" "}
            {touched.has(sel)
              ? t(counts.get(sel) === 1 ? "me.movedOnce" : "me.movedMany", { count: counts.get(sel) ?? 0 })
              : t("me.notYet")}
          </>
        ) : (
          <>
            {t("me.touched", { count: touched.size })}
          </>
        )}
      </Text>
    </View>
  );
}

function Calendar({ posts }: { posts: Post[] }) {
  const { t, language } = useI18n();
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - 40) / 7);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const byDay = new Map<number, Post>();
  posts.forEach((p) => {
    const d = new Date(p.createdAt);
    if (d.getMonth() === month && d.getFullYear() === year && !byDay.has(d.getDate())) byDay.set(d.getDate(), p);
  });
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row" }}>
        {weekdayInitials(language).map((d, i) => (
          <Mono key={i} style={{ flex: 1, textAlign: "center" }}>
            {d}
          </Mono>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          const p = d ? byDay.get(d) : undefined;
          const today = d === now.getDate();
          return (
            <View key={i} style={{ width: cell, height: cell * 1.25, padding: 2 }}>
              {d && (
                <Pressable
                  disabled={!p}
                  onPress={() => p && router.push({ pathname: "/post/[id]", params: { id: p.id } })}
                  accessibilityLabel={p ? t("post.dayAct", { act: t(`actions.${p.action}.label`), day: d }) : t("post.day", { day: d })}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    overflow: "hidden",
                    backgroundColor: p ? C.card2 : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: today ? 1.5 : 0,
                    borderColor: C.leaf,
                  }}
                >
                  {p ? (
                    <>
                      <Image source={p.photo} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" priority="low" />
                      <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 12, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>{d}</Text>
                    </>
                  ) : (
                    <Text style={{ color: d > now.getDate() ? C.faint : C.mute, fontFamily: F.regular, fontSize: 12 }}>{d}</Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ value, label, first }: { value: number; label: string; first?: boolean }) {
  const n = useCountUp(value);
  const { language } = useI18n();
  return (
    <View style={{ flex: 1, gap: 4, paddingLeft: first ? 0 : 14, borderLeftWidth: first ? 0 : 1, borderLeftColor: C.line }}>
      <Text style={{ fontFamily: F.medium, fontSize: 34, lineHeight: 38, letterSpacing: -1.6, color: C.ink, fontVariant: ["tabular-nums"] }}>
        {formatNumber(n, language)}
      </Text>
      <Mono>{label}</Mono>
    </View>
  );
}

export default function Me() {
  const { top } = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const posts = useMyPosts();
  const verifiedCount = useApp((s) => s.verifiedCount);
  const comune = useApp((s) => s.comune);
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const reset = useApp((s) => s.reset);
  const equipBadge = useApp((s) => s.equipBadge);
  const { t, language } = useI18n();
  const pulse = useApp((s) => s.pulse);
  const comuneView = useComune();
  const league = useLeague();
  const rank = league.findIndex((r) => r.me) + 1;

  const { width } = useWindowDimensions();
  const badgeSize = Math.floor((width - 40 - 16) / 3);
  const streak = streakOf(posts);
  const seeds = seedsOf(posts, verifiedCount);
  const place = comune?.name ?? t("comune.yours");
  const imp = impact(posts);
  const goals = sdgsOf(posts);
  const stats = badgeStatsOf(posts, verifiedCount);
  const earned = earnedBadges(stats);
  const earnedKey = earned.join();

  useEffect(() => {
    dropStaleBadge();
  }, [profile.badgeId, earnedKey]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: top + 10, paddingHorizontal: 20, paddingBottom: 140, gap: 40 }}>
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Avatar avatarId={profile.avatarId} name={profileName(profile.name, t)} size={76} ring={C.lime} />
            <IconButton
              icon="share"
              label={t("me.share")}
              onPress={() => Share.share({ message: t("me.shareTextIn", { streak, rank, place }) })}
            />
          </View>
          <View style={{ gap: 6 }}>
            <TitledName name={profileName(profile.name, t)} badgeId={profile.badgeId} lines={2} style={[T.hero, { fontSize: 40, lineHeight: 42 }]} />
            <Mono>
              @{profile.handle || t("common.youInline")} · {t(ROLE_LABEL[profile.role])} · {t("me.rankIn", { rank, place })}
            </Mono>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Stat value={streak} label={t("me.streak")} first />
            <Stat value={seeds} label={t("common.seeds")} />
            <Stat value={posts.filter((p) => p.verifiedBy.length >= 3).length} label={t("me.verified")} />
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(80)} style={{ gap: 16 }}>
          <SectionHeader index="01" title={t("me.agenda")} action={`${goals.size}/17`} />
          <Agenda posts={posts} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120)} style={{ gap: 16 }}>
          <SectionHeader index="02" title={t("myComune.title")} action={t("myComune.sources")} onAction={() => router.push("/sources")} />
          <ComuneSection view={comuneView} pulse={pulse} />
        </Animated.View>

        <View style={{ gap: 16 }}>
          <SectionHeader index="03" title={t("me.impact")} action={t("me.howCount")} onAction={() => router.push("/sources")} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: C.line }}>
            <Imp value={formatDecimal(imp.co2, language, 1)} label={t("me.co2")} />
            <Imp value={formatNumber(imp.items, language)} label={t("me.items")} right />
            <Imp value={formatNumber(imp.litres, language)} label={t("me.litres")} />
            <Imp value={formatNumber(imp.records, language)} label={t("me.records")} right />
          </View>
          <Text style={T.caption}>{t("me.estimates")}</Text>
        </View>

        <View style={{ gap: 16 }}>
          <SectionHeader index="04" title={t("me.memories")} action={monthName(new Date(), language)} />
          <Calendar posts={posts} />
        </View>

        <View style={{ gap: 16 }}>
          <SectionHeader index="05" title={t("me.badges")} action={`${earned.length}/${BADGES.length}`} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {BADGES.map((b) => {
              const on = earned.includes(b.id);
              const equipped = profile.badgeId === b.id;
              const progressLine = b.progress ? t(b.progress.key, { n: Math.min(b.progress.of(stats), b.progress.goal), goal: b.progress.goal }) : "";
              const reqLine = on ? t(b.requirement) : b.progress ? progressLine : t(b.requirement);
              const alertLine = b.progress ? `${t(b.requirement)} ${progressLine}` : t(b.requirement);
              return (
                <Pressable
                  key={b.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: equipped }}
                  accessibilityLabel={`${t(b.name)}, ${equipped ? t("badges.active") : on ? t("badges.earned") : t("badges.locked")}. ${reqLine}`}
                  onPress={() => {
                    haptic.tap();
                    if (on) equipBadge(equipped ? null : b.id);
                    else Alert.alert(t(b.name), alertLine);
                  }}
                  style={{
                    width: badgeSize,
                    minHeight: badgeSize * 1.1,
                    borderRadius: R.md,
                    borderCurve: "continuous",
                    backgroundColor: on ? C.forest : C.card,
                    borderWidth: equipped ? 2 : 0,
                    borderColor: C.leaf,
                    padding: equipped ? 10 : 12,
                    justifyContent: "space-between",
                  }}
                >
                  {!on && (
                    <View style={{ position: "absolute", top: 8, right: 8 }}>
                      <Icon name="lock" size={12} color={C.faint} />
                    </View>
                  )}
                  <Image source={BADGE_ART[b.id]} style={{ width: badgeSize * 0.38, height: badgeSize * 0.38, opacity: on ? 1 : 0.35 }} />
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, letterSpacing: -0.2, color: on ? C.white : C.mute }}>{t(b.name)}</Text>
                    {!on && <Text numberOfLines={2} style={{ fontFamily: F.regular, fontSize: 11, color: C.mute }}>{b.progress ? progressLine : t(b.requirement)}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
          <Row icon="location" label={t("common.comune")} value={comune?.name} onPress={() => router.push("/comune")} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Icon name="globe" size={16} color={C.ink} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.2 }}>{t("language.row")}</Text>
            <LanguageSwitch />
          </View>
          <Row
            icon="doc"
            label={t("me.explanations")}
            value={{ me: t("common.me"), class: t("common.myClass"), comune: t("common.comune") }[explain]}
            onPress={() => setExplain(explain === "me" ? "class" : explain === "class" ? "comune" : "me")}
          />
          <Row icon="book" label={t("me.guide")} onPress={() => router.push("/guide")} />
          <Row icon="shield" label={t("me.sources")} onPress={() => router.push("/sources")} />
          <Row icon="sparkle" label={t("common.askLeaf")} onPress={() => router.push("/leaf")} />
          <Row
            icon="refresh"
            label={t("me.signOut")}
            onPress={() =>
              Alert.alert(t("me.signOutTitle"), supabase ? t("me.signOutBody") : t("me.signOutLocal"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("me.signOutConfirm"),
                  style: "destructive",
                  onPress: async () => {
                    await supabase?.auth.signOut().catch(() => {});
                    reset();
                    router.replace("/onboarding");
                  },
                },
              ])
            }
          />
        </View>

        <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
          <Logo size={19} color={C.faint} />
          <Mono color={C.faint}>{t("me.tagline")}</Mono>
        </View>
      </ScrollView>
      <TopCover />
    </View>
  );
}

function Imp({ value, label, right }: { value: string; label: string; right?: boolean }) {
  return (
    <View
      style={{
        width: "50%",
        gap: 4,
        paddingVertical: 16,
        paddingLeft: right ? 16 : 0,
        borderLeftWidth: right ? 1 : 0,
        borderLeftColor: C.line,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
      }}
    >
      <Text style={{ fontFamily: F.medium, fontSize: 32, letterSpacing: -1.4, color: C.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress: () => void }) {
  return (
    <Press
      scale={0.99}
      onPress={onPress}
      accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 56, borderBottomWidth: 1, borderBottomColor: C.line }}
    >
      <Icon name={icon} size={16} color={C.leaf} />
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.2 }}>
        {label}
      </Text>
      {value && (
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1, fontFamily: F.monoMedium, fontSize: 11, letterSpacing: 0.4, color: C.ink }}>
          {value}
        </Text>
      )}
      <Icon name="chevron" size={12} color={C.faint} />
    </Press>
  );
}
