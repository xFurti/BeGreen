import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommunitySections, GroupHub, type CommunitySection } from "@/components/community-hub";
import { CommunityRankings } from "@/components/community-rankings";
import { toast } from "@/components/toast";
import { Icon } from "@/components/icon";
import { LoveYourCity } from "@/components/love-your-city";
import { TerritoryCard } from "@/components/territory-card";
import { Press } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { syncCommunity, useJoined } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export default function CommunityTab() {
  const { C, T } = useTheme();
  const { top } = useSafeAreaInsets();
  const { t } = useI18n();
  const comune = useApp((s) => s.comune);
  const { groups } = useJoined();
  const [section, setSection] = useState<CommunitySection>("territory");
  const [refreshing, setRefreshing] = useState(false);
  const [rankingCommunity, setRankingCommunity] = useState<string>();
  const scroll = useRef<ScrollViewInstance>(null);
  const reduced = useReducedMotion();

  useEffect(() => { void syncCommunity(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncCommunity(section === "rankings" ? rankingCommunity : undefined, { throwOnError: true }); }
    catch { toast(t("shared.offline"), "refresh"); }
    finally { setRefreshing(false); }
  }, [section, rankingCommunity, t]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: top + 18, paddingHorizontal: 20, paddingBottom: 18, gap: 20, backgroundColor: C.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={T.display}>{t("community.title")}</Text>
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: C.mint }}><Icon name="people" size={18} color={C.leaf} /></View>
        </View>
        <CommunitySections value={section} count={groups.length} onChange={(next) => {
          scroll.current?.scrollTo({ y: 0, animated: false });
          setSection(next);
        }} />
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140, gap: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.leaf} colors={[C.leaf]} />}
        showsVerticalScrollIndicator={false}
      >
        {section === "territory" && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[T.label, { color: C.leaf }]}>{t("community.hub.yourCity")}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: F.medium, fontSize: 38, lineHeight: 44, letterSpacing: -1.7, color: C.ink }}>{comune?.name}</Text>
          </View>
          <Press scale={reduced ? 1 : 0.97} onPress={() => router.navigate("/comune")} accessibilityLabel={t("community.hub.changeCity")} style={{ minHeight: 44, paddingHorizontal: 15, gap: 7, flexDirection: "row", alignItems: "center", borderRadius: R.pill, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{t("community.hub.changeCity")}</Text>
            <Icon name="swap" size={14} color={C.leaf} />
          </Press>
        </View>}

        <Animated.View key={section} entering={reduced ? undefined : FadeIn.duration(220)}>
          {section === "territory" ? <TerritoryCard /> : section === "groups" ? <GroupHub groups={groups} /> : <CommunityRankings groups={groups} onContextChange={setRankingCommunity} />}
        </Animated.View>

        <View accessible accessibilityLabel="Love your city" style={{ alignItems: "center", paddingTop: 10 }}>
          <LoveYourCity height={46} />
        </View>
      </ScrollView>
    </View>
  );
}
