import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Button, Chip } from "@/components/ui";
import { handleVariants } from "@/data/seeds";
import { useI18n } from "@/i18n/use-i18n";
import { freeHandles } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export const HANDLE = /^[a-z0-9._]{2,24}$/;

export const toHandle = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);

type Status = "idle" | "invalid" | "checking" | "free" | "taken" | "offline";

// Your @, checked while you type. Red only once you've written something that can't work.
export function HandleStep({ name, handle, onChange, onNext }: { name: string; handle: string; onChange: (h: string) => void; onNext: () => void }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  // The answer for the handle on screen; anything older is still "checking".
  const [checked, setChecked] = useState<{ handle: string; status: Status; suggest: string[] } | null>(null);
  const valid = HANDLE.test(handle);
  const status: Status = !valid ? (handle ? "invalid" : "idle") : !hasBackend ? "idle" : checked?.handle === handle ? checked.status : "checking";
  const suggest = checked?.handle === handle ? checked.suggest : [];

  useEffect(() => {
    if (!HANDLE.test(handle) || !hasBackend) return;
    let cancel = false;
    const id = setTimeout(async () => {
      const candidates = [handle, ...handleVariants(handle, name)];
      try {
        const free = await freeHandles(candidates);
        if (cancel) return;
        setChecked(
          free.has(handle)
            ? { handle, status: "free", suggest: [] }
            : { handle, status: "taken", suggest: candidates.filter((c) => c !== handle && free.has(c)).slice(0, 3) },
        );
      } catch (e) {
        if (__DEV__) console.warn(e);
        if (!cancel) setChecked({ handle, status: "offline", suggest: [] });
      }
    }, 350);
    return () => {
      cancel = true;
      clearTimeout(id);
    };
  }, [handle, name]);

  const line = status === "free" ? C.leaf : status === "taken" || status === "invalid" ? C.red : C.line;
  const ok = valid && status !== "taken" && status !== "checking";

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 2, borderBottomColor: line }}>
        <Text style={{ fontFamily: F.monoMedium, fontSize: 24, color: C.mute }}>@</Text>
        <TextInput
          value={handle}
          onChangeText={(v) =>
            onChange(
              v
                .toLowerCase()
                .replace(/[^a-z0-9._]/g, "")
                .slice(0, 24),
            )
          }
          autoFocus
          placeholder={t("onboarding.handle")}
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t("onboarding.handleA11y")}
          returnKeyType="done"
          onSubmitEditing={() => ok && onNext()}
          style={{ flex: 1, height: 58, fontSize: 24, fontFamily: F.monoMedium, color: C.ink }}
        />
        {status === "checking" && <ActivityIndicator color={C.leaf} />}
        {status === "free" && (
          <Animated.View entering={FadeIn}>
            <Icon name="checkSeal" size={22} color={C.leaf} />
          </Animated.View>
        )}
      </View>

      <View accessibilityLiveRegion="polite" style={{ minHeight: 22, gap: 10 }}>
        {status === "free" && <Text style={[T.caption, { color: C.leaf }]}>{t("seed.ob.free", { handle })}</Text>}
        {status === "checking" && <Text style={T.caption}>{t("seed.ob.checking")}</Text>}
        {status === "invalid" && <Text style={[T.caption, { color: C.red }]}>{t("seed.ob.handleInvalid")}</Text>}
        {status === "offline" && <Text style={T.caption}>{t("seed.ob.handleOffline")}</Text>}
        {status === "idle" && <Text style={T.caption}>{t("onboarding.handleHint")}</Text>}
        {status === "taken" && (
          <Animated.View entering={FadeInDown} style={{ gap: 8 }}>
            <Text style={[T.caption, { color: C.red }]}>{t("seed.ob.taken", { handle })}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {suggest.map((s) => (
                <Chip
                  key={s}
                  label={`@${s}`}
                  onPress={() => {
                    haptic.tap();
                    onChange(s);
                  }}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </View>

      <Button label={t("seed.ob.handleNext")} kind="green" icon="check" disabled={!ok} onPress={onNext} />
    </View>
  );
}
