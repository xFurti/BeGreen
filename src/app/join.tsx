import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// Join a friends' group with the code they sent you. Nothing else to fill in.
export default function JoinWithCode() {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const joinByCode = useCommunity((s) => s.joinByCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await joinByCode(code);
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
    <View style={{ padding: 20, paddingTop: 36, gap: 18 }}>
      <View style={{ gap: 6 }}>
        <Text style={T.display}>{t("community.joinCode.title")}</Text>
        <Text style={T.callout}>{t("community.joinCode.body")}</Text>
      </View>
      <TextInput
        value={code}
        onChangeText={(v) => {
          setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""));
          setError(null);
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
      <Button label={t("community.joinCode.cta")} kind="green" loading={busy} disabled={code.length < 4} onPress={submit} />
    </View>
  );
}
