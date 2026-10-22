import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { View } from "react-native";

import { TabBar } from "@/components/tab-bar";
import { Toaster } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { C } from "@/theme/tokens";

export default function TabsLayout() {
  const onboarded = useApp((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

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
