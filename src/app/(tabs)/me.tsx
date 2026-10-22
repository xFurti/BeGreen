import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ComuneSection } from "@/components/comune-card";
import { Icon, type IconName } from "@/components/icon";
import { Avatar, IconButton, Logo, Mono, Press, SectionHeader, TopCover, useCountUp } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { daysTo2030, SDG_LIST, SDGS } from "@/data/sdgs";
import type { Post } from "@/data/types";
import { useComune } from "@/hooks/use-comune";
import { sdgsOf, seedsOf, streakOf, useApp, useLeague } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const ROLE_LABEL = { student: "Student", teacher: "Teacher", association: "Association", comune: "Comune" } as const;

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
                accessibilityLabel={`SDG ${g}: ${SDGS[g]}${on ? ", moved" : ""}`}
                onPress={() => {
                  haptic.tap();
                  setSel(active ? null : g);
                }}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: on ? C.ink : C.card,
                  borderWidth: active ? 2 : 0,
                  borderColor: on ? C.mute : C.ink,
                  padding: 8,
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.8, color: on ? C.white : C.faint }}>{g}</Text>
                {on && <Text style={{ fontFamily: F.monoMedium, fontSize: 9, color: C.nightMute, alignSelf: "flex-end" }}>×{counts.get(g)}</Text>}
              </Pressable>
            </Animated.View>
          );
        })}
        <View style={{ width: cell, height: cell, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 7, justifyContent: "space-between" }}>
          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.7, color: C.ink }}>
            {daysTo2030()}
          </Text>
          <Text style={{ fontFamily: F.monoMedium, fontSize: 8, color: C.mute, lineHeight: 10 }}>DAYS TO 2030</Text>
        </View>
      </View>
      <Text style={[T.callout, { minHeight: 42 }]}>
        {sel ? (
          <>
            <Text style={{ fontFamily: F.medium, color: C.ink }}>
              SDG {sel} · {SDGS[sel]}.
            </Text>{" "}
            {touched.has(sel) ? `You moved it ${counts.get(sel)} time${counts.get(sel) === 1 ? "" : "s"}.` : "Not yet. Which act could move it?"}
          </>
        ) : (
          <>
            You’ve moved <Text style={{ fontFamily: F.medium, color: C.ink }}>{touched.size} of 17</Text> UN goals. Tap one to see it. Collect
            them all before 2030.
          </>
        )}
      </Text>
    </View>
  );
}

function Calendar({ posts }: { posts: Post[] }) {
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
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
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
                  accessibilityLabel={p ? `${ACTIONS[p.action].label} on day ${d}` : `Day ${d}`}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    overflow: "hidden",
                    backgroundColor: p ? C.card2 : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: today ? 1.5 : 0,
                    borderColor: C.ink,
                  }}
                >
                  {p ? (
                    <>
                      <Image source={p.photo} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" />
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
  return (
    <View style={{ flex: 1, gap: 4, paddingLeft: first ? 0 : 14, borderLeftWidth: first ? 0 : 1, borderLeftColor: C.line }}>
      <Text style={{ fontFamily: F.medium, fontSize: 34, lineHeight: 38, letterSpacing: -1.6, color: C.ink, fontVariant: ["tabular-nums"] }}>
        {n.toLocaleString("en")}
      </Text>
      <Mono>{label}</Mono>
    </View>
  );
}

export default function Me() {
  const { top } = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const posts = useApp((s) => s.myPosts);
  const bonus = useApp((s) => s.bonusSeeds);
  const verifiedCount = useApp((s) => Object.keys(s.verified).length);
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const reset = useApp((s) => s.reset);
  const pulse = useApp((s) => s.pulse);
  const comune = useComune();
  const league = useLeague();
  const rank = league.findIndex((r) => r.me) + 1;

  const { width } = useWindowDimensions();
  const badgeSize = Math.floor((width - 40 - 16) / 3);
  const streak = streakOf(posts);
  const seeds = seedsOf(posts, bonus);
  const imp = impact(posts);
  const kinds = new Set(posts.map((p) => p.action));
  const goals = sdgsOf(posts);

  const badges: { icon: IconName; label: string; on: boolean }[] = [
    { icon: "camera", label: "First proof", on: posts.length > 0 },
    { icon: "flame", label: "7-day streak", on: streak >= 7 },
    { icon: "bike", label: "Car-free ×5", on: posts.filter((p) => p.action === "move").length >= 5 },
    { icon: "binoculars", label: "Spotter", on: kinds.has("spot") },
    { icon: "shield", label: "Verifier ×10", on: verifiedCount >= 10 },
    { icon: "globe", label: "10 of 17 goals", on: goals.size >= 10 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: top + 10, paddingHorizontal: 20, paddingBottom: 140, gap: 40 }}>
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Avatar name={profile.name || "You"} size={76} />
            <IconButton
              icon="share"
              label="Share profile"
              onPress={() =>
                Share.share({ message: `I’m on a ${streak}-day BeGreen streak and #${rank} among my friends this week. Beat that. 🌱 #BeGreen` })
              }
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={[T.hero, { fontSize: 40, lineHeight: 42 }]}>{profile.name || "You"}</Text>
            <Mono>
              @{profile.handle || "you"} · {ROLE_LABEL[profile.role]} · #{rank} this week
            </Mono>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Stat value={streak} label="Day streak" first />
            <Stat value={seeds} label="Seeds" />
            <Stat value={posts.filter((p) => p.verifiedBy.length >= 3).length} label="Verified" />
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(80)} style={{ gap: 16 }}>
          <SectionHeader index="01" title="Agenda 2030" action={`${goals.size}/17`} />
          <Agenda posts={posts} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120)} style={{ gap: 16 }}>
          <SectionHeader index="02" title="My Comune" action="Sources →" onAction={() => router.push("/sources")} />
          <ComuneSection view={comune} pulse={pulse} />
        </Animated.View>

        <View style={{ gap: 16 }}>
          <SectionHeader index="03" title="Impact" action="How we count →" onAction={() => router.push("/sources")} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: C.line }}>
            <Imp value={imp.co2.toFixed(1)} label="kg CO₂e avoided" />
            <Imp value={String(imp.items)} label="items kept from waste" right />
            <Imp value={String(imp.litres)} label="litres saved" />
            <Imp value={String(imp.records)} label="species records" right />
          </View>
          <Text style={T.caption}>Estimates. Useful to compare and motivate, not to certify.</Text>
        </View>

        <View style={{ gap: 16 }}>
          <SectionHeader index="04" title="Memories" action={new Date().toLocaleString("en", { month: "long" })} />
          <Calendar posts={posts} />
        </View>

        <View style={{ gap: 16 }}>
          <SectionHeader index="05" title="Badges" action={`${badges.filter((b) => b.on).length}/${badges.length}`} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {badges.map((b) => (
              <View
                key={b.label}
                style={{
                  width: badgeSize,
                  height: badgeSize * 0.9,
                  borderRadius: R.md,
                  borderCurve: "continuous",
                  backgroundColor: b.on ? C.ink : C.card,
                  padding: 12,
                  justifyContent: "space-between",
                }}
              >
                <Icon name={b.on ? b.icon : "lock"} size={18} color={b.on ? C.white : C.faint} />
                <Text style={{ fontFamily: F.medium, fontSize: 13, letterSpacing: -0.2, color: b.on ? C.white : C.mute }}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
          <Row
            icon="doc"
            label="Explanations"
            value={{ me: "Me", class: "My class", comune: "Comune" }[explain]}
            onPress={() => setExplain(explain === "me" ? "class" : explain === "class" ? "comune" : "me")}
          />
          <Row icon="book" label="How-to guide" onPress={() => router.push("/guide")} />
          <Row icon="shield" label="Data sources & trust" onPress={() => router.push("/sources")} />
          <Row icon="sparkle" label="Ask Leaf" onPress={() => router.push("/leaf")} />
          <Row
            icon="refresh"
            label="Reset demo"
            onPress={() =>
              Alert.alert("Reset BeGreen?", "This clears your posts and returns to onboarding.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: () => {
                    reset();
                    router.replace("/onboarding");
                  },
                },
              ])
            }
          />
        </View>

        <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
          <Logo size={22} color={C.faint} />
          <Mono color={C.faint}>Proof, not promises · v1.1</Mono>
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
      <Icon name={icon} size={16} color={C.ink} />
      <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.2 }}>{label}</Text>
      {value && <Mono color={C.ink}>{value}</Mono>}
      <Icon name="chevron" size={12} color={C.faint} />
    </Press>
  );
}
