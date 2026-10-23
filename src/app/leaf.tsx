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
import { useI18n } from "@/i18n/use-i18n";
import { answerLocally, askLeaf, SUGGESTED_KEYS } from "@/services/leaf";
import { useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

type Turn = { id: number; question: string; pending: boolean; ai: { text: string; cites: SourceId[]; language: "it" | "en" } | null };

export default function Leaf() {
  const { bottom } = useSafeAreaInsets();
  const { pulse, insights } = usePulse();
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const { t, language } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);
  const nextId = useRef(1);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    haptic.tap();
    setQ("");
    const id = nextId.current++;
    setTurns((m) => [...m, { id, question: text, pending: true, ai: null }]);
    setBusy(true);
    const a = await askLeaf(text, { pulse, insights, audience: explain, language });
    setTurns((m) => m.map((turn) => (turn.id === id ? { ...turn, pending: false, ai: { text: a.text, cites: a.cites, language } } : turn)));
    setBusy(false);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
  };

  const greeting = t("leaf.greeting", { place: pulse.place.name });
  const thread = [
    { id: 0, from: "leaf" as const, text: greeting, cites: undefined as SourceId[] | undefined },
    ...turns.flatMap((turn) => {
      const local = answerLocally(turn.question, { pulse, insights, audience: explain, language });
      const answer = !turn.pending && turn.ai?.language === language ? turn.ai : turn.pending ? null : local;
      return [
        { id: turn.id, from: "me" as const, text: turn.question, cites: undefined as SourceId[] | undefined },
        ...(answer ? [{ id: turn.id + 1, from: "leaf" as const, text: answer.text, cites: answer.cites }] : []),
      ];
    }),
  ];

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
              <Mono>{t("leaf.sub")}</Mono>
            </View>
          </View>
          <Segmented<Explain>
            value={explain}
            onChange={setExplain}
            options={[
              { value: "me", label: t("common.me") },
              { value: "class", label: t("common.myClass") },
              { value: "comune", label: t("common.comune") },
            ]}
          />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 12 }}>
          {thread.map((m) => (
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
              <Mono>{t("leaf.busy")}</Mono>
            </Animated.View>
          )}
          {turns.length === 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 6 }}>
              {SUGGESTED_KEYS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => ask(t(key))}
                  accessibilityRole="button"
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.pill, borderWidth: 1, borderColor: C.mint2 }}
                >
                  <Text style={{ fontFamily: F.medium, fontSize: 14, letterSpacing: -0.15, color: C.forest }}>{t(key)}</Text>
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
          placeholder={t("leaf.placeholder")}
          placeholderTextColor={C.mute}
          returnKeyType="send"
          onSubmitEditing={() => ask(q)}
          style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: C.card, paddingHorizontal: 18, fontSize: 16, fontFamily: F.regular, color: C.ink }}
        />
        <Pressable
          accessibilityLabel={t("leaf.send")}
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
