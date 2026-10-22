import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ClueStep } from "@/components/quest/clue";
import { LinkStep, QuestEnd, QuestMap } from "@/components/quest/journey";
import { SourceSheet, type SourceRef } from "@/components/quest/parts";
import { SpeaksStep } from "@/components/quest/speaks";
import { Button, IconButton, Mono } from "@/components/ui";
import { THREADS } from "@/data/quest";
import { useApp } from "@/store/app-store";
import { C, T } from "@/theme/tokens";

type Step = "map" | "clue" | "speaks" | "link" | "end";

// Caccia verde: unlocked after a post. Map → clue → the place speaks → the thread → … → end.
export default function Quest() {
  const { top, bottom } = useSafeAreaInsets();
  const quest = useApp((s) => s.quest);
  const solveStop = useApp((s) => s.solveStop);
  const nextStop = useApp((s) => s.nextStop);
  const finishQuest = useApp((s) => s.finishQuest);
  const [source, setSource] = useState<SourceRef | null>(null);
  const [step, setStep] = useState<Step>(() => {
    if (!quest) return "map";
    if (quest.done) return "end";
    return quest.solved[quest.stops[quest.step]] ? "speaks" : "map";
  });

  if (!quest) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top + 24, paddingBottom: bottom + 16, paddingHorizontal: 22, justifyContent: "space-between" }}>
        <View style={{ gap: 10 }}>
          <Mono>Caccia verde</Mono>
          <Text style={T.display}>Prima la prova, poi la caccia.</Text>
          <Text style={T.callout}>Posta un BeGreen: alla fine potrai avviare la caccia nel centro di Schio e guadagnare altri seeds.</Text>
        </View>
        <Button label="Torna indietro" kind="green" onPress={() => router.back()} />
      </View>
    );
  }

  if (step === "end") return <QuestEnd quest={quest} />;

  const placeId = quest.stops[quest.step];
  const last = quest.step === quest.stops.length - 1;

  let body;
  switch (step) {
    case "map":
      body = <QuestMap quest={quest} onGo={() => setStep(quest.solved[placeId] ? "speaks" : "clue")} />;
      break;
    case "clue":
      body = (
        <ClueStep
          key={placeId}
          placeId={placeId}
          number={quest.step + 1}
          total={quest.stops.length}
          onSource={setSource}
          onSolved={(r) => {
            solveStop(placeId, r);
            setStep("speaks");
          }}
        />
      );
      break;
    case "speaks":
      body = (
        <SpeaksStep
          key={placeId}
          placeId={placeId}
          thread={quest.thread}
          seeds={quest.solved[placeId]?.seeds ?? 0}
          last={last}
          onSource={setSource}
          onNext={() => {
            if (last) {
              finishQuest();
              setStep("end");
            } else setStep("link");
          }}
        />
      );
      break;
    case "link":
      body = (
        <LinkStep
          linkId={quest.links[quest.step]}
          next={quest.step + 2}
          total={quest.stops.length}
          onSource={setSource}
          onNext={() => {
            nextStop();
            setStep("map");
          }}
        />
      );
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top, paddingBottom: bottom }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
        <IconButton
          icon={step === "map" ? "close" : "back"}
          label={step === "map" ? "Chiudi la caccia" : "Torna alla mappa"}
          onPress={() => (step === "map" ? router.back() : setStep("map"))}
        />
        <Mono color={C.ink} style={{ flex: 1, textAlign: "center" }}>
          {THREADS[quest.thread].short}
        </Mono>
        <View style={{ width: 40, alignItems: "flex-end" }}>
          <Mono color={C.ink}>{`${quest.step + 1}/${quest.stops.length}`}</Mono>
        </View>
      </View>
      {body}
      <SourceSheet open={source} onClose={() => setSource(null)} />
    </View>
  );
}
