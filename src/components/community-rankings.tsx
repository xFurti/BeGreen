import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Leaderboard } from "@/components/leaderboard";
import { Button, Mono, Press } from "@/components/ui";
import { COMMUNITY_KIND_ICON, isCity, type Community } from "@/data/community";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { comuneCommunity, previewCity, syncCommunity, useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// An optional, contextual entry to the same boards used by the community detail screens.
// Choosing a board never changes the app's Comune or the user's memberships.
export function CommunityRankings({ groups, onContextChange }: { groups: Community[]; onContextChange: (id: string) => void }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const comune = useApp((s) => s.comune);
  const catalog = useCommunity((s) => s.catalog);
  const roles = useCommunity((s) => s.roles);
  const own = comune ? comuneCommunity(comune) : undefined;
  const city = catalog.find((c) => c.id === own?.id) ?? own;
  const [selectedId, setSelectedId] = useState<string>();
  // A revoked or left group disappears from `groups`: immediately fall back to the Comune.
  const selected = groups.find((c) => c.id === selectedId) ?? city;
  const id = selected?.id;
  const allowed = selected && (selected.visibility === "public" || !!roles[selected.id]);
  const [choosing, setChoosing] = useState(false);
  const [retry, setRetry] = useState(0);
  const [request, setRequest] = useState<{ id: string; attempt: number; phase: "ready" | "error" }>();

  useEffect(() => {
    if (!id) return;
    let current = true;
    onContextChange(id);
    if (comune && id === `comune-${comune.id}`) previewCity(comune);
    syncCommunity(id, { throwOnError: true }).then(
      () => { if (current) setRequest({ id, attempt: retry, phase: "ready" }); },
      () => { if (current) setRequest({ id, attempt: retry, phase: "error" }); },
    );
    return () => { current = false; };
  }, [id, retry, comune, onContextChange]);

  if (!selected) return null;
  const phase = request && request.id === id && request.attempt === retry ? request.phase : "loading";
  const choose = (c: Community) => { setSelectedId(c.id); setChoosing(false); };

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 31, lineHeight: 35, letterSpacing: -1.1, color: C.ink }}>{t("community.hub.rankingsHeadline")}</Text>
        <Text style={[T.callout, { maxWidth: 340 }]}>{t("community.hub.rankingsBody")}</Text>
      </View>

      <Press scale={reduced ? 1 : 0.985} onPress={() => setChoosing(true)} accessibilityLabel={t("community.hub.chooseRanking")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}><Icon name={COMMUNITY_KIND_ICON[selected.kind]} size={20} color={C.leaf} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[T.label, { fontSize: 9 }]}>{t("community.hub.rankingContext")}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 18, letterSpacing: -0.5, color: C.ink }}>{selected.name}</Text>
        </View>
        <Icon name="swap" size={18} color={C.leaf} />
      </Press>

      {phase === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel={t("community.hub.loadingRanking")} style={{ alignItems: "center", paddingVertical: 38, gap: 12 }}><ActivityIndicator color={C.leaf} /><Text style={T.caption}>{t("community.hub.loadingRanking")}</Text></View>
      ) : phase === "error" ? (
        <View style={{ padding: 20, gap: 14, borderRadius: R.lg, backgroundColor: C.card }}><Text style={T.callout}>{t("community.hub.rankingError")}</Text><Button label={t("groups.retry")} kind="secondary" size="md" onPress={() => setRetry((value) => value + 1)} /></View>
      ) : allowed ? (
        <View style={{ gap: 12 }}>
          <Leaderboard community={selected} title={t("community.hub.rankingsTab")} limit={5} />
          <Button label={t("community.hub.fullRanking")} kind="ghost" size="md" icon="league" onPress={() => router.navigate({ pathname: "/community-ranking", params: { id: selected.id } })} />
        </View>
      ) : <Text style={T.callout}>{t("community.page.privateLocked")}</Text>}

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><Icon name="info" size={15} color={C.mute} /><Text style={[T.caption, { flex: 1 }]}>{t("community.hub.rankingScope")}</Text></View>

      <Modal transparent visible={choosing} animationType={reduced ? "none" : "slide"} onRequestClose={() => setChoosing(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: C.scrim }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => setChoosing(false)} style={{ flex: 1 }} />
          <View accessibilityViewIsModal style={{ maxHeight: "75%", backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: 20, paddingBottom: 36, gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Text style={[T.title, { flex: 1 }]}>{t("community.hub.chooseRanking")}</Text><Press onPress={() => setChoosing(false)} accessibilityLabel={t("common.close")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: R.pill, backgroundColor: C.card }}><Icon name="close" size={19} color={C.ink} /></Press></View>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {[...(city ? [city] : []), ...groups].map((c) => (
                <Pressable key={c.id} accessibilityRole="radio" accessibilityLabel={c.name} accessibilityState={{ checked: c.id === id }} onPress={() => choose(c)} style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 16, borderRadius: R.md, backgroundColor: c.id === id ? C.mint : C.card }}>
                  <Icon name={COMMUNITY_KIND_ICON[c.kind]} size={21} color={C.leaf} />
                  <View style={{ flex: 1, gap: 4 }}><Text style={T.headline}>{c.name}</Text><Mono size={9}>{isCity(c) ? t("community.hub.yourCity") : t(`community.visibility.${c.visibility === "private" ? "private" : "public"}`)}</Mono></View>
                  {c.id === id && <Icon name="check" size={18} color={C.leaf} />}
                </Pressable>
              ))}
              {!groups.length && <Text style={[T.caption, { padding: 10 }]}>{t("community.hub.rankingsNoGroups")}</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
