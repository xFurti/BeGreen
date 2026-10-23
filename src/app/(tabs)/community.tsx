import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { TerritoryCard } from "@/components/territory-card";
import { LoveYourCity } from "@/components/love-your-city";
import { Button, IconButton, Logo, Mono, Press, TopCover } from "@/components/ui";
import { COMMUNITY_KIND_ICON, type Community } from "@/data/community";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { joinCity, suggestedCommunity, syncCommunity, useCommunity, useCommunitySpots, useJoined } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// The Community tab: straight to the communities you're in. Two kinds, two sections:
// your groups (friends, joined with a code, ranked) and your Comune (a real place, its map).

const open = (c: Community) => router.push({ pathname: "/community/[id]", params: { id: c.id } });

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  const { C, T } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={[T.title, { flex: 1 }]}>{title}</Text>
        {action && (
          <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} hitSlop={10}>
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.leaf }}>{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function MemberCount({ c }: { c: Community }) {
  const { t, language } = useI18n();
  const members = useCommunity((s) => s.members[c.id]);
  const n = Math.max(members?.length ?? c.memberCount ?? 1, 1);
  return <>{n === 1 ? t("community.member") : t("community.members", { count: formatNumber(n, language) })}</>;
}

// One row per community: groups and Comuni share the same size and shape.
function CommunityRow({
  c,
  index,
  subtitle,
  trailing,
}: {
  c: Community;
  index: number;
  subtitle: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const { C } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(20)}>
      <Press
        scale={0.985}
        onPress={() => open(c)}
        accessibilityLabel={c.name}
        style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: R.lg, borderCurve: "continuous", backgroundColor: C.card }}
      >
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
          <Icon name={COMMUNITY_KIND_ICON[c.kind]} size={20} color={C.lime} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.4, color: C.ink }}>
            {c.name}
          </Text>
          {subtitle}
        </View>
        {trailing}
      </Press>
    </Animated.View>
  );
}

function GroupRow({ c, index }: { c: Community; index: number }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const priv = c.visibility === "private";
  return (
    <CommunityRow
      c={c}
      index={index}
      subtitle={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name={priv ? "lock" : "globe"} size={11} color={C.mute} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.mute }}>
            {priv ? t("community.visibility.private") : t("community.visibility.public")} · <MemberCount c={c} />
          </Text>
        </View>
      }
      trailing={
        <>
          <Icon name="chevron" size={14} color={C.faint} />
        </>
      }
    />
  );
}

function ComuneRow({ c, index }: { c: Community; index: number }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const { real } = useCommunitySpots(c);
  return (
    <CommunityRow
      c={c}
      index={index}
      subtitle={
        <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>
          <MemberCount c={c} /> · {real === 1 ? t("community.hub.place") : t("community.hub.places", { count: real })}
        </Text>
      }
      trailing={<Icon name="chevron" size={14} color={C.faint} />}
    />
  );
}

// Not in a Comune yet: yours, one tap away.
function SuggestedComune() {
  const { C } = useTheme();
  const { t } = useI18n();
  const comune = useApp((s) => s.comune);
  const catalog = useCommunity((s) => s.catalog);
  const [busy, setBusy] = useState(false);
  const suggestion = suggestedCommunity(comune, catalog);
  if (!suggestion) return null;
  const c = suggestion.community;
  return (
    <CommunityRow
      c={c}
      index={0}
      subtitle={<Mono color={C.leaf}>{t("community.hub.yourCity")}</Mono>}
      trailing={
        <Button
          label={t("community.hub.join")}
          kind="green"
          size="sm"
          icon="plus"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              if (await joinCity(c)) open(c);
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    />
  );
}

export default function CommunityTab() {
  const { C, T } = useTheme();
  const { top } = useSafeAreaInsets();
  const { t } = useI18n();
  const { cities, groups } = useJoined();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void syncCommunity();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncCommunity();
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: top + 12, paddingHorizontal: 20, paddingBottom: 140, gap: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.leaf} colors={[C.leaf]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <Text style={[T.display, { flex: 1 }]}>{t("community.title")}</Text>
          <IconButton icon="search" label={t("community.hub.findCity")} onPress={() => router.push("/communities")} />
        </View>

        <TerritoryCard />

        <Section title={t("community.hub.groups")} action={groups.length ? t("community.hub.joinCode") : undefined} onAction={() => router.push("/join")}>
          {groups.map((c, i) => (
            <GroupRow key={c.id} c={c} index={i} />
          ))}
          {groups.length === 0 && <Text style={T.callout}>{t("community.hub.noGroups")}</Text>}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label={t("community.hub.newGroup")} kind="green" size="md" icon="plus" style={{ flex: 1 }} onPress={() => router.navigate("/new-community")} />
            {groups.length === 0 && <Button label={t("community.hub.joinCode")} kind="secondary" size="md" style={{ flex: 1 }} onPress={() => router.push("/join")} />}
          </View>
        </Section>

        <Section title={cities.length > 1 ? t("community.hub.cities") : t("community.hub.city")} action={t("community.hub.findCity")} onAction={() => router.push("/communities")}>
          {cities.map((c, i) => (
            <ComuneRow key={c.id} c={c} index={i} />
          ))}
          {cities.length === 0 && <SuggestedComune />}
        </Section>

        <View accessible accessibilityLabel="Love your city · BeGreen" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 6 }}>
          <LoveYourCity height={30} />
          <Logo size={22} />
        </View>
      </ScrollView>
      <TopCover />
    </View>
  );
}
