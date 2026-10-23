import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapScreen } from "@/components/map-screen";
import { useI18n } from "@/i18n/use-i18n";
import { useCommunity, useCommunityById } from "@/store/community-store";
import { useTheme } from "@/theme/use-theme";

// A community's map, full screen: from a post, a place, or a community you're exploring.
export default function CommunityMapRoute() {
  const { C, T } = useTheme();
  const { id, spot } = useLocalSearchParams<{ id: string; spot?: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const community = useCommunityById(id);
  const member = useCommunity((s) => !!s.roles[id]);
  const { t } = useI18n();
  if (!community) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <Text style={T.body}>{t("community.missing")}</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MapScreen community={community} initialSpotId={spot} top={top} bottom={bottom} canAdd={member} onBack={() => (router.canGoBack() ? router.back() : router.replace("/community"))} />
    </View>
  );
}
