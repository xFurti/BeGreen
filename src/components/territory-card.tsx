import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { CommunityCover, SpotRow } from "@/components/community-ui";
import { Icon } from "@/components/icon";
import { Mono, Press } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { comuneCommunity, previewCity, syncCommunity, useCommunity, useCommunitySpots } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// Both the cover and its CTA open the existing full-screen map.
export function TerritoryCard() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const comune = useApp((s) => s.comune);
  const catalog = useCommunity((s) => s.catalog);
  const own = comune ? comuneCommunity(comune) : undefined;
  const city = catalog.find((c) => c.id === own?.id) ?? own;
  const { spots } = useCommunitySpots(city);
  useEffect(() => {
    if (comune) { const c = previewCity(comune); void syncCommunity(c.id); }
  }, [comune]);
  if (!city || !comune) return null;
  const open = (map = false) => {
    const c = previewCity(comune);
    router.navigate({ pathname: map ? "/map/[id]" : "/community/[id]", params: { id: c.id } });
  };
  const recent = spots.filter((s) => !s.hidden && !s.isExample).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  return (
    <View style={{ gap: 22 }}>
      <View style={{ borderRadius: R.xl, borderCurve: "continuous", overflow: "hidden", backgroundColor: C.forest }}>
        <CommunityCover community={city} height={270} onPress={() => open(true)} />
        <Press scale={reduced ? 1 : 0.99} onPress={() => open(true)} accessibilityLabel={t("community.city.openMap")} style={{ paddingHorizontal: 19, paddingVertical: 18, flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ flex: 1, gap: 5 }}><Text style={{ fontFamily: F.medium, fontSize: 21, letterSpacing: -0.6, color: C.white }}>{t("community.hub.exploreMap")}</Text><Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>{t("community.hub.mapHint")}</Text></View>
          <View style={{ width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: C.lime }}><Icon name="arrowRight" size={21} color={C.forest} /></View>
        </Press>
      </View>
      <Press scale={reduced ? 1 : 0.985} onPress={() => open()} accessibilityLabel={t("groups.openCity", { name: city.name })} style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 16, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}><Icon name="people" size={21} color={C.leaf} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>{t("community.hub.localCommunity")}</Text><Text style={{ fontFamily: F.regular, fontSize: 12, color: C.mute }}>{t("community.hub.localHint")}</Text></View>
        <Icon name="chevron" size={16} color={C.leaf} />
      </Press>
      <View style={{ gap: 13 }}>
        <Mono>{t("community.hub.nearby")}</Mono>
        {recent.map((spot) => <SpotRow key={spot.id} spot={spot} />)}
        {!recent.length && <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}><Icon name="pin" size={18} color={C.leaf} /><Text style={[T.caption, { flex: 1 }]}>{t("community.hub.firstPlace")}</Text></View>}
      </View>
    </View>
  );
}
