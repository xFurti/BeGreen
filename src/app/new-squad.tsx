import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { Button, Chip, Mono } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { KIND } from "@/data/squad-kinds";
import type { SquadKind } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { useApp } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export default function NewSquad() {
  const { C, T } = useTheme();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SquadKind>("friends");
  const [busy, setBusy] = useState(false);
  const create = useApp((s) => s.createSquad);
  const place = useApp((s) => s.comune?.name ?? s.place.name);
  const { drop } = usePulse();
  // The first weekly quest follows what the Comune needs today.
  const action = ACTIONS[drop.action];
  const quest = { title: `${action.label} week`, action: drop.action, goal: 10, progress: 0, endsInDays: 7 };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 28 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 10 }}>
        <Mono>New squad · {place}</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>Start a crew.</Text>
        <Text style={T.callout}>A class, a club, a team, your Comune. Squads share quests, a leaderboard and a community report.</Text>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Squad name"
        placeholderTextColor={C.faint}
        autoFocus
        style={{
          height: 60,
          borderBottomWidth: 1,
          borderBottomColor: name ? C.leaf : C.line,
          fontSize: 28,
          fontFamily: F.medium,
          letterSpacing: -1,
          color: C.ink,
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(Object.keys(KIND) as SquadKind[]).map((k) => (
          <Chip key={k} label={KIND[k].label} icon={KIND[k].icon} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name={action.icon} size={14} color={C.leaf} />
        <Text style={[T.caption, { flex: 1 }]}>
          First quest: <Text style={{ fontFamily: F.medium, color: C.ink }}>{quest.title}</Text>, from today’s {place} challenge. 3 proofs
          per member in 7 days.
        </Text>
      </View>
      <Button
        label={busy ? "Creating…" : "Create squad"}
        kind="green"
        disabled={name.trim().length < 3 || busy}
        onPress={async () => {
          setBusy(true);
          try {
            const s = await create({ name: name.trim(), kind, place, quest });
            haptic.success();
            router.back();
            setTimeout(() => router.push({ pathname: "/squad/[id]", params: { id: s.id } }), 300);
          } catch {
            Alert.alert("Couldn’t create the squad", "Check your connection and try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScrollView>
  );
}
