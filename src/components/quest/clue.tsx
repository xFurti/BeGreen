import { Image } from "expo-image";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View, type GestureResponderEvent } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Button, Mono, Segmented } from "@/components/ui";
import { clueOf, getPlace, QUEST_IMAGES, type CheckMode } from "@/data/quest";
import { insideBoxes, isRightAnswer } from "@/services/quest/verify";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

import { PhotoCredit, Polaroid, Stamp, type SourceRef } from "./parts";

const MISSES_BEFORE_REVEAL = 3;

export function ClueStep({
  placeId,
  number,
  total,
  onSolved,
  onSource,
}: {
  placeId: string;
  number: number;
  total: number;
  onSolved: (r: { mode: CheckMode; hints: number; tries: number }) => void;
  onSource: (r: SourceRef) => void;
}) {
  const clue = clueOf(placeId);
  const place = getPlace(placeId);
  const [mode, setMode] = useState<CheckMode>("remote");
  const [hints, setHints] = useState(0);
  const [tries, setTries] = useState(0);
  const [found, setFound] = useState(false);

  const solve = () => {
    haptic.success();
    setFound(true);
    setTimeout(() => onSolved({ mode, hints, tries: tries + 1 }), 1300);
  };
  const miss = () => {
    haptic.thud();
    setTries((t) => t + 1);
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Mono style={{ flex: 1 }}>
              Tappa {number} di {total} · Indizio
            </Mono>
            <Pressable onPress={() => onSource({ sourceId: clue.sourceId })} hitSlop={8} accessibilityRole="button">
              <Mono color={C.ink}>Fonte →</Mono>
            </Pressable>
          </View>
          <Text style={T.display}>{clue.title}</Text>
        </View>

        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ paddingHorizontal: 26 }}>
          <Polaroid caption="dove sono?">
            <Image
              source={QUEST_IMAGES.crops[clue.crop]}
              accessibilityLabel={clue.alt}
              style={{ width: "100%", aspectRatio: 1.25, borderRadius: 2, backgroundColor: C.ink }}
              contentFit="cover"
            />
          </Polaroid>
        </Animated.View>

        <View style={{ gap: 8 }}>
          {clue.hints.slice(0, hints).map((h, i) => (
            <Animated.View key={i} entering={FadeInDown} style={{ flexDirection: "row", gap: 10, backgroundColor: C.mint, borderRadius: R.md, padding: 14 }}>
              <Mono color={C.forest}>{`Aiuto ${i + 1}`}</Mono>
              <Text style={[T.callout, { flex: 1, color: C.ink }]}>{h}</Text>
            </Animated.View>
          ))}
          {hints < clue.hints.length && !found && (
            <Button
              label={`Mi serve un aiuto (${hints}/${clue.hints.length})`}
              icon="bulb"
              kind="ghost"
              size="md"
              trailing="−5"
              onPress={() => setHints((h) => h + 1)}
            />
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Mono color={C.ink}>Come lo verifichi</Mono>
          <Segmented<CheckMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: "onsite", label: "Sono sul posto" },
              { value: "remote", label: "A distanza" },
            ]}
          />
          {mode === "onsite" ? (
            <OnSite question={clue.check.question} answers={clue.check.answers} disabled={found} onRight={solve} onWrong={miss} />
          ) : (
            <Remote placeId={placeId} tries={tries} disabled={found} onRight={solve} onWrong={miss} />
          )}
        </View>

        {clue.toVerify && (
          <Text style={T.caption}>
            <Text style={{ fontFamily: F.medium, color: C.amber }}>Da verificare sul posto · </Text>
            {clue.toVerify}
          </Text>
        )}
        <PhotoCredit place={place} />
        <Text style={T.caption}>La verifica è un controllo fisso (riquadro sulla foto o risposta esatta): nessuna AI decide se l&apos;hai trovato.</Text>
      </ScrollView>

      {found && (
        <Animated.View
          entering={FadeIn.duration(150)}
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}
        >
          <Stamp label="Trovato!" size={1.4} />
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

function OnSite({
  question,
  answers,
  disabled,
  onRight,
  onWrong,
}: {
  question: string;
  answers: string[];
  disabled: boolean;
  onRight: () => void;
  onWrong: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(0);
  const shake = useSharedValue(0);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  if (!open) return <Button label="L'ho trovato!" kind="green" icon="location" onPress={() => setOpen(true)} />;

  const submit = () => {
    if (isRightAnswer(value, answers)) return onRight();
    onWrong();
    setWrong((n) => n + 1);
    shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-4, { duration: 50 }), withTiming(0, { duration: 50 })));
  };

  return (
    <Animated.View entering={FadeInDown}>
      <Animated.View style={[{ gap: 10, backgroundColor: C.card, borderRadius: R.md, padding: 16 }, s]}>
        <Text style={T.headline}>Ultima prova: {question}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={submit}
          placeholder="La tua risposta"
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          returnKeyType="done"
          editable={!disabled}
          style={{ height: 48, borderRadius: R.sm, backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 16, color: C.ink }}
        />
        {wrong > 0 && <Text style={[T.caption, { color: C.red }]}>Non è questa. Guarda meglio, oppure chiedi un aiuto.</Text>}
        <Button label="Verifica" kind="green" size="md" disabled={!value.trim() || disabled} onPress={submit} />
      </Animated.View>
    </Animated.View>
  );
}

function Remote({
  placeId,
  tries,
  disabled,
  onRight,
  onWrong,
}: {
  placeId: string;
  tries: number;
  disabled: boolean;
  onRight: () => void;
  onWrong: () => void;
}) {
  const place = getPlace(placeId);
  const clue = clueOf(placeId);
  const photo = useRef<ComponentRef<typeof View>>(null);
  const [tap, setTap] = useState<{ x: number; y: number; ok: boolean } | null>(null);
  const reveal = tries >= MISSES_BEFORE_REVEAL;

  // pageX/pageY + measure() agree on native and web (locationX isn't reliable on web).
  const onPress = (e: GestureResponderEvent) => {
    if (disabled) return;
    const { pageX, pageY } = e.nativeEvent;
    photo.current?.measure((_x, _y, w, h, left, top) => {
      if (!w || !h) return;
      const x = (pageX - left) / w;
      const y = (pageY - top) / h;
      const ok = insideBoxes(x, y, clue.boxes);
      setTap({ x, y, ok });
      if (ok) onRight();
      else onWrong();
    });
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={T.callout}>Questa è la foto intera del luogo. Tocca il punto esatto dove si trova il dettaglio.</Text>
      <Pressable
        ref={photo}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${place.photo.alt}. Tocca dove si trova il dettaglio.`}
        style={{ width: "100%", aspectRatio: place.photo.w / place.photo.h, borderRadius: R.md, overflow: "hidden", backgroundColor: C.card }}
      >
        <Image source={QUEST_IMAGES.full[place.photo.key]} style={{ width: "100%", height: "100%" }} contentFit="fill" pointerEvents="none" />
        {reveal &&
          clue.boxes.map(([x0, y0, x1, y1], i) => (
            <Animated.View
              key={i}
              entering={FadeIn}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: `${x0 * 100}%`,
                top: `${y0 * 100}%`,
                width: `${(x1 - x0) * 100}%`,
                height: `${(y1 - y0) * 100}%`,
                borderWidth: 2,
                borderColor: C.lime,
                borderRadius: 6,
                boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
              }}
            />
          ))}
        {tap && (
          <View
            key={`${tap.x}-${tap.y}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: `${tap.x * 100}%`,
              top: `${tap.y * 100}%`,
              width: 28,
              height: 28,
              marginLeft: -14,
              marginTop: -14,
              borderRadius: 14,
              borderWidth: 3,
              borderColor: tap.ok ? C.green : C.red,
              backgroundColor: "rgba(255,255,255,0.35)",
            }}
          />
        )}
      </Pressable>
      {tries > 0 && !disabled && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="info" size={13} color={C.mute} />
          <Text style={T.caption}>{reveal ? "Ecco dov'era: toccalo per continuare." : `Non è lì. Tentativi: ${tries}/${MISSES_BEFORE_REVEAL}`}</Text>
        </View>
      )}
    </View>
  );
}
