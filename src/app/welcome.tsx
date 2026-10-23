import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DropCard } from "@/components/drop-card";
import { Button, Mono } from "@/components/ui";
import { usePulse } from "@/hooks/use-pulse";
import { useI18n } from "@/i18n/use-i18n";
import { countComuneMembers } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { useApp } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export default function Welcome() {
  const { C, T } = useTheme();
  const { top } = useSafeAreaInsets();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const profile = useApp((s) => s.profile);
  const comune = useApp((s) => s.comune);
  const { drop, pulse, ready } = usePulse();
  const [permission, requestPermission] = useCameraPermissions();
  const [seed, setSeed] = useState<number | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!hasBackend || !comune) return;
    countComuneMembers(comune.id)
      .then((count) => {
        if (mounted) setSeed(count);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [comune]);

  const startProof = async () => {
    setPermissionMessage(null);
    const next = permission?.granted ? permission : await requestPermission();
    if (!next?.granted) {
      setPermissionMessage(t("welcome.cameraDenied"));
      return;
    }
    router.replace("/");
    router.push("/capture");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.View entering={reducedMotion ? undefined : FadeIn} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: top + 24, paddingHorizontal: 20, paddingBottom: 36, gap: 22 }}>
          <View style={{ gap: 8 }}>
            <Mono color={C.leaf}>{t("welcome.kicker")}</Mono>
            <Text style={[T.hero, { fontSize: 42, lineHeight: 44 }]}>{t("welcome.greeting", { handle: profile.handle || t("common.youInline") })}</Text>
            <Text style={{ fontFamily: F.regular, fontSize: 16, lineHeight: 23, color: C.ink2 }}>
              {seed !== null && seed >= 1 && comune ? t("welcome.seed", { count: seed, place: comune.name }) : t("welcome.localGreeting", { place: comune?.name ?? t("common.yourArea") })}
            </Text>
          </View>

          <DropCard drop={drop} done={false} place={comune?.name ?? pulse.place.name} crowd={[]} ready={ready} />

          <View style={{ backgroundColor: C.mint, borderRadius: R.lg, padding: 18, gap: 8 }}>
            <Mono color={C.forestInk}>{t("welcome.cameraTitle")}</Mono>
            <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink2 }}>{t("welcome.cameraBody")}</Text>
          </View>
          {permissionMessage && <Text style={[T.caption, { color: C.red }]}>{permissionMessage}</Text>}
          <Button label={t("welcome.firstProof")} kind="green" icon="camera" onPress={startProof} />
          <Button label={t("welcome.enterFeed")} kind="ghost" onPress={() => router.replace("/")} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
