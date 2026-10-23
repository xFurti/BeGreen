import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { Button, Chip, Mono } from "@/components/ui";
import { KIND } from "@/data/squad-kinds";
import type { SquadKind } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { ACT_WEEK, actionCopy, questTitle, squadKindLabel } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { useApp } from "@/store/app-store";
import { C, F, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

export default function NewSquad() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SquadKind>("friends");
  const [busy, setBusy] = useState(false);
  const create = useApp((s) => s.createSquad);
  const place = useApp((s) => s.comune?.name ?? s.place.name);
  const { drop } = usePulse();
  const { t } = useI18n();
  // The first weekly quest follows what the Comune needs today.
  const action = actionCopy(t, drop.action);
  const quest = { title: ACT_WEEK, action: drop.action, goal: 10, progress: 0, endsInDays: 7 };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 28 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 10 }}>
        <Mono>
          {t("newSquad.kicker")} · {place}
        </Mono>
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
          borderBottomColor: name ? C.leaf : C.line,
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name={action.icon} size={14} color={C.leaf} />
        <Text style={[T.caption, { flex: 1 }]}>{t("newSquad.firstQuest", { quest: questTitle(t, quest.title, quest.action), place })}</Text>
      </View>
      <Button
        label={busy ? t("newSquad.creating") : t("newSquad.create")}
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
            Alert.alert(t("newSquad.failTitle"), t("shared.checkConnection"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScrollView>
  );
}
