import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { View } from "react-native";

import { TabBar } from "@/components/tab-bar";
import { Toaster } from "@/components/ui";
import { useSocialSync } from "@/hooks/use-social";
import { useApp } from "@/store/app-store";
import { useTheme } from "@/theme/use-theme";

export default function TabsLayout() {
  const onboarded = useApp((s) => s.onboarded);
  const hasComune = useApp((s) => !!s.comune);
  const { C } = useTheme();
  useSocialSync();
  if (!onboarded || !hasComune) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="pulse" />
        <Tabs.Screen name="league" />
        <Tabs.Screen name="me" />
      </Tabs>
      <Toaster />
    </View>
  );
}
