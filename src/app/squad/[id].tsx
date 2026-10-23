import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Icon } from "@/components/icon";
import { AvatarStack, Bar, Button, Mono, Press, SdgTags, SourceBadge } from "@/components/ui";
import { KIND } from "@/data/squad-kinds";
import { ACTIONS, DOMAINS, type ActionId, type Domain } from "@/data/actions";
import { USERS } from "@/data/seed";
import { usePulse } from "@/hooks/use-pulse";
import { useAllPosts, useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";

function Ring({ value, size = 112 }: { value: number; size?: number }) {
  const r = size / 2 - 5;
  const len = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.mint2} strokeWidth={6} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={C.leaf}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - Math.min(1, value))}
      />
    </Svg>
  );
}

export default function SquadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squad = useApp((s) => s.squads.find((x) => x.id === id));
  const posts = useAllPosts().filter((p) => p.squadId === id);
  const { insights, pulse } = usePulse();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 40 - 8) / 3);

  if (!squad) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={T.body}>Squad not found.</Text>
      </View>
    );
  }

  const pct = squad.quest.progress / squad.quest.goal;
  const monthly = (Object.entries(squad.monthly) as [ActionId, number][]).sort((a, b) => b[1] - a[1]);
  const total = monthly.reduce((a, [, n]) => a + n, 0);
  const maxN = Math.max(1, ...monthly.map(([, n]) => n));
  const co2 = monthly.reduce((a, [k, n]) => a + (ACTIONS[k].impact.unit === "kg CO₂e" ? ACTIONS[k].impact.value * n : 0), 0);
  const items = monthly.reduce((a, [k, n]) => a + (ACTIONS[k].impact.unit === "items" ? ACTIONS[k].impact.value * n : 0), 0);
  const records = squad.monthly.spot ?? 0;
  const domainHits = new Map<Domain, number>();
  monthly.forEach(([k, n]) => ACTIONS[k].domains.forEach((d) => domainHits.set(d, (domainHits.get(d) ?? 0) + n)));
  const goals = Array.from(new Set(monthly.flatMap(([k]) => ACTIONS[k].sdgs))).sort((a, b) => a - b);
  const bad = insights.filter((i) => i.level === "bad");

  const report =
    `BeGreen Community Report · ${squad.name} (${squad.place})\n` +
    `Month to date: ${total.toLocaleString("en")} verified acts by ${squad.memberCount.toLocaleString("en")} members.\n` +
    monthly.map(([k, n]) => `• ${ACTIONS[k].label}: ${n}`).join("\n") +
    `\nEstimated: ≈${Math.round(co2).toLocaleString("en")} kg CO₂e avoided, ≈${Math.round(items).toLocaleString("en")} items diverted, ${records} species records.\n` +
    `Agenda 2030 goals touched: ${goals.map((g) => `SDG ${g}`).join(", ")}.\n` +
    `Local context (${pulse.place.name}): ${insights.map((i) => `${i.label} ${i.value}${i.unit ? " " + i.unit : ""} (${i.status})`).join("; ")}.\n` +
    `Sources: CAMS/Open-Meteo (model), iNaturalist (citizen science), OpenStreetMap (map), BeGreen (community, anonymised). Estimates are indicative.`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 32 }} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: "" }} />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={KIND[squad.kind].icon} size={12} color={C.mute} />
          <Mono>
            {KIND[squad.kind].label} · {squad.place}
          </Mono>
        </View>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{squad.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 }}>
          <AvatarStack people={squad.memberIds.slice(0, 5).map((m) => ({ avatar: USERS[m]?.avatar, name: USERS[m]?.name ?? "You" }))} size={28} />
          <Text style={{ flex: 1, fontFamily: F.regular, color: C.ink2 }}>{squad.memberCount.toLocaleString("en")} members</Text>
          <Press
            onPress={() => Share.share({ message: `Join my BeGreen squad “${squad.name}” with code ${squad.code}` })}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 34, borderRadius: R.pill }}
            accessibilityLabel="Share invite code"
          >
            <Text style={{ fontFamily: F.monoMedium, fontSize: 13, letterSpacing: 1 }}>{squad.code}</Text>
            <Icon name="share" size={13} />
          </Press>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, backgroundColor: C.mint, borderRadius: R.xl, padding: 18 }}>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Ring value={pct} />
          <Text style={{ position: "absolute", fontFamily: F.medium, fontSize: 26, letterSpacing: -1.2 }}>{Math.round(pct * 100)}%</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Mono>Weekly quest · {squad.quest.endsInDays}d left</Mono>
          <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 23, letterSpacing: -0.6 }}>{squad.quest.title}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>
            {squad.quest.progress.toLocaleString("en")} / {squad.quest.goal.toLocaleString("en")}
          </Text>
          <Button
            size="sm"
            label="Add yours"
            icon={ACTIONS[squad.quest.action].icon}
            style={{ alignSelf: "flex-start", marginTop: 6 }}
            onPress={() => router.push({ pathname: "/capture", params: { action: squad.quest.action } })}
          />
        </View>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Mono>Community report · this month</Mono>
          <Text style={T.callout}>
            {squad.kind === "comune"
              ? "Aggregated and anonymised for the administration. No names, no exact locations."
              : "What your squad did this month. Ready to send to your school or Comune."}
          </Text>
        </View>

        <View style={{ flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line }}>
          <Metric label="Verified acts" value={total.toLocaleString("en")} />
          <Metric label="kg CO₂e (est.)" value={Math.round(co2).toLocaleString("en")} border />
          <Metric label="Items (est.)" value={Math.round(items).toLocaleString("en")} border />
        </View>

        <View style={{ gap: 14, paddingTop: 4 }}>
          {monthly.map(([k, n], i) => (
            <Animated.View key={k} entering={FadeInDown.delay(i * 40)} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name={ACTIONS[k].icon} size={13} color={C.ink} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14 }}>{ACTIONS[k].label}</Text>
                <Mono color={C.ink}>{n.toLocaleString("en")}</Mono>
              </View>
              <Bar value={n / maxN} color={i === 0 ? C.leaf : C.forestMute} height={3} />
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <Mono>Data meets action</Mono>
        <Text style={[T.body, { fontSize: 15, lineHeight: 22, color: C.ink2 }]}>
          {bad.length
            ? `Today in ${pulse.place.name}, ${bad.map((b) => `${b.label.toLowerCase()} is ${b.status.toLowerCase()}`).join(" and ")}. `
            : `No red flags in today's local data for ${pulse.place.name}. `}
          This squad’s acts cover <Text style={{ fontFamily: F.medium, color: C.ink }}>{domainHits.size} of 7</Text> sustainability areas and{" "}
          <Text style={{ fontFamily: F.medium, color: C.ink }}>{goals.length} of 17</Text> UN goals.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {(Object.keys(DOMAINS) as Domain[]).map((d) => {
            const on = domainHits.has(d);
            return (
              <View
                key={d}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  height: 28,
                  borderRadius: R.pill,
                  backgroundColor: on ? C.forest : C.card,
                }}
              >
                <Icon name={DOMAINS[d].icon} size={11} color={on ? C.lime : C.faint} />
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: on ? C.white : C.mute }}>{DOMAINS[d].label}</Text>
              </View>
            );
          })}
        </View>
        <SdgTags goals={goals} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <SourceBadge id="begreen" />
          <SourceBadge id="cams" />
          <SourceBadge id="inat" />
        </View>
      </View>

      <Button label="Share report" icon="share" onPress={() => Share.share({ message: report })} />

      {posts.length > 0 && (
        <View style={{ gap: 12 }}>
          <Mono>Latest proofs</Mono>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {posts.slice(0, 9).map((p) => (
              <Press
                key={p.id}
                onPress={() => router.push({ pathname: "/post/[id]", params: { id: p.id } })}
                style={{ width: tile, height: tile * 1.25, borderRadius: 12, overflow: "hidden" }}
                accessibilityLabel={ACTIONS[p.action].label}
              >
                <Image source={p.photo} style={{ flex: 1 }} contentFit="cover" />
              </Press>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingLeft: border ? 12 : 0, borderLeftWidth: border ? 1 : 0, borderLeftColor: C.line, gap: 4 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 24, letterSpacing: -1, fontVariant: ["tabular-nums"] }} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      <Mono>{label}</Mono>
    </View>
  );
}
