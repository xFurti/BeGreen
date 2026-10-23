import { Linking, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Mono, Press, SdgTags } from "@/components/ui";
import { ACTION_LIST } from "@/data/actions";
import { SOURCE_KINDS, SOURCES, type SourceId, type SourceKind } from "@/data/sources";
import { actionCopy, sourceCopy, sourceKindCopy } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { C, F, T } from "@/theme/tokens";

export default function Sources() {
  const { t, language } = useI18n();
  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 36, paddingBottom: 60 }}>
      <View style={{ gap: 12 }}>
        <Mono>{t("sources.kicker")}</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{t("sources.title")}</Text>
        <Text style={[T.body, { fontSize: 17, lineHeight: 25, color: C.ink2 }]}>{t("sources.body")}</Text>
      </View>

      <View>
        {(Object.keys(SOURCE_KINDS) as SourceKind[]).map((k, i) => {
          const s = sourceKindCopy(t, k);
          return (
            <Animated.View key={k} entering={FadeInDown.delay(i * 60)} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 18, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SOURCE_KINDS[k].color }} />
                <Text style={{ fontFamily: F.medium, fontSize: 18, letterSpacing: -0.4, flex: 1 }}>{s.label}</Text>
              </View>
              <Text style={[T.callout, { lineHeight: 21 }]}>{s.what}</Text>
              <Text style={[T.body, { fontSize: 14, lineHeight: 20 }]}>
                <Text style={{ fontFamily: F.medium }}>{t("common.goodFor")} · </Text>
                {s.goodFor}
              </Text>
              <Text style={[T.body, { fontSize: 14, lineHeight: 20 }]}>
                <Text style={{ fontFamily: F.medium, color: C.red }}>{t("common.careful")} · </Text>
                {s.careful}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        <Mono color={C.ink}>{t("sources.inApp")}</Mono>
        {(Object.keys(SOURCES) as SourceId[]).map((id) => {
          const s = SOURCES[id];
          const copy = sourceCopy(t, id);
          return (
            <Press
              key={id}
              scale={0.99}
              onPress={() => Linking.openURL(s.url)}
              accessibilityLabel={copy.name}
              style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 6 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SOURCE_KINDS[s.kind].color }} />
                <Text style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2, flex: 1 }}>{copy.name}</Text>
                <Icon name="link" size={12} color={C.mute} />
              </View>
              <Text style={{ fontFamily: F.regular, color: C.ink2, fontSize: 13 }}>{copy.provider}</Text>
              <Mono color={s.verified ? C.mute : C.amber}>{s.verified ? copy.terms : `⚠︎ ${copy.terms}`}</Mono>
            </Press>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        <Mono color={C.ink}>{t("sources.count")}</Mono>
        <Text style={T.callout}>{t("sources.countBody")}</Text>
        {ACTION_LIST.map((a) => {
          const copy = actionCopy(t, a.id);
          return (
          <View key={a.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Icon name={a.icon} size={14} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14 }}>{copy.label}</Text>
              <SdgTags goals={a.sdgs} />
            </View>
            <Text style={[T.caption, { color: C.ink2 }]}>
              {t("sources.impactLine", { value: formatNumber(a.impact.value, language), unit: copy.impact.unitLabel, note: copy.impact.note })}
            </Text>
          </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
