import { Stack } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { SpotRow } from "@/components/community-ui";
import { Sprout } from "@/components/nature";
import { Mono } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { useCommunity } from "@/store/community-store";
import { useTheme } from "@/theme/use-theme";

// Your personal list of places, by community, most recently saved first.
export default function Saved() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const saved = useCommunity((s) => s.saved);
  const spots = useCommunity((s) => s.spots);
  const catalog = useCommunity((s) => s.catalog);
  const list = spots.filter((s) => saved[s.id]).sort((a, b) => saved[b.id] - saved[a.id]);
  const groups = catalog.map((c) => ({ c, items: list.filter((s) => s.communityId === c.id) })).filter((g) => g.items.length);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: t("community.saved.title") }} />
      <Text style={T.display}>{t("community.saved.title")}</Text>
      {groups.map(({ c, items }) => (
        <View key={c.id} style={{ gap: 2 }}>
          <Mono color={C.leaf}>{c.name}</Mono>
          {items.map((s) => (
            <SpotRow key={s.id} spot={s} />
          ))}
        </View>
      ))}
      {list.length === 0 && (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
          <Sprout size={52} />
          <Text style={[T.callout, { textAlign: "center", maxWidth: 280 }]}>{t("community.saved.empty")}</Text>
        </View>
      )}
    </ScrollView>
  );
}
