import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Button, Chip, Mono } from "@/components/ui";
import { KIND } from "@/data/squad-kinds";
import type { SquadKind } from "@/data/types";
import { squadKindLabel } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { C, F, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

export default function NewSquad() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SquadKind>("friends");
  const create = useApp((s) => s.createSquad);
  const place = useApp((s) => s.place.name);
  const { t } = useI18n();

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 28 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 10 }}>
        <Mono>{t("newSquad.kicker")}</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{t("newSquad.title")}</Text>
        <Text style={T.callout}>{t("newSquad.body")}</Text>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("newSquad.name")}
        placeholderTextColor={C.faint}
        autoFocus
        style={{
          height: 60,
          borderBottomWidth: 1,
          borderBottomColor: name ? C.ink : C.line,
          fontSize: 28,
          fontFamily: F.medium,
          letterSpacing: -1,
          color: C.ink,
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(Object.keys(KIND) as SquadKind[]).map((k) => (
          <Chip key={k} label={squadKindLabel(t, k)} icon={KIND[k].icon} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <Button
        label={t("newSquad.create")}
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
