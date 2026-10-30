import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { cancelAnimation, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { levelColor, PulseDetail } from "@/components/pulse-detail";
import { SeedTip } from "@/components/seed-ui";
import { IconButton, Press, TopCover } from "@/components/ui";
import { SOURCES } from "@/data/sources";
import { usePulse } from "@/hooks/use-pulse";
import { sourceKindCopy } from "@/i18n/content";
import { timeAgo } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { pulseCards, type PulseCard } from "@/services/pulse-cards";
import { useApp } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

function PulseTile({ card, index, onOpen }: { card: PulseCard; index: number; onOpen: () => void }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const source = SOURCES[card.sources[0]];
  const value = card.key === "areas" && card.state === "unavailable" ? t("pulse.mapPaused") : card.value;
  const unit = card.key === "nature" ? t("pulse.plantSpecies") : card.unit;
  const status = card.key === "nature" && card.state === "ready" ? t("pulse.natureWindow") : card.status;
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(index * 55).duration(340)} style={{ flex: 1, minWidth: 0 }}>
      <Press onPress={onOpen} scale={reduced ? 1 : 0.97}
        accessibilityLabel={t("pulse.openCard", { label: card.label, value: `${value} ${unit ?? ""}`, status })}
        style={{ flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 15, minHeight: 176, gap: 11 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name={card.icon} size={18} color={C.ink2} />
          <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{card.label}</Text>
          <Icon name="chevron" size={13} color={C.mute} />
        </View>
        <Animated.View key={`${card.value}-${card.state}`} entering={reduced ? undefined : FadeIn.duration(200)} style={{ gap: 2 }}>
          <Text style={{ fontFamily: F.regular, fontSize: value.length > 8 ? 21 : 36, letterSpacing: -1.1, fontVariant: ["tabular-nums"], color: C.ink }}>{value}</Text>
          {!!unit && card.state === "ready" && <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.mute }}>{unit}</Text>}
        </Animated.View>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
          {card.state === "loading" ? <ActivityIndicator size="small" color={C.mute} /> : <View style={{ width: 6, height: 6, marginTop: 5, borderRadius: 3, backgroundColor: card.state === "unavailable" ? C.amber : levelColor(C)[card.level] }} />}
          <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: C.ink2 }}>{status}</Text>
        </View>
        <Text style={[T.caption, { fontSize: 11, lineHeight: 14, marginTop: "auto" }]}>{sourceKindCopy(t, source.kind).short} · {source.mark}</Text>
      </Press>
    </Animated.View>
  );
}

function PulseSkeleton() {
  const { C } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    if (!reduced) opacity.set(withRepeat(withTiming(1, { duration: 850 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);
  const shimmer = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View accessibilityLabel={t("pulse.updating")} accessibilityState={{ busy: true }} aria-busy style={{ gap: 16 }}>
      {[0, 1, 2].map((row) => <View key={row} accessible={false} style={{ flexDirection: "row", gap: 10 }}>
        {[0, 1].map((col) => <Animated.View key={col} style={[{ flex: 1, height: 176, borderRadius: R.lg, backgroundColor: C.card, padding: 18, gap: 18 }, shimmer]}>
          <View style={{ width: "55%", height: 12, borderRadius: 6, backgroundColor: C.card2 }} />
          <View style={{ width: "65%", height: 34, borderRadius: 8, backgroundColor: C.card2 }} />
          <View style={{ width: "80%", height: 10, borderRadius: 6, backgroundColor: C.card2 }} />
        </Animated.View>)}
      </View>)}
    </View>
  );
}

export default function PulseScreen() {
  const { C, T } = useTheme();
  const { top } = useSafeAreaInsets();
  const { pulse, insights, loading, refresh, ready } = usePulse();
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const { t, language } = useI18n();
  const reduced = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PulseCard["key"] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isJustNow, setIsJustNow] = useState(true);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const cards = pulseCards(pulse, insights, t);
  const selectedCard = cards.find((c) => c.key === selected);
  useEffect(() => {
    const update = () => setIsJustNow(Date.now() - pulse.fetchedAt < 60_000);
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [pulse.fetchedAt]);
  const freshness = isJustNow ? t("pulse.justNow") : t("pulse.ago", { time: timeAgo(pulse.fetchedAt, language) });
  async function reload() {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }
  function navigateFromDetail(navigate: () => void) {
    // iOS must finish dismissing its native Modal before presenting a router sheet.
    if (detailOpen && Platform.OS === "ios") pendingNavigation.current = navigate;
    else navigate();
    setDetailOpen(false);
  }
  function openSources() {
    navigateFromDetail(() => router.push("/sources"));
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 140, gap: 22 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.ink} onRefresh={reload} />}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text accessibilityRole="header" {...(Platform.OS === "web" ? { "aria-level": 1 } : {})} style={[T.display, { flex: 1 }]}>{t("pulse.title")}</Text>
            <IconButton icon="info" label={t("pulse.how")} onPress={openSources} size={44} />
            <IconButton icon="sparkle" label={t("common.askLeaf")} bg={C.forest} color={C.lime} onPress={() => router.push("/leaf")} size={44} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <Press onPress={() => router.push("/comune")} scale={reduced ? 1 : 0.98} accessibilityLabel={t("comune.change", { name: pulse.place.name })}
              style={{ flexDirection: "row", alignItems: "center", minHeight: 44, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 9, gap: 8 }}>
              <Icon name="location" size={13} color={C.forestInk} /><Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{pulse.place.name}</Text><Icon name="chevron" size={11} color={C.mute} />
            </Press>
            <Text style={[T.caption, { fontSize: 11 }]}>{loading ? t("pulse.updating") : freshness}</Text>
            {loading && <ActivityIndicator size="small" color={C.leaf} />}
          </View>
        </View>
        {ready && pulse.sample && <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.card, borderRadius: R.md, padding: 12 }}><Icon name="alert" size={16} color={C.amber} /><Text style={[T.callout, { flex: 1 }]}>{t("pulse.offline")}</Text></View>}
        {!ready ? <PulseSkeleton /> : <>
          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}><Text accessibilityRole="header" {...(Platform.OS === "web" ? { "aria-level": 2 } : {})} style={T.title}>{t("pulse.explore")}</Text></View>
            {[0, 2, 4].map((start) => <View key={start} style={{ flexDirection: "row", alignItems: "stretch", gap: 10 }}>
              {cards.slice(start, start + 2).map((card, offset) => <PulseTile key={card.key} card={card} index={start + offset} onOpen={() => { setSelected(card.key); setDetailOpen(true); }} />)}
            </View>)}
          </View>
        </>}
        <Press onPress={openSources} accessibilityLabel={t("pulse.sourcesLink")} scale={reduced ? 1 : 0.98}
          style={{ minHeight: 54, padding: 15, borderRadius: R.md, backgroundColor: C.card, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="info" size={17} color={C.ink2} /><Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{t("pulse.sourcesLink")}</Text><Icon name="chevron" size={14} color={C.mute} />
        </Press>
        <SeedTip id="pulse" text={t("seed.tips.pulse")} />
      </ScrollView>
      <TopCover />
      {selectedCard && <PulseDetail key={selectedCard.key} card={selectedCard} pulse={pulse} visible={detailOpen} explain={explain} onExplain={setExplain}
        onClose={() => setDetailOpen(false)} onSources={openSources} onRetry={reload} refreshing={refreshing}
        onDismiss={() => { const navigate = pendingNavigation.current; pendingNavigation.current = null; navigate?.(); }}
        onAction={(action) => navigateFromDetail(() => router.push({ pathname: "/capture", params: { action } }))} />}
    </View>
  );
}
