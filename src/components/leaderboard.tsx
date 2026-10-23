import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { TitledName } from "@/components/titled-name";
import { Avatar, Button, Mono } from "@/components/ui";
import { isCity, type Community } from "@/data/community";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { rankOf, type Standing } from "@/services/leaderboard";
import { useAuthor, weekResetIn } from "@/store/app-store";
import { useStandings } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// This week's leaderboard of a community, in deep green: the moment that matters in a group.
// `limit` keeps the top of the board and always adds your own row.

function Row({ r, rank, index }: { r: Standing; rank: number; index: number }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const who = useAuthor()(r.userId);
  const name = r.me ? t("community.board.you") : who.name;
  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 40).springify().damping(20)}
      layout={LinearTransition}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        height: 54,
        paddingHorizontal: 12,
        marginHorizontal: -12,
        borderRadius: R.md,
        backgroundColor: r.me ? C.forest2 : "transparent",
      }}
    >
      <Text style={{ width: 26, fontFamily: F.monoMedium, fontSize: 13, color: rank <= 3 ? C.lime : C.forestMute }}>{String(rank).padStart(2, "0")}</Text>
      <Avatar name={who.name} src={who.avatar} seed={who.seed} seeds={who.seeds} size={32} invert />
      <View style={{ flex: 1, gap: 1 }}>
        <TitledName name={name} badgeId={who.badgeId} style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.white }} />
        {r.postedToday && <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>{t("community.board.today")}</Text>}
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 18, letterSpacing: -0.5, color: r.me ? C.lime : C.white, fontVariant: ["tabular-nums"] }}>
        {formatNumber(r.points, language)}
      </Text>
    </Animated.View>
  );
}

export function Leaderboard({ community, limit, title }: { community: Community; limit?: number; title: string }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const board = useStandings(community);
  const author = useAuthor();
  const { rank, ahead, mine } = rankOf(board);
  const top = limit ? board.slice(0, limit) : board;
  const showMine = limit && rank > limit;
  const alone = board.length < 2;
  const line = alone
    ? isCity(community)
      ? t("community.board.aloneCity")
      : t("community.board.alone")
    : ahead && mine
      ? t("community.board.toPass", { gap: ahead.points - mine.points, name: ahead.me ? t("community.board.you") : author(ahead.userId).name })
      : t("community.board.leading");

  return (
    <View style={{ backgroundColor: C.forest, borderRadius: R.xl, borderCurve: "continuous", padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Mono color={C.lime} style={{ flex: 1 }}>
          {title}
        </Mono>
        <Mono color={C.forestMute}>{t("community.board.resets", { days: weekResetIn() })}</Mono>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 44, lineHeight: 46, letterSpacing: -2, color: C.white, fontVariant: ["tabular-nums"] }}>#{rank}</Text>
        <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 14, lineHeight: 19, color: C.forestMute }}>{line}</Text>
        <Button label={t("community.board.post")} kind="inverse" size="sm" icon="camera" onPress={() => router.push("/capture")} />
      </View>
      <View style={{ height: 1, backgroundColor: C.forestLine }} />
      <View>
        {top.map((r, i) => (
          <Row key={r.userId} r={r} rank={i + 1} index={i} />
        ))}
        {showMine && mine && (
          <>
            <Text style={{ textAlign: "center", color: C.forestMute, fontFamily: F.mono, fontSize: 12, paddingVertical: 2 }}>···</Text>
            <Row r={mine} rank={rank} index={top.length} />
          </>
        )}
      </View>
      <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>{t("community.board.how")}</Text>
    </View>
  );
}

// "#2 this week" for a list row, from the same board.
export function useMyRank(community: Community) {
  const board = useStandings(community);
  return { ...rankOf(board), size: board.length };
}
