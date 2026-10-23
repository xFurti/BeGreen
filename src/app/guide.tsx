import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Button, Mono, SdgTags } from "@/components/ui";
import { ACTION_LIST, type ActionId } from "@/data/actions";
import { BINS, searchItems, type BinId } from "@/data/guide";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { actionCopy, binCopy, itemCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

function Swatch({ bin, size = 12 }: { bin: BinId; size?: number }) {
  const { C, scheme } = useTheme();
  // The residual bin is black: on the dark theme it needs an edge to show.
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: BINS[bin].swatch,
        borderWidth: scheme === "dark" ? 1 : 0,
        borderColor: C.faint,
      }}
    />
  );
}

function Steps({ id }: { id: ActionId }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ gap: 12 }}>
      {actionCopy(t, id).howto.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <Mono color={C.ink} style={{ width: 20, paddingTop: 3 }}>
            {String(i + 1).padStart(2, "0")}
          </Mono>
          <Text style={[T.body, { flex: 1, fontSize: 15, lineHeight: 22 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Guide() {
  const { C, T } = useTheme();
  const params = useLocalSearchParams<{ action?: ActionId; from?: string }>();
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ActionId | null>(params.action ?? null);
  const [bin, setBin] = useState<BinId | null>(null);
  const results = searchItems(q);
  const fromCapture = params.from === "capture";
  const { t } = useI18n();

  const doIt = (id: ActionId) => {
    router.back();
    if (!fromCapture) setTimeout(() => router.push({ pathname: "/capture", params: { action: id } }), 250);
  };

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollerRef}
        {...scrollProps}
        nestedScrollEnabled={process.env.EXPO_OS === "android"}
        contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 34, paddingBottom: scrollPaddingBottom(60, cover) }}
        keyboardShouldPersistTaps="handled"
      >
      <View style={{ gap: 10 }}>
        <Mono>{t("guide.kicker")}</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{t("guide.title")}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 16, height: 50 }}>
          <Icon name="search" size={16} color={C.mute} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("guide.search")}
            placeholderTextColor={C.mute}
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, fontFamily: F.regular, fontSize: 16, color: C.ink, height: 50 }}
          />
          {!!q && (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel={t("guide.clear")}>
              <Icon name="close" size={14} color={C.mute} />
            </Pressable>
          )}
        </View>
        {!!q && (
          <Animated.View entering={FadeIn} layout={LinearTransition}>
            {results.length === 0 ? (
              <Text style={[T.callout, { paddingVertical: 8 }]}>
                {t("guide.empty")}
              </Text>
            ) : (
              results.map((it) => {
                const copy = itemCopy(t, it.id);
                return (
                <View key={it.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>{copy.name}</Text>
                    <Swatch bin={it.bin} />
                    <Mono color={C.ink}>{binCopy(t, it.bin).name}</Mono>
                  </View>
                  <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{copy.tip}</Text>
                </View>
                );
              })
            )}
          </Animated.View>
        )}
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Mono>01</Mono>
          <Text style={[T.title, { flex: 1 }]}>{t("guide.sorting")}</Text>
          <SdgTags goals={[12]} />
        </View>
        <Text style={T.callout}>{t("guide.sortingBody")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(BINS) as BinId[]).map((b) => {
            const on = bin === b;
            return (
              <Pressable
                key={b}
                accessibilityRole="button"
                onPress={() => {
                  haptic.tap();
                  setBin(on ? null : b);
                }}
                style={{
                  width: "48.5%",
                  borderRadius: R.md,
                  borderCurve: "continuous",
                  padding: 14,
                  gap: 10,
                  backgroundColor: on ? C.forest : C.card,
                }}
              >
                <Swatch bin={b} size={16} />
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2, color: on ? C.white : C.ink }}>{binCopy(t, b).name}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {bin && (
          <Animated.View key={bin} entering={FadeInDown.springify().damping(20)} style={{ gap: 10, paddingTop: 4 }}>
            <Text style={T.body}>
              <Text style={{ fontFamily: F.medium }}>{t("common.yes")} · </Text>
              {binCopy(t, bin).yes}
            </Text>
            <Text style={[T.body, { color: C.ink2 }]}>
              <Text style={{ fontFamily: F.medium, color: C.red }}>{t("common.no")} · </Text>
              {binCopy(t, bin).no}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, paddingBottom: 8 }}>
          <Mono>02</Mono>
          <Text style={[T.title, { flex: 1 }]}>{t("guide.acts")}</Text>
        </View>
        {ACTION_LIST.map((a) => {
          const on = open === a.id;
          const copy = actionCopy(t, a.id);
          return (
            <Animated.View key={a.id} layout={LinearTransition.springify().damping(20)} style={{ borderTopWidth: 1, borderTopColor: C.line }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => {
                  haptic.tap();
                  setOpen(on ? null : a.id);
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 58 }}
              >
                <Icon name={a.icon} size={17} color={C.ink} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>{copy.label}</Text>
                <Mono>+{a.seeds}</Mono>
                <View style={{ transform: [{ rotate: on ? "90deg" : "0deg" }] }}>
                  <Icon name="chevron" size={12} color={C.mute} />
                </View>
              </Pressable>
              {on && (
                <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16, paddingBottom: 22 }}>
                  <Steps id={a.id} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <SdgTags goals={a.sdgs} />
                  </View>
                  <Button label={fromCapture ? t("guide.gotIt") : t("guide.doIt")} size="md" icon={fromCapture ? "check" : "camera"} onPress={() => doIt(a.id)} />
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>
      </ScrollView>
    </View>
  );
}
