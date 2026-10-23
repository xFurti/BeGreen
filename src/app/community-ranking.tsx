import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text } from "react-native";

import { Leaderboard } from "@/components/leaderboard";
import { useI18n } from "@/i18n/use-i18n";
import { syncCommunity, useCommunity, useCommunityById } from "@/store/community-store";
import { useTheme } from "@/theme/use-theme";

export default function CommunityRanking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useCommunityById(id);
  const role = useCommunity((s) => s.roles[id]);
  const { T } = useTheme();
  const { t } = useI18n();
  useEffect(() => { void syncCommunity(id); }, [id]);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 20 }}>
      <Stack.Screen options={{ title: t("groups.board") }} />
      <Text style={T.display}>{c?.name ?? t("community.title")}</Text>
      <Text style={T.callout}>{t("groups.boardBody")}</Text>
      {c && (c.visibility === "public" || role)
        ? <Leaderboard community={c} title={t("groups.board")} />
        : <Text style={T.body}>{t(c ? "community.page.privateLocked" : "community.missing")}</Text>}
    </ScrollView>
  );
}
