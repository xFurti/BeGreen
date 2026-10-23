import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { SpotRow } from "@/components/community-ui";
import { FollowButton, FollowCounts, PhotoGrid } from "@/components/friends";
import { TitledName } from "@/components/titled-name";
import { Avatar, Button, Mono } from "@/components/ui";
import { challengeProgress } from "@/data/community";
import { useI18n } from "@/i18n/use-i18n";
import { fetchFollows, fetchProfiles } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { rememberProfiles, streakOf, useApp, useAuthor } from "@/store/app-store";
import { useCommunity } from "@/store/community-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// Someone's profile: follow them, their friends, their photos, and what they added to the community.
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
  const allPosts = useApp((s) => s.posts);
  const iFollow = useApp((s) => s.following.includes(id));
  const followsMe = useApp((s) => s.followers.includes(id));
  const myFollowing = useApp((s) => s.following);
  const myFollowers = useApp((s) => s.followers);
  const [counts, setCounts] = useState<{ following: number; followers: number } | null>(null);
  const photos = useMemo(() => allPosts.filter((p) => p.authorId === id && !p.isDemo), [allPosts, id]);

  useEffect(() => {
    if (!id || me || !hasBackend || id === "demo" || useApp.getState().profiles[id]) return;
    let live = true;
    fetchProfiles([id])
      .then((more) => {
        if (live) rememberProfiles(Object.values(more));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id, me]);

  useEffect(() => {
    if (me || !hasBackend) return;
    let live = true;
    fetchFollows(id)
      .then((f) => live && setCounts({ following: f.following.length, followers: f.followers.length }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id, me, iFollow]);

  // Offline only this phone's own follows are known.
  const shown = me
    ? { following: myFollowing.length, followers: myFollowers.length }
    : (counts ?? { following: followsMe ? 1 : 0, followers: iFollow ? 1 : 0 });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: u.name }} />
      <View style={{ alignItems: "center", gap: 10 }}>
        <Avatar name={u.name} seed={u.seed} seeds={u.seeds} size={72} />
        <TitledName name={u.name} badgeId={u.badgeId} align="center" style={{ fontFamily: F.medium, fontSize: 24, letterSpacing: -0.8, color: C.ink }} />
        <Mono>
          @{u.handle}
          {role === "moderator" ? ` · ${t("community.page.moderator")}` : ""}
          {followsMe ? ` · ${t("profile.friends.followsYou")}` : ""}
        </Mono>
        {!me && <FollowButton user={u} size="md" />}
      </View>
      <FollowCounts userId={id} following={shown.following} followers={shown.followers} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { n: photos.length, label: t("profile.photos.title") },
          { n: streakOf(photos), label: t("me.streak") },
          { n: photos.filter((p) => p.verifiedBy.length >= 3).length, label: t("me.verified") },
        ].map((x) => (
          <View key={x.label} style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, gap: 4 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 24, color: C.ink }}>{x.n}</Text>
            <Text style={T.caption}>{x.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Mono>{t("profile.photos.title")}</Mono>
        <PhotoGrid posts={photos} empty={me ? t("profile.photos.emptyMine") : t("profile.photos.emptyThem", { name: u.name })} />
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
