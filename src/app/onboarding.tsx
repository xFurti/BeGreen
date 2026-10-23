import { Camera } from "expo-camera";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse } from "react-native-svg";

import { Icon } from "@/components/icon";
import { LanguageSwitch } from "@/components/language-switch";
import { Blobs, LeafBurst } from "@/components/nature";
import { HANDLE, HandleStep, toHandle } from "@/components/onboarding/handle-step";
import { PlaceStep } from "@/components/onboarding/place-step";
import { RoleStep, SeedCard } from "@/components/onboarding/seed-card";
import { SoilStep } from "@/components/onboarding/soil-step";
import { SeedBuddy } from "@/components/seed-buddy";
import { Bubble, FloatingLeaves, HoldButton, SeedPicker } from "@/components/seed-ui";
import { Button, Logo, Mono, Press } from "@/components/ui";
import { SEED_IDS, type Mood, type SeedId } from "@/data/seeds";
import type { Comune, Role } from "@/data/types";
import { useI18n } from "@/i18n/use-i18n";
import { countPlanted, HandleTaken } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { registerProfile, useApp } from "@/store/app-store";
import { F, R, seedArt } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// «Pianta il tuo seme» (issue #13). Your seed asks one thing at a time: where to plant it, shows
// the live ground of your Comune and today's challenge, learns who you are, then you hold to plant.
// After planting: a welcome, why the camera is needed, and the first proof.

const STEPS = ["hello", "place", "soil", "name", "handle", "role", "species", "card"] as const;
type Step = (typeof STEPS)[number] | "welcome" | "camera";

function Progress({ index }: { index: number }) {
  const { C } = useTheme();
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("seed.ob.step", { n: index + 1, total: STEPS.length })}
      accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}
      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}
    >
      {STEPS.map((s, i) => (
        <Animated.View
          key={s}
          layout={LinearTransition.springify().damping(18)}
          style={{ flex: i === index ? 2.4 : 1, height: 6, borderRadius: 3, backgroundColor: i <= index ? C.leaf : C.band, opacity: i <= index ? 1 : 0.6 }}
        />
      ))}
    </View>
  );
}

// The welcome: the seed sinks into a mound of soil and leaves fly out.
function Planted({ seed, size, burst }: { seed: SeedId; size: number; burst: number }) {
  const reduced = useReducedMotion();
  const sink = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) sink.set(withSpring(1, { damping: 12, stiffness: 90 }));
  }, [sink, reduced]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value * size * 0.18 - (1 - sink.value) * size * 0.4 }] }));
  return (
    <View style={{ width: size, height: size * 1.05, alignItems: "center" }}>
      <Animated.View style={a}>
        <SeedBuddy seed={seed} stage={0} mood="wow" size={size} animated />
      </Animated.View>
      <Svg width={size * 1.3} height={size * 0.34} viewBox="0 0 130 34" style={{ position: "absolute", bottom: -size * 0.02 }}>
        <Ellipse cx={65} cy={26} rx={64} ry={14} fill={seedArt.soil} />
        <Ellipse cx={65} cy={20} rx={52} ry={10} fill={seedArt.soilTop} />
      </Svg>
      {!reduced && <LeafBurst id={burst} count={12} />}
    </View>
  );
}

export default function Onboarding() {
  const { C, T } = useTheme();
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useI18n();
  const comune = useApp((s) => s.comune);
  const setComune = useApp((s) => s.setComune);
  const finish = useApp((s) => s.finishOnboarding);

  const [step, setStep] = useState<Step>("hello");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [seed, setSeed] = useState<SeedId>(SEED_IDS[0]);
  const [soil, setSoil] = useState<{ mood: Mood; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planted, setPlanted] = useState<number | null>(null);
  const [hop, setHop] = useState(0);
  const [burst, setBurst] = useState(0);

  const index = STEPS.indexOf(step as (typeof STEPS)[number]);
  const buddy = Math.min(step === "welcome" ? 210 : 150, width * (step === "welcome" ? 0.52 : 0.38));
  const place = comune?.name ?? "";

  const go = useCallback((next: Step) => {
    haptic.tap();
    setHop((h) => h + 1);
    setStep(next);
  }, []);

  const back = () => {
    if (index <= 0) return;
    setError(null);
    go(STEPS[index - 1]);
  };

  const onSoil = useCallback((mood: Mood, text: string) => setSoil({ mood, text }), []);

  const pickComune = (c: Comune) => {
    setComune(c);
    setSoil(null);
    setHop((h) => h + 1);
  };

  const plant = async () => {
    if (!comune || busy) return;
    const profile = { name: name.trim(), handle, role: role ?? "student", seed };
    setBusy(true);
    setError(null);
    try {
      await registerProfile(profile, comune);
      finish(profile);
      setBurst((b) => b + 1);
      setStep("welcome");
      if (hasBackend) countPlanted(comune.id).then(setPlanted, () => undefined);
    } catch (e) {
      if (e instanceof HandleTaken) {
        setError(t("seed.ob.handleTaken", { handle }));
        setStep("handle");
      } else setError(t("seed.ob.offline"));
    } finally {
      setBusy(false);
    }
  };

  // The welcome moves on by itself; a tap is quicker.
  useEffect(() => {
    if (step !== "welcome") return;
    const id = setTimeout(() => setStep("camera"), 2800);
    return () => clearTimeout(id);
  }, [step]);

  const firstProof = async () => {
    haptic.success();
    try {
      if (process.env.EXPO_OS !== "web") await Camera.requestCameraPermissionsAsync();
    } catch (e) {
      if (__DEV__) console.warn(e);
    }
    router.replace("/");
    setTimeout(() => router.push("/capture"), 80);
  };

  const mood: Mood =
    error ? "wow" : step === "soil" ? (soil?.mood ?? "happy") : step === "species" || step === "welcome" ? "wow" : "happy";

  const say: Record<Step, string> = {
    hello: t("seed.ob.hello"),
    place: comune ? t("seed.ob.planted", { place }) : t("seed.ob.whereQ"),
    soil: soil?.text ?? t("seed.ob.soilQ", { place }),
    name: t("seed.ob.nameQ"),
    handle: error ?? t("seed.ob.handleQ", { name: name.trim().split(" ")[0] }),
    role: t("seed.ob.roleQ"),
    species: t("seed.ob.speciesQ"),
    card: error ?? t("seed.ob.cardQ"),
    welcome: planted ? t("seed.ob.welcome", { handle, n: planted, place }) : t("seed.ob.welcomeNoNumber", { handle, place }),
    camera: t("seed.ob.cameraQ"),
  };
  const sub: Partial<Record<Step, string>> = {
    hello: t("seed.ob.helloBody"),
    place: comune ? undefined : t("seed.ob.whereBody"),
    role: t("seed.ob.roleSub"),
    species: t("seed.ob.speciesSub"),
    camera: t("seed.ob.cameraWhy"),
  };

  const nameDone = () => {
    if (!handleEdited) setHandle(toHandle(name));
    go("handle");
  };

  const answer = (() => {
    switch (step) {
      case "hello":
        return <Button label={t("seed.ob.helloGo")} kind="green" icon="seed" onPress={() => go("place")} />;
      case "place":
        return <PlaceStep comune={comune} onPick={pickComune} onNext={() => go("soil")} />;
      case "soil":
        return (
          <View style={{ gap: 12 }}>
            <SoilStep key={comune?.id} onMood={onSoil} onNext={() => go("name")} />
            <Press onPress={() => go("name")} accessibilityLabel={t("common.skip")} style={{ alignSelf: "center", padding: 6 }}>
              <Mono color={C.mute}>{t("common.skip")}</Mono>
            </Press>
          </View>
        );
      case "name":
        return (
          <View style={{ gap: 16 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder={t("onboarding.name")}
              placeholderTextColor={C.faint}
              accessibilityLabel={t("onboarding.name")}
              autoCorrect={false}
              autoCapitalize="words"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => name.trim() && nameDone()}
              style={{ height: 64, borderBottomWidth: 2, borderBottomColor: name.trim() ? C.leaf : C.line, fontSize: 30, fontFamily: F.medium, letterSpacing: -1.1, color: C.ink }}
            />
            <Button label={t("seed.ob.nameNext")} kind="green" icon="check" disabled={!name.trim()} onPress={nameDone} />
          </View>
        );
      case "handle":
        return (
          <HandleStep
            name={name}
            handle={handle}
            onChange={(h) => {
              setError(null);
              setHandleEdited(true);
              setHandle(h);
            }}
            onNext={() => {
              setError(null);
              go("role");
            }}
          />
        );
      case "role":
        return (
          <RoleStep
            value={role}
            onPick={(r) => {
              setRole(r);
              setHop((h) => h + 1);
              setTimeout(() => go("species"), 380);
            }}
          />
        );
      case "species":
        return (
          <View style={{ gap: 16 }}>
            <SeedPicker
              stage={4}
              value={seed}
              onChange={(s) => {
                setSeed(s);
                setHop((h) => h + 1);
              }}
            />
            <Text style={[T.caption, { textAlign: "center" }]}>{t(`seed.speciesHint.${seed}`)}</Text>
            <Button label={t("seed.ob.speciesNext")} kind="green" icon="check" onPress={() => go("card")} />
          </View>
        );
      case "card":
        return (
          <View style={{ gap: 16 }}>
            <SeedCard name={name.trim()} handle={handle} role={role ?? "student"} place={place} seed={seed} />
            <HoldButton
              label={t("seed.ob.hold")}
              a11yLabel={t("seed.ob.holdA11y")}
              busy={busy}
              busyLabel={t("seed.ob.planting")}
              disabled={!comune || !name.trim() || !HANDLE.test(handle)}
              onComplete={plant}
            />
            {!hasBackend && <Text style={[T.caption, { textAlign: "center" }]}>{t("onboarding.offlineProto")}</Text>}
          </View>
        );
      case "welcome":
        return <Mono style={{ textAlign: "center" }}>{t("seed.ob.welcomeTap")}</Mono>;
      case "camera":
        return (
          <View style={{ gap: 10 }}>
            <Button label={t("seed.ob.firstProof")} kind="green" icon="camera" onPress={firstProof} />
            <Button label={t("seed.ob.later")} kind="ghost" onPress={() => router.replace("/")} />
          </View>
        );
    }
  })();

  const content = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottom + 20, gap: 18 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", paddingTop: step === "welcome" ? 40 : 4 }}>
        {step === "welcome" ? (
          <Planted seed={seed} size={buddy} burst={burst} />
        ) : (
          <SeedBuddy seed={seed} stage={0} mood={mood} size={buddy} animated hop={hop} />
        )}
      </View>
      <Bubble key={`${step}:${say[step]}`} text={say[step]} tone={step === "welcome" ? "dark" : "light"} />
      {sub[step] && (
        <Animated.Text key={`sub:${step}`} entering={FadeIn.delay(350)} style={[T.body, { fontSize: 16, lineHeight: 23, color: C.ink2, textAlign: "center" }]}>
          {sub[step]}
        </Animated.Text>
      )}
      <Animated.View key={`answer:${step}`} entering={FadeInDown.delay(250).springify().damping(18)} style={{ gap: 12, paddingTop: 4 }}>
        {answer}
      </Animated.View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ position: "absolute", inset: 0, overflow: "hidden" } as never} pointerEvents="none">
        <Blobs colors={[C.mint2, C.mint]} opacity={0.9} size={width * 0.9} />
        <FloatingLeaves />
      </View>
      <View style={{ paddingTop: top + 10, paddingHorizontal: 20, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 12 }}>
        {index > 0 ? (
          <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("seed.ob.back")} style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.card }}>
            <Icon name="back" size={18} color={C.ink} />
          </Pressable>
        ) : (
          <Logo size={24} />
        )}
        {index >= 0 ? <Progress index={index} /> : <View style={{ flex: 1 }} />}
        <LanguageSwitch compact />
      </View>
      {step === "welcome" ? (
        <Pressable style={{ flex: 1 }} onPress={() => setStep("camera")} accessibilityRole="button" accessibilityLabel={`${say.welcome} ${t("seed.ob.welcomeTap")}`}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
}
