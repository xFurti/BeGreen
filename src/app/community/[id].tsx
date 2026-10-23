import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";

import { ChallengeCard, CommunityCover, communityDescription, ProofRow, PromptCard, SpotRow } from "@/components/community-ui";
import { Icon } from "@/components/icon";
import { GroupImpact } from "@/components/group-impact";
import { AvatarStack, Button, Mono, Press } from "@/components/ui";
import { eventPhase, isCity, type Community } from "@/data/community";
import { useCommunityFeed } from "@/hooks/use-community-feed";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { useNow } from "@/hooks/use-now";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { useAuthor } from "@/store/app-store";
import { joinCity, syncCommunity, useCommunity, useCommunityById, useCommunitySpots } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// A community's page. A city leads with its real map and what's happening there; a group leads with
// its leaderboard and the code to invite friends. Both can be explored before joining.

const openMap = (c: Community) => router.push({ pathname: "/map/[id]", params: { id: c.id } });

function Heading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { C, T } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
      <Text style={[T.title, { flex: 1 }]}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} hitSlop={10}>
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.leaf }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function useMemberLine(c: Community) {
  const { t, language } = useI18n();
  const members = useCommunity((s) => s.members[c.id]);
  const joined = useCommunity((s) => !!s.roles[c.id]);
  // Offline the member list is just this phone: you, once you've joined.
  const n = Math.max(members?.length ?? c.memberCount ?? 0, joined ? 1 : 0);
  return n === 1 ? t("community.member") : t("community.members", { count: formatNumber(n, language) });
}

function Challenges({ c, member }: { c: Community; member: boolean }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const all = useCommunity((s) => s.challenges);
  const now = useNow();
  const active = all.filter((x) => x.communityId === c.id && x.endsAt > now).sort((a, b) => a.endsAt - b.endsAt);
  if (!active.length && !member) return null;
  return (
    <View style={{ gap: 12 }}>
      <Heading title={t("community.challenges.active")} />
      {active.slice(0, 3).map((x, i) => (
        <ChallengeCard key={x.id} challenge={x} index={i} />
      ))}
      {active.length === 0 && <Text style={T.caption}>{t("community.page.noChallenges")}</Text>}
      {member && (
        <Button label={t("community.challenges.launch")} size="md" kind="ghost" icon="flag" onPress={() => router.push({ pathname: "/new-challenge", params: { community: c.id } })} />
      )}
    </View>
  );
}

// Proofs posted in the community, newest first.
function Latest({ c, limit = 6, empty }: { c: Community; limit?: number; empty: string }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const proofs = useCommunityFeed(c).filter((it) => it.kind === "post");
  return (
    <View style={{ gap: 10 }}>
      <Heading title={isCity(c) ? t("community.page.latest") : t("groups.groupActivity")} />
      {proofs.slice(0, limit).map((it) => (it.kind === "post" ? <ProofRow key={it.post.id} post={it.post} /> : null))}
      {proofs.length === 0 && <Text style={T.caption}>{empty}</Text>}
    </View>
  );
}

function BoardLink({ c }: { c: Community }) {
  const { t } = useI18n();
  return <Button label={t("groups.board")} kind="ghost" size="md" icon="league" onPress={() => router.push({ pathname: "/community-ranking", params: { id: c.id } })} />;
}

function LeaveButton({ c }: { c: Community }) {
  const { t } = useI18n();
  const leave = useCommunity((s) => s.leave);
  return (
    <Button
      label={t("community.page.leave")}
      kind="ghost"
      size="md"
      onPress={() =>
        Alert.alert(t("community.page.leaveTitle", { name: c.name }), t("community.page.leaveBody"), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("community.page.leave"),
            style: "destructive",
            onPress: () =>
              leave(c.id)
                .then(() => router.back())
                .catch(() => Alert.alert(t("shared.offline"))),
          },
        ])
      }
    />
  );
}

// ---------- city ----------

function CityPage({ c }: { c: Community }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const role = useCommunity((s) => s.roles[c.id]);
  const { spots, real } = useCommunitySpots(c);
  const memberLine = useMemberLine(c);
  const now = useNow();
  const [busy, setBusy] = useState(false);

  // Local experiences: what's coming up first, then the places people added.
  const experiences = useMemo(() => {
    const visible = spots.filter((s) => !s.hidden);
    const upcoming = visible.filter((s) => s.kind === "event" && eventPhase(s, now) !== "ended").sort((a, b) => (a.startsAt ?? 0) - (b.startsAt ?? 0));
    const places = visible.filter((s) => s.kind !== "event" && s.kind !== "moment").sort((a, b) => b.updatedAt - a.updatedAt);
    return [...upcoming, ...places].slice(0, 6);
  }, [spots, now]);

  const join = async () => {
    setBusy(true);
    try {
      if (await joinCity(c)) haptic.success();
      else Alert.alert(t("community.page.joinFail"), t("shared.checkConnection"));
    } catch {
      Alert.alert(t("community.page.joinFail"), t("shared.checkConnection"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <CommunityCover community={c} height={320} onPress={() => openMap(c)}>
        <View pointerEvents="none" style={{ position: "absolute", right: 12, bottom: 22, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 14, height: 38 }}>
          <Icon name="expand" size={14} color={C.bg} />
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.bg }}>{t("community.city.openMap")}</Text>
        </View>
      </CommunityCover>

      <View style={{ gap: 6 }}>
        <Mono color={C.leaf}>{t("community.city.kicker")}</Mono>
        <Text style={T.hero}>{c.name}</Text>
        <Text style={T.caption}>
          {memberLine} · {c.area}
        </Text>
      </View>

      {role ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label={t("community.add.cta")} kind="green" icon="plus" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/add-spot", params: { community: c.id } })} />
          <Button label={t("community.city.map")} kind="secondary" icon="map" onPress={() => openMap(c)} />
        </View>
      ) : (
        <Button label={t("community.city.join", { name: c.name })} kind="green" icon="plus" loading={busy} onPress={join} />
      )}

      <View style={{ gap: 4 }}>
        <Heading title={t("community.city.experiences")} action={real ? t("community.city.onMap") : undefined} onAction={() => openMap(c)} />
        {experiences.map((s) => (
          <SpotRow key={s.id} spot={s} />
        ))}
        {experiences.length === 0 && <Text style={[T.caption, { paddingTop: 6 }]}>{role ? t("community.city.noPlaces") : t("community.city.noPlacesGuest")}</Text>}
      </View>

      {role && <PromptCard community={c} />}

      <Challenges c={c} member={!!role} />

      <Latest c={c} limit={5} empty={t("community.city.noProofs")} />

      <BoardLink c={c} />

      {role && <LeaveButton c={c} />}
    </>
  );
}

// ---------- group ----------

function InviteCard({ c, code }: { c: Community; code: string }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const share = () => Share.share({ message: t("community.group.inviteText", { name: c.name, code }) });
  return (
    <View style={{ borderRadius: R.xl, borderCurve: "continuous", borderWidth: 1, borderColor: C.line, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 19, letterSpacing: -0.5, color: C.ink }}>{t("community.group.invite")}</Text>
          <Text style={T.caption}>{t("community.group.inviteBody")}</Text>
        </View>
        <Press onPress={share} accessibilityLabel={t("community.group.share")} style={{ backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text selectable style={{ fontFamily: F.monoMedium, fontSize: 22, letterSpacing: 3, color: C.ink }}>
            {code}
          </Text>
        </Press>
      </View>
      <Button label={t("community.group.share")} kind="green" icon="share" size="md" onPress={share} />
    </View>
  );
}

function GroupPage({ c }: { c: Community }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const role = useCommunity((s) => s.roles[c.id]);
  const invite = useCommunity((s) => s.invites[c.id]);
  const members = useCommunity((s) => s.members[c.id]);
  const join = useCommunity((s) => s.join);
  const author = useAuthor();
  const memberLine = useMemberLine(c);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const priv = c.visibility === "private";
  const canSee = !priv || !!role;

  const doJoin = async () => {
    setBusy(true);
    try {
      const ok = await join(c.id, priv ? code.trim() : undefined);
      if (!ok) Alert.alert(t("community.page.badCode"), t("community.page.badCodeBody"));
      else haptic.success();
    } catch {
      Alert.alert(t("community.page.joinFail"), t("shared.checkConnection"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={priv ? "lock" : "globe"} size={12} color={C.leaf} />
          <Mono color={C.leaf}>
            {t("community.group.kicker")} · {priv ? t("community.visibility.private") : t("community.visibility.public")}
          </Mono>
        </View>
        <Text style={T.hero}>{c.name}</Text>
        {!!communityDescription(t, c) && <Text style={T.callout}>{communityDescription(t, c)}</Text>}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!!members?.length && <AvatarStack people={members.slice(0, 5).map((m) => author(m.userId))} size={22} />}
          <Text style={T.caption}>{memberLine}</Text>
        </View>
      </View>

      {!role && (
        <View style={{ backgroundColor: C.mint, borderRadius: R.lg, padding: 16, gap: 10 }}>
          {priv && (
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder={t("community.page.codePh")}
              placeholderTextColor={C.mute}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              style={{ height: 50, borderRadius: R.pill, backgroundColor: C.bg, paddingHorizontal: 18, fontFamily: F.monoMedium, fontSize: 18, letterSpacing: 2, color: C.ink }}
              accessibilityLabel={t("community.page.codePh")}
            />
          )}
          <Button label={t("community.group.join")} kind="green" icon="plus" loading={busy} disabled={priv && code.trim().length < 4} onPress={doJoin} />
        </View>
      )}

      {canSee ? (
        <>
          {role && <Button label={t("groups.post")} kind="green" icon="camera" onPress={() => router.push({ pathname: "/capture", params: { group: c.id } })} />}
          <Challenges c={c} member={!!role} />
          <Latest c={c} empty={t("groups.noProofs")} />
          <GroupImpact community={c} />
          {role && invite && <InviteCard c={c} code={invite} />}
          <View style={{ gap: 10 }}>
            <Heading title={t("groups.members")} />
            {(members ?? []).slice(0, 30).map((m) => (
              <Press key={m.userId} onPress={() => router.push({ pathname: "/member/[id]", params: { id: m.userId } })}>
                <Text style={T.body}>{author(m.userId).name}</Text>
              </Press>
            ))}
            {(members?.length ?? 0) > 30 && <Text style={T.caption}>{t("groups.moreMembers", { count: 30 })}</Text>}
          </View>
          <BoardLink c={c} />
        </>
      ) : (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 20 }}>
          <Icon name="lock" size={24} color={C.mute} />
          <Text style={[T.callout, { textAlign: "center" }]}>{t("community.page.privateLocked")}</Text>
        </View>
      )}

      {role && <LeaveButton c={c} />}
    </>
  );
}

export default function CommunityPage() {
  const { C, T } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const community = useCommunityById(id);
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const { t } = useI18n();

  useEffect(() => {
    void syncCommunity(id);
  }, [id]);

  if (!community) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={T.body}>{t("community.missing")}</Text>
      </View>
    );
  }

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: community.name }} />
      <ScrollView
        ref={scrollerRef}
        {...scrollProps}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: scrollPaddingBottom(60, cover), gap: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        {isCity(community) ? <CityPage c={community} /> : <GroupPage c={community} />}
      </ScrollView>
    </View>
  );
}
