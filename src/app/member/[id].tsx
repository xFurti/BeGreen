import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";

import { SpotRow } from "@/components/community-ui";
import { TitledName } from "@/components/titled-name";
import { Avatar, Button, Mono } from "@/components/ui";
import { challengeProgress } from "@/data/community";
import { useI18n } from "@/i18n/use-i18n";
import { useApp, useAuthor } from "@/store/app-store";
import { useCommunity } from "@/store/community-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// A member and what they added to the community: places, events, challenge contributions.
export default function Member() {
  const { C, T } = useTheme();
  const { id, community } = useLocalSearchParams<{ id: string; community?: string }>();
  const { t } = useI18n();
  const author = useAuthor();
  const meId = useApp((s) => s.userId);
  const spots = useCommunity((s) => s.spots);
  const entries = useCommunity((s) => s.entries);
  const challenges = useCommunity((s) => s.challenges);
  const members = useCommunity((s) => (community ? s.members[community] : undefined));
  const blocked = useCommunity((s) => s.blocked.includes(id));
  const block = useCommunity((s) => s.block);
  const u = author(id);
  const theirs = spots.filter((s) => s.authorId === id && (!community || s.communityId === community) && !s.hidden);
  const contributions = entries.filter((e) => e.userId === id);
  const joined = new Set(contributions.map((e) => e.challengeId));
  const role = members?.find((m) => m.userId === id)?.role;
  const me = id === meId;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: u.name }} />
      <View style={{ alignItems: "center", gap: 10 }}>
        <Avatar name={u.name} seed={u.seed} seeds={u.seeds} size={72} />
        <TitledName name={u.name} badgeId={u.badgeId} align="center" style={{ fontFamily: F.medium, fontSize: 24, letterSpacing: -0.8, color: C.ink }} />
        <Mono>
          @{u.handle}
          {role === "moderator" ? ` · ${t("community.page.moderator")}` : ""}
        </Mono>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { n: theirs.filter((s) => s.kind === "discovery" || s.kind === "useful").length, label: t("community.memberPage.places") },
          { n: theirs.filter((s) => s.kind === "event").length, label: t("community.memberPage.events") },
          { n: contributions.length, label: t("community.memberPage.contributions") },
        ].map((x) => (
          <View key={x.label} style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, gap: 4 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 24, color: C.ink }}>{x.n}</Text>
            <Text style={T.caption}>{x.label}</Text>
          </View>
        ))}
      </View>
      {joined.size > 0 && (
        <View style={{ gap: 6 }}>
          <Mono>{t("community.memberPage.challenges")}</Mono>
          {challenges
            .filter((c) => joined.has(c.id))
            .map((c) => (
              <Text key={c.id} style={T.callout}>
                {c.template ? t(`community.templates.${c.template}.title`) : c.title} · {contributions.filter((e) => e.challengeId === c.id).length}/
                {challengeProgress(c, entries).count}
              </Text>
            ))}
        </View>
      )}
      <View style={{ gap: 2 }}>
        <Mono>{t("community.memberPage.added")}</Mono>
        {theirs.map((s) => (
          <SpotRow key={s.id} spot={s} />
        ))}
        {theirs.length === 0 && <Text style={[T.caption, { paddingVertical: 8 }]}>{t("community.memberPage.none")}</Text>}
      </View>
      {!me && (
        <Button
          label={blocked ? t("community.memberPage.unblock") : t("community.memberPage.block")}
          kind="ghost"
          size="md"
          icon="block"
          onPress={() =>
            blocked
              ? block(id, false)
              : Alert.alert(t("community.flag.blockTitle", { name: u.name }), t("community.flag.blockBody"), [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("community.flag.blockConfirm"), style: "destructive", onPress: () => block(id, true) },
                ])
          }
        />
      )}
    </ScrollView>
  );
}
