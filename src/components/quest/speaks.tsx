import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Mono, Tag } from "@/components/ui";
import { factsOf, getFact, getPlace, QUEST_IMAGES, type Thread } from "@/data/quest";
import type { Narration } from "@/data/quest/types";
import { narrate } from "@/services/quest/narrate";
import { C, F, T } from "@/theme/tokens";

import { ActHint, CuriosityCard, PhotoCredit, placeCuriosity, SourceChip, type SourceRef } from "./parts";

export function SpeaksStep({
  placeId,
  thread,
  seeds,
  last,
  onNext,
  onSource,
}: {
  placeId: string;
  thread: Thread;
  seeds: number;
  last: boolean;
  onNext: () => void;
  onSource: (r: SourceRef) => void;
}) {
  const place = getPlace(placeId);
  const [story, setStory] = useState<Narration | null>(null);

  useEffect(() => {
    let alive = true;
    narrate({ place, facts: factsOf(placeId), thread }).then((n) => alive && setStory(n));
    return () => {
      alive = false;
    };
  }, [place, placeId, thread]);

  // Number each cited fact once, in order of appearance.
  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    story?.sentences.forEach((s) => s.factIds?.forEach((id) => m.has(id) || m.set(id, m.size + 1)));
    return m;
  }, [story]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View>
          <Image source={QUEST_IMAGES.full[place.photo.key]} accessibilityLabel={place.photo.alt} style={{ width: "100%", aspectRatio: 1.35 }} contentFit="cover" />
          <View style={{ position: "absolute", left: 16, bottom: 14, flexDirection: "row", gap: 6 }}>
            <Tag label="TROVATO" solid />
            {seeds > 0 && <Tag label={`+${seeds} SEEDS`} solid />}
          </View>
        </View>

        <View style={{ padding: 20, gap: 22 }}>
          <View style={{ gap: 6 }}>
            <Mono color={C.leaf}>Il luogo parla</Mono>
            <Text style={T.display}>{place.name}</Text>
            <Text style={T.callout}>{place.subtitle}</Text>
            <PhotoCredit place={place} />
          </View>

          {!story ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <View style={{ gap: 14 }}>
              {story.sentences.map((s, i) => (
                <Animated.View key={i} entering={FadeInDown.delay(120 * i).springify().damping(18)} style={{ gap: 6 }}>
                  {s.flavor ? (
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <Tag label="RACCONTO" />
                      <Text style={[T.body, { flex: 1, fontStyle: "italic", color: C.ink2 }]}>{s.text}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 27, letterSpacing: -0.5, color: C.ink }}>{s.text}</Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {s.factIds?.map((id) => {
                          const f = getFact(id);
                          return f ? <SourceChip key={id} n={numbers.get(id) ?? 0} onPress={() => onSource({ factId: id, sourceId: f.sourceId })} /> : null;
                        })}
                      </View>
                    </>
                  )}
                </Animated.View>
              ))}
              <Text style={T.caption}>
                Ogni frase con «fonte» viene da un fatto curato e verificato. Le frasi «racconto» sono colore narrativo: niente date, nomi o numeri.
                {story.fallback ? " Il narratore non ha superato i controlli: stai leggendo il testo di riserva." : ""}
              </Text>
            </View>
          )}

          <CuriosityCard {...placeCuriosity(place)} onSource={onSource} />
          <ActHint act={place.act} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
        <Button label={last ? "Concludi la caccia" : "Prossima tappa"} kind="green" icon={last ? "trophy" : "arrowRight"} onPress={onNext} />
      </View>
    </View>
  );
}
