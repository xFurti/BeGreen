import { router } from "expo-router";
import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { ProofMedia } from "@/components/proof-media";
import { Avatar, Mono, Press, SdgTags, Tag } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { ME_ID, USERS } from "@/data/seed";
import type { Post } from "@/data/types";
import { useApp } from "@/store/app-store";
import { C, F, R, shadow } from "@/theme/tokens";
import { compact, haptic, timeAgo } from "@/utils/format";

export const VERIFY_GOAL = 3;
export const REACTIONS = ["💚", "🔥", "😂", "😮", "🌍"];

export function author(id: string, meName: string) {
  if (id === ME_ID) return { id, name: meName || "You", handle: "you", avatar: undefined, tag: "You" };
  return USERS[id];
}

function Dots({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: VERIFY_GOAL }).map((_, i) => (
        <View
          key={i}
          style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: i < n ? (dark ? C.white : C.ink) : dark ? C.nightLine : C.card2 }}
        />
      ))}
    </View>
  );
}

export function VerifyBar({ post }: { post: Post }) {
  const verify = useApp((s) => s.verify);
  const meName = useApp((s) => s.profile.name);
  const n = post.verifiedBy.length;
  const done = n >= VERIFY_GOAL;
  const mine = post.authorId === ME_ID;
  const iVerified = post.verifiedBy.includes(ME_ID);

  if (done) {
    const names = post.verifiedBy.slice(0, 2).map((id) => author(id, meName)?.name ?? "?");
    return (
      <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
        <Icon name="checkSeal" size={14} color={C.ink} />
        <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 13, color: C.mute, flexShrink: 1 }}>
          Verified by <Text style={{ color: C.ink, fontFamily: F.medium }}>{names.join(", ")}</Text>
          {n > 2 ? ` +${n - 2}` : ""}
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {!mine && !iVerified ? (
        <Press
          onPress={() => {
            haptic.success();
            verify(post.id);
          }}
          accessibilityLabel="Verify this proof"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: C.ink,
            paddingHorizontal: 12,
            height: 30,
            borderRadius: R.pill,
          }}
        >
          <Icon name="check" size={12} color={C.white} />
          <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 13 }}>Verify</Text>
        </Press>
      ) : (
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{mine ? "Waiting for friends" : "You verified"}</Text>
      )}
      <Dots n={n} />
      <Mono>
        {n}/{VERIFY_GOAL}
      </Mono>
    </View>
  );
}

function Reactions({ post }: { post: Post }) {
  const react = useApp((s) => s.react);
  const mine = useApp((s) => s.reacted[post.id]);
  const [open, setOpen] = useState(false);
  const entries = Object.entries(post.reactions).filter(([, n]) => n > 0);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const top = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([e]) => e);

  return (
    <View style={{ zIndex: 2 }}>
      <Pressable
        accessibilityLabel="React"
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 30 }}
      >
        <Text style={{ fontSize: 14, letterSpacing: -3 }}>{top.length ? top.join(" ") : "🙂"}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: mine ? C.ink : C.mute, fontVariant: ["tabular-nums"] }}>
          {total ? compact(total) : "React"}
        </Text>
      </Pressable>
      {open && (
        <Animated.View
          entering={FadeIn.duration(140)}
          style={{
            position: "absolute",
            bottom: 36,
            right: -48,
            flexDirection: "row",
            gap: 2,
            backgroundColor: C.bg,
            borderRadius: R.pill,
            padding: 4,
            boxShadow: shadow.lift,
          }}
        >
          {REACTIONS.map((e, i) => (
            <Animated.View key={e} entering={ZoomIn.delay(i * 22).springify().damping(14)}>
              <Pressable
                accessibilityLabel={`React ${e}`}
                onPress={() => {
                  haptic.soft();
                  react(post.id, e);
                  setOpen(false);
                }}
                style={{
                  width: 38,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  backgroundColor: mine === e ? C.card : "transparent",
                }}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

export const PostCard = memo(function PostCard({
  post,
  active,
  locked,
  lockHint,
  index = 0,
}: {
  post: Post;
  active: boolean;
  locked?: boolean;
  lockHint?: boolean;
  index?: number;
}) {
  const meName = useApp((s) => s.profile.name);
  const react = useApp((s) => s.react);
  const mine = useApp((s) => s.reacted[post.id]);
  const a = author(post.authorId, meName);
  const action = ACTIONS[post.action];
  const open = () => router.push({ pathname: "/post/[id]", params: { id: post.id } });

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 4) * 60).springify().damping(20)} style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar src={a.avatar} name={a.name} size={34} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, color: C.ink }}>{a.name}</Text>
          <Mono>
            {post.place} · {timeAgo(post.createdAt)}
          </Mono>
        </View>
        {post.isDrop && <Tag label="DROP" solid />}
      </View>

      <ProofMedia
        photo={post.photo}
        proof={post.proof}
        active={active}
        locked={locked}
        lockHint={lockHint}
        verified={post.verifiedBy.length >= VERIFY_GOAL}
        onPressMain={open}
        onDoubleTap={() => {
          if (mine !== "💚") react(post.id, "💚");
        }}
      />

      {!locked && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name={action.icon} size={15} color={C.ink} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2, color: C.ink }}>{action.label}</Text>
            <SdgTags goals={action.sdgs.slice(0, 2)} />
          </View>
          {!!post.caption && (
            <Pressable onPress={open}>
              <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1, color: C.ink }}>
                <Text style={{ fontFamily: F.semibold }}>{a.handle} </Text>
                {post.caption}
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 30 }}>
            <View style={{ flex: 1 }}>
              <VerifyBar post={post} />
            </View>
            <Reactions post={post} />
            <Pressable onPress={open} hitSlop={6} accessibilityLabel="Comments" style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name="chatOutline" size={14} color={C.mute} />
              <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.mute, fontVariant: ["tabular-nums"] }}>{post.comments.length}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Animated.View>
  );
});
