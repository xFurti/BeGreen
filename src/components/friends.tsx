import { Image } from "expo-image";
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { TitledName } from "@/components/titled-name";
import { Avatar, Button, Mono, Press, Tag } from "@/components/ui";
import type { Post, User } from "@/data/types";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useApp, useFollowing } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// Following, and what comes with it: the accounts you follow are your friends.

export const openMember = (id: string) => router.push({ pathname: "/member/[id]", params: { id } });

export function FollowButton({ user, size = "sm" }: { user: User; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const me = useApp((s) => s.userId);
  const follow = useApp((s) => s.follow);
  const following = useFollowing(user.id);
  const followsMe = useApp((s) => s.followers.includes(user.id));
  if (!user.id || user.id === me || user.id === "demo") return null;
  return (
    <Button
      label={following ? t("profile.friends.followingBtn") : followsMe ? t("profile.friends.followBack") : t("profile.friends.follow")}
      kind={following ? "secondary" : "green"}
      size={size}
      icon={following ? "check" : "plus"}
      onPress={() => {
        haptic.tap();
        follow(user.id, !following, user);
      }}
    />
  );
}

export function PersonRow({ user }: { user: User }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const followsMe = useApp((s) => s.followers.includes(user.id));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <Press
        scale={0.985}
        onPress={() => openMember(user.id)}
        accessibilityLabel={user.name}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <Avatar name={user.name} src={user.avatar} seed={user.seed} seeds={user.seeds} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <TitledName
            name={user.name}
            badgeId={user.badgeId}
            style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.regular, fontSize: 13, color: C.mute }}>
              @{user.handle}
            </Text>
            {followsMe && <Tag label={t("profile.friends.followsYou")} />}
          </View>
        </View>
      </Press>
      <FollowButton user={user} />
    </View>
  );
}

// "12 Following · 4 Followers": opens the lists.
export function FollowCounts({ userId, following, followers }: { userId: string; following: number; followers: number }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const open = (tab: "following" | "followers") => router.push({ pathname: "/friends", params: { id: userId, tab } });
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {(
        [
          ["following", following, t("profile.friends.following")],
          ["followers", followers, t("profile.friends.followers")],
        ] as const
      ).map(([tab, n, label]) => (
        <Press
          key={tab}
          scale={0.98}
          onPress={() => open(tab)}
          accessibilityLabel={`${formatNumber(n, language)} ${label}`}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 6,
            backgroundColor: C.card,
            borderRadius: R.md,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.6, color: C.ink, fontVariant: ["tabular-nums"] }}>
            {formatNumber(n, language)}
          </Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{label}</Text>
        </Press>
      ))}
    </View>
  );
}

// Someone's proofs as a photo grid, newest first: three across.
const GAP = 4;
export function PhotoGrid({ posts, empty }: { posts: Post[]; empty: string }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const shown = [...posts].sort((a, b) => b.createdAt - a.createdAt);
  const tile = Math.floor((width - 2 * GAP) / 3);
  if (!shown.length) {
    return (
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 17, color: C.ink }}>{t("profile.photos.empty")}</Text>
        <Text style={[T.caption, { textAlign: "center" }]}>{empty}</Text>
      </View>
    );
  }
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {shown.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push({ pathname: "/post/[id]", params: { id: p.id } })}
          accessibilityRole="button"
          accessibilityLabel={t("profile.openProof")}
          style={({ pressed }) => ({
            width: tile > 0 ? tile : "30%",
            aspectRatio: 3 / 4,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: C.card,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Image source={p.photo} style={{ flex: 1 }} contentFit="cover" transition={150} priority="low" />
          {p.verifiedBy.length >= 3 && (
            <View
              style={{
                position: "absolute",
                left: 6,
                bottom: 6,
                backgroundColor: C.scrim,
                borderRadius: 8,
                paddingHorizontal: 6,
                height: 16,
                justifyContent: "center",
              }}
            >
              <Mono color={C.white} size={9}>
                ✓
              </Mono>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
