import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { CommunityCover, SpotRow } from "@/components/community-ui";
import { Button, Mono } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { comuneCommunity, previewCity, syncCommunity, useCommunity, useCommunitySpots } from "@/store/community-store";
import { R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export function TerritoryCard() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const comune = useApp((s) => s.comune);
  const catalog = useCommunity((s) => s.catalog);
  const own = comune ? comuneCommunity(comune) : undefined;
  const city = catalog.find((c) => c.id === own?.id) ?? own;
  const { spots } = useCommunitySpots(city);
  useEffect(() => {
    if (comune) {
      const c = previewCity(comune);
      void syncCommunity(c.id);
    }
  }, [comune]);
  if (!city || !comune) return null;
  const open = (map = false) => {
    const c = previewCity(comune);
    router.push({ pathname: map ? "/map/[id]" : "/community/[id]", params: { id: c.id } });
  };
  const recent = [...spots].filter((s) => !s.hidden && !s.isExample).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Mono color={C.leaf}>{t("groups.territory")}</Mono>
        <Text style={T.hero}>{city.name}</Text>
        <Text style={T.callout}>{t("groups.territoryBody")}</Text>
      </View>
      <View style={{ borderRadius: R.xl, overflow: "hidden", backgroundColor: C.card }}>
        <CommunityCover community={city} height={230} onPress={() => open(true)} />
      </View>
      <Button label={t("groups.openCity", { name: city.name })} icon="arrowRight" kind="green" onPress={() => open()} />
      <View style={{ gap: 8 }}>
        <Text style={T.title}>{t("groups.activity")}</Text>
        {recent.map((spot) => <SpotRow key={spot.id} spot={spot} />)}
        {!recent.length && <Text style={T.caption}>{t("groups.noActivity")}</Text>}
      </View>
    </View>
  );
}
