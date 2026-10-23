import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Icon } from "@/components/icon";
import { AvatarStack, Bar, Button, Mono, Press, SdgTags, SourceBadge } from "@/components/ui";
import { KIND } from "@/data/squad-kinds";
import { ACTIONS, DOMAINS, type ActionId, type Domain } from "@/data/actions";
import { actionCopy, domainLabel, questTitle, squadKindLabel } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { usePulse } from "@/hooks/use-pulse";
import { useApp, useAuthor } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

function Ring({ value, size = 112 }: { value: number; size?: number }) {
  const { C } = useTheme();
  const r = size / 2 - 5;
  const len = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.band} strokeWidth={6} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={C.leaf}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - Math.min(1, value))}
      />
    </Svg>
  );
}

export default function SquadDetail() {
  const { C, T } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const squad = useApp((s) => s.squads.find((x) => x.id === id) ?? s.localSquads.find((x) => x.id === id));
  const member = useApp((s) => s.squads.some((x) => x.id === id));
  const join = useApp((s) => s.joinSquad);
  const allPosts = useApp((s) => s.posts);
  const posts = allPosts.filter((p) => p.squadId === id);
  const author = useAuthor();
  const { insights, pulse } = usePulse();
  const { t, language } = useI18n();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 40 - 8) / 3);

  if (!squad) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={T.body}>{t("squad.missing")}</Text>
      </View>
    );
  }

  const pct = Math.min(1, squad.quest.progress / squad.quest.goal);
  const monthly = (Object.entries(squad.monthly) as [ActionId, number][]).sort((a, b) => b[1] - a[1]);
  const total = monthly.reduce((a, [, n]) => a + n, 0);
  const maxN = Math.max(1, ...monthly.map(([, n]) => n));
  const co2 = monthly.reduce((a, [k, n]) => a + (ACTIONS[k].impact.unit === "kg CO₂e" ? ACTIONS[k].impact.value * n : 0), 0);
  const items = monthly.reduce((a, [k, n]) => a + (ACTIONS[k].impact.unit === "items" ? ACTIONS[k].impact.value * n : 0), 0);
  const records = squad.monthly.spot ?? 0;
  const domainHits = new Map<Domain, number>();
  monthly.forEach(([k, n]) => ACTIONS[k].domains.forEach((d) => domainHits.set(d, (domainHits.get(d) ?? 0) + n)));
  const goals = Array.from(new Set(monthly.flatMap(([k]) => ACTIONS[k].sdgs))).sort((a, b) => a - b);
  const bad = insights.filter((i) => i.level === "bad");

  const report = t("squad.report", {
    name: squad.name,
    place: squad.place,
    total: formatNumber(total, language),
    members: formatNumber(squad.memberCount, language),
    lines: monthly.map(([k, n]) => `• ${actionCopy(t, k).label}: ${formatNumber(n, language)}`).join("\n"),
    co2: formatNumber(Math.round(co2), language),
    items: formatNumber(Math.round(items), language),
    records: formatNumber(records, language),
    goals: goals.map((g) => `SDG ${g}`).join(", "),
    city: pulse.place.name,
    context: insights.map((i) => `${i.label} ${i.value}${i.unit ? " " + i.unit : ""} (${i.status})`).join("; "),
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 32 }} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: "" }} />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={KIND[squad.kind].icon} size={12} color={C.mute} />
          <Mono>
            {squadKindLabel(t, squad.kind)} · {squad.place}
          </Mono>
        </View>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{squad.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 }}>
          <AvatarStack people={squad.memberIds.slice(0, 5).map(author)} size={28} />
          <Text style={{ flex: 1, fontFamily: F.regular, color: C.ink2 }}>
            {squad.memberCount === 1 ? t("league.member") : t("league.members", { count: formatNumber(squad.memberCount, language) })}
          </Text>
          <Press
            onPress={() => Share.share({ message: t("squad.invite", { name: squad.name, code: squad.code }) })}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 34, borderRadius: R.pill }}
            accessibilityLabel={t("squad.shareCode")}
          >
            <Text style={{ fontFamily: F.monoMedium, fontSize: 13, letterSpacing: 1, color: C.ink }}>{squad.code}</Text>
            <Icon name="share" size={13} />
          </Press>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, backgroundColor: C.mint, borderRadius: R.xl, padding: 18 }}>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Ring value={pct} />
          <Text style={{ position: "absolute", fontFamily: F.medium, fontSize: 26, letterSpacing: -1.2, color: C.ink }}>{Math.round(pct * 100)}%</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Mono>{t("squad.quest", { days: squad.quest.endsInDays })}</Mono>
          <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 23, letterSpacing: -0.6, color: C.ink }}>{questTitle(t, squad.quest.title, squad.quest.action)}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>
            {formatNumber(squad.quest.progress, language)} / {formatNumber(squad.quest.goal, language)}
          </Text>
          {member ? (
            <Button
              size="sm"
              label={t("squad.add")}
              icon={ACTIONS[squad.quest.action].icon}
              style={{ alignSelf: "flex-start", marginTop: 6 }}
              onPress={() => router.push({ pathname: "/capture", params: { action: squad.quest.action } })}
            />
          ) : (
            <Button
              size="sm"
              label={t("squad.join")}
              icon="plus"
              style={{ alignSelf: "flex-start", marginTop: 6 }}
              onPress={() => join(squad.code).catch(() => Alert.alert(t("squad.joinFail"), t("shared.checkConnection")))}
            />
          )}
        </View>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Mono>{t("squad.reportKicker")}</Mono>
          <Text style={T.callout}>{squad.kind === "comune" ? t("squad.reportComune") : t("squad.reportOther")}</Text>
        </View>

        <View style={{ flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line }}>
          <Metric label={t("squad.acts")} value={formatNumber(total, language)} />
          <Metric label={t("squad.co2")} value={formatNumber(Math.round(co2), language)} border />
          <Metric label={t("squad.items")} value={formatNumber(Math.round(items), language)} border />
        </View>

        <View style={{ gap: 14, paddingTop: 4 }}>
          {monthly.map(([k, n], i) => (
            <Animated.View key={k} entering={FadeInDown.delay(i * 40)} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name={ACTIONS[k].icon} size={13} color={C.ink} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, color: C.ink }}>{actionCopy(t, k).label}</Text>
                <Mono color={C.ink}>{formatNumber(n, language)}</Mono>
              </View>
              <Bar value={n / maxN} color={i === 0 ? C.leaf : C.forestMute} height={3} />
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <Mono>{t("squad.meets")}</Mono>
        <Text style={[T.body, { fontSize: 15, lineHeight: 22, color: C.ink2 }]}>
          {bad.length
            ? t("squad.bad", { place: pulse.place.name, bits: bad.map((b) => t("squad.bit", { label: b.label.toLowerCase(), status: b.status.toLowerCase() })).join(", ") })
            : t("squad.calm", { place: pulse.place.name })}{" "}
          {t("squad.cover", { domains: domainHits.size, goals: goals.length })}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {(Object.keys(DOMAINS) as Domain[]).map((d) => {
            const on = domainHits.has(d);
            return (
              <View
                key={d}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  height: 28,
                  borderRadius: R.pill,
                  backgroundColor: on ? C.forest : C.card,
                }}
              >
                <Icon name={DOMAINS[d].icon} size={11} color={on ? C.lime : C.faint} />
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: on ? C.white : C.mute }}>{domainLabel(t, d)}</Text>
              </View>
            );
          })}
        </View>
        <SdgTags goals={goals} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <SourceBadge id="begreen" />
          <SourceBadge id="cams" />
          <SourceBadge id="inat" />
        </View>
      </View>

      <Button label={t("squad.share")} icon="share" onPress={() => Share.share({ message: report })} />

      {posts.length > 0 && (
        <View style={{ gap: 12 }}>
          <Mono>{t("squad.latest")}</Mono>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {posts.slice(0, 9).map((p) => (
              <Press
                key={p.id}
                onPress={() => router.push({ pathname: "/post/[id]", params: { id: p.id } })}
                style={{ width: tile, height: tile * 1.25, borderRadius: 12, overflow: "hidden" }}
                accessibilityLabel={actionCopy(t, p.action).label}
              >
                <Image source={p.photo} style={{ flex: 1 }} contentFit="cover" />
              </Press>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, border }: { label: string; value: string; border?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingLeft: border ? 12 : 0, borderLeftWidth: border ? 1 : 0, borderLeftColor: C.line, gap: 4 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 24, letterSpacing: -1, fontVariant: ["tabular-nums"], color: C.ink }} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      <Mono>{label}</Mono>
    </View>
  );
}
