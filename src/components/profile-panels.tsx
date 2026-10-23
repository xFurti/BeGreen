import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { IconButton, Press } from "@/components/ui";
import { ProfileMap } from "@/components/profile-map";
import { ACTIONS } from "@/data/actions";
import type { Post } from "@/data/types";
import { sdgsOf, streakOf } from "@/store/app-store";
import { C, F } from "@/theme/tokens";
import { haptic } from "@/utils/format";
import { calendarMonth } from "@/utils/profile";

export const PROFILE_MUTED = "#626863";
const caption = { fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: PROFILE_MUTED, fontVariant: ["tabular-nums" as const] };
const openPost = (post: Post) => router.push({ pathname: "/post/[id]", params: { id: post.id } });

export function PanelTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <View style={s.titleRow}>
      <Text accessibilityRole="header" {...(Platform.OS === "web" ? { "aria-level": 2 } : {})} style={s.title}>{title}</Text>
      {action ?? (detail && <Text style={caption}>{detail}</Text>)}
    </View>
  );
}

function Empty({ title, text, icon }: { title: string; text: string; icon: IconName }) {
  return (
    <View style={s.empty}>
      <Icon name={icon} color={C.leaf} size={26} />
      <Text style={s.title}>{title}</Text>
      <Text style={[caption, { textAlign: "center" }]}>{text}</Text>
      <Press onPress={() => router.push("/capture")} style={s.action} accessibilityLabel="Make your first proof">
        <Text style={s.actionText}>Make a green move</Text>
        <Icon name="arrowRight" color={C.white} size={17} />
      </Press>
    </View>
  );
}

export function ImpactPanel({ posts, verifications }: { posts: Post[]; verifications: number }) {
  const verified = posts.filter((p) => p.verifiedBy.length >= 3);
  const totals = { co2: 0, items: 0, litres: 0, records: 0 };
  verified.forEach((p) => {
    const impact = ACTIONS[p.action].impact;
    if (impact.unit === "kg CO₂e") totals.co2 += impact.value;
    if (impact.unit === "items") totals.items += impact.value;
    if (impact.unit === "litres") totals.litres += impact.value;
    if (impact.unit === "records") totals.records += impact.value;
  });
  const kinds = new Set(verified.map((p) => p.action));
  const badges: { icon: IconName; label: string; on: boolean }[] = [
    { icon: "camera", label: "First proof", on: verified.length > 0 },
    { icon: "flame", label: "7-day streak", on: streakOf(verified) >= 7 },
    { icon: "bike", label: "Car-free ×5", on: verified.filter((p) => p.action === "move").length >= 5 },
    { icon: "binoculars", label: "Nature spotter", on: kinds.has("spot") },
    { icon: "shield", label: "Verifier ×10", on: verifications >= 10 },
    { icon: "globe", label: "10 UN goals", on: sdgsOf(verified).size >= 10 },
  ];

  return (
    <View style={s.stack}>
      <View style={{ gap: 14 }}>
        <PanelTitle
          title="Small acts. Real impact."
          action={<IconButton icon="info" label="How we estimate impact" bg="transparent" color={PROFILE_MUTED} size={44} onPress={() => router.push("/sources")} />}
        />
        <View style={s.metrics}>
          {[
            [totals.co2.toFixed(1), "kg CO₂e avoided"],
            [String(totals.items), "items out of waste"],
            [String(totals.litres), "litres saved"],
            [String(totals.records), "species recorded"],
          ].map(([value, label]) => (
            <View key={label} style={s.metric}>
              <Text style={s.figure}>{value}</Text>
              <Text style={caption}>{label}</Text>
            </View>
          ))}
        </View>
        {posts.length === 0 && <Text style={caption}>Your first verified proof starts your impact. Three friends make it count.</Text>}
      </View>
      <View style={{ gap: 16 }}>
        <PanelTitle title="Your milestones" detail={`${badges.filter((b) => b.on).length} of ${badges.length}`} />
        <View style={s.badges}>
          {badges.map((b) => (
            <View key={b.label} accessibilityLabel={`${b.label}, ${b.on ? "earned" : "locked"}`} style={[s.badge, b.on && { backgroundColor: C.mint2 }]}>
              <Icon name={b.on ? b.icon : "lock"} size={22} color={b.on ? C.leaf : PROFILE_MUTED} />
              <Text style={[caption, { color: b.on ? C.forest : PROFILE_MUTED, fontFamily: F.medium, textAlign: "center" }]}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function MemoriesPanel({ posts }: { posts: Post[] }) {
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { cells, byDay } = calendarMonth(month, posts);
  const sameMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const visiblePosts = selectedDay ? byDay.get(selectedDay) ?? [] : [...byDay.values()].flat().sort((a, b) => b.createdAt - a.createdAt);
  const moveMonth = (step: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1));
    setSelectedDay(null);
  };
  return (
    <View style={s.stack}>
      <View style={{ gap: 16 }}>
        <PanelTitle title="A little greener, every day" />
        <View style={s.titleRow}>
          <IconButton icon="back" label="Previous month" bg={C.card} color={C.ink} size={44} onPress={() => moveMonth(-1)} />
          <Text accessibilityRole="header" {...(Platform.OS === "web" ? { "aria-level": 3 } : {})} style={s.month}>{month.toLocaleDateString("en", { month: "long", year: "numeric" })}</Text>
          <Pressable disabled={sameMonth} accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled: sameMonth }} onPress={() => moveMonth(1)} style={s.nextMonth}>
            <Icon name="chevron" size={17} color={sameMonth ? "#ADB3AD" : C.ink} />
          </Pressable>
        </View>
        <View style={s.calendar}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <Text key={`day-${i}`} style={s.weekday}>{d}</Text>)}
          {cells.map((d, i) => {
            const dayPosts = d ? byDay.get(d) ?? [] : [];
            const today = sameMonth && d === now.getDate();
            return (
              <View key={i} style={s.daySlot}>
                {d && <Pressable
                  disabled={!dayPosts.length}
                  accessibilityRole={dayPosts.length ? "button" : undefined}
                  accessibilityState={{ selected: selectedDay === d }}
                  accessibilityLabel={`${month.toLocaleDateString("en", { month: "long" })} ${d}: ${dayPosts.length} proofs`}
                  onPress={() => { haptic.tap(); setSelectedDay(selectedDay === d ? null : d); }}
                  style={[s.day, today && { borderColor: C.leaf, borderWidth: 2 }, selectedDay === d && { borderColor: C.ink, borderWidth: 3 }]}
                >
                  {dayPosts[0] && <Image source={dayPosts[0].photo} style={StyleSheet.absoluteFill} contentFit="cover" />}
                  <Text style={[s.dayNumber, dayPosts.length > 0 && s.photoDayNumber]}>{d}</Text>
                </Pressable>}
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 14 }}>
        <PanelTitle title={selectedDay ? `Memories from day ${selectedDay}` : "Your green memories"} detail={`${visiblePosts.length} proofs`} />
        {posts.length === 0 ? <Empty icon="calendar" title="Your story starts here" text="Save your first green act. This calendar will become a little album of the things you did." /> :
          visiblePosts.length === 0 ? <Text style={caption}>No proofs this month. Explore another month to revisit your green moves.</Text> :
            <View style={s.photos}>
              {visiblePosts.map((post) => (
                <Pressable key={post.id} accessibilityRole="button" accessibilityLabel={`Open ${ACTIONS[post.action].label}, ${new Date(post.createdAt).toLocaleDateString("en")}${post.verifiedBy.length >= 3 ? ", verified" : ""}`} onPress={() => openPost(post)} style={s.memory}>
                  <View style={s.memoryMedia}>
                    <Image source={post.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <View pointerEvents="none" style={s.memoryDate}>
                      <Text style={s.memoryDateText}>{new Date(post.createdAt).toLocaleDateString("en", { day: "numeric", month: "short" })}</Text>
                    </View>
                    {post.verifiedBy.length >= 3 && <View pointerEvents="none" style={s.memoryVerified}>
                      <Icon name="checkSeal" size={24} color={C.leaf} />
                    </View>}
                  </View>
                  <View style={{ padding: 10 }}>
                    <Text style={s.memoryLabel}>{ACTIONS[post.action].label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>}
      </View>
    </View>
  );
}

export function MapPanel({ posts }: { posts: Post[] }) {
  return <ProfileMap posts={posts} />;
}

const s = StyleSheet.create({
  stack: { gap: 30 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontFamily: F.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.5, color: C.ink, flexShrink: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", backgroundColor: C.card, borderRadius: 20, padding: 6 },
  metric: { width: "50%", padding: 16, gap: 5 },
  figure: { fontFamily: F.regular, fontSize: 28, letterSpacing: -1.2, color: C.ink, fontVariant: ["tabular-nums"] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { width: "30%", flexGrow: 1, flexBasis: "30%", backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  month: { fontFamily: F.medium, fontSize: 16, color: C.ink },
  nextMonth: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: C.card },
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.285714%", textAlign: "center", paddingBottom: 10, fontFamily: F.medium, fontSize: 12, color: PROFILE_MUTED },
  daySlot: { width: "14.285714%", aspectRatio: 0.86, padding: 2 },
  day: { flex: 1, borderRadius: 10, backgroundColor: C.card, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  dayNumber: { fontFamily: F.medium, fontSize: 13, color: PROFILE_MUTED },
  photoDayNumber: { position: "absolute", bottom: 3, right: 3, backgroundColor: C.white, color: C.ink, borderRadius: 4, paddingHorizontal: 4, fontSize: 11 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  memory: { width: "46%", flexGrow: 1, flexBasis: "46%", maxWidth: "49%", backgroundColor: C.card, borderRadius: 16, overflow: "hidden" },
  memoryMedia: { width: "100%", aspectRatio: 1 },
  memoryDate: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  memoryDateText: { fontFamily: F.medium, fontSize: 11, lineHeight: 16, color: C.white, fontVariant: ["tabular-nums"] },
  memoryVerified: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  memoryLabel: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.ink },
  empty: { padding: 24, gap: 12, alignItems: "center", backgroundColor: C.card, borderRadius: 20 },
  action: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20, backgroundColor: C.forest, borderRadius: 24, marginTop: 8 },
  actionText: { fontFamily: F.medium, fontSize: 14, color: C.white },
});
