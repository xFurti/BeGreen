import { router } from "expo-router";
import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import { DropTag } from "@/components/drop-tag";
import { Icon } from "@/components/icon";
import { LeafBurst } from "@/components/nature";
import { ProofMedia } from "@/components/proof-media";
import { TitledName } from "@/components/titled-name";
import { Avatar, Mono, Press, SdgTags, Tag } from "@/components/ui";
import type { Post } from "@/data/types";
import { actionCopy, placeLabel, textOf } from "@/i18n/content";
import { compact, timeAgo } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useApp, useAuthor } from "@/store/app-store";
import { C, F, R, shadow } from "@/theme/tokens";
import { haptic } from "@/utils/format";

export const VERIFY_GOAL = 3;
export const REACTIONS = ["💚", "🔥", "😂", "😮", "🌍"];

function Dots({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: VERIFY_GOAL }).map((_, i) => (
        <View
          key={i}
          style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: i < n ? (dark ? C.lime : C.leaf) : dark ? C.nightLine : C.mint2 }}
        />
      ))}
    </View>
  );
}

export function VerifyBar({ post }: { post: Post }) {
  const verify = useApp((s) => s.verify);
  const me = useApp((s) => s.userId);
  const author = useAuthor();
  const { t } = useI18n();
  const n = post.verifiedBy.length;
  const done = n >= VERIFY_GOAL;
  const mine = post.authorId === me;
  const iVerified = post.verifiedBy.includes(me);
  // Survives the switch from the Verify button to the verified label, so the leaves finish flying.
  const [burst, setBurst] = useState(0);
  const leaves = burst > 0 && (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: 80, height: 30 }}>
      <LeafBurst id={burst} />
    </View>
  );

  if (post.isDemo) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="info" size={14} color={C.mute} />
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{t("post.example")}</Text>
      </View>
    );
  }

  if (mine && post.pending) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="refresh" size={13} color={C.mute} />
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{t("post.notShared")}</Text>
      </View>
    );
  }

  if (done) {
    const names = post.verifiedBy.slice(0, 2).map((id) => author(id).name);
    return (
      <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
        {leaves}
        <Icon name="checkSeal" size={14} color={C.leaf} />
        <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 13, color: C.mute, flexShrink: 1 }}>
          {t("post.verifiedBy", { names: names.join(", ") + (n > 2 ? ` +${n - 2}` : "") })}
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {leaves}
      {!mine && !iVerified ? (
        <Press
          onPress={() => {
            haptic.success();
            setBurst(Date.now());
            verify(post.id);
          }}
          accessibilityLabel={t("post.verifyA11y")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: C.forest,
            paddingHorizontal: 12,
            height: 30,
            borderRadius: R.pill,
          }}
        >
          <Icon name="check" size={12} color={C.lime} />
          <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 13 }}>{t("post.verify")}</Text>
        </Press>
      ) : (
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: mine ? C.ink2 : C.leaf }}>{mine ? t("post.waiting") : t("post.youVerified")}</Text>
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
  const { t, language } = useI18n();
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
        accessibilityLabel={t("post.react")}
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 30 }}
      >
        <Text style={{ fontSize: 14, letterSpacing: -3 }}>{top.length ? top.join(" ") : "🙂"}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: mine ? C.ink : C.mute, fontVariant: ["tabular-nums"] }}>
          {total ? compact(total, language) : t("post.react")}
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
                accessibilityLabel={t("post.reactEmoji", { emoji: e })}
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
                  backgroundColor: mine === e ? C.mint : "transparent",
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
  const react = useApp((s) => s.react);
  const mine = useApp((s) => s.reacted[post.id]);
  const flagged = useApp((s) => !!s.flagged[post.id]);
  const { t, language } = useI18n();
  const a = useAuthor()(post.authorId);
  const action = actionCopy(t, post.action);
  const caption = textOf(post.caption, post.captionKey, language);
  const open = () => router.push({ pathname: "/post/[id]", params: { id: post.id } });

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 4) * 60).springify().damping(20)} style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar src={a.avatar} avatarId={a.avatarId} name={a.name} size={34} />
        <View style={{ flex: 1, gap: 2 }}>
          <TitledName name={a.name} badgeId={a.badgeId} style={{ fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, color: C.ink }} />
          <Mono>
            {placeLabel(post.place, t)} · {timeAgo(post.createdAt, language)}
          </Mono>
        </View>
        {post.isDemo && <Tag label={t("common.demo")} />}
        {post.isDrop && <DropTag post={post} />}
        {flagged && <Tag label={t("post.flaggedTag")} />}
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
            <Icon name={action.icon} size={15} color={C.leaf} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2, color: C.ink }}>{action.label}</Text>
            <SdgTags goals={action.sdgs.slice(0, 2)} />
          </View>
          {!!caption && (
            <Pressable onPress={open}>
              <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1, color: C.ink }}>
                <Text style={{ fontFamily: F.semibold }}>{a.handle} </Text>
                {caption}
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 30 }}>
            <View style={{ flex: 1 }}>
              <VerifyBar post={post} />
            </View>
            {!post.isDemo && (
              <>
                <Reactions post={post} />
                <Pressable onPress={open} hitSlop={6} accessibilityLabel={t("post.comments")} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="chatOutline" size={14} color={C.mute} />
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.mute, fontVariant: ["tabular-nums"] }}>{post.comments.length}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
});
