import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { LanguageSwitch } from "@/components/language-switch";
import { Aurora } from "@/components/onboarding/aurora";
import { CityFlip } from "@/components/onboarding/city-flip";
import { GoalsGrid } from "@/components/onboarding/goals-grid";
import { HoldToPlant } from "@/components/onboarding/hold-to-plant";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { AvatarPicker, ProfileCard } from "@/components/onboarding/profile-card";
import { ProofDeck } from "@/components/onboarding/proof-deck";
import { RaceTap } from "@/components/onboarding/race-tap";
import { RotatingWord } from "@/components/onboarding/rotating-word";
import { WordsIn } from "@/components/onboarding/words-in";
import { Button, Chip, Logo, Mono, Press } from "@/components/ui";
import type { Role } from "@/data/types";
import type { AvatarId } from "@/data/avatars";
import type { MessageKey } from "@/i18n/catalog";
import { useHandleStatus } from "@/hooks/use-handle-status";
import { useI18n } from "@/i18n/use-i18n";
import { comuneLabel, comuneNearMe } from "@/services/comuni";
import { isHandle, toHandle } from "@/services/handles";
import { HandleTaken } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { registerProfile, useApp } from "@/store/app-store";
import { C, F, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const ROLES: { value: Role; icon: IconName; label: MessageKey; hint: MessageKey }[] = [
  { value: "student", icon: "school", label: "roles.student", hint: "roles.studentHint" },
  { value: "teacher", icon: "doc", label: "roles.teacher", hint: "roles.teacherHint" },
  { value: "association", icon: "people", label: "roles.association", hint: "roles.associationHint" },
  { value: "comune", icon: "building", label: "roles.comune", hint: "roles.comuneHint" },
];

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    progress.set(reducedMotion ? (done ? 1 : 0) : withSpring(done ? 1 : 0, { damping: 14, stiffness: 280 }));
  }, [done, progress, reducedMotion]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 + progress.value * 0.45, transform: [{ scale: 0.9 + progress.value * 0.1 }] }));
  return (
    <Animated.View
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: done ? C.leaf : C.line, backgroundColor: done ? C.leaf : C.bg, alignItems: "center", justifyContent: "center" }}>
        {done && <Icon name="check" size={13} color={C.white} />}
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 14, color: done ? C.forest : C.mute }}>{label}</Text>
    </Animated.View>
  );
}

export default function Onboarding() {
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
  const [role, setRole] = useState<Role>("student");
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
  const invalid = h.length > 0 && !isHandle(h);
  const canStart = name.trim().length > 0 && handleOk && !!comune && !busy;
  const missing = [
    name.trim().length ? null : t("onboarding.checklistName"),
    handleOk ? null : t("onboarding.checklistHandle"),
    comune ? null : t("onboarding.checklistComune"),
  ].filter((item): item is string => !!item);

  const locateComune = async () => {
    setLocating(true);
    setLocationMessage(null);
    const found = await comuneNearMe().catch(() => null);
    if (!found) {
      setLocationMessage(t("comune.noLocation"));
    } else {
      setComune(found);
      haptic.success();
    }
    setLocating(false);
  };

  const go = (i: number) => {
    haptic.tap();
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const start = async () => {
    if (!canStart) return;
    const profile = { name: name.trim(), handle: h, role, avatarId };
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

  const slides = [
    {
      kicker: t("onboarding.kicker1"),
      title: t("onboarding.title1"),
      body: t("onboarding.body1"),
      visual: <ProofDeck width={inner} active={page === 0} />,
    },
    {
      kicker: t("onboarding.kicker2"),
      title: t("onboarding.title2"),
      body: t("onboarding.body2"),
      visual: <CityFlip active={page === 1} />,
    },
    {
      kicker: t("onboarding.kicker3"),
      title: t("onboarding.title3"),
      body: t("onboarding.body3"),
      visual: <RaceTap active={page === 2} />,
    },
    {
      kicker: t("onboarding.kicker4"),
      title: t("onboarding.title4"),
      body: t("onboarding.body4"),
      visual: <GoalsGrid active={page === 3} width={inner} />,
    },
  ];
  const last = slides.length;
  const onPagerScroll = useAnimatedScrollHandler((event) => {
    pagerProgress.value = event.contentOffset.x / width;
  });

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <Aurora progress={pagerProgress} />
      <View style={{ paddingTop: top + 10, paddingHorizontal: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Logo size={24} />
          <View style={{ flexGrow: 1 }} />
          <LanguageSwitch compact />
          {page < last ? (
            <Pressable onPress={() => go(last)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.skip")}>
              <Mono color={C.ink}>{t("common.skip")}</Mono>
            </Pressable>
          ) : (
            <Mono>
              {String(page + 1).padStart(2, "0")} / {String(last + 1).padStart(2, "0")}
            </Mono>
          )}
        </View>
        <OnboardingProgress
          count={last + 1}
          page={page}
          progress={pagerProgress}
          onPress={go}
          stepLabel={(index) => t("onboarding.progressA11y", { n: index + 1, total: last + 1 })}
          segmentLabel={(index) => t("onboarding.progressGo", { n: index + 1 })}
        />
      </View>

      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onPagerScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyboardShouldPersistTaps="handled"
      >
        {slides.map((s, i) => (
          <ScrollView key={i} style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 24, gap: 26 }} showsVerticalScrollIndicator={false}>
            <Animated.View entering={reducedMotion ? undefined : FadeIn.delay(80)}>{s.visual}</Animated.View>
            <View style={{ gap: 12, paddingTop: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Mono color={C.leaf}>{s.kicker}</Mono>
                {i === 0 && (
                  <RotatingWord
                    active={page === 0}
                    words={[t("onboarding.rotate.bike"), t("onboarding.rotate.recycle"), t("onboarding.rotate.plant"), t("onboarding.rotate.refill")]}
                  />
                )}
              </View>
              <WordsIn text={s.title} />
              <Text style={[T.body, { fontSize: 17, lineHeight: 25, color: C.ink2 }]}>{s.body}</Text>
            </View>
          </ScrollView>
        ))}

        <ScrollView style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 28, gap: 30 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 10 }}>
            <Mono color={C.leaf}>{t("onboarding.last")}</Mono>
            <Text style={[T.hero, { fontSize: 42, lineHeight: 43 }]}>{t("onboarding.who")}</Text>
          </View>

          <ProfileCard
            name={name.trim()}
            handle={h}
            role={role}
            roleLabel={t(ROLES.find((r) => r.value === role)?.label ?? "roles.student")}
            avatarId={avatarId}
            comune={comune}
          />
          <AvatarPicker value={avatarId} onChange={setAvatarId} />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("onboarding.name")}
            placeholderTextColor={C.faint}
            autoCorrect={false}
            returnKeyType="done"
            style={{
              height: 64,
              borderBottomWidth: 1,
              borderBottomColor: name ? C.leaf : C.line,
              fontSize: 30,
              fontFamily: F.medium,
              letterSpacing: -1.1,
              color: C.ink,
            }}
          />

          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderBottomWidth: 1,
                borderBottomColor: invalid ? C.red : h ? C.leaf : C.line,
              }}
            >
              <Text style={{ fontFamily: F.monoMedium, fontSize: 17, color: C.mute }}>@</Text>
              <TextInput
                value={h}
                onChangeText={(v) => {
                  setHandleEdited(true);
                  setHandle(toHandle(v));
                }}
                placeholder={t("onboarding.handle")}
                placeholderTextColor={C.faint}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t("onboarding.handleA11y")}
                style={{ flex: 1, height: 46, fontSize: 17, fontFamily: F.monoMedium, color: C.ink }}
              />
            </View>
            {handleStatus.state === "checking" && <Text style={T.caption}>{t("onboarding.handleChecking")}</Text>}
            {handleStatus.state === "free" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Icon name="checkSeal" size={15} color={C.leaf} />
                <Text style={[T.caption, { color: C.leaf }]}>{t("onboarding.handleFree", { handle: h })}</Text>
              </View>
            )}
            {handleStatus.state === "taken" && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="close" size={15} color={C.red} />
                  <Text style={[T.caption, { color: C.red }]}>{t("onboarding.handleTakenInline", { handle: h })}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {handleStatus.suggestions.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={`@${suggestion}`}
                      onPress={() => {
                        setHandle(suggestion);
                        setHandleEdited(true);
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
            <Text style={T.caption}>{t("onboarding.handleHint")}</Text>
          </View>

          <View style={{ gap: 12 }}>
            <Mono color={C.forest}>{t("onboarding.joining")}</Mono>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {ROLES.map((r) => (
                <Chip key={r.value} label={t(r.label)} icon={r.icon} active={role === r.value} onPress={() => setRole(r.value)} />
              ))}
            </View>
            <Text style={T.caption}>{t("onboarding.explanations", { hint: t(ROLES.find((r) => r.value === role)?.hint ?? "roles.studentHint") })}</Text>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
            <Button label={locating ? t("comune.locating") : t("onboarding.useLocation")} kind="ghost" icon="location" disabled={locating} onPress={locateComune} style={{ alignSelf: "flex-start", marginTop: 12 }} />
            {locationMessage && <Text style={[T.caption, { paddingBottom: 8 }]}>{locationMessage}</Text>}
            <Press
              scale={0.99}
              onPress={() => router.push("/comune")}
              accessibilityLabel={comune ? t("comune.change", { name: comune.name }) : t("onboarding.chooseA11y")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.line,
              }}
            >
              <Icon name="location" size={17} color={C.leaf} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.2 }}>{comune ? comuneLabel(comune) : t("comune.yourTitle")}</Text>
                <Text style={{ fontFamily: F.regular, color: C.mute, fontSize: 13 }}>{comune ? t("onboarding.comuneSet") : t("onboarding.comunePick")}</Text>
              </View>
              {comune ? <Icon name="checkSeal" size={20} color={C.leaf} /> : <Mono color={C.ink}>{t("onboarding.choose")}</Mono>}
            </Press>
          </View>
          {!hasBackend && <Text style={T.caption}>{t("onboarding.offlineProto")}</Text>}
        </ScrollView>
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: bottom + 12, paddingTop: 8, gap: 10 }}>
        {page === last && error && <Text style={[T.caption, { color: C.red, textAlign: "center" }]}>{error}</Text>}
        {page < last ? (
          <Button sheen label={page === 0 ? t("onboarding.letsGo") : t("common.next")} onPress={() => go(page + 1)} />
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <ChecklistItem label={t("onboarding.checklistName")} done={name.trim().length > 0} />
              <ChecklistItem label={t("onboarding.checklistHandle")} done={handleOk} />
              <ChecklistItem label={t("onboarding.checklistComune")} done={!!comune} />
            </View>
            <HoldToPlant
              canStart={canStart}
              busy={busy}
              accessibilityLabel={missing.length ? t("onboarding.checklistMissing", { items: missing.join(", ") }) : t("onboarding.holdToPlant")}
              holdLabel={t("onboarding.holdToPlant")}
              busyLabel={t("onboarding.joiningNow")}
              onComplete={start}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
