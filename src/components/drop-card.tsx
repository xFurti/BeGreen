import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Blobs, LeafMark } from "@/components/nature";
import { AvatarStack, LiveDot, Mono, Press, SdgTags } from "@/components/ui";
import type { User } from "@/data/types";
import { actionCopy } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import type { Drop } from "@/services/drop";
import { C, F, R } from "@/theme/tokens";

const pad = (n: number) => String(n).padStart(2, "0");

// Time left until midnight: the Drop is a daily thing.
export function useCountdown() {
  const calc = () => {
    const n = new Date();
    const end = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime();
    const s = Math.max(0, Math.floor((end - n.getTime()) / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function DropCard({
  drop,
  done,
  place,
  crowd,
  ready = true,
}: {
  drop: Drop;
  done: boolean;
  place: string;
  // Real people in this Comune who already did today's challenge.
  crowd: User[];
  ready?: boolean;
}) {
  const { t, language } = useI18n();
  const action = actionCopy(t, drop.action);
  const left = useCountdown();

  return (
    <Press
      scale={0.985}
      disabled={!ready}
      accessibilityLabel={t("dropCard.a11y", { title: drop.title, time: left })}
      onPress={() => router.push("/drop")}
      // Leaf-shaped: two round corners, two tight ones.
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
      <Blobs colors={[C.leaf, C.lime]} opacity={0.22} />
      <View pointerEvents="none" style={{ position: "absolute", right: -18, bottom: -26, opacity: 0.14 }}>
        <LeafMark size={150} color={C.lime} vein={C.forest} rotate={-12} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <LiveDot color={done ? C.forestMute : C.lime} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.white }}>
              {done ? t("dropCard.done") : t("dropCard.today")}
            </Text>
          </View>
          <Mono color={C.forestMute}>{place}</Mono>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Mono color={C.forestMute} style={{ fontVariant: ["tabular-nums"] }}>{left}</Mono>
          <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>{t("dropCard.leftToday")}</Text>
        </View>
      </View>

      <Text style={{ fontFamily: F.medium, fontSize: 32, lineHeight: 34, letterSpacing: -1.4, color: C.white }}>
        {ready ? drop.title : t("dropCard.reading", { place })}
      </Text>

      {ready ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name={action.icon} size={14} color={C.lime} />
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.white }}>{action.label}</Text>
            <Text style={{ flex: 1, flexShrink: 1, fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.forestMute }}>
              · {drop.metric}
            </Text>
            <SdgTags goals={action.sdgs.slice(0, 1)} dark />
          </View>
          <View style={{ height: 1, backgroundColor: C.forestLine }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {crowd.length > 0 && <AvatarStack people={crowd.slice(0, 3)} size={22} ring={C.forest} />}
            <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.forestMute }} numberOfLines={1}>
              {done ? (
                <Text style={{ color: C.lime, fontFamily: F.medium }}>
                  {crowd.length > 1 ? t("dropCard.inWith", { count: formatNumber(crowd.length - 1, language), place }) : t("dropCard.in")}
                </Text>
              ) : crowd.length ? (
                crowd.length === 1 ? t("dropCard.didInOne", { place }) : t("dropCard.didIn", { count: formatNumber(crowd.length, language), place })
              ) : (
                t("dropCard.first", { place })
              )}
            </Text>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}>
              <Icon name={done ? "check" : "arrowRight"} size={13} color={C.forest} />
            </View>
          </View>
        </View>
      ) : (
        <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.forestMute }}>
          {t("dropCard.loading")}
        </Text>
      )}
    </Press>
  );
}
