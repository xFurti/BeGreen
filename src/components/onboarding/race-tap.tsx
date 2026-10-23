import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { LeafBurst } from "@/components/nature";
import { Avatar, Button, Mono } from "@/components/ui";
import type { MessageKey } from "@/i18n/catalog";
import { useI18n } from "@/i18n/use-i18n";
import { C, F, R } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const BASE: { id: string; name: MessageKey; pts: number }[] = [
  { id: "a", name: "onboarding.race.classmate", pts: 345 },
  { id: "b", name: "onboarding.race.neighbour", pts: 270 },
  { id: "c", name: "onboarding.race.teacher", pts: 205 },
  { id: "d", name: "onboarding.race.squadMate", pts: 160 },
];

export function RaceTap({ active }: { active: boolean }) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [mine, setMine] = useState(120);
  const [burst, setBurst] = useState(0);
  const rows = [...BASE.map((person) => ({ ...person, me: false })), { id: "me", name: "common.you" as MessageKey, pts: mine, me: true }].sort(
    (a, b) => b.pts - a.pts,
  );
  const leading = rows[0]?.id === "me";
  const post = () => {
    if (!active || leading) return;
    haptic.soft();
    const next = mine + 115;
    setMine(next);
    if (next > 345) {
      haptic.success();
      if (!reducedMotion) setBurst((id) => id + 1);
    }
  };
  return (
    <View style={{ paddingTop: 4, gap: 12 }}>
      <View>
        {rows.map((row, index) => (
          <Animated.View
            key={row.id}
            entering={reducedMotion ? undefined : FadeInDown.delay(index * 50)}
            layout={reducedMotion ? undefined : LinearTransition.springify().damping(16)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              height: 58,
              paddingHorizontal: row.me ? 14 : 0,
              marginHorizontal: row.me ? -14 : 0,
              borderRadius: row.me ? R.md : 0,
              backgroundColor: row.me ? C.forest : "transparent",
              borderBottomWidth: row.me ? 0 : 1,
              borderBottomColor: C.line,
            }}
          >
            <Mono color={row.me ? C.lime : C.mute} style={{ width: 20 }}>
              {String(index + 1).padStart(2, "0")}
            </Mono>
            <Avatar name={row.me ? t("common.you") : t(row.name)} size={32} invert={row.me} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: row.me ? C.white : C.ink }}>
              {row.me ? t("common.you") : t(row.name)}
            </Text>
            {row.me && index === 0 && <Icon name="crown" size={14} color={C.lime} />}
            <Text style={{ fontFamily: F.medium, fontSize: 17, color: row.me ? C.white : C.ink, fontVariant: ["tabular-nums"] }}>{row.pts}</Text>
          </Animated.View>
        ))}
      </View>
      {burst > 0 && <LeafBurst id={burst} />}
      <Button label={leading ? t("onboarding.raceLeading") : t("onboarding.racePost")} kind="green" icon="camera" disabled={leading} onPress={post} />
    </View>
  );
}
