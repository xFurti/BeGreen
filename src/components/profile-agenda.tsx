import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppState, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ACTIONS } from "@/data/actions";
import { daysTo2030, SDG_LIST } from "@/data/sdgs";
import type { Post } from "@/data/types";
import { sdgTitle } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { sdgsOf } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export function Agenda({ posts }: { posts: Post[] }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const touched = sdgsOf(posts);
  const [sel, setSel] = useState<number | null>(null);
  const [days, setDays] = useState(() => daysTo2030());
  useFocusEffect(
    useCallback(() => {
      const update = () => setDays(daysTo2030());
      update();
      const id = setInterval(update, 1000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") update();
      });
      return () => {
        clearInterval(id);
        subscription.remove();
      };
    }, []),
  );
  const gap = 6;
  const cell = Math.floor((Math.min(width, 620) - 40 - gap * 5) / 6);
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
                accessibilityLabel={`${t("me.sdg", { n: g, title: sdgTitle(t, g) })}${on ? t("common.sdgMoved") : ""}`}
                onPress={() => {
                  haptic.tap();
                  setSel(active ? null : g);
                }}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: on ? C.leaf : C.mint,
                  borderWidth: active ? 2 : 0,
                  borderColor: on ? C.forest : C.leaf,
                  padding: 8,
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.8, color: on ? C.onLeaf : C.forestMute }}>{g}</Text>
                {on && (
                  <Text style={{ fontFamily: F.monoMedium, fontSize: 9, color: C.mint, alignSelf: "flex-end" }}>×{counts.get(g)}</Text>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
        <View
          style={{ width: cell, height: cell, borderRadius: 12, backgroundColor: C.forest, padding: 7, justifyContent: "space-between" }}
        >
          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.7, color: C.lime }}>
            {days}
          </Text>
          <Text style={{ fontFamily: F.monoMedium, fontSize: 8, color: C.forestMute, lineHeight: 10 }}>{t("me.daysTo")}</Text>
        </View>
      </View>
      <Text style={[T.callout, { minHeight: 42 }]}>
        {sel ? (
          <>
            <Text style={{ fontFamily: F.medium, color: C.ink }}>
              SDG {sel} · {sdgTitle(t, sel)}.
            </Text>{" "}
            {touched.has(sel)
              ? t(counts.get(sel) === 1 ? "me.movedOnce" : "me.movedMany", { count: counts.get(sel) ?? 0 })
              : t("me.notYet")}
          </>
        ) : (
          <>{t("me.touched", { count: touched.size })}</>
        )}
      </Text>
    </View>
  );
}
