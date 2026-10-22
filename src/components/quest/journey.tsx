import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Blobs } from "@/components/nature";
import { Button, Mono, SdgTags, useCountUp } from "@/components/ui";
import { getLink, getPlace, QUEST_IMAGES, THREADS } from "@/data/quest";
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

export function QuestMap({ quest, onGo }: { quest: QuestRun; onGo: () => void }) {
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
              Caccia verde · Schio
            </Mono>
            <SdgTags goals={t.sdgs} />
          </View>
          <Text style={T.display}>{t.title}</Text>
          <Text style={T.callout}>{t.pitch}</Text>
          {fresh && (
            <Text style={T.caption}>
              {quest.stops.length} tappe nel centro di Schio. Trovi un dettaglio, il luogo ti racconta la sua storia con le fonti in mano. Fino a +
              {maxQuestSeeds(quest.stops.length)} seeds.
            </Text>
          )}
        </View>

        <View>
          {quest.stops.map((id, i) => {
            const p = getPlace(id);
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
                          <Image source={QUEST_IMAGES.full[p.photo.key]} style={{ width: "100%", aspectRatio: 1, borderRadius: 2 }} contentFit="cover" />
                          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                            <Stamp label="✓" size={0.8} />
                          </View>
                        </View>
                      ) : (
                        <View style={{ width: "100%", aspectRatio: 1, borderRadius: 2, backgroundColor: active ? C.forest : C.mint, alignItems: "center", justifyContent: "center" }}>
                          {active ? <Pulse /> : <Text style={{ fontFamily: F.medium, fontSize: 30, color: C.mint2 }}>?</Text>}
                        </View>
                      )}
                    </Polaroid>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Mono color={active || solved ? C.leaf : C.mute}>{`0${i + 1}${active ? " · Adesso" : solved ? " · Trovato" : ""}`}</Mono>
                    <Text style={[T.title, { color: solved || active ? C.ink : C.faint }]}>{solved ? p.name : "Luogo misterioso"}</Text>
                    {solved && <Text style={T.caption}>{p.subtitle}</Text>}
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

export function QuestEnd({ quest }: { quest: QuestRun }) {
  const { top, bottom } = useSafeAreaInsets();
  const t = THREADS[quest.thread];
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

      <View style={{ flex: 1, justifyContent: "center", gap: 28 }}>
        <View>
          <Text style={[T.mega, { color: C.lime, fontSize: 112, lineHeight: 112, fontVariant: ["tabular-nums"] }]}>+{n}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.white }}>seeds dalla caccia.</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.forestMute, marginTop: 6 }}>
            {total === 0
              ? "Questi luoghi li avevi già trovati: i seeds si guadagnano una volta sola. Le storie restano."
              : `${stopSeeds} dalle tappe${quest.bonus ? ` · +${quest.bonus} bonus ${t.short}` : ""}`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {quest.stops.map((id, i) => {
            const p = getPlace(id);
            return (
              <Animated.View key={id} entering={FadeInDown.delay(200 + i * 140).springify().damping(14)} style={{ flex: 1 }}>
                <Polaroid tilt={[-4, 2, -2][i % 3]} caption={p.name.split(" ").slice(-1)[0]}>
                  <Image source={QUEST_IMAGES.full[p.photo.key]} style={{ width: "100%", aspectRatio: 1, borderRadius: 2 }} contentFit="cover" />
                </Polaroid>
              </Animated.View>
            );
          })}
        </View>
        <Text style={{ fontFamily: F.medium, fontSize: 17, lineHeight: 23, letterSpacing: -0.3, color: C.white }}>{t.title}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, paddingTop: 16 }}>
        <Button
          label="Condividi"
          icon="share"
          kind="glass"
          onPress={() =>
            Share.share({
              message: `Ho completato «${t.title}» a Schio: ${quest.stops.map((id) => getPlace(id).name).join(" → ")}. Le mura parlano, con le fonti in mano. 🌱 #BeGreen`,
            })
          }
        />
        <Button label="Torna al feed" kind="inverse" onPress={() => router.back()} style={{ flex: 1, borderRadius: R.pill }} />
      </View>
    </View>
  );
}
