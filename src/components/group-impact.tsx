import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";

import { Bar, Button, Chip, Mono, SdgTags, SourceBadge } from "@/components/ui";
import { ACTIONS, type ActionId } from "@/data/actions";
import { isCity, type Community } from "@/data/community";
import { useCommunityFeed } from "@/hooks/use-community-feed";
import { useNow } from "@/hooks/use-now";
import { usePulse } from "@/hooks/use-pulse";
import { actionCopy, questTitle } from "@/i18n/content";
import { formatDecimal, formatNumber, intlLocale } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { monthKey } from "@/services/groups";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const impactOf = (counts: [ActionId, number][], unit: string) =>
  counts.reduce((sum, [act, n]) => sum + (ACTIONS[act].impact.unit === unit ? ACTIONS[act].impact.value * n : 0), 0);

// This month's impact of a group or a city, as one big number: seen, not pushed.
// A group counts from its server-side tally; a city from the proofs taken there.
export function ImpactHero({ community }: { community: Community }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const now = useNow();
  const month = monthKey(now);
  const tally = useCommunity((s) => s.progress[community.id]?.months[month]);
  const feed = useCommunityFeed(community);
  const counts = useMemo((): [ActionId, number][] => {
    if (!isCity(community) && tally) return (Object.entries(tally) as [ActionId, number][]).filter(([, n]) => n > 0);
    const out: Partial<Record<ActionId, number>> = {};
    for (const it of feed) if (it.kind === "post" && monthKey(it.post.createdAt) === month) out[it.post.action] = (out[it.post.action] ?? 0) + 1;
    return Object.entries(out) as [ActionId, number][];
  }, [community, tally, feed, month]);
  const acts = counts.reduce((n, [, v]) => n + v, 0);
  const co2 = impactOf(counts, "kg CO₂e");
  const items = Math.round(impactOf(counts, "items"));
  const monthName = new Date(now).toLocaleDateString(intlLocale(language), { month: "long" });
  return (
    <View style={{ backgroundColor: C.mint, borderRadius: R.xl, borderCurve: "continuous", padding: 20, gap: 6 }}>
      <Mono color={C.forestInk}>{t("groups.impactKicker", { month: monthName })}</Mono>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <Text selectable style={{ fontFamily: F.medium, fontSize: 64, lineHeight: 66, letterSpacing: -3, color: C.forestInk, fontVariant: ["tabular-nums"] }}>
          {co2 < 10 && co2 > 0 ? formatDecimal(co2, language, 1) : formatNumber(Math.round(co2), language)}
        </Text>
        <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.forestInk, paddingBottom: 10 }}>{t("groups.impactUnit")}</Text>
      </View>
      <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink2 }}>
        {acts ? t("groups.impactLine", { count: formatNumber(acts, language), items: formatNumber(items, language) }) : t("groups.impactEmpty")}
      </Text>
    </View>
  );
}

export function GroupImpact({ community }: { community: Community }) {
  const { C, T } = useTheme();
  const { t, language } = useI18n();
  const now = useNow();
  const { insights, pulse } = usePulse();
  const progress = useCommunity((s) => s.progress[community.id]);
  const member = useCommunity((s) => !!s.roles[community.id]);
  const [selected, setSelected] = useState<string>();
  const months = [...new Set([monthKey(now), ...Object.keys(progress?.months ?? {})])].sort().reverse();
  const month = selected && months.includes(selected) ? selected : months[0];
  const counts = Object.entries(progress?.months[month] ?? {}).filter(([, n]) => n > 0) as [ActionId, number][];
  const total = counts.reduce((n, [, value]) => n + value, 0);
  const impact = (unit: string) => counts.reduce((sum, [act, n]) => sum + (ACTIONS[act].impact.unit === unit ? ACTIONS[act].impact.value * n : 0), 0);
  const co2 = Math.round(impact("kg CO₂e"));
  const items = Math.round(impact("items"));
  const quest = progress?.quest;
  const active = quest && Date.parse(quest.endsAt) > now;
  const questProgress = active ? quest.progress : 0;
  const goals = [...new Set(counts.flatMap(([act]) => ACTIONS[act].sdgs))].sort((a, b) => a - b);
  const domains = new Set(counts.flatMap(([act]) => ACTIONS[act].domains));
  const context = insights.map((i) => `${i.label}: ${i.value}${i.unit ? ` ${i.unit}` : ""} (${i.status})`).join("; ");
  return (
    <View style={{ gap: 18 }}>
      {quest && (
        <View style={{ padding: 18, gap: 12, borderRadius: R.lg, backgroundColor: C.mint }}>
          <Mono color={C.forestInk}>{t("groups.goal")}</Mono>
          <Text style={T.title}>{questTitle(t, quest.title, quest.action)}</Text>
          <Bar value={Math.min(1, questProgress / Math.max(1, quest.goal))} />
          <Text style={T.caption}>{formatNumber(questProgress, language)} / {formatNumber(quest.goal, language)}</Text>
          {member && <Button label={t("groups.post")} size="md" icon="camera" onPress={() => router.push({ pathname: "/capture", params: { group: community.id, action: quest.action } })} />}
        </View>
      )}
      <View style={{ gap: 12 }}>
        <Text style={T.title}>{t("groups.report")}</Text>
        <Text style={T.caption}>{t("groups.reportBody")}</Text>
        {months.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={t("groups.months")} contentContainerStyle={{ gap: 8 }}>
            {months.map((m) => <Chip key={m} label={m} active={m === month} onPress={() => setSelected(m)} />)}
          </ScrollView>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[[t("groups.actions"), total], [t("groups.estimatedCo2"), co2], [t("groups.items"), items]].map(([label, n]) => (
            <View key={label} style={{ flex: 1, padding: 12, gap: 6, backgroundColor: C.card, borderRadius: R.md }}>
              <Text style={{ fontFamily: F.medium, fontSize: 32, letterSpacing: -1, color: C.ink, fontVariant: ["tabular-nums"] }}>{formatNumber(Number(n), language)}</Text>
              <Text style={T.caption}>{label}</Text>
            </View>
          ))}
        </View>
        {counts.map(([act, n]) => <Text key={act} style={T.body}>{actionCopy(t, act).label} · {formatNumber(n, language)}</Text>)}
        {total > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={T.caption}>{t("groups.cover", { domains: domains.size, goals: goals.length })}</Text>
            <SdgTags goals={goals} />
            <Text style={T.caption}>{t("groups.context", { place: pulse.place.name })}</Text>
            <Text style={T.caption}>{context}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <SourceBadge id="begreen" /><SourceBadge id="cams" /><SourceBadge id="inat" />
            </View>
          </View>
        )}
        {total === 0 ? <Text style={T.caption}>{t("groups.reportEmpty")}</Text> : (
          <Button label={t("groups.reportShare")} kind="secondary" size="md" icon="share" onPress={() => Share.share({ message: t("groups.reportText", {
            name: community.name, month, count: total, co2, items,
            lines: counts.map(([act, n]) => `${actionCopy(t, act).label}: ${formatNumber(n, language)}`).join("\n"),
          }) + `\n${t("groups.cover", { domains: domains.size, goals: goals.length })}\n${t("groups.context", { place: pulse.place.name })}\n${context}` })} />
        )}
      </View>
    </View>
  );
}
