import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Blobs } from "@/components/nature";
import { Button, Mono, Press, Tag } from "@/components/ui";
import { NATURE } from "@/data/quest";
import type { Species } from "@/services/env";
import { INAT, speciesLabel, type NatureStop } from "@/services/quest/nature";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

import { ActHint, CuriosityCard, SourceChip, Stamp, type SourceRef } from "./parts";

function SpeciesPhoto({ s, size }: { s: Species; size: number }) {
  return s.photo ? (
    <Image source={{ uri: s.photo }} accessibilityLabel={speciesLabel(s)} style={{ width: size, height: size, borderRadius: R.sm, backgroundColor: C.mint }} contentFit="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: R.sm, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
      <Icon name="nature" size={size * 0.4} color={C.leaf} />
    </View>
  );
}

function SampleNote({ sample }: { sample: boolean }) {
  return sample ? (
    <Text style={[T.caption, { color: C.amber }]}>Dati di esempio: i dati live non hanno risposto. Riprova con la connessione per vedere le specie vicino a te.</Text>
  ) : null;
}

/** Clue of the nature stop: which species was observed most often near you? Checked against the data, not by a model. */
export function NatureClue({
  stop,
  number,
  total,
  sample,
  onSolved,
  onSource,
}: {
  stop: NatureStop;
  number: number;
  total: number;
  sample: boolean;
  onSolved: (r: { mode: "remote"; hints: number; tries: number }) => void;
  onSource: (r: SourceRef) => void;
}) {
  const [wrong, setWrong] = useState<Record<number, true>>({});
  const [found, setFound] = useState(false);
  const tries = Object.keys(wrong).length;

  const pick = (s: Species) => {
    if (found || wrong[s.id]) return;
    if (s.id === stop.target.id) {
      haptic.success();
      setFound(true);
      setTimeout(() => onSolved({ mode: "remote", hints: 0, tries: tries + 1 }), 1300);
    } else {
      haptic.thud();
      setWrong((w) => ({ ...w, [s.id]: true }));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Mono style={{ flex: 1 }}>
              Tappa {number} di {total} · Natura intorno a te
            </Mono>
            <Pressable onPress={() => onSource({ sourceId: INAT })} hitSlop={8} accessibilityRole="button">
              <Mono color={C.ink}>Fonte →</Mono>
            </Pressable>
          </View>
          <Text style={T.display}>Chi vive vicino a te?</Text>
          <Text style={T.callout}>{stop.question}</Text>
        </View>

        <View style={{ gap: 10 }}>
          {stop.options.map((s, i) => {
            const isWrong = !!wrong[s.id];
            const isRight = found && s.id === stop.target.id;
            return (
              <Animated.View key={s.id} entering={FadeInDown.delay(90 * i).springify().damping(17)}>
                <Press
                  onPress={() => pick(s)}
                  disabled={found}
                  accessibilityLabel={speciesLabel(s)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 10,
                    borderRadius: R.md,
                    borderWidth: 2,
                    borderColor: isRight ? C.leaf : isWrong ? C.red : C.line,
                    backgroundColor: isRight ? C.mint : C.white,
                  }}
                >
                  <SpeciesPhoto s={s} size={72} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={T.headline}>{s.common ?? s.name}</Text>
                    <Text style={[T.caption, { fontStyle: "italic" }]}>{s.name}</Text>
                    {isWrong && <Text style={[T.caption, { color: C.red }]}>No: {s.count} osservazioni. Ce n&apos;è una vista più spesso.</Text>}
                    {isRight && <Text style={[T.caption, { color: C.leaf }]}>Sì: {s.count} osservazioni.</Text>}
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </View>

        <SampleNote sample={sample} />
        <Text style={T.caption}>
          Osservazioni verificate dalla comunità di iNaturalist (citizen science), entro 10 km, ultimi 30 giorni. Foto con licenza Creative Commons dei rispettivi autori.
        </Text>
      </ScrollView>
      {found && (
        <Animated.View
          entering={FadeIn.duration(150)}
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}
        >
          <Stamp label="Trovata!" size={1.4} />
        </Animated.View>
      )}
    </View>
  );
}

/** "La natura parla": live numbers, each with its source, plus the curiosity and the act to prove. */
export function NatureSpeaks({
  stop,
  seeds,
  last,
  sample,
  onNext,
  onSource,
}: {
  stop: NatureStop;
  seeds: number;
  last: boolean;
  sample: boolean;
  onNext: () => void;
  onSource: (r: SourceRef) => void;
}) {
  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    stop.sentences.forEach((s) => s.sourceId && !m.has(s.sourceId) && m.set(s.sourceId, m.size + 1));
    return m;
  }, [stop]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={{ height: 220, backgroundColor: C.forest, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <Blobs colors={[C.leaf, C.lime]} opacity={0.25} size={300} />
          <SpeciesPhoto s={stop.target} size={150} />
          <View style={{ position: "absolute", left: 16, bottom: 14, flexDirection: "row", gap: 6 }}>
            <Tag label="TROVATA" solid />
            {seeds > 0 && <Tag label={`+${seeds} SEEDS`} solid />}
          </View>
        </View>
        {stop.target.attribution && (
          <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.mute, paddingHorizontal: 20, paddingTop: 8 }} numberOfLines={1}>
            FOTO {stop.target.attribution.toUpperCase()} · INATURALIST
          </Text>
        )}

        <View style={{ padding: 20, gap: 22 }}>
          <View style={{ gap: 6 }}>
            <Mono color={C.leaf}>La natura parla</Mono>
            <Text style={T.display}>{NATURE.name}</Text>
            <Text style={T.callout}>{NATURE.subtitle}</Text>
          </View>

          <View style={{ gap: 14 }}>
            {stop.sentences.map((s, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(120 * i).springify().damping(18)} style={{ gap: 6 }}>
                {s.flavor ? (
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Tag label="RACCONTO" />
                    <Text style={[T.body, { flex: 1, fontStyle: "italic", color: C.ink2 }]}>{s.text}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 27, letterSpacing: -0.5, color: C.ink }}>{s.text}</Text>
                    {s.sourceId && (
                      <View style={{ flexDirection: "row" }}>
                        <SourceChip n={numbers.get(s.sourceId) ?? 0} onPress={() => onSource({ sourceId: s.sourceId!, text: s.text })} />
                      </View>
                    )}
                  </>
                )}
              </Animated.View>
            ))}
            <Text style={T.caption}>Numeri letti adesso dai dati aperti, con la loro fonte: nessun modello li scrive o li stima.</Text>
            <SampleNote sample={sample} />
          </View>

          <CuriosityCard id="natura" text={stop.curiosity.text} refs={stop.curiosity.sourceIds.map((sourceId) => ({ sourceId }))} onSource={onSource} />
          <ActHint act={NATURE.act} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
        <Button label={last ? "Concludi la caccia" : "Prossima tappa"} kind="green" icon={last ? "trophy" : "arrowRight"} onPress={onNext} />
      </View>
    </View>
  );
}
