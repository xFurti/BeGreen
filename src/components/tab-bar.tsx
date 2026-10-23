import type { BottomTabBarProps } from "expo-router/js-tabs";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { LeafMark } from "@/components/nature";
import { Press } from "@/components/ui";
import type { MessageKey } from "@/i18n/catalog";
import { useI18n } from "@/i18n/use-i18n";
import { postedToday, useMyPosts } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

const TABS: Record<string, { label: MessageKey; icon: IconName; on: IconName }> = {
  index: { label: "tabs.feed", icon: "home", on: "homeFill" },
  pulse: { label: "tabs.pulse", icon: "pulse", on: "pulseFill" },
  community: { label: "tabs.community", icon: "community", on: "communityFill" },
  me: { label: "tabs.me", icon: "me", on: "meFill" },
};

// The shutter. Looks like the camera it opens, in deep green with a lime ring.
function CaptureButton() {
  const done = postedToday(useMyPosts());
  const { C } = useTheme();
  const { t } = useI18n();
  return (
    <Press
      scale={0.88}
      hapticOn={false}
      accessibilityLabel={t("tabs.capture")}
      onPress={() => {
        haptic.thud();
        router.push("/capture");
      }}
      style={{
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: C.forest,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -14,
        boxShadow: "0 6px 20px rgba(11,61,42,0.32)",
      }}
    >
      <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: C.lime, alignItems: "center", justifyContent: "center" }}>
        <Icon name="plus" size={20} color={C.white} />
      </View>
      {!done && (
        <View
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.red,
            borderWidth: 2,
            borderColor: C.bg,
          }}
        />
      )}
    </Press>
  );
}

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useI18n();
  const items = state.routes.map((route, i) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === i;
    const label = t(meta.label);
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => {
          const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) {
            haptic.tap();
            navigateToTab(route.key);
          }
        }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 10 }}
      >
        <Icon name={focused ? meta.on : meta.icon} size={22} color={focused ? C.forestInk : C.faint} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, maxWidth: "100%" }}>
          {focused && <LeafMark size={8} color={C.leaf} vein="transparent" />}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{ flexShrink: 1, fontFamily: F.medium, fontSize: 10.5, letterSpacing: -0.1, color: focused ? C.forestInk : C.mute }}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    );
  });

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: C.bar,
        borderTopWidth: 1,
        borderTopColor: C.line,
        paddingBottom: Math.max(bottom, 10),
        paddingHorizontal: 6,
      }}
    >
      {items.slice(0, 2)}
      <View style={{ width: 78, alignItems: "center" }}>
        <CaptureButton />
      </View>
      {items.slice(2)}
    </View>
  );
}
