import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { useI18n } from "@/i18n/use-i18n";
import { resolveGroupInvite } from "@/services/community";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { hasBackend } from "@/services/supabase";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// Join a friends' group with the code they sent you. Nothing else to fill in.
export default function JoinWithCode() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const joinByCode = useCommunity((s) => s.joinByCode);
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<{ id: string; name: string }[]>([]);

  const submit = async (target?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!target) {
        const s = useCommunity.getState();
        const candidates = hasBackend ? await resolveGroupInvite(code) : s.catalog.filter((c) => s.invites[c.id] === code);
        if (candidates.length > 1) {
          setChoices(candidates);
          return;
        }
      }
      const id = await joinByCode(code, target);
      if (!id) {
        setError(t("community.joinCode.bad"));
        return;
      }
      haptic.success();
      router.replace({ pathname: "/community/[id]", params: { id } });
    } catch {
      setError(t("shared.checkConnection"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollerRef}
        {...scrollProps}
        nestedScrollEnabled={process.env.EXPO_OS === "android"}
        contentContainerStyle={{ padding: 20, paddingTop: 36, paddingBottom: scrollPaddingBottom(40, cover), gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Text style={T.display}>{t("community.joinCode.title")}</Text>
          <Text style={T.callout}>{t("community.joinCode.body")}</Text>
        </View>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            setError(null);
            setChoices([]);
          }}
          placeholder="ABC123"
          placeholderTextColor={C.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          maxLength={12}
          returnKeyType="go"
          onSubmitEditing={() => code.length >= 4 && submit()}
          style={{ height: 68, borderRadius: R.lg, backgroundColor: C.card, textAlign: "center", fontFamily: F.monoMedium, fontSize: 30, letterSpacing: 6, color: C.ink }}
          accessibilityLabel={t("community.page.codePh")}
        />
        {error && <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.red, textAlign: "center" }}>{error}</Text>}
        {choices.length > 1 && <Text style={T.callout}>{t("groups.inviteChoice")}</Text>}
        {choices.map((c) => (
          <Button key={c.id} label={c.name} kind="secondary" disabled={busy} onPress={() => submit(c.id)} />
        ))}
        {!choices.length && <Button label={t("community.joinCode.cta")} kind="green" loading={busy} disabled={code.length < 4} onPress={() => submit()} />}
      </ScrollView>
    </View>
  );
}
