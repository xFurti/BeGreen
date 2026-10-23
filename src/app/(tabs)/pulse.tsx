import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Blobs } from "@/components/nature";
import { Button, IconButton, Mono, Press, SdgTags, Segmented, SourceBadge, TopCover } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import type { Explain } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import type { Pulse } from "@/services/env";
import { aqiBand, type Insight, type Level } from "@/services/interpret";
import { useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { timeAgo } from "@/utils/format";

const DOT: Record<Level, string> = { good: C.green, ok: C.amber, bad: C.red, info: C.faint };

const GOALS: Record<Insight["key"], number[]> = {
  air: [3, 11],
  weather: [13],
  water: [6],
  soil: [15, 2],
  nature: [15],
  areas: [15, 11],
};

function AirChart({ data }: { data: { hour: string; aqi: number }[] }) {
  const max = Math.max(60, ...data.map((d) => d.aqi));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 52 }}>
        {data.map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(6, (d.aqi / max) * 100)}%`,
              borderRadius: 2,
              backgroundColor: i === 0 ? C.forest : d.aqi > 60 ? C.red : C.mint2,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Mono>Now</Mono>
        <Mono>{data[12]?.hour ?? ""}:00</Mono>
        <Mono>+24h</Mono>
      </View>
    </View>
  );
}

function RainChart({ data }: { data: { day: string; mm: number }[] }) {
  const max = Math.max(5, ...data.map((d) => d.mm));
  const todayIdx = data.length - 3;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5, height: 44 }}>
        {data.map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(4, (d.mm / max) * 100)}%`,
              borderRadius: 2,
              backgroundColor: i >= todayIdx ? C.mint2 : C.forest,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Mono>−7 days</Mono>
        <Mono>Today → forecast</Mono>
      </View>
    </View>
  );
}

function Extra({ k, pulse }: { k: Insight["key"]; pulse: Pulse }) {
  if (k === "air" && pulse.air?.next24.length) return <AirChart data={pulse.air.next24} />;
  if (k === "water" && pulse.water?.daily.length) return <RainChart data={pulse.water.daily} />;
  if (k === "nature" && pulse.nature?.top.length) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 10 }} />
        {pulse.nature.top.slice(0, 10).map((s) => (
          <View key={s.id} style={{ width: 120, gap: 6 }}>
            <View style={{ width: 120, height: 150, borderRadius: 16, overflow: "hidden", backgroundColor: C.card }}>
              {s.photo ? <Image source={s.photo} style={{ flex: 1 }} contentFit="cover" transition={200} /> : null}
              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 6, height: 18, borderRadius: 9, justifyContent: "center" }}>
                <Mono color={C.white} size={10}>
                  ×{s.count}
                </Mono>
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 13, letterSpacing: -0.2 }}>
              {s.common ?? s.name}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 11, color: C.mute, fontStyle: "italic", marginTop: -4 }}>
              {s.name}
            </Text>
            {!!s.attribution && (
              <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 9, color: C.faint, marginTop: -4 }}>
                {s.attribution}
              </Text>
            )}
          </View>
        ))}
        <View style={{ width: 10 }} />
      </ScrollView>
    );
  }
  if (k === "areas" && pulse.areas?.length) {
    return (
      <View>
        {pulse.areas.slice(0, 4).map((a, i) => (
          <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
            <Icon name="tree" size={14} color={C.ink} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14 }} numberOfLines={1}>
              {a.name}
            </Text>
            <Mono color={C.ink}>{a.km} km</Mono>
          </View>
        ))}
      </View>
    );
  }
  return null;
}

function InsightCard({ i, explain, pulse, index }: { i: Insight; explain: Explain; pulse: Pulse; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(20)}
      layout={LinearTransition}
      style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18, paddingBottom: 26, gap: 16 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Mono>{String(index + 1).padStart(2, "0")}</Mono>
        <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, flex: 1 }}>{i.label}</Text>
        {i.sources.slice(0, 1).map((s) => (
          <SourceBadge key={s} id={s} onPress={() => router.push("/sources")} />
        ))}
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text selectable style={{ fontFamily: F.medium, fontSize: 56, lineHeight: 58, letterSpacing: -3, fontVariant: ["tabular-nums"], color: C.ink }}>
          {i.value}
        </Text>
        {i.unit && <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.mute, paddingBottom: 10 }}>{i.unit}</Text>}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 12 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: DOT[i.level] }} />
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{i.status}</Text>
        </View>
      </View>

      <Extra k={i.key} pulse={pulse} />

      <Animated.Text key={explain} entering={FadeIn.duration(250)} selectable style={[T.callout, { fontSize: 15, lineHeight: 22 }]}>
        {i.explain[explain]}
      </Animated.Text>

      <SdgTags goals={GOALS[i.key]} />

      {i.act && (
        <Press
          onPress={() => router.push({ pathname: "/capture", params: { action: i.act!.action } })}
          accessibilityLabel={i.act.label}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.md, padding: 14 }}
        >
          <Icon name={ACTIONS[i.act.action].icon} size={16} color={C.ink} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2 }}>{i.act.label}</Text>
            <Mono>
              {ACTIONS[i.act.action].label} · +{ACTIONS[i.act.action].seeds}
            </Mono>
          </View>
          <Icon name="arrowRight" size={14} color={C.ink} />
        </Press>
      )}
    </Animated.View>
  );
}

function Cell({ label, value, sub, last }: { label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6, paddingRight: 10, borderRightWidth: last ? 0 : 1, borderRightColor: C.line, paddingLeft: 10 }}>
      <Mono>{label}</Mono>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.medium, fontSize: 24, letterSpacing: -1, color: C.ink }}>
        {value}
      </Text>
      {sub && (
        <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12, color: C.mute }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

export default function PulseScreen() {
  const { top } = useSafeAreaInsets();
  const { pulse, insights, drop, loading, refresh, ready } = usePulse();
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const [refreshing, setRefreshing] = useState(false);

  const bad = insights.filter((i) => i.level === "bad");
  const lever = bad[0];
  const air = pulse.air ? aqiBand(pulse.air.aqi) : null;
  const da = ACTIONS[drop.action];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingTop: top + 10, paddingHorizontal: 20, paddingBottom: 140, gap: 22 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.ink}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh(true);
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ gap: 6 }}>
            <Text style={T.display}>Pulse</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="location" size={11} color={C.mute} />
              <Mono>
                {pulse.place.name} · {loading ? "updating" : `${timeAgo(pulse.fetchedAt)} ago`}
              </Mono>
              {loading && <ActivityIndicator size="small" color={C.mute} />}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton icon="info" label="How we know" onPress={() => router.push("/sources")} />
            <IconButton icon="sparkle" label="Ask Leaf" bg={C.forest} color={C.lime} onPress={() => router.push("/leaf")} />
          </View>
        </View>

        {ready && pulse.sample && (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: C.card, borderRadius: R.md, padding: 12 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.amber }} />
            <Text style={{ flex: 1, fontFamily: F.regular, color: C.ink2, fontSize: 13 }}>Offline. Showing sample data. Pull to refresh.</Text>
          </View>
        )}

        {!ready ? (
          <View style={{ gap: 12 }}>
            {[110, 200, 200].map((h, i) => (
              <View key={i} style={{ height: h, borderRadius: R.lg, backgroundColor: C.mint, alignItems: "center", justifyContent: "center", gap: 10 }}>
                {i === 0 && (
                  <>
                    <ActivityIndicator color={C.leaf} />
                    <Mono>Reading {pulse.place.name}</Mono>
                  </>
                )}
              </View>
            ))}
          </View>
        ) : (
          <>
            <Animated.View entering={FadeIn} style={{ flexDirection: "row", marginHorizontal: -10, paddingVertical: 4 }}>
              {air && <Cell label="Air" value={air.label} sub={`EAQI ${pulse.air!.aqi}`} />}
              {pulse.weather && <Cell label="Temp" value={`${pulse.weather.temp}°`} sub={`${pulse.weather.tmin}° / ${pulse.weather.tmax}°`} />}
              {pulse.water && <Cell label="Dry days" value={String(pulse.water.dryDays)} sub={`${Math.round(pulse.water.rain7)} mm/7d`} />}
              {pulse.nature && <Cell label="Species" value={String(pulse.nature.speciesCount)} sub="10 km" last />}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(80)}
              style={{
                backgroundColor: C.forest,
                borderRadius: R.sm,
                borderTopLeftRadius: 40,
                borderBottomRightRadius: 40,
                borderCurve: "continuous",
                padding: 20,
                gap: 18,
                overflow: "hidden",
              }}
            >
              <Blobs colors={[C.leaf, C.lime]} opacity={0.18} />
              <Mono color={C.forestMute}>Today in {pulse.place.name}</Mono>
              <Text style={{ fontFamily: F.medium, fontSize: 30, lineHeight: 33, letterSpacing: -1.3, color: C.white }}>
                {lever ? (
                  <>
                    Biggest lever today: <Text style={{ color: C.lime }}>{lever.label.toLowerCase()}.</Text>
                  </>
                ) : (
                  <>
                    All clear. <Text style={{ color: C.lime }}>Make it count anyway.</Text>
                  </>
                )}
              </Text>
              <Button
                kind="inverse"
                icon={da.icon}
                label={`Do today’s Drop`}
                trailing={`+${da.seeds + 10}`}
                onPress={() => router.push({ pathname: "/capture", params: { action: drop.action } })}
              />
            </Animated.View>

            <View style={{ gap: 12, paddingTop: 8 }}>
              <Mono color={C.ink}>Explain it for</Mono>
              <Segmented<Explain>
                value={explain}
                onChange={setExplain}
                options={[
                  { value: "me", label: "Me" },
                  { value: "class", label: "My class" },
                  { value: "comune", label: "Comune" },
                ]}
              />
            </View>

            <View>
              {insights.map((i, idx) => (
                <InsightCard key={i.key} i={i} explain={explain} pulse={pulse} index={idx} />
              ))}
            </View>
          </>
        )}

        <Press
          onPress={() => router.push("/sources")}
          style={{ padding: 20, borderRadius: R.lg, backgroundColor: C.card, gap: 8 }}
          accessibilityLabel="About the data"
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, flex: 1 }}>Not all data is equal</Text>
            <Icon name="arrowRight" size={14} color={C.ink} />
          </View>
          <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>
            Stations, models, citizen observations and maps measure different things in different ways. Tap any source to see what it’s good
            for and where to be careful.
          </Text>
        </Press>
      </ScrollView>
      <TopCover />
    </View>
  );
}
