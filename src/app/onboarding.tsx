import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, TextInput, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, useAnimatedScrollHandler, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { LanguageSwitch } from "@/components/language-switch";
import { Aurora } from "@/components/onboarding/aurora";
import { CityLive } from "@/components/onboarding/city-live";
import { HoldToPlant } from "@/components/onboarding/hold-to-plant";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { AvatarPicker, ProfileCard } from "@/components/onboarding/profile-card";
import { ProofDeck } from "@/components/onboarding/proof-deck";
import { RotatingWord } from "@/components/onboarding/rotating-word";
import { WordsIn } from "@/components/onboarding/words-in";
import { Button, Chip, Logo, Mono, Press } from "@/components/ui";
import type { AvatarId } from "@/data/avatars";
import type { Comune } from "@/data/types";
import { useHandleStatus } from "@/hooks/use-handle-status";
import { useI18n } from "@/i18n/use-i18n";
import { comuneLabel, comuneNearMe } from "@/services/comuni";
import { isHandle, toHandle } from "@/services/handles";
import { HandleTaken } from "@/services/social";
import { registerProfile, useApp } from "@/store/app-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

const PAGE_COUNT = 3;

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  const { C } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    progress.set(reducedMotion ? (done ? 1 : 0) : withSpring(done ? 1 : 0, { damping: 14, stiffness: 280 }));
  }, [done, progress, reducedMotion]);
  return (
    <Animated.View
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, { opacity: done ? 1 : 0.65 }]}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: done ? C.leaf : C.line, backgroundColor: done ? C.leaf : C.bg, alignItems: "center", justifyContent: "center" }}>
        {done && <Icon name="check" size={13} color={C.onLeaf} />}
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 14, color: done ? C.forestInk : C.mute }}>{label}</Text>
    </Animated.View>
  );
}

function CityChooser({ comune, locating, onLocate, onSearch, message }: { comune: Comune | null; locating: boolean; onLocate: () => void; onSearch: () => void; message: string | null }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ gap: 10 }}>
      {!comune && <Button label={locating ? t("comune.locating") : t("onboarding.useLocation")} kind="green" icon="location" disabled={locating} onPress={onLocate} />}
      <Press
        onPress={onSearch}
        accessibilityLabel={comune ? t("comune.change", { name: comune.name }) : t("onboarding.searchComune")}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 14 }}
      >
        <Icon name="search" size={16} color={C.forestInk} />
        <Text style={{ flex: 1, fontFamily: F.medium, color: C.ink }}>{comune ? comuneLabel(comune) : t("onboarding.searchComune")}</Text>
        <Mono color={C.forestInk}>{comune ? t("onboarding.changeComune") : t("onboarding.search")}</Mono>
      </Press>
      {message && <Text style={T.caption}>{message}</Text>}
    </View>
  );
}

export default function Onboarding() {
  const { C, T } = useTheme();
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const pager = useRef<ScrollViewInstance>(null);
  const pagerProgress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const finish = useApp((s) => s.finishOnboarding);
  const comune = useApp((s) => s.comune);
  const setComune = useApp((s) => s.setComune);
  const { t } = useI18n();
  const inner = width - 40;
  const h = handleEdited ? handle : toHandle(name);
  const handleStatus = useHandleStatus(h, isHandle(h));
  const handleOk = isHandle(h) && handleStatus.state !== "taken" && handleStatus.state !== "checking";
  const canStart = name.trim().length > 0 && handleOk && !!comune && !busy;
  const missing = [name.trim().length ? null : t("onboarding.checklistName"), handleOk ? null : t("onboarding.checklistHandle")].filter(
    (item): item is string => !!item,
  );

  const go = (next: number) => {
    haptic.tap();
    pager.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };
  const locate = async () => {
    setLocating(true);
    setLocationMessage(null);
    const found = await comuneNearMe().catch(() => null);
    if (!found) setLocationMessage(t("comune.noLocation"));
    else {
      setComune(found);
      haptic.success();
    }
    setLocating(false);
  };
  const start = async () => {
    if (!canStart) return;
    const profile = { name: name.trim(), handle: h, role: "student" as const, avatarId };
    setBusy(true);
    setError(null);
    try {
      await registerProfile(profile, comune);
      haptic.success();
      finish(profile);
      router.replace("/welcome");
    } catch (e) {
      setError(e instanceof HandleTaken ? t("onboarding.handleTaken", { handle: h }) : t("onboarding.offline"));
    } finally {
      setBusy(false);
    }
  };
  const onScroll = useAnimatedScrollHandler((event) => {
    pagerProgress.value = event.contentOffset.x / width;
  });

  const form = (
    <ScrollView style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 24, gap: 22 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 8 }}>
        <Mono color={C.leaf}>{t("onboarding.last")}</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{t("onboarding.who")}</Text>
      </View>
      <ProfileCard name={name.trim()} handle={h} avatarId={avatarId} comune={comune} />
      <AvatarPicker value={avatarId} onChange={setAvatarId} />
        <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("onboarding.name")}
        placeholderTextColor={C.faint}
        autoCorrect={false}
        style={{ height: 64, borderBottomWidth: 1, borderBottomColor: name ? C.leaf : C.line, fontSize: 30, fontFamily: F.medium, color: C.ink }}
      />
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: h.length > 0 && !isHandle(h) ? C.red : h ? C.leaf : C.line }}>
          <Text style={{ fontFamily: F.monoMedium, fontSize: 17, color: C.mute }}>@</Text>
          <TextInput
            value={h}
            onChangeText={(value) => {
              setHandleEdited(true);
              setHandle(toHandle(value));
            }}
            placeholder={t("onboarding.handle")}
            placeholderTextColor={C.faint}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityHint={t("onboarding.handleHint")}
            accessibilityLabel={t("onboarding.handleA11y")}
            style={{ flex: 1, height: 46, fontSize: 17, fontFamily: F.monoMedium, color: C.ink }}
          />
        </View>
        {handleStatus.state === "checking" && <Text style={T.caption}>{t("onboarding.handleChecking")}</Text>}
        {handleStatus.state === "free" && (
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <Icon name="checkSeal" size={15} color={C.leaf} />
            <Text style={[T.caption, { color: C.leaf }]}>{t("onboarding.handleFree", { handle: h })}</Text>
          </View>
        )}
        {handleStatus.state === "taken" && (
          <View style={{ gap: 8 }}>
            <Text style={[T.caption, { color: C.red }]}>{t("onboarding.handleTakenInline", { handle: h })}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {handleStatus.suggestions.map((suggestion) => (
                <Chip key={suggestion} label={`@${suggestion}`} onPress={() => { setHandle(suggestion); setHandleEdited(true); }} />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const city = (
    <ScrollView style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 24, gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Mono color={C.leaf}>{t("onboarding.cityKicker")}</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>{t("onboarding.cityTitle")}</Text>
        <Text style={T.body}>{t("onboarding.cityBody")}</Text>
      </View>
      <CityChooser comune={comune} locating={locating} onLocate={locate} onSearch={() => router.push("/comune")} message={locationMessage} />
      {comune && <CityLive active={page === 1} />}
    </ScrollView>
  );
  const slides = [
    <ScrollView key="hook" style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 24, gap: 24 }}>
      <ProofDeck width={inner} active={page === 0} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Mono color={C.leaf}>{t("onboarding.kicker1")}</Mono>
          <RotatingWord active={page === 0} words={[t("onboarding.rotate.bike"), t("onboarding.rotate.recycle"), t("onboarding.rotate.plant"), t("onboarding.rotate.refill")]} />
        </View>
        <WordsIn text={t("onboarding.title1")} />
        <Text style={T.body}>{t("onboarding.body1")}</Text>
      </View>
    </ScrollView>,
    city,
    form,
  ];
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <Aurora progress={pagerProgress} />
      <View style={{ paddingTop: top + 10, paddingHorizontal: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Logo size={24} />
          <View style={{ flex: 1 }} />
          <LanguageSwitch compact />
          <Mono style={{ marginLeft: 10 }}>{String(page + 1).padStart(2, "0")} / 03</Mono>
        </View>
        <OnboardingProgress count={PAGE_COUNT} page={page} progress={pagerProgress} onPress={go} stepLabel={(i) => t("onboarding.progressA11y", { n: i + 1, total: PAGE_COUNT })} segmentLabel={(i) => t("onboarding.progressGo", { n: i + 1 })} />
      </View>
      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        {slides.map((slide, index) => <Animated.View key={index} entering={reducedMotion ? undefined : FadeIn.delay(60)}>{slide}</Animated.View>)}
      </Animated.ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: bottom + 12, paddingTop: 8, gap: 10 }}>
        {page === 2 && error && <Text style={[T.caption, { color: C.red, textAlign: "center" }]}>{error}</Text>}
        {page === 0 && <Button sheen label={t("onboarding.letsGo")} onPress={() => go(1)} />}
        {page === 1 && <Button sheen label={t("onboarding.next")} disabled={!comune} onPress={() => go(2)} />}
        {page === 2 && (
          <>
            <View style={{ gap: 8 }}>
              <ChecklistItem label={t("onboarding.checklistName")} done={name.trim().length > 0} />
              <ChecklistItem label={t("onboarding.checklistHandle")} done={handleOk} />
            </View>
            <HoldToPlant canStart={canStart} busy={busy} accessibilityLabel={missing.length ? t("onboarding.checklistMissing", { items: missing.join(", ") }) : t("onboarding.holdToPlant")} holdLabel={t("onboarding.holdToPlant")} busyLabel={t("onboarding.joiningNow")} onComplete={start} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
