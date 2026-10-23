import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";

import { GuideMotion, useGuideReducedMotion } from "@/components/guide/controls";
import { GuideGestures } from "@/components/guide/gestures";
import { GuideSorting } from "@/components/guide/sorting";
import { Mono } from "@/components/ui";
import type { ActionId } from "@/data/actions";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { useI18n } from "@/i18n/use-i18n";
import { guideAction } from "@/services/guide";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

function GuideContent() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ action?: string | string[]; from?: string }>();
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const reduced = useGuideReducedMotion();
  const [tab, setTab] = useState<"gestures" | "sorting">("gestures");
  const navigating = useRef(false);
  const fromCapture = params.from === "capture";
  const doIt = (id: ActionId) => {
    if (navigating.current) return;
    navigating.current = true;
    // Returning from the camera guide must preserve its in-progress photo/video.
    if (fromCapture && router.canGoBack()) router.back();
    else router.replace({ pathname: "/capture", params: { action: id } });
  };
  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scrollerRef} {...scrollProps} nestedScrollEnabled={process.env.EXPO_OS === "android"}
        keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingTop: 26, gap: 22, paddingBottom: scrollPaddingBottom(60, cover) }}>
        <View style={{ gap: 10 }}>
          <Mono>{t("guide.kicker")}</Mono>
          <Text accessibilityRole="header" style={[T.hero, { fontSize: 30, lineHeight: 34 }]}>{t(tab === "gestures" ? "guide.title" : "guide.sortingTab")}</Text>
          <Text style={T.callout}>{t(tab === "gestures" ? "guide.intro" : "guide.sortingIntro")}</Text>
        </View>
        <View accessibilityRole="tablist" accessibilityLabel={t("guide.tabs")} style={{ flexDirection: "row", padding: 4, borderRadius: R.md, backgroundColor: C.card }}>
          {(["gestures", "sorting"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: value === tab }} aria-selected={process.env.EXPO_OS === "web" ? value === tab : undefined}
            onPress={() => { if (tab === value) return; haptic.tap(); Keyboard.dismiss(); setTab(value); scrollerRef.current?.scrollTo({ y: 0, animated: false }); }}
            style={{ flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", padding: 8, borderRadius: R.sm, backgroundColor: value === tab ? C.raised : "transparent" }}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: value === tab ? C.ink : C.ink2, textAlign: "center" }}>{t(value === "gestures" ? "guide.gesturesTab" : "guide.sortingTab")}</Text>
          </Pressable>)}
        </View>
        {/* Keep local search, selected object and walkthrough position across tabs. */}
        <View style={{ display: tab === "gestures" ? "flex" : "none" }} accessibilityElementsHidden={tab !== "gestures"} importantForAccessibility={tab === "gestures" ? "auto" : "no-hide-descendants"}>
          <GuideGestures initialAction={guideAction(params.action)} initialFocus={!!params.action} fromCapture={fromCapture} onDoIt={doIt} onFocus={() => scrollerRef.current?.scrollTo({ y: 0, animated: !reduced })} />
        </View>
        <View style={{ display: tab === "sorting" ? "flex" : "none" }} accessibilityElementsHidden={tab !== "sorting"} importantForAccessibility={tab === "sorting" ? "auto" : "no-hide-descendants"}>
          <GuideSorting />
        </View>
      </ScrollView>
    </View>
  );
}

export default function Guide() {
  return <GuideMotion><GuideContent /></GuideMotion>;
}
