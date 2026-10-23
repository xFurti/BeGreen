import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useCountdown } from "@/components/drop-card";
import { Icon } from "@/components/icon";
import { Button, LiveDot, Mono, SdgTags, SourceBadge } from "@/components/ui";
import { usePulse } from "@/hooks/use-pulse";
import type { MessageKey, Translator } from "@/i18n/catalog";
import { actionCopy } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import { useI18n } from "@/i18n/use-i18n";
import type { Drop } from "@/services/drop";
import { canClaimDrop, seedsFor } from "@/services/rewards";
import { hasBackend } from "@/services/supabase";
import { useApp } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const READINGS: { key: string; label: MessageKey; unit?: string; pct?: boolean; unitKey?: MessageKey }[] = [
  { key: "aqi", label: "dropSheet.readings.aqi", unit: "EAQI" },
  { key: "pm25", label: "dropSheet.readings.pm25", unit: "µg/m³" },
  { key: "no2", label: "dropSheet.readings.no2", unit: "µg/m³" },
  { key: "temp", label: "dropSheet.readings.temp", unit: "°C" },
  { key: "rain7", label: "dropSheet.readings.rain7", unit: "mm" },
  { key: "dryDays", label: "dropSheet.readings.dryDays" },
  { key: "soilMoisture", label: "dropSheet.readings.soil", pct: true },
  { key: "plantSpecies", label: "dropSheet.readings.species", unitKey: "dropSheet.readings.speciesUnit" },
  { key: "area", label: "dropSheet.readings.area" },
];

function readings(d: Drop["data"], t: Translator, lang: Language) {
  return READINGS.filter((r) => d[r.key] !== undefined).map((r) => {
    const v = d[r.key];
    const value = typeof v === "number" ? (r.pct ? `${Math.round(v * 100)}%` : formatNumber(v, lang)) : v;
    const unit = r.key === "area" && typeof d.areaKm === "number" ? t("common.km", { km: formatNumber(d.areaKm, lang) }) : r.unitKey ? t(r.unitKey) : r.unit;
    return { key: r.key, label: t(r.label), value, unit };
  });
}

export default function DropSheet() {
  const { C, T } = useTheme();
  const { drop, pulse } = usePulse();
  const comune = useApp((s) => s.comune);
  const { t, language } = useI18n();
  const place = comune?.name ?? pulse.place.name;
  const a = actionCopy(t, drop.action);
  const left = useCountdown();
  const bonus = useApp((s) => canClaimDrop(drop, s.posts, s.userId, hasBackend));
  const rows = readings(drop.data, t, language);

  const go = (path: "/capture" | "/guide") => {
    router.back();
    setTimeout(() => router.push({ pathname: path, params: { action: drop.action } }), 250);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 30 }}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LiveDot color={C.leaf} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.forestInk }}>{t("dropSheet.title")}</Text>
            </View>
            <Mono>{place}</Mono>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Mono color={C.forestInk} style={{ fontVariant: ["tabular-nums"] }}>{left}</Mono>
            <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.mute }}>{t("dropCard.leftToday")}</Text>
          </View>
        </View>
        <Text style={[T.hero, { fontSize: 40, lineHeight: 42 }]}>{drop.title}</Text>
        <SdgTags goals={a.sdgs} />
      </View>

      <Animated.View entering={FadeInDown.delay(80)} style={{ gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
        <Mono>{t("dropSheet.why")}</Mono>
        <Text style={[T.body, { fontSize: 17, lineHeight: 25 }]}>{drop.why}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{drop.metric}</Text>
          {drop.sources.map((s) => (
            <SourceBadge key={s} id={s} onPress={() => router.push("/sources")} />
          ))}
        </View>
      </Animated.View>

      {rows.length > 0 && (
        <Animated.View entering={FadeInDown.delay(120)} style={{ gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
          <Mono style={{ marginBottom: 8 }}>{t("dropSheet.readings.title", { place })}</Mono>
          {rows.map((r) => (
            <View key={r.key} style={{ flexDirection: "row", alignItems: "baseline", gap: 10, paddingVertical: 7 }}>
              <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 15, color: C.ink2 }}>{r.label}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, fontVariant: ["tabular-nums"], color: C.ink }} numberOfLines={1}>
                {r.value}
              </Text>
              {r.unit && <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.mute }}>{r.unit}</Text>}
            </View>
          ))}
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(160)} style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
        <Mono style={{ marginBottom: 10 }}>{t("dropSheet.how")}</Mono>
        {[
          { icon: "camera" as const, title: t("dropSheet.snap"), d: t("dropSheet.snapBody") },
          { icon: "video" as const, title: t("dropSheet.prove"), d: a.proofHint },
          { icon: "checkSeal" as const, title: t("dropSheet.friends"), d: t("dropSheet.friendsBody") },
        ].map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 10 }}>
            <Mono color={C.leaf} style={{ width: 20, paddingTop: 3 }}>
              {String(i + 1).padStart(2, "0")}
            </Mono>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>{s.title}</Text>
              <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{s.d}</Text>
            </View>
            <Icon name={s.icon} size={16} color={C.leaf} />
          </View>
        ))}
      </Animated.View>

      <Text style={T.caption}>
        {drop.offline ? t("dropSheet.noteOffline", { place }) : drop.shared ? t("dropSheet.noteShared", { place }) : t("dropSheet.noteLocal", { place })}
      </Text>

      <View style={{ gap: 8 }}>
        <Button label={t("dropSheet.doIt", { act: a.label })} kind="green" trailing={`+${seedsFor({ action: drop.action, isDrop: bonus })}`} icon={a.icon} onPress={() => go("/capture")} />
        <Button label={t("dropSheet.show")} kind="ghost" icon="book" onPress={() => go("/guide")} />
      </View>
    </ScrollView>
  );
}
