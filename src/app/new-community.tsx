import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Share, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Button, Segmented } from "@/components/ui";
import type { Community, Visibility } from "@/data/community";
import { useI18n } from "@/i18n/use-i18n";
import { bboxAround } from "@/services/geo";
import { useApp } from "@/store/app-store";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// A group with friends in two steps: name it, then send the code. Private unless you say otherwise.
export default function NewGroup() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const comune = useApp((s) => s.comune);
  const create = useCommunity((s) => s.create);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Community | null>(null);
  const code = useCommunity((s) => (made ? s.invites[made.id] : undefined));

  if (!comune) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const c = await create({
        name: name.trim(),
        kind: "friends",
        description: "",
        area: comune.name,
        visibility,
        // A group's own map, for the places its members share, starts around your Comune.
        center: { lat: comune.lat, lon: comune.lon },
        bbox: bboxAround({ lat: comune.lat, lon: comune.lon }, 4),
        comuni: [comune.name],
      });
      haptic.success();
      setMade(c);
    } catch {
      Alert.alert(t("community.newGroup.fail"), t("shared.checkConnection"));
    } finally {
      setBusy(false);
    }
  };

  if (made) {
    const share = () => code && Share.share({ message: t("community.group.inviteText", { name: made.name, code }) });
    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 36, gap: 22, paddingBottom: 50 }}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={{ alignItems: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={28} color={C.lime} />
          </View>
          <Text style={[T.display, { textAlign: "center" }]}>{t("community.newGroup.ready", { name: made.name })}</Text>
          <Text style={[T.callout, { textAlign: "center" }]}>{t("community.newGroup.readyBody")}</Text>
        </Animated.View>
        {code && (
          <View style={{ alignItems: "center", backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 22 }}>
            <Text selectable style={{ fontFamily: F.monoMedium, fontSize: 38, letterSpacing: 8, color: C.ink }}>
              {code}
            </Text>
          </View>
        )}
        <Button label={t("community.group.share")} kind="green" icon="share" onPress={share} disabled={!code} />
        <Button label={t("community.newGroup.open")} kind="ghost" onPress={() => router.replace({ pathname: "/community/[id]", params: { id: made.id } })} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 36, gap: 18, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
      <Text style={T.display}>{t("community.newGroup.title")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("community.newGroup.namePh")}
        placeholderTextColor={C.mute}
        maxLength={60}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => name.trim().length >= 3 && submit()}
        style={{ height: 56, borderRadius: R.md, backgroundColor: C.card, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 18, color: C.ink }}
        accessibilityLabel={t("community.newGroup.name")}
      />
      <View style={{ gap: 8 }}>
        <Segmented<Visibility>
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "private", label: t("community.visibility.private") },
            { value: "public", label: t("community.visibility.public") },
          ]}
        />
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
          <Icon name={visibility === "private" ? "lock" : "globe"} size={14} color={C.ink2} />
          <Text style={[T.caption, { flex: 1, color: C.ink2 }]}>
            {visibility === "private" ? t("community.newGroup.privateNote") : t("community.newGroup.publicNote")}
          </Text>
        </View>
      </View>
      <Button label={t("community.newGroup.create")} kind="green" icon="plus" loading={busy} disabled={name.trim().length < 3} onPress={submit} />
    </ScrollView>
  );
}
