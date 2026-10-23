import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FlipInEasyY, FlipOutEasyY } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import { Sprout } from "@/components/nature";
import { Button, Mono, Press, SourceBadge, useCountUp } from "@/components/ui";
import { moodFromGround, type Mood } from "@/data/seeds";
import type { SourceId } from "@/data/sources";
import { usePulse } from "@/hooks/use-pulse";
import { actionCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { aqiBand } from "@/services/interpret";
import { seedsFor } from "@/services/rewards";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

type Reading = { key: string; icon: IconName; label: string; value: number; unit: string; source: SourceId; bad?: boolean };

function ReadingRow({ r, i }: { r: Reading; i: number }) {
  const { C } = useTheme();
  const n = useCountUp(r.value, 900);
  return (
    <Animated.View
      entering={FadeInDown.delay(150 + i * 160).springify().damping(16)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: r.bad ? C.red : C.card }}
    >
      <Icon name={r.icon} size={18} color={r.bad ? C.red : C.leaf} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>{r.label}</Text>
        <SourceBadge id={r.source} />
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 30, letterSpacing: -1.2, color: C.ink, fontVariant: ["tabular-nums"] }}>{n}</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute, minWidth: 56 }}>{r.unit}</Text>
    </Animated.View>
  );
}

// The wow moment: the ground of your Comune today, live, then today's challenge opening like a bud.
export function SoilStep({ onMood, onNext }: { onMood: (m: Mood, text: string) => void; onNext: () => void }) {
  const { C, T } = useTheme();
  const { t, language } = useI18n();
  const { pulse, drop, ready } = usePulse();
  const [open, setOpen] = useState(false);

  const mood = moodFromGround({ aqi: pulse.air?.aqi, dryDays: pulse.water?.dryDays, rain7: pulse.water?.rain7, moisture: pulse.soil?.moisture });
  const moodText = mood === "cough" ? t("seed.ob.soilCough") : mood === "thirsty" ? t("seed.ob.soilThirsty") : t("seed.ob.soilHappy");
  useEffect(() => {
    if (ready) onMood(mood, moodText);
  }, [ready, mood, moodText, onMood]);

  if (!ready)
    return (
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 24 }}>
        <ActivityIndicator color={C.leaf} />
        <Mono>{t("seed.ob.loadingData")}</Mono>
      </View>
    );

  const readings: Reading[] = [];
  if (pulse.air) {
    const band = aqiBand(pulse.air.aqi, language);
    readings.push({ key: "air", icon: "air", label: t("seed.ob.air"), value: Math.round(pulse.air.aqi), unit: band.label, source: "cams", bad: band.level === "bad" });
  }
  if (pulse.water)
    readings.push(
      pulse.water.dryDays >= 3
        ? { key: "dry", icon: "sun", label: t("seed.ob.dry"), value: pulse.water.dryDays, unit: "", source: "openmeteo", bad: mood === "thirsty" }
        : { key: "rain", icon: "drop", label: t("seed.ob.rain"), value: Math.round(pulse.water.rain7), unit: "mm", source: "openmeteo" },
    );
  if (pulse.soil) readings.push({ key: "soil", icon: "soil", label: t("seed.ob.soil"), value: Math.round(pulse.soil.moisture * 100), unit: "%", source: "openmeteo" });

  const a = actionCopy(t, drop.action);
  const seeds = seedsFor({ action: drop.action, isDrop: !drop.offline });

  return (
    <View style={{ gap: 10 }}>
      {readings.map((r, i) => (
        <ReadingRow key={r.key} r={r} i={i} />
      ))}
      {pulse.sample && <Text style={T.caption}>{t("seed.ob.sample")}</Text>}

      <Animated.View entering={FadeIn.delay(150 + readings.length * 160 + 200)} style={{ paddingTop: 6 }}>
        {!open ? (
          <Animated.View key="closed" exiting={FlipOutEasyY.duration(220)}>
            <Press
              onPress={() => {
                haptic.success();
                setOpen(true);
              }}
              accessibilityLabel={t("seed.ob.dropReveal")}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: R.xl, backgroundColor: C.forest }}
            >
              <Sprout size={40} color={C.lime} stem={C.mint2} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, color: C.white }}>{t("seed.ob.dropReveal")}</Text>
              <Icon name="sparkle" size={18} color={C.lime} />
            </Press>
          </Animated.View>
        ) : (
          <Animated.View key="open" entering={FlipInEasyY.delay(200).springify().damping(16)} style={{ gap: 12 }}>
            <View style={{ padding: 18, borderRadius: R.xl, backgroundColor: C.forest, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name={a.icon} size={16} color={C.lime} />
                <Mono color={C.lime} style={{ flex: 1 }}>
                  {t("seed.ob.dropKicker", { place: pulse.place.name })}
                </Mono>
                <Mono color={C.lime}>{t("seed.ob.dropSeeds", { seeds })}</Mono>
              </View>
              <Text style={{ fontFamily: F.semibold, fontSize: 26, lineHeight: 29, letterSpacing: -1, color: C.white }}>{drop.title}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.forestMute }}>{drop.why}</Text>
            </View>
            <Button label={t("seed.ob.dropNext")} kind="green" icon="leaf" onPress={onNext} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
