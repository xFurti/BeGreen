import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Blobs, LeafMark } from "@/components/nature";
import { AvatarStack, Button, IconButton, LiveDot, Mono, Press, SdgTags } from "@/components/ui";
import type { User } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { actionCopy } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { isGroupPost } from "@/services/groups";
import { canClaimDrop, seedsFor } from "@/services/rewards";
import { hasBackend } from "@/services/supabase";
import { streakOf, useApp, useAuthor, useMyPosts } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const pad = (n: number) => String(n).padStart(2, "0");

// Time left until midnight: the Drop is a daily thing.
export function useCountdown() {
  const calc = () => {
    const n = new Date();
    const end = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime();
    const s = Math.max(0, Math.floor((end - n.getTime()) / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// The one daily prompt: today's challenge for your Comune (the Drop) and your own BeGreen of the day,
// in a single card. The same card sits on top of the feed and of the data tab.
export function DailyCard() {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const { drop, pulse, ready } = usePulse();
  const comune = useApp((s) => s.comune);
  const all = useApp((s) => s.posts);
  const me = useApp((s) => s.userId);
  const myPosts = useMyPosts();
  const author = useAuthor();
  const bonus = useApp((s) => canClaimDrop(drop, s.posts, s.userId, hasBackend));
  const left = useCountdown();
  const place = comune?.name ?? pulse.place.name;
  const action = actionCopy(t, drop.action);
  const streak = streakOf(myPosts);
  const today = new Date().toDateString();
  const mineToday = myPosts.find((p) => new Date(p.createdAt).toDateString() === today);
  const done = myPosts.some((p) => p.challengeId === drop.id);

  // Real people in this Comune who already did today's challenge, you first.
  const crowd = useMemo(() => {
    const ids = [...new Set(all.filter((p) => p.challengeId === drop.id && !p.isDemo && !isGroupPost(p)).map((p) => p.authorId))];
    return ids.sort((a, b) => Number(b === me) - Number(a === me)).map((id): User => author(id));
  }, [all, drop.id, me, author]);

  const crowdLine = done
    ? crowd.length > 1
      ? t("dropCard.inWith", { count: formatNumber(crowd.length - 1, language), place })
      : t("dropCard.in")
    : crowd.length
      ? crowd.length === 1
        ? t("dropCard.didInOne", { place })
        : t("dropCard.didIn", { count: formatNumber(crowd.length, language), place })
      : t("dropCard.first", { place });

  return (
    <View
      // Leaf-shaped: two round corners, two tight ones.
      style={{
        backgroundColor: C.forest,
        borderRadius: R.sm,
        borderTopLeftRadius: 40,
        borderBottomRightRadius: 40,
        borderCurve: "continuous",
        padding: 20,
        gap: 18,
        overflow: "hidden",
      }}
    >
      <Blobs colors={[C.leaf, C.lime]} opacity={0.22} />
      <View pointerEvents="none" style={{ position: "absolute", right: -18, bottom: -26, opacity: 0.14 }}>
        <LeafMark size={150} color={C.lime} vein={C.forest} rotate={-12} />
      </View>
      <Press
        scale={0.985}
        disabled={!ready}
        accessibilityLabel={t("dropCard.a11y", { title: drop.title, time: left })}
        onPress={() => router.push("/drop")}
        style={{ gap: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LiveDot color={done ? C.forestMute : C.lime} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.white }}>
                {done ? t("dropCard.done") : t("dropCard.today")}
              </Text>
            </View>
            <Mono color={C.forestMute}>{place}</Mono>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="flame" size={12} color={streak > 0 ? C.lime : C.forestMute} />
              <Mono color={streak > 0 ? C.lime : C.forestMute}>{streak}</Mono>
              <Mono color={C.forestMute} style={{ fontVariant: ["tabular-nums"] }}>
                · {left}
              </Mono>
            </View>
            <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>{t("dropCard.leftToday")}</Text>
          </View>
        </View>

        <Text
          accessibilityRole="header"
          {...(Platform.OS === "web" ? { "aria-level": 1 } : {})}
          style={{ fontFamily: F.medium, fontSize: 32, lineHeight: 34, letterSpacing: -1.4, color: C.white }}
        >
          {ready ? drop.title : t("dropCard.reading", { place })}
        </Text>
      </Press>

      {ready ? (
        <View style={{ gap: 14 }}>
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name={action.icon} size={14} color={C.lime} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.white }}>{action.label}</Text>
              <SdgTags goals={action.sdgs.slice(0, 1)} dark />
            </View>
            <Text style={{ marginLeft: 22, fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.forestMute }}>{drop.metric}</Text>
          </View>

          {mineToday ? (
            <Press
              scale={0.985}
              onPress={() => router.push({ pathname: "/post/[id]", params: { id: mineToday.id } })}
              accessibilityLabel={t("dropCard.yours")}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.forest2, borderRadius: R.md, padding: 10 }}
            >
              <Image
                source={mineToday.photo}
                style={{ width: 44, height: 56, borderRadius: 10, backgroundColor: C.forestLine }}
                contentFit="cover"
                priority="low"
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.lime }}>{t("dropCard.yours")}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.white }}>
                  {actionCopy(t, mineToday.action).label}
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.white }}>
                  {mineToday.verifiedBy.length >= 3 ? t("me.verified") : `${t("post.waiting")} · ${mineToday.verifiedBy.length}/3`}
                </Text>
              </View>
              <Icon name="arrowRight" size={13} color={C.lime} />
            </Press>
          ) : (
            <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.forestMute }}>
              <Text style={{ fontFamily: F.medium, color: C.white }}>{t("dropCard.notYet")}. </Text>
              {streak > 0 ? t("feed.streak", { count: streak, time: left.slice(0, 5) }) : t("feed.first")}
            </Text>
          )}

          <View style={{ height: 1, backgroundColor: C.forestLine }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {crowd.length > 0 && <AvatarStack people={crowd.slice(0, 3)} size={22} ring={C.forest} />}
            <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: done ? C.lime : C.forestMute }} numberOfLines={1}>
              {crowdLine}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {done ? (
              <Button label={t("feed.ideas")} kind="glass" icon="book" onPress={() => router.push("/guide")} style={{ flex: 1 }} />
            ) : (
              <Button
                label={t("feed.now")}
                kind="inverse"
                icon={action.icon}
                trailing={`+${seedsFor({ action: drop.action, isDrop: bonus })}`}
                onPress={() => router.push({ pathname: "/capture", params: { action: drop.action } })}
                style={{ flex: 1 }}
              />
            )}
            <IconButton icon="info" label={t("dropCard.why")} bg={C.glass} color={C.white} size={56} onPress={() => router.push("/drop")} />
          </View>
        </View>
      ) : (
        <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.forestMute }}>{t("dropCard.loading")}</Text>
      )}
    </View>
  );
}
