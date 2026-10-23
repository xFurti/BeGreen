import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { GuideIcon, GuideMaterialIcon, GuideReveal } from "@/components/guide/controls";
import { Icon } from "@/components/icon";
import { BINS, searchItems, type BinId, type GuideItemId } from "@/data/guide";
import { binCopy, itemCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export function GuideSorting() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [bin, setBin] = useState<BinId>("paper");
  const [example, setExample] = useState<GuideItemId>(BINS.paper.examples[0]);
  const [errorOpen, setErrorOpen] = useState(false);
  const [yesOpen, setYesOpen] = useState(false);
  const copy = binCopy(t, bin);
  const examples = BINS[bin].examples;
  const results = searchItems(q);
  const chooseBin = (id: BinId) => {
    haptic.tap();
    setBin(id);
    setExample(BINS[id].examples[0]);
    setYesOpen(false);
    setErrorOpen(false);
  };
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line }}>
        <Icon name="search" size={18} color={C.mute} />
        <TextInput value={q} onChangeText={setQ} placeholder={t("guide.search")} placeholderTextColor={C.mute}
          accessibilityLabel={t("guide.search")} autoCorrect={false} returnKeyType="search"
          style={{ flex: 1, minWidth: 0, fontFamily: F.regular, fontSize: 16, color: C.ink, minHeight: 50 }} />
        {!!q && <Pressable accessibilityRole="button" accessibilityLabel={t("guide.clear")} onPress={() => setQ("")} style={{ minHeight: 44, width: 34, alignItems: "center", justifyContent: "center" }}><Icon name="close" size={16} color={C.mute} /></Pressable>}
      </View>
      {!!q.trim() && (
        <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
          {results.length === 0 ? <Text style={T.callout}>{t("guide.empty")}</Text> : results.map(item => (
            <View key={item.id} style={{ padding: 14, gap: 8, borderRadius: R.md, backgroundColor: C.mint }}>
              <Text style={T.headline}>{itemCopy(t, item.id).name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><GuideMaterialIcon bin={item.bin} size={18} color={C.forestInk} /><Text style={[T.caption, { color: C.forestInk, flex: 1 }]}>{binCopy(t, item.bin).name}</Text></View>
              <Text style={T.callout}>{itemCopy(t, item.id).tip}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(BINS) as BinId[]).map(id => {
          const selected = bin === id;
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={binCopy(t, id).name} accessibilityState={process.env.EXPO_OS === "web" ? undefined : { selected }} aria-pressed={process.env.EXPO_OS === "web" ? selected : undefined} onPress={() => chooseBin(id)}
              style={({ pressed }) => ({ flexBasis: "30%", flexGrow: 1, minWidth: 0, minHeight: 98, paddingHorizontal: 6, paddingVertical: 12, alignItems: "center", justifyContent: "center", gap: 9, borderRadius: R.md, borderWidth: 1, borderColor: selected ? C.leaf : "transparent", backgroundColor: selected ? C.mint : C.card, opacity: pressed ? 0.75 : 1 })}>
              <GuideIcon material={id} selected={selected} color={selected ? C.forestInk : C.ink2} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: BINS[id].swatch, borderWidth: id === "special" ? 1 : 0, borderColor: C.faint }} />
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.ink, textAlign: "center", flexShrink: 1 }}>{t(`guide.binLabels.${id}`)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ backgroundColor: C.mint, borderRadius: R.lg, padding: 17, gap: 12 }}>
        <GuideReveal key={bin} style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><GuideMaterialIcon bin={bin} size={23} color={C.forestInk} /><Text style={[T.title, { flex: 1, color: C.forestInk, fontSize: 20 }]}>{copy.name}</Text></View>
          <Text style={T.callout}>{t("guide.chooseObject")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {examples.map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={process.env.EXPO_OS === "web" ? undefined : { selected: example === id }} aria-pressed={process.env.EXPO_OS === "web" ? example === id : undefined} onPress={() => { haptic.tap(); setExample(id); }}
              style={{ padding: 10, minHeight: 44, justifyContent: "center", backgroundColor: C.bg, borderRadius: R.xs, borderWidth: 1, borderColor: example === id ? C.leaf : "transparent" }}>
              <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.ink }}>{itemCopy(t, id).name}</Text>
            </Pressable>)}
          </View>
        </GuideReveal>
        <GuideReveal key={`${bin}-${example}`} style={{ flexDirection: "row", gap: 9 }}>
          <Icon name="checkSeal" size={19} color={C.forestInk} /><Text accessibilityLiveRegion="polite" style={[T.body, { flex: 1, fontSize: 14, lineHeight: 21 }]}>{itemCopy(t, example).tip}</Text>
        </GuideReveal>
      </View>
      {([{ key: "yes", label: t("guide.yes"), icon: "checkSeal", open: yesOpen, toggle: () => setYesOpen(!yesOpen), body: copy.yes },
        { key: "no", label: t("guide.mistake"), icon: "alert", open: errorOpen, toggle: () => setErrorOpen(!errorOpen), body: copy.no }] as const).map(row => (
          <View key={row.key} style={{ borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 4 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={row.label} accessibilityState={{ expanded: row.open }} onPress={() => { haptic.tap(); row.toggle(); }} style={{ flexDirection: "row", gap: 10, alignItems: "center", minHeight: 48 }}>
              <Icon name={row.icon} size={18} color={C.forestInk} /><Text style={[T.body, { flex: 1, fontSize: 14 }]}>{row.label}</Text><View style={{ transform: [{ rotate: row.open ? "90deg" : "0deg" }] }}><Icon name="chevron" size={13} color={C.mute} /></View>
            </Pressable>
            {row.open && <GuideReveal style={{ paddingBottom: 12 }}><Text style={T.callout}>{row.body}</Text></GuideReveal>}
          </View>
        ))}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><Icon name="location" size={16} color={C.mute} /><Text style={[T.caption, { flex: 1 }]}>{t("guide.local")}</Text></View>
    </View>
  );
}
