import { useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { LeafMark } from "@/components/nature";
import { Mono, Segmented, SourceBadge } from "@/components/ui";
import type { SourceId } from "@/data/sources";
import type { Explain } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { askLeaf, SUGGESTED } from "@/services/leaf";
import { useApp } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

type Msg = { id: number; from: "me" | "leaf"; text: string; cites?: SourceId[] };

export default function Leaf() {
  const { C, T } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { pulse, insights } = usePulse();
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 0,
      from: "leaf",
      text: `Hey, I'm Leaf. I read ${pulse.place.name}'s air, water, soil and nature data so you don't have to. Ask me anything — I'll always tell you where the numbers come from.`,
    },
  ]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    haptic.tap();
    setQ("");
    setMsgs((m) => [...m, { id: Date.now(), from: "me", text: question }]);
    setBusy(true);
    const a = await askLeaf(question, { pulse, insights, audience: explain });
    setMsgs((m) => [...m, { id: Date.now() + 1, from: "leaf", text: a.text, cites: a.cites }]);
    setBusy(false);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      {/* In a form sheet iOS adopts the first ScrollView as the sheet's own scroller, so the header lives inside it. */}
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 26, paddingBottom: 14, gap: 14, backgroundColor: C.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}
            >
              <LeafMark size={20} color={C.lime} vein={C.forest} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[T.title, { fontSize: 24 }]}>Leaf</Text>
              <Mono>Grounded in local data · cites sources</Mono>
            </View>
          </View>
          <Segmented<Explain>
            value={explain}
            onChange={setExplain}
            options={[
              { value: "me", label: "Me" },
              { value: "class", label: "My class" },
              { value: "comune", label: "Comune" },
            ]}
          />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 12 }}>
          {msgs.map((m) => (
            <Animated.View
              key={m.id}
              entering={m.from === "me" ? FadeInUp.springify() : FadeInDown.springify()}
              style={{
                alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                backgroundColor: m.from === "me" ? C.forest : C.mint,
                borderRadius: 20,
                borderBottomRightRadius: m.from === "me" ? 6 : 20,
                borderBottomLeftRadius: m.from === "me" ? 20 : 6,
                padding: 14,
                gap: 10,
              }}
            >
              <Text selectable style={{ color: m.from === "me" ? C.white : C.ink, fontFamily: F.regular, fontSize: 15, lineHeight: 22 }}>
                {m.text}
              </Text>
              {!!m.cites?.length && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {m.cites.map((c) => (
                    <SourceBadge key={c} id={c} />
                  ))}
                </View>
              )}
            </Animated.View>
          ))}
          {busy && (
            <Animated.View
              entering={FadeIn}
              style={{ alignSelf: "flex-start", backgroundColor: C.mint, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Mono>Leaf is reading the data…</Mono>
            </Animated.View>
          )}
          {msgs.length < 3 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 6 }}>
              {SUGGESTED.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => ask(s)}
                  accessibilityRole="button"
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.pill, borderWidth: 1, borderColor: C.mint2 }}
                >
                  <Text style={{ fontFamily: F.medium, fontSize: 14, letterSpacing: -0.15, color: C.forestInk }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottom + 10, backgroundColor: C.bg }}
      >
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ask about air, water, nature…"
          placeholderTextColor={C.mute}
          returnKeyType="send"
          onSubmitEditing={() => ask(q)}
          style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: C.card, paddingHorizontal: 18, fontSize: 16, fontFamily: F.regular, color: C.ink }}
        />
        <Pressable
          accessibilityLabel="Send question"
          onPress={() => ask(q)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: q.trim() ? C.forest : C.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="send" size={17} color={q.trim() ? C.lime : C.faint} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
