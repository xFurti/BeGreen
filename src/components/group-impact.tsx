import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";

import { Bar, Button, Chip, Mono, SdgTags, SourceBadge } from "@/components/ui";
import { ACTIONS, type ActionId } from "@/data/actions";
import type { Community } from "@/data/community";
import { useNow } from "@/hooks/use-now";
import { usePulse } from "@/hooks/use-pulse";
import { actionCopy, questTitle } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { monthKey } from "@/services/groups";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

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
              <Text style={{ fontFamily: F.medium, fontSize: 25, color: C.ink }}>{formatNumber(Number(n), language)}</Text>
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
