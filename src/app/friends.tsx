import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";

import { PersonRow } from "@/components/friends";
import { Icon } from "@/components/icon";
import { Segmented } from "@/components/ui";
import type { User } from "@/data/types";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { useI18n } from "@/i18n/use-i18n";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { fetchFollows, fetchNearbyProfiles, fetchProfiles, searchProfiles } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { rememberProfiles, useApp, useAuthor } from "@/store/app-store";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type Tab = "following" | "followers";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Your friends (the accounts you follow), who follows you, and people to follow.
// With `id`, the same lists for someone else.
export default function Friends() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ id?: string; tab?: Tab }>();
  const meId = useApp((s) => s.userId);
  const id = params.id || meId;
  const mine = id === meId;
  const author = useAuthor();
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const myFollowing = useApp((s) => s.following);
  const myFollowers = useApp((s) => s.followers);
  const profiles = useApp((s) => s.profiles);
  const comuneId = useApp((s) => s.comune?.id);
  const members = useCommunity((s) => s.members);
  const [tab, setTab] = useState<Tab>(params.tab === "followers" ? "followers" : "following");
  const [theirs, setTheirs] = useState<{ following: string[]; followers: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{ q: string; users: User[] } | null>(null);
  const [nearby, setNearby] = useState<User[]>([]);

  // Someone else's lists come from the server; their names too.
  useEffect(() => {
    if (mine || !hasBackend) return;
    let live = true;
    fetchFollows(id)
      .then(async (f) => {
        const missing = [...f.following, ...f.followers].filter((x) => !useApp.getState().profiles[x] && x !== meId);
        const more = await fetchProfiles(missing).catch(() => ({}));
        if (!live) return;
        rememberProfiles(Object.values(more));
        setTheirs(f);
      })
      .catch(() => live && setTheirs({ following: [], followers: [] }));
    return () => {
      live = false;
    };
  }, [id, mine, meId]);

  useEffect(() => {
    if (!mine || !hasBackend || !comuneId) return;
    fetchNearbyProfiles(comuneId, meId)
      .then((users) => {
        rememberProfiles(users);
        setNearby(users);
      })
      .catch(() => {});
  }, [mine, comuneId, meId]);

  // Search: the server when there is one, otherwise everyone this phone has seen.
  const q = query.trim();
  useEffect(() => {
    if (q.length < 2 || !hasBackend) return;
    let live = true;
    const timer = setTimeout(() => {
      searchProfiles(q, meId)
        .then((users) => {
          if (!live) return;
          rememberProfiles(users);
          setRemote({ q, users });
        })
        .catch(() => live && setRemote({ q, users: [] }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, meId]);
  const local = useMemo(() => {
    const n = norm(q.replace(/^@/, ""));
    return Object.values(profiles).filter(
      (u) => u.id !== meId && u.id !== "demo" && (norm(u.name).includes(n) || norm(u.handle).includes(n)),
    );
  }, [q, profiles, meId]);
  const found = q.length < 2 ? null : !hasBackend ? local : remote?.q === q ? remote.users : null;
  const searching = hasBackend && q.length >= 2 && remote?.q !== q;

  const lists = mine
    ? { following: myFollowing, followers: myFollowers }
    : (theirs ?? (hasBackend ? null : { following: [], followers: [] }));
  const ids = lists?.[tab] ?? [];
  const people = ids.map((x) => author(x));
  const who = author(id);

  // People you may know: from your groups and your Comune, not followed yet.
  const suggested = useMemo(() => {
    if (!mine) return [];
    const followed = new Set(myFollowing);
    const fromGroups = Object.values(members)
      .flat()
      .map((m) => m.userId);
    const seen = [...fromGroups, ...nearby.map((u) => u.id), ...Object.keys(profiles)];
    return [...new Set(seen)].filter((x) => x !== meId && x !== "demo" && !followed.has(x)).slice(0, 8);
  }, [mine, myFollowing, members, nearby, profiles, meId]);

  // Group members are only ids. Load the ones this phone has never seen, or the row stays "Someone".
  useEffect(() => {
    if (!mine || !hasBackend) return;
    const missing = suggested.filter((x) => !useApp.getState().profiles[x]);
    if (!missing.length) return;
    let live = true;
    fetchProfiles(missing)
      .then((more) => {
        if (live) rememberProfiles(Object.values(more));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [mine, suggested]);

  const empty =
    tab === "following"
      ? mine
        ? t("profile.friends.noFollowing")
        : t("profile.friends.noFollowingThem", { name: who.name })
      : mine
        ? t("profile.friends.noFollowers")
        : t("profile.friends.noFollowersThem", { name: who.name });

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollerRef}
        {...scrollProps}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: scrollPaddingBottom(60, cover), gap: 20 }}
      >
        <Stack.Screen options={{ title: mine ? t("profile.friends.title") : who.name }} />

        {mine && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              height: 50,
              borderRadius: R.pill,
              backgroundColor: C.card,
              paddingHorizontal: 18,
            }}
          >
            <Icon name="search" size={16} color={C.mute} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("profile.friends.search")}
              placeholderTextColor={C.mute}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t("profile.friends.search")}
              style={{ flex: 1, fontFamily: F.regular, fontSize: 16, color: C.ink }}
            />
            {searching && <ActivityIndicator size="small" color={C.mute} />}
          </View>
        )}

        {found ? (
          <View>
            {!hasBackend && <Text style={[T.caption, { paddingBottom: 6 }]}>{t("profile.friends.searchOffline")}</Text>}
            {found.map((u) => (
              <PersonRow key={u.id} user={author(u.id)} />
            ))}
            {found.length === 0 && !searching && <Text style={T.callout}>{t("profile.friends.noResults", { q })}</Text>}
          </View>
        ) : (
          <>
            <Segmented<Tab>
              label={t("profile.friends.title")}
              value={tab}
              onChange={setTab}
              options={[
                { value: "following", label: `${t("profile.friends.following")} · ${lists?.following.length ?? "…"}` },
                { value: "followers", label: `${t("profile.friends.followers")} · ${lists?.followers.length ?? "…"}` },
              ]}
            />
            {!lists ? (
              <ActivityIndicator color={C.leaf} />
            ) : (
              <View>
                {people.map((u) => (
                  <PersonRow key={u.id} user={u} />
                ))}
                {people.length === 0 && <Text style={T.callout}>{empty}</Text>}
              </View>
            )}
            {mine && suggested.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text style={T.title}>{t("profile.friends.suggested")}</Text>
                {suggested.map((x) => (
                  <PersonRow key={x} user={author(x)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
