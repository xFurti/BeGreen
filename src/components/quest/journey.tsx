import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Blobs } from "@/components/nature";
import { Button, Mono, Press, SdgTags, useCountUp } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { getLink, getPlace, isNature, NATURE, QUEST_IMAGES, stopName, THREADS } from "@/data/quest";
import type { Species } from "@/services/env";
import { maxQuestSeeds } from "@/services/quest/seeds";
import type { QuestRun } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

import { Polaroid, SourceChip, Stamp, type SourceRef } from "./parts";

// ---------- Map ----------

function Pulse() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[{ fontFamily: F.medium, fontSize: 30, color: C.lime }, s]}>?</Animated.Text>;
}

/** A square image for a stop: the place's photo, or the species found at the nature stop */
function StopImage({ id, natureTarget }: { id: string; natureTarget?: Species }) {
  const style = { width: "100%" as const, aspectRatio: 1, borderRadius: 2 };
  if (!isNature(id)) return <Image source={QUEST_IMAGES.full[getPlace(id).photo.key]} style={style} contentFit="cover" />;
  if (natureTarget?.photo) return <Image source={{ uri: natureTarget.photo }} style={style} contentFit="cover" />;
  return (
    <View style={[style, { backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }]}>
      <Icon name="nature" size={26} color={C.leaf} />
    </View>
  );
}

const stopSubtitle = (id: string) => (isNature(id) ? NATURE.subtitle : getPlace(id).subtitle);

export function QuestMap({ quest, natureTarget, onGo }: { quest: QuestRun; natureTarget?: Species; onGo: () => void }) {
  const t = THREADS[quest.thread];
  const current = quest.stops[quest.step];
  const fresh = Object.keys(quest.solved).length === 0;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 26, paddingBottom: 30 }}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name={t.icon} size={15} color={C.leaf} />
            <Mono color={C.leaf} style={{ flex: 1 }}>
              Caccia verde
            </Mono>
            <SdgTags goals={t.sdgs} />
          </View>
          <Text style={T.display}>{t.title}</Text>
          <Text style={T.callout}>{t.pitch}</Text>
          {fresh && (
            <Text style={T.caption}>
              {quest.stops.length - 1} tappe a Schio, dove l&apos;acqua ha acceso le fabbriche e una fabbrica è diventata giardino, poi la natura che vive
              intorno a te, letta dai dati aperti. Ogni tappa ha le sue fonti e ti suggerisce un gesto da provare. Fino a +{maxQuestSeeds(quest.stops.length)} seeds.
            </Text>
          )}
        </View>

        <View>
          {quest.stops.map((id, i) => {
            const solved = !!quest.solved[id];
            const active = id === current && !solved;
            return (
              <Animated.View key={id} entering={FadeInDown.delay(110 * i).springify().damping(17)}>
                {i > 0 && <View style={{ marginLeft: 44, height: 22, borderLeftWidth: 2, borderStyle: "dashed", borderColor: C.mint2 }} />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <View style={{ width: 90 }}>
                    <Polaroid tilt={i % 2 ? 3 : -3}>
                      {solved ? (
                        <View>
                          <StopImage id={id} natureTarget={natureTarget} />
                          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                            <Stamp label="✓" size={0.8} />
                          </View>
                        </View>
                      ) : (
                        <View style={{ width: "100%", aspectRatio: 1, borderRadius: 2, backgroundColor: active ? C.forest : C.mint, alignItems: "center", justifyContent: "center" }}>
                          {active ? (
                            <Pulse />
                          ) : isNature(id) ? (
                            <Icon name="nature" size={26} color={C.mint2} />
                          ) : (
                            <Text style={{ fontFamily: F.medium, fontSize: 30, color: C.mint2 }}>?</Text>
                          )}
                        </View>
                      )}
                    </Polaroid>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Mono color={active || solved ? C.leaf : C.mute}>{`0${i + 1}${active ? " · Adesso" : solved ? " · Trovato" : ""}`}</Mono>
                    <Text style={[T.title, { color: solved || active ? C.ink : C.faint }]}>
                      {solved || isNature(id) ? stopName(id) : "Luogo misterioso"}
                    </Text>
                    {(solved || isNature(id)) && <Text style={T.caption}>{stopSubtitle(id)}</Text>}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Button label={quest.solved[current] ? "Torna al racconto" : `Indizio ${quest.step + 1}`} kind="green" icon="search" onPress={onGo} />
      </View>
    </View>
  );
}

// ---------- Link between stops ----------

export function LinkStep({ linkId, next, total, onNext, onSource }: { linkId: string; next: number; total: number; onNext: () => void; onSource: (r: SourceRef) => void }) {
  const link = getLink(linkId);
  const t = THREADS[link.thread];
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <View />
      <Animated.View entering={FadeIn.duration(400)} style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name={t.icon} size={14} color={C.leaf} />
          <Mono color={C.leaf}>Il filo · {t.short}</Mono>
        </View>
        <Text style={[T.display, { fontSize: 30, lineHeight: 36 }]}>{link.text}</Text>
        <View style={{ flexDirection: "row" }}>
          <SourceChip n={1} onPress={() => onSource({ sourceId: link.sourceId, quote: link.quote })} />
        </View>
      </Animated.View>
      <Button label={`Alla tappa ${next} di ${total}`} kind="green" icon="arrowRight" onPress={onNext} />
    </View>
  );
}

// ---------- End ----------

export function QuestEnd({ quest, natureTarget }: { quest: QuestRun; natureTarget?: Species }) {
  const { top, bottom } = useSafeAreaInsets();
  const t = THREADS[quest.thread];
  const act = ACTIONS[t.act];
  const stopSeeds = Object.values(quest.solved).reduce((a, s) => a + s.seeds, 0);
  const total = stopSeeds + quest.bonus;
  const n = useCountUp(total, 900);
  useEffect(() => {
    haptic.success();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.forest, paddingTop: top + 16, paddingBottom: bottom + 12, paddingHorizontal: 22, overflow: "hidden" }}>
      <Blobs colors={[C.leaf, C.lime]} opacity={0.2} size={360} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Mono color={C.white} style={{ flex: 1 }}>
          Caccia completata
        </Mono>
        <SdgTags goals={t.sdgs} dark />
      </View>

      <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
        <View>
          <Text style={[T.mega, { color: C.lime, fontSize: 112, lineHeight: 112, fontVariant: ["tabular-nums"] }]}>+{n}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.white }}>seeds dalla caccia.</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.forestMute, marginTop: 6 }}>
            {total === 0
              ? "Queste tappe le avevi già trovate: i seeds si guadagnano una volta sola. Il gesto qui sotto invece vale sempre."
              : `${stopSeeds} dalle tappe${quest.bonus ? ` · +${quest.bonus} bonus ${t.short}` : ""}`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {quest.stops.map((id, i) => (
            <Animated.View key={id} entering={FadeInDown.delay(200 + i * 140).springify().damping(14)} style={{ flex: 1 }}>
              <Polaroid tilt={[-4, 2, -2, 3][i % 4]} caption={isNature(id) ? "Natura" : stopName(id).split(" ").slice(-1)[0]}>
                <StopImage id={id} natureTarget={natureTarget} />
              </Polaroid>
            </Animated.View>
          ))}
        </View>
        <Text style={{ fontFamily: F.medium, fontSize: 17, lineHeight: 23, letterSpacing: -0.3, color: C.white }}>{t.title}</Text>
      </View>

      <Animated.View entering={FadeInDown.delay(800).springify().damping(18)}>
        <Press
          onPress={() => router.replace({ pathname: "/capture", params: { action: t.act } })}
          accessibilityLabel={`Fai la tua parte: ${act.label}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: R.lg, backgroundColor: C.forest2, borderWidth: 1, borderColor: C.forestLine }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}>
            <Icon name={act.icon} size={18} color={C.forest} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Mono color={C.forestMute}>Fai la tua parte · prova ora</Mono>
            <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.white }}>{act.label}</Text>
          </View>
          <Mono color={C.lime}>{`+${act.seeds}`}</Mono>
        </Press>
      </Animated.View>

      <View style={{ flexDirection: "row", gap: 10, paddingTop: 12 }}>
        <Button
          label="Condividi"
          icon="share"
          kind="glass"
          onPress={() =>
            Share.share({
              message: `Ho completato la Caccia verde «${t.title}»: ${quest.stops.map(stopName).join(" → ")}. Ogni tappa con le sue fonti. 🌱 #BeGreen`,
            })
          }
        />
        <Button label="Torna al feed" kind="inverse" onPress={() => router.back()} style={{ flex: 1, borderRadius: R.pill }} />
      </View>
    </View>
  );
}
