import { Image } from "expo-image";
import * as Linking from "expo-linking";
import * as Speech from "expo-speech";
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Blobs } from "@/components/nature";
import { Button, Mono, Press } from "@/components/ui";
import { ACTIONS, type ActionId } from "@/data/actions";
import { getFact, getQuestSource, type QuestPlace } from "@/data/quest";
import { C, F, R, shadow, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

// ---------- Polaroid & stamp ----------

export function Polaroid({
  source,
  children,
  caption,
  tilt = -1.5,
  style,
}: {
  source?: number;
  children?: ReactNode;
  caption?: string;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { backgroundColor: C.white, padding: 8, paddingBottom: caption ? 30 : 8, borderRadius: 4, boxShadow: shadow.lift, transform: [{ rotate: `${tilt}deg` }] },
        style,
      ]}
    >
      {children ?? <Image source={source} style={{ width: "100%", aspectRatio: 1.3, borderRadius: 2 }} contentFit="cover" />}
      {caption && (
        <Text style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.mute }}>
          {caption}
        </Text>
      )}
    </View>
  );
}

export function Stamp({ label = "Trovato", size = 1 }: { label?: string; size?: number }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(11).stiffness(220)}>
      <View
        style={{
          borderWidth: 3 * size,
          borderColor: C.leaf,
          borderRadius: 8 * size,
          paddingHorizontal: 14 * size,
          paddingVertical: 6 * size,
          transform: [{ rotate: "-10deg" }],
          backgroundColor: "rgba(255,255,255,0.9)",
        }}
      >
        <Text style={{ fontFamily: F.monoMedium, fontSize: 22 * size, letterSpacing: 2, color: C.leaf, textTransform: "uppercase" }}>{label}</Text>
      </View>
    </Animated.View>
  );
}

// ---------- Sources ----------

export function SourceChip({ n, onPress }: { n: number; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={`Fonte ${n}`} style={{ paddingHorizontal: 7, height: 22, borderRadius: 6, backgroundColor: C.mint, justifyContent: "center" }}>
      <Text style={{ fontFamily: F.monoMedium, fontSize: 10.5, color: C.forest }}>FONTE {n}</Text>
    </Press>
  );
}

/** What a chip opens: the fact (or live sentence), its source and the exact quote it was checked against */
export type SourceRef = { factId?: string; sourceId: string; quote?: string; text?: string };

export function SourceSheet({ open, onClose }: { open: SourceRef | null; onClose: () => void }) {
  const { bottom } = useSafeAreaInsets();
  const src = open ? getQuestSource(open.sourceId) : undefined;
  const fact = open?.factId ? getFact(open.factId) : undefined;
  const quote = open?.quote ?? fact?.quote;
  const text = open?.text ?? fact?.text;
  return (
    <Modal visible={!!open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} accessibilityLabel="Chiudi" />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: 22, paddingBottom: bottom + 18, gap: 14 }}>
        <Mono>Da dove viene</Mono>
        {text && <Text style={T.body}>{text}</Text>}
        {quote && (
          <View style={{ borderLeftWidth: 2, borderLeftColor: C.leaf, paddingLeft: 12 }}>
            <Text style={[T.callout, { fontStyle: "italic" }]}>«{quote}»</Text>
          </View>
        )}
        {src && (
          <View style={{ gap: 4 }}>
            <Text style={T.headline}>{src.title}</Text>
            <Text style={T.caption}>
              {src.author} · {src.license} · {src.live ? "dati letti in tempo reale" : `consultata il ${src.accessed}`}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {src && <Button label="Apri la fonte" icon="link" kind="secondary" size="md" onPress={() => Linking.openURL(src.url)} style={{ flex: 1 }} />}
          <Button label="Chiudi" kind="green" size="md" onPress={onClose} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

export function PhotoCredit({ place, dark }: { place: QuestPlace; dark?: boolean }) {
  return (
    <Pressable onPress={() => Linking.openURL(place.photo.url)} accessibilityRole="link" hitSlop={6}>
      <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: dark ? C.nightMute : C.mute }} numberOfLines={1}>
        FOTO {place.photo.author} · {place.photo.license} · WIKIMEDIA COMMONS
      </Text>
    </Pressable>
  );
}

// ---------- "Fai la tua parte" ----------

/** Turns what you just learned into the BeGreen act you can prove next */
export function ActHint({ act }: { act: ActionId }) {
  const a = ACTIONS[act];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.mint, borderRadius: R.md, padding: 14 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
        <Icon name={a.icon} size={16} color={C.lime} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Mono color={C.forest}>Fai la tua parte</Mono>
        <Text style={[T.headline, { color: C.forest }]}>{a.label}</Text>
      </View>
      <Mono color={C.forest}>{`+${a.seeds}`}</Mono>
    </View>
  );
}

// ---------- "Lo sapevi?" with audio ----------

function Wave() {
  const h = useSharedValue(0.3);
  useEffect(() => {
    h.set(withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(0.3, { duration: 260 })), -1));
  }, [h]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center", height: 14 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[{ width: 3, height: 14, borderRadius: 2, backgroundColor: C.lime, opacity: 0.6 + i * 0.2 }, a]} />
      ))}
    </View>
  );
}

/** "Lo sapevi?" for a place: the curiosity and the facts behind it */
export const placeCuriosity = (place: QuestPlace) => ({
  id: place.id,
  text: place.curiosity.text,
  refs: place.curiosity.factIds.flatMap((id) => {
    const f = getFact(id);
    return f ? [{ factId: id, sourceId: f.sourceId }] : [];
  }),
});

export function CuriosityCard({ id, text, refs, onSource }: { id: string; text: string; refs: SourceRef[]; onSource: (r: SourceRef) => void }) {
  const [speaking, setSpeaking] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, [id]);

  const toggle = () => {
    haptic.soft();
    scale.set(withSequence(withTiming(0.9, { duration: 70 }), withSpring(1)));
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const done = () => setSpeaking(false);
    Speech.speak(`Lo sapevi? ${text}`, { language: "it-IT", rate: 0.98, onDone: done, onStopped: done, onError: done });
  };
  const btn = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeIn.delay(250)} style={{ backgroundColor: C.forest, borderRadius: R.lg, padding: 18, gap: 12, overflow: "hidden" }}>
      <Blobs colors={[C.leaf, C.lime]} opacity={0.18} size={220} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="sparkle" size={14} color={C.lime} />
        <Mono color={C.lime} style={{ flex: 1 }}>
          Lo sapevi?
        </Mono>
        <Animated.View style={btn}>
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={speaking ? "Ferma l'audio" : "Ascolta la curiosità"}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            {speaking ? <Wave /> : <Icon name="play" size={13} color={C.white} />}
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.white }}>{speaking ? "Stop" : "Ascolta"}</Text>
          </Pressable>
        </Animated.View>
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 19, lineHeight: 25, letterSpacing: -0.4, color: C.white }}>{text}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {refs.map((r) => (
          <Press
            key={r.factId ?? r.sourceId}
            onPress={() => onSource(r)}
            accessibilityLabel="Fonte della curiosità"
            style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: R.pill, borderWidth: 1, borderColor: C.forestLine }}
          >
            <Icon name="doc" size={11} color={C.forestMute} />
            <Text numberOfLines={1} style={{ fontFamily: F.monoMedium, fontSize: 10.5, color: C.forestMute, maxWidth: 240 }}>
              {getQuestSource(r.sourceId)?.title.split(":")[0].toUpperCase()}
            </Text>
          </Press>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
