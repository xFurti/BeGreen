import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useCountdown } from "@/components/drop-card";
import { Icon } from "@/components/icon";
import { Button, LiveDot, Mono, SdgTags, SourceBadge } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { usePulse } from "@/hooks/use-pulse";
import { C, F, T } from "@/theme/tokens";

export default function DropSheet() {
  const { drop, pulse } = usePulse();
  const a = ACTIONS[drop.action];
  const left = useCountdown();

  const go = (path: "/capture" | "/guide") => {
    router.back();
    setTimeout(() => router.push({ pathname: path, params: { action: drop.action } }), 250);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 30 }}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LiveDot color={C.leaf} />
          <Mono color={C.forest}>Today’s Drop</Mono>
          <Mono>· {pulse.place.name}</Mono>
          <View style={{ flex: 1 }} />
          <Mono color={C.forest} style={{ fontVariant: ["tabular-nums"] }}>
            {left}
          </Mono>
        </View>
        <Text style={[T.hero, { fontSize: 40, lineHeight: 42 }]}>{drop.title}</Text>
        <SdgTags goals={a.sdgs} />
      </View>

      <Animated.View entering={FadeInDown.delay(80)} style={{ gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
        <Mono>Why this, why today</Mono>
        <Text style={[T.body, { fontSize: 17, lineHeight: 25 }]}>{drop.why}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 14 }}>{drop.metric}</Text>
          {drop.sources.map((s) => (
            <SourceBadge key={s} id={s} onPress={() => router.push("/sources")} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160)} style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }}>
        <Mono style={{ marginBottom: 10 }}>How it works</Mono>
        {[
          { icon: "camera" as const, t: "Snap the thing", d: "The bike, the bin, the bottle, the plant." },
          { icon: "video" as const, t: "Prove it in 5 seconds", d: a.proofHint },
          { icon: "checkSeal" as const, t: "3 friends verify", d: "Then it counts for your streak, squad and city." },
        ].map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 10 }}>
            <Mono color={C.leaf} style={{ width: 20, paddingTop: 3 }}>
              {String(i + 1).padStart(2, "0")}
            </Mono>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3 }}>{s.t}</Text>
              <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{s.d}</Text>
            </View>
            <Icon name={s.icon} size={16} color={C.leaf} />
          </View>
        ))}
      </Animated.View>

      <Text style={T.caption}>
        No alarm, no panic. Everyone in {pulse.place.name} gets the same Drop today. Post it whenever you actually do it, before midnight.
      </Text>

      <View style={{ gap: 8 }}>
        <Button label={`Do it: ${a.label}`} kind="green" trailing={`+${a.seeds + 10}`} icon={a.icon} onPress={() => go("/capture")} />
        <Button label="Show me how" kind="ghost" icon="book" onPress={() => go("/guide")} />
      </View>
    </ScrollView>
  );
}
