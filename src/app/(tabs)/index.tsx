import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View, type ListViewToken } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DropCard, useCountdown } from "@/components/drop-card";
import { Icon } from "@/components/icon";
import { Sprout } from "@/components/nature";
import { PostCard, VerifyBar } from "@/components/post-card";
import { Avatar, Bar, Button, Logo, Mono, Press, TextTabs } from "@/components/ui";
import { demoPostsFor } from "@/data/demo";
import type { Post, User } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { actionCopy, profileName } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { postedToday, streakOf, syncSocial, useApp, useAuthor, useLeague, useMyPosts } from "@/store/app-store";
import { C, F, R } from "@/theme/tokens";

type Lens = "comune" | "squads" | "everyone";

// Below this many real proofs for today's challenge, example proofs fill the Comune feed.
const DEMO_UNDER = 3;

function NotYet({ streak }: { streak: number }) {
  const left = useCountdown();
  const { t } = useI18n();
  return (
    <View
      style={{
        borderRadius: R.sm,
        borderTopRightRadius: R.xl,
        borderBottomLeftRadius: R.xl,
        borderCurve: "continuous",
        backgroundColor: C.mint,
        padding: 20,
        gap: 18,
        overflow: "hidden",
      }}
    >
      <View pointerEvents="none" style={{ position: "absolute", right: 16, bottom: 92, opacity: 0.9 }}>
        <Sprout size={64} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Mono color={C.forest}>{t("feed.yours")}</Mono>
        <View style={{ flex: 1 }} />
        <Icon name="flame" size={13} color={streak > 0 ? C.forest : C.faint} />
        <Mono color={streak > 0 ? C.forest : C.mute}>{streak}</Mono>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 28, lineHeight: 30, letterSpacing: -1.2, color: C.ink, paddingRight: 64 }}>
          {t("feed.notYet")}
        </Text>
        <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink2, paddingRight: 64 }}>
          {streak > 0 ? t("feed.streak", { count: streak, time: left.slice(0, 5) }) : t("feed.first")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label={t("feed.now")} kind="green" icon="camera" onPress={() => router.push("/capture")} style={{ flex: 1 }} />
        <Button label={t("feed.ideas")} kind="inverse" icon="book" onPress={() => router.push("/guide")} />
      </View>
    </View>
  );
}

function Mine({ post }: { post: Post }) {
  const { t } = useI18n();
  const a = actionCopy(t, post.action);
  return (
    <View style={{ gap: 8 }}>
      <Press
        scale={0.985}
        onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}
        accessibilityLabel={t("feed.todayA11y")}
        style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
      >
        <Image source={post.photo} style={{ width: 62, height: 78, borderRadius: 12, backgroundColor: C.card }} contentFit="cover" priority="low" />
        <View style={{ flex: 1, gap: 6 }}>
          <Mono color={C.leaf}>{t("feed.today")}</Mono>
          <Text style={{ fontFamily: F.medium, fontSize: 18, letterSpacing: -0.5, color: C.ink }}>{a.label}</Text>
          {!post.pending && <VerifyBar post={post} />}
        </View>
      </Press>
      {post.pending && <View style={{ paddingLeft: 76 }}><VerifyBar post={post} /></View>}
    </View>
  );
}

function Race({ place }: { place: string }) {
  const league = useLeague();
  const { t } = useI18n();
  const i = league.findIndex((r) => r.me);
  const me = league[i];
  const ahead = league[i - 1];
  const gap = ahead ? ahead.points - me.points : 0;
  const alone = league.length < 2;
  return (
    <Press
      scale={0.985}
      onPress={() => router.navigate("/league")}
      accessibilityLabel={t("feed.leagueA11y")}
      style={{ backgroundColor: C.card, borderRadius: R.xl, borderCurve: "continuous", padding: 18, gap: 14 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Mono style={{ flex: 1 }}>{t("feed.weekIn", { place })}</Mono>
        <Mono color={C.forest}>{t("feed.league")}</Mono>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 44, lineHeight: 46, letterSpacing: -2, color: C.forest }}>#{i + 1}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }} numberOfLines={1}>
            {alone ? t("feed.firstOnBoard") : ahead ? t("feed.behind", { gap, name: ahead.name }) : t("feed.top")}
          </Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }} numberOfLines={1}>
            {alone
              ? t("feed.alone", { place })
              : ahead
                ? t("feed.oneProof")
                : t("feed.ahead", { gap: me.points - (league[1]?.points ?? 0), name: league[1]?.name ?? t("feed.everyone") })}
          </Text>
        </View>
        {ahead && <Avatar src={ahead.avatar} name={ahead.name} size={36} />}
      </View>
      {ahead && <Bar value={me.points / Math.max(1, ahead.points)} />}
    </Press>
  );
}

export default function Feed() {
  const { top } = useSafeAreaInsets();
  const all = useApp((s) => s.posts);
  const me = useApp((s) => s.userId);
  const myPosts = useMyPosts();
  const profile = useApp((s) => s.profile);
  const squads = useApp((s) => s.squads);
  const comune = useApp((s) => s.comune);
  const author = useAuthor();
  const { drop, pulse, refresh, ready } = usePulse();
  const { t } = useI18n();
  const [lens, setLens] = useState<Lens>("comune");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const place = comune?.name ?? pulse.place.name;

  const unlocked = postedToday(myPosts);
  const streak = streakOf(myPosts);
  const today = new Date().toDateString();
  const mineToday = myPosts.find((p) => new Date(p.createdAt).toDateString() === today);
  const didDrop = myPosts.some((p) => p.challengeId === drop.id);

  const challengePosts = useMemo(() => all.filter((p) => p.challengeId === drop.id && !p.isDemo), [all, drop.id]);
  const crowd = useMemo(() => {
    const ids = [...new Set(challengePosts.map((p) => p.authorId))].sort((a, b) => Number(b === me) - Number(a === me));
    return ids.map((id): User => author(id));
  }, [challengePosts, me, author]);

  const mySquadIds = useMemo(() => new Set(squads.map((s) => s.id)), [squads]);
  const posts = useMemo(() => {
    const others = all.filter((p) => p.authorId !== me && !p.isDemo);
    if (lens === "squads") return others.filter((p) => p.squadId && mySquadIds.has(p.squadId));
    if (lens === "everyone") return others.filter((p) => p.audience === "public");
    const local = others.filter((p) => p.comuneId === comune?.id && p.audience !== "squad");
    if (!ready || challengePosts.length >= DEMO_UNDER) return local;
    return [...local, ...demoPostsFor(drop, place)];
  }, [all, me, lens, mySquadIds, comune?.id, ready, challengePosts.length, drop, place]);

  // FlatList forbids swapping this callback after mount, so keep one instance for the screen's lifetime.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: (ListViewToken & { item: Post })[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    setActiveId(first?.item?.id ?? null);
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), syncSocial()]);
    setRefreshing(false);
  }, [refresh]);

  const header = (
    <View style={{ gap: 14, paddingBottom: 10 }}>
      <DropCard drop={drop} done={didDrop} place={place} crowd={crowd} ready={ready} />
      {mineToday ? (
        <View style={{ paddingVertical: 8 }}>
          <Mine post={mineToday} />
        </View>
      ) : (
        <NotYet streak={streak} />
      )}
      <Race place={place} />
      <View style={{ paddingTop: 18 }}>
        <TextTabs<Lens>
          value={lens}
          onChange={setLens}
          options={[
            { value: "comune", label: place },
            { value: "squads", label: t("common.squads") },
            { value: "everyone", label: t("common.everyone") },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={{
          paddingTop: top + 2,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: C.bg,
        }}
      >
        <Press onPress={() => router.push("/leaf")} accessibilityLabel={t("common.askLeaf")} style={{ width: 40, height: 40, justifyContent: "center" }}>
          <Icon name="sparkle" size={21} color={C.leaf} />
        </Press>
        <Logo size={24} />
        <Press onPress={() => router.navigate("/me")} accessibilityLabel={t("feed.profile")} style={{ width: 40, alignItems: "flex-end" }}>
          <Avatar name={profileName(profile.name, t)} size={32} />
        </Press>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        windowSize={7}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 140, gap: 34 }}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            index={index}
            active={unlocked && activeId === item.id}
            locked={!unlocked}
            lockHint={!unlocked && index === 0}
          />
        )}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.leaf} colors={[C.leaf]} />}
        ListEmptyComponent={
          <Animated.View entering={FadeIn} style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
            <Sprout size={56} />
            <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.6, color: C.ink }}>{t("feed.quiet")}</Text>
            <Text style={{ fontFamily: F.regular, color: C.mute, textAlign: "center" }}>
              {lens === "squads" ? t("feed.quietBody") : lens === "everyone" ? t("feed.quietEveryone") : t("feed.quietComune", { place })}
            </Text>
            {lens === "squads" && <Button label={t("feed.findSquad")} size="md" onPress={() => router.navigate("/league")} style={{ marginTop: 6 }} />}
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
