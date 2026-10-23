import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { LeafMark } from "@/components/nature";
import { Mono, Press, SourceBadge } from "@/components/ui";
import type { Explain } from "@/data/types";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { usePulse } from "@/hooks/use-pulse";
import { intlLocale } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import type { Level } from "@/services/interpret";
import { composerInset } from "@/services/keyboard-inset";
import { askLeaf, suggestionsFor, todayVerdict, type LeafAnswer, type LeafFact } from "@/services/leaf";
import { useApp } from "@/store/app-store";
import { F, R, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// Each turn keeps the audience and the answer it was asked with: switching
// "Explained for" or re-asking adds a new turn, the past never rewrites itself.
type Turn = { id: number; shown: string; question: string; audience: Explain; place: string; answer: LeafAnswer | null };

const AUDIENCES: Explain[] = ["me", "class", "comune"];
const dot = (C: Palette): Record<Level, string> => ({ good: C.green, ok: C.amber, bad: C.red, info: C.faint });

export default function Leaf() {
  const { C } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { ref: keyboardRoot, cover } = useKeyboardCover();
  const { pulse, insights } = usePulse();
  // Starts from the profile's choice (also used by Pulse and Me) but stays local to this conversation.
  const preferred = useApp((s) => s.explain);
  const [audience, setAudience] = useState<Explain>(preferred);
  const { t, language } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const underComposer = process.env.EXPO_OS === "ios" ? composerHeight : 0;
  const nextId = useRef(1);
  const place = pulse.place.name;

  const scrollToEnd = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);

  const ask = async (question: string, opts?: { audience?: Explain; shown?: string }) => {
    const text = question.trim();
    if (!text || busy) return;
    haptic.tap();
    const forWhom = opts?.audience ?? audience;
    if (!opts) setQ("");
    const id = nextId.current++;
    setTurns((m) => [...m, { id, shown: opts?.shown ?? text, question: text, audience: forWhom, place, answer: null }]);
    setBusy(true);
    scrollToEnd();
    const answer = await askLeaf(text, { pulse, insights, audience: forWhom, language });
    setTurns((m) => m.map((turn) => (turn.id === id ? { ...turn, answer } : turn)));
    setBusy(false);
    scrollToEnd();
  };

  const cycleAudience = () => {
    haptic.tap();
    setAudience((a) => AUDIENCES[(AUDIENCES.indexOf(a) + 1) % AUDIENCES.length]);
  };

  const today = insights.filter((i) => i.key !== "areas").slice(0, 4);
  const updatedAt = new Intl.DateTimeFormat(intlLocale(language), { hour: "2-digit", minute: "2-digit" }).format(pulse.fetchedAt);
  const suggestions = suggestionsFor(insights);
  const lastAnswered = [...turns].reverse().find((turn) => turn.answer)?.id;
  const canSend = !!q.trim() && !busy;

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1 }}>
      {/* In a form sheet iOS adopts the first ScrollView as the sheet's own scroller, so the header lives inside it.
          react-native-screens also stretches that ScrollView to the whole sheet, under the composer: on iOS the
          content is padded by the composer's measured height, or the last answer and its chips can't be reached.
          On Android the sheet is a bottom sheet and keeps the drag unless this list joins nested scrolling. */}
      <ScrollView
        ref={scroller}
        nestedScrollEnabled={process.env.EXPO_OS === "android"}
        style={{ flex: 1 }}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: underComposer + 24 }}
        scrollIndicatorInsets={{ bottom: underComposer }}
        keyboardShouldPersistTaps="handled"
      >
        {/* A sticky header's own style moves to RN's wrapper and the child gets `flex: 1`, so the row lives one level down. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, backgroundColor: C.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar size={28} />
            <Text style={{ fontFamily: F.semibold, fontSize: 18, letterSpacing: -0.3, color: C.ink }}>Leaf</Text>
            <View style={{ flex: 1 }} />
            <Press
              onPress={() => router.push("/comune")}
              accessibilityLabel={t("leaf.openComune", { place })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                height: 30,
                paddingLeft: 10,
                paddingRight: 8,
                borderRadius: R.pill,
                backgroundColor: C.card,
              }}
            >
              <Icon name="location" size={12} color={C.forestInk} />
              <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 13, color: C.ink, flexShrink: 1 }}>
                {pulse.sample ? t("leaf.sample", { place }) : t("leaf.updated", { place, time: updatedAt })}
              </Text>
              <Icon name="chevron" size={11} color={C.mute} />
            </Press>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 22 }}>
          {/* Leaf opens on today's verdict for this place, not on a greeting: the numbers come first. */}
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: C.ink }}>
              {todayVerdict(insights, place, language)}
            </Text>
            {today.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {today.map((i) => (
                  <Fact key={i.key} f={{ label: i.label, value: i.value, unit: i.unit, level: i.level }} />
                ))}
              </View>
            )}
            <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.mute }}>{t("leaf.greeting")}</Text>
          </Animated.View>

          {turns.length === 0 && (
            <Animated.View entering={FadeIn.delay(150)} style={{ gap: 8 }}>
              {suggestions.map((s) => (
                <Suggestion key={s.key} icon={s.icon} label={t(s.key)} onPress={() => ask(t(s.key))} />
              ))}
            </Animated.View>
          )}

          {turns.map((turn) => (
            <Answer
              key={turn.id}
              question={turn.shown}
              answer={turn.answer}
              audience={turn.audience}
              place={turn.place}
              // Chips re-ask with today's data, so only offer them while the place is still the same.
              latest={turn.id === lastAnswered && !busy && turn.place === place}
              onAsk={(question) => ask(question)}
              onReask={(aud) => ask(turn.question, { audience: aud, shown: t(`leaf.reask.${aud}`) })}
            />
          ))}
        </View>
      </ScrollView>

      <View
        onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
        style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: composerInset(bottom, cover), backgroundColor: C.bg, gap: 8 }}
      >
        <Press
          onPress={cycleAudience}
          accessibilityLabel={`${t("leaf.audience.a11y")}: ${t(`leaf.audience.${audience}`)}`}
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            height: 30,
            borderRadius: R.pill,
            backgroundColor: C.card,
          }}
        >
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{t("leaf.audience.label")}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.forestInk }}>{t(`leaf.audience.${audience}`)}</Text>
          <Icon name="chevron" size={11} color={C.mute} />
        </Press>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("leaf.placeholder", { place })}
            placeholderTextColor={C.mute}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={() => ask(q)}
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 112,
              borderRadius: 24,
              backgroundColor: C.card,
              paddingHorizontal: 18,
              paddingTop: 13,
              paddingBottom: 13,
              fontSize: 16,
              lineHeight: 21,
              fontFamily: F.regular,
              color: C.ink,
            }}
          />
          <Press
            accessibilityLabel={t("leaf.send")}
            disabled={!canSend}
            onPress={() => ask(q)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: canSend ? C.forest : C.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="send" size={17} color={canSend ? C.lime : C.faint} />
          </Press>
        </View>
      </View>
    </View>
  );
}

function Avatar({ size }: { size: number }) {
  const { C } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.forest,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LeafMark size={size / 2} color={C.lime} vein={C.forest} />
    </View>
  );
}

function Suggestion({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: R.md,
        borderWidth: 1,
        borderColor: C.band,
      }}
    >
      <Icon name={icon} size={18} color={C.forestInk} />
      <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, letterSpacing: -0.15, color: C.forestInk }}>{label}</Text>
      <Icon name="chevron" size={13} color={C.mute} />
    </Press>
  );
}

function Chip({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  const { C } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: R.pill,
        borderWidth: 1,
        borderColor: C.band,
      }}
    >
      {icon && <Icon name={icon} size={13} color={C.forestInk} />}
      <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: C.forestInk }}>{label}</Text>
    </Press>
  );
}

function Fact({ f }: { f: LeafFact }) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: R.sm,
        backgroundColor: C.card,
      }}
    >
      {f.level && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot(C)[f.level] }} />}
      <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{f.label}</Text>
      <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.ink }}>
        {f.value}
        {f.unit ? ` ${f.unit}` : ""}
      </Text>
    </View>
  );
}

// A turn reads as a card: the question as its caption, Leaf's answer as the content.
function Answer({
  question,
  answer,
  audience,
  place,
  latest,
  onAsk,
  onReask,
}: {
  question: string;
  answer: LeafAnswer | null;
  audience: Explain;
  place: string;
  latest: boolean;
  onAsk: (question: string) => void;
  onReask: (audience: Explain) => void;
}) {
  const { C } = useTheme();
  const { t } = useI18n();
  const others = AUDIENCES.filter((a) => a !== audience);
  return (
    <Animated.View entering={FadeInUp.springify()} style={{ gap: 12 }}>
      <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <Text selectable style={{ flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.mute }}>
            {question}
          </Text>
          {audience !== "me" && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill, backgroundColor: C.mint }}>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: C.forestInk }}>
                {t(audience === "class" ? "leaf.audience.badgeClass" : "leaf.audience.badgeComune")}
              </Text>
            </View>
          )}
        </View>
        {answer ? (
          <Animated.View entering={FadeIn.duration(250)} style={{ gap: 12 }}>
            {!!answer.headline && (
              <Text selectable style={{ fontFamily: F.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: C.ink }}>
                {answer.headline}
              </Text>
            )}
            {!!answer.text && (
              <Text selectable style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 22, color: C.ink }}>
                {answer.text}
              </Text>
            )}
            {!!answer.facts?.length && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {answer.facts.map((f) => (
                  <Fact key={`${f.label}-${f.value}`} f={f} />
                ))}
              </View>
            )}
            <View style={{ height: 1, backgroundColor: C.line }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 4 }}>
              {!!answer.cites.length && (
                <Press
                  onPress={() => router.push("/sources")}
                  accessibilityLabel={t("leaf.sourcesA11y")}
                  style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 2, flexShrink: 1 }}
                >
                  {answer.cites.map((c) => (
                    <SourceBadge key={c} id={c} />
                  ))}
                  <Icon name="info" size={13} color={C.mute} />
                </Press>
              )}
              <Mono size={10} style={{ marginLeft: "auto" }}>
                {answer.mode === "ai" ? t("leaf.modeAi", { place }) : t("leaf.modeLocal")}
              </Mono>
            </View>
          </Animated.View>
        ) : (
          <Typing label={t("leaf.busy")} />
        )}
      </View>
      {latest && answer && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {answer.tailored && others.map((a) => <Chip key={a} icon="people" label={t(`leaf.reask.${a}`)} onPress={() => onReask(a)} />)}
          {answer.followUps?.map((f) => (
            <Chip key={f} label={f} onPress={() => onAsk(f)} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function Typing({ label }: { label: string }) {
  return (
    <Animated.View
      entering={FadeIn}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", gap: 5, paddingVertical: 6 }}
    >
      <View style={{ flexDirection: "row", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 160} />
        ))}
      </View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const { C } = useTheme();
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0.25, { duration: 380 })), -1)));
  }, [o, delay]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.leaf }, s]} />;
}
