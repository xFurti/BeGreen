import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Avatar, AvatarStack, Bar, Button, IconButton, Mono, Press, SectionHeader, TextTabs, toast, TopCover } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { LEAGUE, USERS } from "@/data/seed";
import { KIND } from "@/data/squad-kinds";
import type { Squad } from "@/data/types";
import { nudgedRecently, useApp, useLeague, weekResetIn, type Racer } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { compact, haptic } from "@/utils/format";

type View_ = "friends" | "squads" | "schools";

const NUDGES = ["Time to BeGreen. Everyone’s waiting.", "Your streak called. It misses you.", "The planet left you on read.", "5 seconds. That’s all it takes."];

function Podium({ top3 }: { top3: Racer[] }) {
  // 2 · 1 · 3, like a real podium.
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const h = [74, 104, 56];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 8 }}>
      {order.map((r, i) => {
        const place = r === top3[0] ? 1 : r === top3[1] ? 2 : 3;
        return (
          <Animated.View key={r.id} entering={FadeInDown.delay(100 + i * 90).springify().damping(16)} style={{ flex: 1, alignItems: "center", gap: 8 }}>
            {place === 1 && <Icon name="crown" size={16} color={C.leaf} />}
            <Avatar src={r.avatar} name={r.name} size={place === 1 ? 56 : 46} ring={r.me ? C.leaf : undefined} />
            <View style={{ alignItems: "center", gap: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 14, letterSpacing: -0.2, color: C.ink }}>
                {r.me ? "You" : r.name}
              </Text>
              <Mono>{r.points}</Mono>
            </View>
            <View
              style={{
                width: "100%",
                height: h[i],
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                backgroundColor: place === 1 ? C.forest : place === 2 ? C.mint2 : C.mint,
                alignItems: "center",
                paddingTop: 10,
              }}
            >
              <Text style={{ fontFamily: F.medium, fontSize: 24, letterSpacing: -1, color: place === 1 ? C.lime : C.forest }}>{place}</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function RacerRow({ r, rank, index }: { r: Racer; rank: number; index: number }) {
  const recentlyNudged = nudgedRecently(useApp((s) => s.nudged[r.id]));
  const nudge = useApp((s) => s.nudge);
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 50).springify().damping(20)}
      layout={LinearTransition}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: r.me ? 14 : 0,
        marginHorizontal: r.me ? -14 : 0,
        height: 62,
        borderRadius: r.me ? R.md : 0,
        backgroundColor: r.me ? C.forest : "transparent",
        borderBottomWidth: r.me ? 0 : 1,
        borderBottomColor: C.line,
      }}
    >
      <Mono color={r.me ? C.lime : C.mute} style={{ width: 22 }}>
        {String(rank).padStart(2, "0")}
      </Mono>
      <Avatar src={r.avatar} name={r.name} size={36} invert={r.me} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: r.me ? C.white : C.ink }}>{r.me && r.name !== "You" ? `${r.name} (you)` : r.name}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 12, color: r.me ? C.forestMute : C.mute }}>
          {r.postedToday ? "BeGreen’d today" : "Not yet today"}
        </Text>
      </View>
      {!r.me && !r.postedToday && (
        <Press
          disabled={recentlyNudged}
          hapticOn={false}
          onPress={() => {
            haptic.thud();
            nudge(r.id);
            toast(`Nudged ${r.name}: “${NUDGES[r.name.length % NUDGES.length]}”`, "hand");
          }}
          accessibilityLabel={`Nudge ${r.name}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 11,
            height: 30,
            borderRadius: R.pill,
            borderWidth: 1,
            borderColor: C.mint2,
          }}
        >
          <Icon name="hand" size={12} color={C.leaf} />
          <Text style={{ fontFamily: F.medium, fontSize: 13 }}>{recentlyNudged ? "Nudged" : "Nudge"}</Text>
        </Press>
      )}
      <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.5, color: r.me ? C.white : C.ink, fontVariant: ["tabular-nums"], minWidth: 40, textAlign: "right" }}>
        {r.points}
      </Text>
    </Animated.View>
  );
}

function SquadCard({ s, index }: { s: Squad; index: number }) {
  const pct = s.quest.progress / s.quest.goal;
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(20)}>
      <Press
        scale={0.985}
        onPress={() => router.push({ pathname: "/squad/[id]", params: { id: s.id } })}
        accessibilityLabel={s.name}
        style={{ borderRadius: R.xl, borderCurve: "continuous", borderWidth: 1, borderColor: C.line, padding: 18, gap: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name={KIND[s.kind].icon} size={12} color={C.mute} />
          <Mono style={{ flex: 1 }}>
            {KIND[s.kind].label} · {s.place}
          </Mono>
          <Mono color={C.ink}>{compact(s.points)} seeds</Mono>
        </View>
        <Text style={{ fontFamily: F.medium, fontSize: 24, lineHeight: 27, letterSpacing: -0.9, color: C.ink }}>{s.name}</Text>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.ink }}>
              {s.quest.title}
            </Text>
            <Mono color={C.ink}>{Math.round(pct * 100)}%</Mono>
          </View>
          <Bar value={pct} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}>
            <AvatarStack people={s.memberIds.slice(0, 4).map((id) => ({ avatar: USERS[id]?.avatar, name: USERS[id]?.name ?? "You" }))} size={22} />
            <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.mute }}>{s.memberCount.toLocaleString("en")} members</Text>
            <Icon name={ACTIONS[s.quest.action].icon} size={13} color={C.mute} />
            <Mono>{s.quest.endsInDays}d left</Mono>
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

export default function League() {
  const { top } = useSafeAreaInsets();
  const squads = useApp((s) => s.squads);
  const join = useApp((s) => s.joinSquad);
  const league = useLeague();
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<View_>("friends");

  const myRank = league.findIndex((r) => r.me) + 1;
  const ahead = league[myRank - 2];
  const me = league[myRank - 1];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingTop: top + 10, paddingHorizontal: 20, paddingBottom: 140, gap: 22 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ gap: 6 }}>
            <Text style={T.display}>League</Text>
            <Mono>
              Week {weekNumber()} · resets in {weekResetIn()}d
            </Mono>
          </View>
          <IconButton icon="plus" label="New squad" bg={C.forest} color={C.lime} onPress={() => router.push("/new-squad")} />
        </View>

        <TextTabs<View_>
          value={tab}
          onChange={setTab}
          options={[
            { value: "friends", label: "Friends" },
            { value: "squads", label: "Squads", count: squads.length },
            { value: "schools", label: "Schools" },
          ]}
        />

        {tab === "friends" && (
          <View style={{ gap: 18 }}>
            <Podium top3={league.slice(0, 3)} />
            <View style={{ backgroundColor: C.card, borderRadius: R.lg, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 32, letterSpacing: -1.4, color: C.ink }}>#{myRank}</Text>
              <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 14, lineHeight: 19, color: C.ink2 }}>
                {ahead ? (
                  <>
                    <Text style={{ fontFamily: F.medium, color: C.ink }}>{ahead.points - me.points} seeds</Text> to pass {ahead.name}. A litter pick is worth 25.
                  </>
                ) : (
                  "You’re leading the week. Defend the crown."
                )}
              </Text>
              <Button label="Go" size="sm" onPress={() => router.push("/capture")} />
            </View>
            <View>
              {league.map((r, i) => (
                <RacerRow key={r.id} r={r} rank={i + 1} index={i} />
              ))}
            </View>
            <Text style={[T.caption, { textAlign: "center" }]}>Seeds from verified proofs this week. Fake proofs get flagged and lose them.</Text>
          </View>
        )}

        {tab === "squads" && (
          <View style={{ gap: 14 }}>
            {squads.map((s, i) => (
              <SquadCard key={s.id} s={s} index={i} />
            ))}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: C.card, borderRadius: R.pill, padding: 5, paddingLeft: 18 }}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Got a squad code?"
                placeholderTextColor={C.mute}
                autoCapitalize="characters"
                style={{ flex: 1, fontSize: 15, fontFamily: F.monoMedium, color: C.ink, height: 44, letterSpacing: 0.5 }}
              />
              <Button
                size="sm"
                label="Join"
                disabled={code.trim().length < 4}
                onPress={() => {
                  const s = join(code);
                  if (s) router.push({ pathname: "/squad/[id]", params: { id: s.id } });
                  else Alert.alert("No squad found", "Check the code with your teacher or squad captain.");
                  setCode("");
                }}
              />
            </View>
          </View>
        )}

        {tab === "schools" && (
          <View style={{ gap: 4 }}>
            <SectionHeader title="City league" action="Milano" />
            <Text style={[T.caption, { marginBottom: 10 }]}>Schools ranked by verified acts. Resets every month.</Text>
            {LEAGUE.map((l, i) => {
              const mine = l.name === "Liceo Volta";
              return (
                <Animated.View
                  key={l.id}
                  entering={FadeInDown.delay(80 + i * 60).springify().damping(20)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    height: 64,
                    paddingHorizontal: mine ? 14 : 0,
                    marginHorizontal: mine ? -14 : 0,
                    borderRadius: mine ? R.md : 0,
                    backgroundColor: mine ? C.forest : "transparent",
                    borderBottomWidth: mine ? 0 : 1,
                    borderBottomColor: C.line,
                  }}
                >
                  <Mono color={mine ? C.lime : C.mute} style={{ width: 22 }}>
                    {String(i + 1).padStart(2, "0")}
                  </Mono>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: mine ? C.white : C.ink }}>{l.name}</Text>
                    {mine && <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>Your school</Text>}
                  </View>
                  <Text style={{ fontFamily: F.medium, fontSize: 16, color: mine ? C.white : C.ink, fontVariant: ["tabular-nums"] }}>
                    {l.points.toLocaleString("en")}
                  </Text>
                  <Mono color={l.delta > 0 ? (mine ? C.lime : C.green) : l.delta < 0 ? C.red : C.mute} style={{ width: 28, textAlign: "right" }}>
                    {l.delta > 0 ? `↑${l.delta}` : l.delta < 0 ? `↓${-l.delta}` : "–"}
                  </Mono>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <TopCover />
    </View>
  );
}

function weekNumber() {
  const d = new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7);
}
