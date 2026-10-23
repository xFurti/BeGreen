import { Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { ACTIONS } from "@/data/actions";
import { Mono, SdgTags, SourceBadge } from "@/components/ui";
import type { Insight } from "@/services/interpret";
import { actionCopy } from "@/i18n/content";
import { usePulse } from "@/hooks/use-pulse";
import { useI18n } from "@/i18n/use-i18n";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

function InsightRow({ insight }: { insight: Insight }) {
  const { C } = useTheme();
  const source = insight.sources[0];
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12, gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name={insight.icon} size={16} color={C.leaf} />
        <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink }}>{insight.label}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 22, color: C.ink }}>{insight.value}{insight.unit ? ` ${insight.unit}` : ""}</Text>
      </View>
      <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.ink2 }}>{insight.explain.me}</Text>
      {source && <SourceBadge id={source} />}
    </View>
  );
}

export function CityLive({ active }: { active: boolean }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const { insights, drop, ready } = usePulse();
  const shown = active && ready ? insights.slice(0, 3).filter((item) => item.value && item.explain.me) : [];
  if (!active) return null;
  if (!ready) return <Text style={T.caption}>{t("onboarding.cityLoading")}</Text>;
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.lg, padding: 16, gap: 2 }}>
      {shown.map((insight) => <InsightRow key={insight.key} insight={insight} />)}
      <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 13, marginTop: 4, gap: 7 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>{drop.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Mono color={C.forestInk}>{actionCopy(t, drop.action).label}</Mono>
          <SdgTags goals={ACTIONS[drop.action].sdgs.slice(0, 1)} />
        </View>
      </View>
    </View>
  );
}
