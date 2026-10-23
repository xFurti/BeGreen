import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { Button, Mono, Press } from "@/components/ui";
import type { Comune } from "@/data/types";
import { useI18n } from "@/i18n/use-i18n";
import { comuneLabel, comuneNearMe, searchComuni } from "@/services/comuni";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// "Where are you planting me?": your position or a search, without leaving onboarding.
export function PlaceStep({ comune, onPick, onNext }: { comune: Comune | null; onPick: (c: Comune) => void; onNext: () => void }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const [mode, setMode] = useState<"choose" | "search">("choose");
  const [changing, setChanging] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; results: Comune[] } | null>(null);
  const searchable = mode === "search" && q.trim().length >= 2;
  const results = searchable && found?.q === q ? found.results : [];
  const searching = searchable && found?.q !== q;

  useEffect(() => {
    if (mode !== "search" || q.trim().length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      searchComuni(q, ctrl.signal)
        .then((r) => {
          setFound({ q, results: r });
          setNote(r.length ? null : t("seed.ob.noResults"));
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setFound({ q, results: [] });
          setNote(t("seed.ob.searchFailed"));
          if (__DEV__) console.warn(e);
        });
    }, 300);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, mode, t]);

  const pick = (c: Comune) => {
    haptic.success();
    setChanging(false);
    setMode("choose");
    setQ("");
    setNote(null);
    onPick(c);
  };

  const nearMe = async () => {
    haptic.tap();
    setLocating(true);
    setNote(null);
    const c = await comuneNearMe().catch(() => null);
    setLocating(false);
    if (c) pick(c);
    else {
      setNote(t("seed.ob.noLocation"));
      setMode("search");
    }
  };

  if (comune && !changing) {
    return (
      <Animated.View entering={FadeInDown.springify().damping(18)} style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: R.lg, backgroundColor: C.mint }}>
          <Icon name="location" size={18} color={C.leaf} />
          <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, color: C.forestInk }}>{comuneLabel(comune)}</Text>
          <Icon name="checkSeal" size={20} color={C.leaf} />
        </View>
        <Button label={t("common.next")} kind="green" icon="leaf" onPress={onNext} />
        <Press onPress={() => setChanging(true)} accessibilityLabel={t("seed.ob.change")} style={{ alignSelf: "center", padding: 6 }}>
          <Mono color={C.ink}>{t("seed.ob.change")}</Mono>
        </Press>
      </Animated.View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {mode === "choose" ? (
        <Animated.View entering={FadeIn} style={{ gap: 10 }}>
          <Button label={locating ? t("seed.ob.locating") : t("seed.ob.nearMe")} kind="green" icon="locate" loading={locating} onPress={nearMe} />
          <Text style={[T.caption, { textAlign: "center" }]}>{t("seed.ob.nearMeHint")}</Text>
          <Button label={t("seed.ob.search")} kind="ghost" icon="search" onPress={() => setMode("search")} />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={{ gap: 10 }}>
          {note && <Text style={[T.caption, { color: C.ink2 }]}>{note}</Text>}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 54, paddingHorizontal: 16, borderRadius: R.pill, backgroundColor: C.card }}>
            <Icon name="search" size={17} color={C.mute} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus
              placeholder={t("seed.ob.searchPlaceholder")}
              placeholderTextColor={C.faint}
              accessibilityLabel={t("seed.ob.searchPlaceholder")}
              autoCorrect={false}
              returnKeyType="search"
              style={{ flex: 1, fontFamily: F.medium, fontSize: 17, color: C.ink }}
            />
            {searching && <ActivityIndicator color={C.leaf} />}
          </View>
          {results.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(i * 40)}>
              <Press
                onPress={() => pick(c)}
                accessibilityLabel={comuneLabel(c)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line }}
              >
                <Icon name="location" size={15} color={C.leaf} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink }}>{c.name}</Text>
                {!!c.province && c.province !== c.name && <Mono>{c.province}</Mono>}
              </Press>
            </Animated.View>
          ))}
          <Press onPress={() => setMode("choose")} accessibilityLabel={t("seed.ob.nearMe")} style={{ alignSelf: "center", padding: 6, flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Icon name="locate" size={14} color={C.leaf} />
            <Mono color={C.ink}>{t("seed.ob.nearMe")}</Mono>
          </Press>
        </Animated.View>
      )}
    </View>
  );
}
