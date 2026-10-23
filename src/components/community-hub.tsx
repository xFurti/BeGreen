import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Mono, Press } from "@/components/ui";
import { COMMUNITY_KIND_ICON, type Community } from "@/data/community";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export type CommunitySection = "territory" | "groups";

export function CommunitySections({ value, count, onChange }: { value: CommunitySection; count: number; onChange: (value: CommunitySection) => void }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(value === "groups" ? 1 : 0);
  useEffect(() => { position.set(withTiming(value === "groups" ? 1 : 0, { duration: reduced ? 0 : 230 })); }, [value, reduced, position]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * width / 2 }] }));
  return (
    <View accessibilityRole="tablist" accessibilityLabel={t("community.hub.sections")} onLayout={(event) => setWidth(Math.max(0, event.nativeEvent.layout.width - 10))} style={{ flexDirection: "row", padding: 4, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 4, top: 4, bottom: 4, width: width / 2, borderRadius: 13, backgroundColor: C.forest }, indicator]} />
      {(["territory", "groups"] as const).map((tab) => {
        const selected = tab === value;
        return (
          <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={t(`community.hub.${tab}Tab`)} accessibilityState={{ selected }} aria-selected={process.env.EXPO_OS === "web" ? selected : undefined} onPress={() => { if (!selected) { haptic.tap(); onChange(tab); } }} style={{ flex: 1, minHeight: 46, paddingHorizontal: 8, gap: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Icon name={tab === "territory" ? "map" : "people"} size={17} color={selected ? C.lime : C.mute} />
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: selected ? C.white : C.ink2 }}>{t(`community.hub.${tab}Tab`)}</Text>
            {tab === "groups" && count > 0 && <Text style={{ fontFamily: F.mono, fontSize: 10, color: selected ? C.forestMute : C.mute }}>{formatNumber(count, language)}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function GroupCard({ community: c, index }: { community: Community; index: number }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const members = useCommunity((s) => s.members[c.id]);
  const reduced = useReducedMotion();
  const count = Math.max(members?.length ?? c.memberCount ?? 1, 1);
  const isPrivate = c.visibility === "private";
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.duration(280).delay(Math.min(index, 5) * 45)}>
      <Press scale={reduced ? 1 : 0.985} onPress={() => router.navigate({ pathname: "/community/[id]", params: { id: c.id } })} accessibilityLabel={c.name} style={{ borderRadius: R.lg, borderCurve: "continuous", padding: 18, gap: 19, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}><Icon name={COMMUNITY_KIND_ICON[c.kind]} size={21} color={C.leaf} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 23, letterSpacing: -0.6, color: C.ink }}>{c.name}</Text>
            <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.mute }}>{t(`community.kinds2.${c.kind}`)}</Text>
          </View>
          <Icon name="chevron" size={17} color={C.leaf} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><Icon name="people" size={14} color={C.mute} /><Text style={{ fontFamily: F.regular, fontSize: 12, color: C.ink2 }}>{count === 1 ? t("community.member") : t("community.members", { count: formatNumber(count, language) })}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Icon name={isPrivate ? "lock" : "globe"} size={11} color={C.mute} /><Text style={{ fontFamily: F.regular, fontSize: 11, color: C.mute }}>{t(`community.visibility.${isPrivate ? "private" : "public"}`)}</Text></View>
        </View>
      </Press>
    </Animated.View>
  );
}

export function GroupHub({ groups }: { groups: Community[] }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  return (
    <View style={{ gap: 23 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 31, lineHeight: 35, letterSpacing: -1.1, color: C.ink }}>{t("community.hub.groupsHeadline")}</Text>
        <Text style={[T.callout, { maxWidth: 330 }]}>{t("community.hub.groupsBody")}</Text>
      </View>
      <View style={{ gap: 10 }}>
        <Press scale={reduced ? 1 : 0.985} onPress={() => router.navigate("/new-community")} accessibilityLabel={t("community.hub.newGroup")} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 17, borderRadius: R.lg, backgroundColor: C.forest }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={23} color={C.forest} /></View>
          <View style={{ flex: 1, gap: 3 }}><Text style={{ fontFamily: F.medium, fontSize: 17, color: C.white }}>{t("community.hub.newGroup")}</Text><Text style={{ fontFamily: F.regular, fontSize: 12, color: C.forestMute }}>{t("community.hub.createHint")}</Text></View>
          <Icon name="arrowRight" size={19} color={C.lime} />
        </Press>
        <Press scale={reduced ? 1 : 0.985} onPress={() => router.navigate("/join")} accessibilityLabel={t("community.hub.joinCode")} style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50, borderRadius: R.md, borderWidth: 1, borderColor: C.line }}>
          <Icon name="link" size={17} color={C.leaf} /><Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{t("community.hub.inviteHint")}</Text><Icon name="arrowRight" size={16} color={C.leaf} />
        </Press>
      </View>
      {groups.length ? (
        <View style={{ gap: 12 }}><Mono>{t("community.hub.groups")}</Mono>{groups.map((c, i) => <GroupCard key={c.id} community={c} index={i} />)}</View>
      ) : (
        <View style={{ alignItems: "center", paddingHorizontal: 20, paddingVertical: 25, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-18deg" }] }}><Icon name="leaf" size={19} color={C.leaf} /></View>
            <View style={{ width: 60, height: 60, borderRadius: 22, marginHorizontal: 9, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}><Icon name="people" size={27} color={C.leaf} /></View>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: "center", justifyContent: "center", transform: [{ rotate: "18deg" }] }}><Icon name="leaf" size={19} color={C.leaf} /></View>
          </View>
          <Text style={[T.title, { textAlign: "center" }]}>{t("community.hub.emptyGroupsTitle")}</Text><Text style={[T.caption, { textAlign: "center", maxWidth: 275 }]}>{t("community.hub.emptyGroupsBody")}</Text>
        </View>
      )}
    </View>
  );
}
