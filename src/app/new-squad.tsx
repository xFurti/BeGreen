import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Button, Chip, Mono } from "@/components/ui";
import { KIND } from "@/data/squad-kinds";
import type { SquadKind } from "@/data/types";
import { useApp } from "@/store/app-store";
import { C, F, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

export default function NewSquad() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SquadKind>("friends");
  const create = useApp((s) => s.createSquad);
  const place = useApp((s) => s.place.name);

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 28 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 10 }}>
        <Mono>New squad</Mono>
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
      <Button
        label="Create squad"
        kind="green"
        disabled={name.trim().length < 3}
        onPress={() => {
          haptic.success();
          const s = create({ name: name.trim(), kind, place });
          router.back();
          setTimeout(() => router.push({ pathname: "/squad/[id]", params: { id: s.id } }), 300);
        }}
      />
    </ScrollView>
  );
}
