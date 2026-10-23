import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View, type ListViewToken } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DailyCard } from "@/components/drop-card";
import { Icon } from "@/components/icon";
import { Sprout } from "@/components/nature";
import { PostCard } from "@/components/post-card";
import { SeedTip } from "@/components/seed-ui";
import { Avatar, Button, Logo, Mono, Press, TextTabs } from "@/components/ui";
import { demoPostsFor } from "@/data/demo";
import type { Post } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { profileName } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { isGroupPost, postGroupId } from "@/services/groups";
import { postedToday, syncSocial, useApp, useAuthor, useMyPosts } from "@/store/app-store";
import { useJoined } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type Lens = "all" | "friends" | "groups" | "comune";

// Below this many real proofs for today's challenge, example proofs fill the Comune feed.
const DEMO_UNDER = 3;

function CommunityEntry({ place }: { place: string }) {
  const { C } = useTheme();
  const { t } = useI18n();
  return (
    <Press
      scale={0.985}
      onPress={() => router.navigate("/(tabs)/community")}
      accessibilityLabel={t("community.title")}
      style={{ backgroundColor: C.card, borderRadius: R.xl, borderCurve: "continuous", padding: 18, gap: 14 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Mono style={{ flex: 1 }}>{t("community.title")}</Mono>
        <Icon name="arrowRight" color={C.forestInk} size={18} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Icon name="map" color={C.forestInk} size={30} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }} numberOfLines={1}>
            {t("groups.feedTitle", { place })}
          </Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.mute }}>
            {t("groups.feedBody")}
          </Text>
        </View>
      </View>
    </Press>
  );
}

export default function Feed() {
  const { C } = useTheme();
  const { top } = useSafeAreaInsets();
  const all = useApp((s) => s.posts);
  const me = useApp((s) => s.userId);
  const myPosts = useMyPosts();
  const profile = useApp((s) => s.profile);
  const { groups } = useJoined();
  const comune = useApp((s) => s.comune);
  const author = useAuthor();
  const { drop, pulse, refresh, ready } = usePulse();
  const following = useApp((s) => s.following);
  const { t } = useI18n();
  const [lens, setLens] = useState<Lens>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const place = comune?.name ?? pulse.place.name;

  const unlocked = postedToday(myPosts);
  const dropTipSeen = useApp((s) => !!s.tips.drop);

  const challengeCount = useMemo(() => all.filter((p) => p.challengeId === drop.id && !p.isDemo && !isGroupPost(p)).length, [all, drop.id]);

  const groupIds = useMemo(() => new Set(groups.map((s) => s.id)), [groups]);
  const friends = useMemo(() => new Set(following), [following]);
  const posts = useMemo(() => {
    const others = all.filter((p) => p.authorId !== me && !p.isDemo);
    const inGroup = (p: Post) => groupIds.has(postGroupId(p) ?? "");
    const local = (p: Post) => p.comuneId === comune?.id && !isGroupPost(p);
    if (lens === "groups") return others.filter(inGroup);
    if (lens === "friends") return others.filter((p) => friends.has(p.authorId));
    const shown = lens === "comune" ? others.filter(local) : others.filter((p) => local(p) || inGroup(p) || friends.has(p.authorId) || p.audience === "public");
    if (!ready || challengeCount >= DEMO_UNDER) return shown;
    return [...shown, ...demoPostsFor(drop, place)];
  }, [all, me, lens, groupIds, friends, comune?.id, ready, challengeCount, drop, place]);

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
      <SeedTip id="drop" text={t("seed.tips.drop", { place })} />
      <DailyCard />
      <CommunityEntry place={place} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t("feed.lenses")}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18 }}
      >
        <TextTabs<Lens>
          value={lens}
          onChange={setLens}
          options={[
            { value: "all", label: t("feed.all") },
            { value: "friends", label: t("feed.friends") },
            { value: "groups", label: t("groups.groups") },
            { value: "comune", label: place },
          ]}
        />
      </ScrollView>
      {unlocked && dropTipSeen && posts.some((p) => !p.isDemo) && <SeedTip id="verify" text={t("seed.tips.verify")} />}
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
          <Avatar name={profileName(profile.name, t)} seed={author(me).seed} seeds={author(me).seeds} size={32} />
        </Press>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        windowSize={3}
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
              {lens === "groups"
                ? t("groups.noProofs")
                : lens === "friends"
                  ? t("feed.quietFriends")
                  : lens === "comune"
                    ? t("feed.quietComune", { place })
                    : t("feed.quietAll", { place })}
            </Text>
            {lens === "groups" && <Button label={t("community.title")} size="md" onPress={() => router.navigate("/(tabs)/community")} style={{ marginTop: 6 }} />}
            {lens === "friends" && <Button label={t("profile.friends.find")} size="md" icon="people" onPress={() => router.push("/friends")} style={{ marginTop: 6 }} />}
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
