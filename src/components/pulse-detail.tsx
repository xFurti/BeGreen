import { Image } from "expo-image";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { cancelAnimation, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Button, IconButton, Mono, Press, SdgTags, Segmented, SourceBadge } from "@/components/ui";
import { ACTIONS, type ActionId } from "@/data/actions";
import type { Explain } from "@/data/types";
import { actionCopy, sourceKindCopy } from "@/i18n/content";
import { SOURCES } from "@/data/sources";
import { useI18n } from "@/i18n/use-i18n";
import { formatNumber } from "@/i18n/format";
import type { Pulse } from "@/services/env";
import { aqiBand, type Insight, type Level } from "@/services/interpret";
import type { PulseCard } from "@/services/pulse-cards";
import { F, R, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export const levelColor = (C: Palette): Record<Level, string> => ({ good: C.green, ok: C.amber, bad: C.red, info: C.mute });
const GOALS: Record<Insight["key"], number[]> = { air: [3, 11], weather: [13], water: [6], soil: [15, 2], nature: [15], areas: [15, 11] };

// Animate the real bar height: values themselves never count through invented readings.
function ChartBar({ height, color, index }: { height: number; color: string; index: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? height : 0);
  useEffect(() => {
    progress.set(reduced ? height : withDelay(index * 16, withTiming(height, { duration: 420 })));
    return () => cancelAnimation(progress);
  }, [height, index, progress, reduced]);
  const style = useAnimatedStyle(() => ({ height: progress.value }));
  return <Animated.View style={[{ width: "100%", borderRadius: 3, backgroundColor: color }, style]} />;
}

function AirChart({ data }: { data: { hour: string; aqi: number }[] }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const [selected, setSelected] = useState(0);
  const point = data[selected] ?? data[0];
  const max = Math.max(60, ...data.map((d) => d.aqi));
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink }}>{t("pulse.airChart")}</Text>
      <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.forestInk }} accessibilityLiveRegion="polite">{point ? `${point.hour}:00 · ${formatNumber(point.aqi, language)} EAQI` : "—"}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 64 }}>
        {data.map((d, index) => (
          <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: selected === index }} aria-pressed={selected === index}
            accessibilityLabel={t("pulse.chartPoint", { time: `${d.hour}:00`, value: d.aqi, unit: "EAQI" })}
            onPress={() => setSelected(index)} style={{ flex: 1, height: 64, justifyContent: "flex-end" }}>
            <ChartBar index={index} height={Math.max(4, d.aqi / max * 60)} color={selected === index ? C.forestInk : levelColor(C)[aqiBand(d.aqi, language).level]} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Mono>{t("pulse.now")}</Mono><Mono>{data[12]?.hour ?? ""}:00</Mono><Mono>{t("pulse.plus24")}</Mono></View>
    </View>
  );
}

function RainChart({ data }: { data: { day: string; mm: number }[] }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const [selected, setSelected] = useState(Math.max(0, data.length - 4));
  const point = data[selected] ?? data[0];
  const max = Math.max(5, ...data.map((d) => d.mm));
  const todayIdx = data.length - 3;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink }}>{t("pulse.rainChart")}</Text>
      <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.forestInk }} accessibilityLiveRegion="polite">{point ? `${point.day} · ${formatNumber(point.mm, language)} mm` : "—"}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5, height: 64 }}>
        {data.map((d, index) => (
          <Pressable key={d.day} accessibilityRole="button" accessibilityState={{ selected: selected === index }} aria-pressed={selected === index}
            accessibilityLabel={t("pulse.chartPoint", { time: d.day, value: formatNumber(d.mm, language), unit: "mm" })}
            onPress={() => setSelected(index)} style={{ flex: 1, height: 64, justifyContent: "flex-end" }}>
            <ChartBar index={index} height={Math.max(3, d.mm / max * 60)} color={selected === index ? C.leaf : index >= todayIdx ? C.band : C.forestInk} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Mono>{t("pulse.minus7")}</Mono><Mono>{t("pulse.forecast")}</Mono></View>
    </View>
  );
}

function Extra({ k, pulse }: { k: Insight["key"]; pulse: Pulse }) {
  const { C } = useTheme();
  const reduced = useReducedMotion();
  if (k === "air" && pulse.air?.next24.length) return <AirChart data={pulse.air.next24} />;
  if (k === "water" && pulse.water?.daily.length) return <RainChart data={pulse.water.daily} />;
  if (k === "nature" && pulse.nature?.top.length) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginHorizontal: -24 }}>
        <View style={{ width: 10 }} />
        {pulse.nature.top.slice(0, 10).map((s) => (
          <View key={s.id} style={{ width: 120, gap: 6 }}>
            <View style={{ width: 120, height: 150, borderRadius: 16, overflow: "hidden", backgroundColor: C.card }}>
              {s.photo ? <Image source={s.photo} style={{ flex: 1 }} contentFit="cover" transition={reduced ? 0 : 200} priority="low" /> : null}
              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: C.scrim, paddingHorizontal: 6, height: 18, borderRadius: 9, justifyContent: "center" }}>
                <Mono color={C.white} size={10}>
                  ×{s.count}
                </Mono>
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 13, letterSpacing: -0.2, color: C.ink }}>
              {s.common ?? s.name}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 11, color: C.mute, fontStyle: "italic", marginTop: -4 }}>
              {s.name}
            </Text>
            {!!s.attribution && (
              <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 9, color: C.mute, marginTop: -4 }}>
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
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.ink }} numberOfLines={1}>
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

export function PulseDetail({ card, pulse, visible, explain, onExplain, onClose, onDismiss, onSources, onAction, onRetry, refreshing }: {
  card: PulseCard; pulse: Pulse; visible: boolean; explain: Explain; onExplain: (v: Explain) => void;
  onClose: () => void; onDismiss: () => void; onSources: () => void; onAction: (action: ActionId) => void; onRetry: () => void; refreshing: boolean;
}) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const { top, bottom } = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const titleRef = useRef<ComponentRef<typeof View>>(null);
  const [showLimits, setShowLimits] = useState(false);
  return (
    <Modal transparent visible={visible} accessibilityLabel={card.label} animationType={reduced ? "none" : "slide"} onRequestClose={onClose} onDismiss={onDismiss} onShow={() => {
      const title = titleRef.current;
      if (!title) return;
      if (Platform.OS === "web") title.focus();
      else AccessibilityInfo.sendAccessibilityEvent(title, "focus");
    }}>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingTop: top + 16, backgroundColor: C.scrim }}>
        <View accessible={false} onStartShouldSetResponder={() => true} onResponderRelease={onClose} style={{ position: "absolute", inset: 0 }} />
        <View role={Platform.OS === "web" ? undefined : "dialog"} accessibilityViewIsModal={Platform.OS !== "web"}
          aria-modal={Platform.OS === "web" ? undefined : true} accessibilityLabel={Platform.OS === "web" ? undefined : card.label}
          style={{ maxHeight: "92%", width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, overflow: "hidden" }}>
          <View style={{ width: 34, height: 4, borderRadius: 4, backgroundColor: C.faint, alignSelf: "center", marginTop: 10 }} />
          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={card.label} tabIndex={-1} style={{ flex: 1 }}><Text style={T.title}>{card.label}</Text></View>
            <IconButton icon="close" label={t("common.close")} onPress={onClose} size={44} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom + 28, gap: 20 }}>
            {pulse.sample && (
              <View style={{ backgroundColor: C.card, borderRadius: R.md, padding: 12, borderLeftWidth: 3, borderLeftColor: C.amber }}>
                <Text style={T.callout}>{t("pulse.offline")}</Text>
              </View>
            )}
            <View style={{ gap: 6 }}>
              {card.sources.map((s) => <SourceBadge key={s} id={s} onPress={onSources} />)}
              <Text selectable style={{ fontFamily: F.medium, fontSize: 62, letterSpacing: -2.5, color: C.ink }}>{card.value}</Text>
              {!!card.unit && <Text style={T.caption}>{card.unit}</Text>}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: levelColor(C)[card.level] }} />
                <Text style={T.callout}>{card.status}</Text>
              </View>
            </View>
            <Extra k={card.key} pulse={pulse} />
            <View style={{ gap: 12 }}>
              <Text style={T.headline}>{t("pulse.explains")}</Text>
              <Segmented<Explain> value={explain} onChange={onExplain} label={t("pulse.explains")} options={[
                { value: "me", label: t("common.me") }, { value: "class", label: t("common.myClass") }, { value: "comune", label: t("pulse.forComune") },
              ]} />
              <Animated.Text key={`${explain}-${card.state}`} entering={reduced ? undefined : FadeIn.duration(200)} selectable style={[T.callout, { lineHeight: 23 }]}>{card.explain[explain]}</Animated.Text>
            </View>
            {card.state !== "ready" ? <Button label={t("pulse.retry")} icon="refresh" kind="secondary" loading={refreshing || card.state === "loading"} onPress={onRetry} /> : card.act && (
              <Press onPress={() => onAction(card.act!.action)} accessibilityLabel={card.act.label}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.mint, borderWidth: 1, borderColor: C.band, borderRadius: R.md, padding: 16 }}>
                <Icon name={ACTIONS[card.act.action].icon} size={22} color={C.forestInk} />
                <View style={{ flex: 1, gap: 4 }}><Text style={T.headline}>{card.act.label}</Text><Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestInk }}>{actionCopy(t, card.act.action).label} · +{ACTIONS[card.act.action].seeds}</Text></View>
                <Icon name="arrowRight" size={17} color={C.forestInk} />
              </Press>
            )}
            <SdgTags goals={GOALS[card.key]} />
            <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("pulse.limits")} accessibilityState={{ expanded: showLimits }} aria-expanded={showLimits} onPress={() => setShowLimits(!showLimits)}
                style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.forestInk }}>{t("pulse.limits")}</Text><Icon name={showLimits ? "minus" : "plus"} size={17} color={C.forestInk} />
              </Pressable>
              {showLimits && <Animated.View entering={reduced ? undefined : FadeIn.duration(180)} style={{ gap: 12 }}>
                <Text selectable style={T.callout}>{t(`pulse.caveats.${card.key}`)}</Text>
                <Text selectable style={T.caption}>{sourceKindCopy(t, SOURCES[card.sources[0]].kind).careful}</Text>
                <Button label={t("pulse.sourcesLink")} size="md" kind="secondary" icon="info" onPress={onSources} />
              </Animated.View>}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
