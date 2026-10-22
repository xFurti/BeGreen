import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Button, Mono, SdgTags } from "@/components/ui";
import { ACTION_LIST, ACTIONS, type ActionId } from "@/data/actions";
import { BINS, searchItems, type BinId } from "@/data/guide";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

function Swatch({ bin, size = 12 }: { bin: BinId; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: BINS[bin].swatch }} />;
}

function Steps({ id }: { id: ActionId }) {
  return (
    <View style={{ gap: 12 }}>
      {ACTIONS[id].howto.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <Mono color={C.ink} style={{ width: 20, paddingTop: 3 }}>
            {String(i + 1).padStart(2, "0")}
          </Mono>
          <Text style={[T.body, { flex: 1, fontSize: 15, lineHeight: 22 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Guide() {
  const params = useLocalSearchParams<{ action?: ActionId; from?: string }>();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ActionId | null>(params.action ?? null);
  const [bin, setBin] = useState<BinId | null>(null);
  const results = searchItems(q);
  const fromCapture = params.from === "capture";

  const doIt = (id: ActionId) => {
    router.back();
    if (!fromCapture) setTimeout(() => router.push({ pathname: "/capture", params: { action: id } }), 250);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 34, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 10 }}>
        <Mono>How to</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>Not sure how?{"\n"}We’ve got you.</Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 16, height: 50 }}>
          <Icon name="search" size={16} color={C.mute} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Where does it go? Try “pizza box”"
            placeholderTextColor={C.mute}
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, fontFamily: F.regular, fontSize: 16, color: C.ink, height: 50 }}
          />
          {!!q && (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="close" size={14} color={C.mute} />
            </Pressable>
          )}
        </View>
        {!!q && (
          <Animated.View entering={FadeIn} layout={LinearTransition}>
            {results.length === 0 ? (
              <Text style={[T.callout, { paddingVertical: 8 }]}>
                No match. When in doubt, check your Comune’s rules, or ask Leaf.
              </Text>
            ) : (
              results.map((it) => (
                <View key={it.name} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3 }}>{it.name}</Text>
                    <Swatch bin={it.bin} />
                    <Mono color={C.ink}>{BINS[it.bin].name}</Mono>
                  </View>
                  <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{it.tip}</Text>
                </View>
              ))
            )}
          </Animated.View>
        )}
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Mono>01</Mono>
          <Text style={[T.title, { flex: 1 }]}>Sorting 101</Text>
          <SdgTags goals={[12]} />
        </View>
        <Text style={T.callout}>Six bins. Colours change between Comuni, the logic doesn’t. Tap one.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(BINS) as BinId[]).map((b) => {
            const on = bin === b;
            return (
              <Pressable
                key={b}
                accessibilityRole="button"
                onPress={() => {
                  haptic.tap();
                  setBin(on ? null : b);
                }}
                style={{
                  width: "48.5%",
                  borderRadius: R.md,
                  borderCurve: "continuous",
                  padding: 14,
                  gap: 10,
                  backgroundColor: on ? C.ink : C.card,
                }}
              >
                <Swatch bin={b} size={16} />
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 15, letterSpacing: -0.2, color: on ? C.white : C.ink }}>{BINS[b].name}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12, color: on ? C.nightMute : C.mute }}>
                    {BINS[b].it}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {bin && (
          <Animated.View key={bin} entering={FadeInDown.springify().damping(20)} style={{ gap: 10, paddingTop: 4 }}>
            <Text style={T.body}>
              <Text style={{ fontFamily: F.medium }}>Yes · </Text>
              {BINS[bin].yes}
            </Text>
            <Text style={[T.body, { color: C.ink2 }]}>
              <Text style={{ fontFamily: F.medium, color: C.red }}>No · </Text>
              {BINS[bin].no}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, paddingBottom: 8 }}>
          <Mono>02</Mono>
          <Text style={[T.title, { flex: 1 }]}>Every act, step by step</Text>
        </View>
        {ACTION_LIST.map((a) => {
          const on = open === a.id;
          return (
            <Animated.View key={a.id} layout={LinearTransition.springify().damping(20)} style={{ borderTopWidth: 1, borderTopColor: C.line }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => {
                  haptic.tap();
                  setOpen(on ? null : a.id);
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 58 }}
              >
                <Icon name={a.icon} size={17} color={C.ink} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3 }}>{a.label}</Text>
                <Mono>+{a.seeds}</Mono>
                <View style={{ transform: [{ rotate: on ? "90deg" : "0deg" }] }}>
                  <Icon name="chevron" size={12} color={C.mute} />
                </View>
              </Pressable>
              {on && (
                <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16, paddingBottom: 22 }}>
                  <Steps id={a.id} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <SdgTags goals={a.sdgs} />
                  </View>
                  <Button label={fromCapture ? "Got it" : `Do it now`} size="md" icon={fromCapture ? "check" : "camera"} onPress={() => doIt(a.id)} />
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
