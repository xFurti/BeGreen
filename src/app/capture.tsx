import * as Device from "expo-device";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { Blobs, LeafMark, LeafSwitch } from "@/components/nature";
import { ProofMedia } from "@/components/proof-media";
import { Button, Chip, IconButton, Mono, Press, SdgTags, Segmented, useCountUp } from "@/components/ui";
import { ACTION_LIST, ACTIONS, type ActionId } from "@/data/actions";
import { DEMO_BY_ACTION } from "@/data/seed";
import type { Audience, Media } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { persistMedia } from "@/services/media";
import { leagueOf, postedToday, sdgsOf, streakOf, useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

type Step = "snap" | "proof" | "review" | "done";
const PROOF_SECONDS = 5;
const MIN_PROOF = 2;

const ACircle = Animated.createAnimatedComponent(Circle);

function RecordRing({ progress, size = 88 }: { progress: SharedValue<number>; size?: number }) {
  const r = size / 2 - 3;
  const len = 2 * Math.PI * r;
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - progress.value) }));
  return (
    <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={4} fill="none" />
      <ACircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={C.lime}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        animatedProps={props}
      />
    </Svg>
  );
}

function Steps({ step }: { step: Step }) {
  const items = [
    { k: "snap", n: "01", label: "Snap" },
    { k: "proof", n: "02", label: "Prove" },
  ];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {items.map((it, i) => {
        const on = step === it.k;
        const done = it.k === "snap" && step !== "snap";
        return (
          <View key={it.k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {i > 0 && <View style={{ width: 18, height: 1, backgroundColor: C.nightLine }} />}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {done ? (
                <Icon name="check" size={11} color={C.lime} />
              ) : (
                <Mono color={on ? C.white : C.nightMute}>{it.n}</Mono>
              )}
              <Text style={{ fontFamily: F.medium, fontSize: 14, color: on || done ? C.white : C.nightMute }}>{it.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Celebration ----------

function Burst() {
  const bits = Array.from({ length: 22 });
  return (
    <View pointerEvents="none" style={{ position: "absolute", width: 1, height: 1, alignSelf: "center", top: "34%" }}>
      {bits.map((_, i) => (
        <Bit key={i} i={i} angle={(i / bits.length) * Math.PI * 2 + (i % 2) * 0.2} />
      ))}
    </View>
  );
}

function Bit({ angle, i }: { angle: number; i: number }) {
  const t = useSharedValue(0);
  const dist = 120 + (i % 4) * 45;
  const size = 6 + (i % 3) * 4;
  useEffect(() => {
    t.set(withDelay((i % 5) * 18, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [t, i]);
  const s = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      { translateY: Math.sin(angle) * dist * t.value + 60 * t.value * t.value },
      { rotate: `${t.value * 180}deg` },
    ],
  }));
  // Confetti made of leaves, in the three greens and white.
  return (
    <Animated.View style={[{ position: "absolute" }, s]}>
      <LeafMark size={size + 6} color={[C.lime, C.leaf, C.white, C.mint2][i % 4]} vein="transparent" />
    </Animated.View>
  );
}

type Result = {
  seeds: number;
  streak: number;
  unlocked: boolean;
  isDrop: boolean;
  action: ActionId;
  rankBefore: number;
  rankAfter: number;
  passed: string[];
  next?: { name: string; gap: number };
  newGoals: number[];
};

function Row({ icon, title, sub, right, delay }: { icon: IconName; title: string; sub?: string; right?: string; delay: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.forestLine }}
    >
      <Icon name={icon} size={17} color={C.lime} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.white }}>{title}</Text>
        {sub && <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.forestMute }}>{sub}</Text>}
      </View>
      {right && <Mono color={C.lime}>{right}</Mono>}
    </Animated.View>
  );
}

function Done(r: Result) {
  const { top, bottom } = useSafeAreaInsets();
  const n = useCountUp(r.seeds, 900);
  const a = ACTIONS[r.action];
  const scale = useSharedValue(0.6);
  useEffect(() => {
    haptic.success();
    scale.set(withSpring(1, { damping: 9, stiffness: 140 }));
  }, [scale]);
  const big = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const climbed = r.rankBefore - r.rankAfter;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{ flex: 1, backgroundColor: C.forest, paddingTop: top + 16, paddingBottom: bottom + 12, paddingHorizontal: 22, overflow: "hidden" }}
    >
      <Blobs colors={[C.leaf, C.lime]} opacity={0.2} size={360} />
      <Burst />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Mono color={C.white} style={{ flex: 1 }}>
          {r.isDrop ? "Drop complete" : "You BeGreen’d"}
        </Mono>
        <SdgTags goals={a.sdgs} dark />
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Animated.Text style={[T.mega, { color: C.lime, fontSize: 128, lineHeight: 128, fontVariant: ["tabular-nums"] }, big]}>
          +{n}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(300)} style={{ fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.white }}>
          seeds{r.isDrop ? ", Drop bonus included." : "."}
        </Animated.Text>
      </View>

      <View>
        <Row icon="flame" title={`${r.streak}-day streak`} sub={r.streak > 1 ? "Don’t break the chain." : "Day one. Everyone starts here."} right="+1" delay={250} />
        <Row
          icon="league"
          title={`#${r.rankAfter} this week`}
          sub={
            r.passed.length
              ? `You passed ${r.passed.slice(0, 2).join(" & ")}${r.passed.length > 2 ? ` +${r.passed.length - 2}` : ""}.`
              : r.next
                ? `${r.next.gap} more to pass ${r.next.name}.`
                : "Top of the week. Defend it."
          }
          right={climbed > 0 ? `↑${climbed}` : "—"}
          delay={380}
        />
        {r.newGoals.length > 0 && (
          <Row icon="globe" title={`New on your Agenda 2030`} sub={r.newGoals.map((g) => `SDG ${g}`).join(" · ")} delay={510} />
        )}
        {r.unlocked && <Row icon="lock" title="Today’s feed unlocked" sub="Go see what your friends did." delay={640} />}
      </View>

      <View style={{ flexDirection: "row", gap: 10, paddingTop: 16 }}>
        <Button
          label="Share"
          icon="share"
          kind="glass"
          onPress={() => Share.share({ message: `I just BeGreen’d: ${a.verb}. Proof or it didn’t happen. 🌱 #BeGreen` })}
        />
        <Button label="See the feed" kind="inverse" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
}

// ---------- Screen ----------

export default function Capture() {
  const params = useLocalSearchParams<{ action?: ActionId }>();
  const { top, bottom } = useSafeAreaInsets();
  const { drop, pulse } = usePulse();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const realCamera = Device.isDevice && process.env.EXPO_OS !== "web";

  const [step, setStep] = useState<Step>("snap");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const [photo, setPhoto] = useState<Media | null>(null);
  const [proof, setProof] = useState<Media | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [ready, setReady] = useState(false);
  const recStart = useRef(0);
  const progress = useSharedValue(0);
  const shutter = useSharedValue(1);

  const [picked, setPicked] = useState<ActionId | undefined>(params.action);
  const action: ActionId = picked ?? drop.action;
  // The suggested act leads the chip row, so it's visible without scrolling.
  const [order] = useState(() => [ACTIONS[action], ...ACTION_LIST.filter((x) => x.id !== action)]);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<Audience>("friends");
  const [shareSpot, setShareSpot] = useState(true);
  const squads = useApp((s) => s.squads);
  const [squadId, setSquadId] = useState<string | undefined>(squads[0]?.id);
  const addPost = useApp((s) => s.addPost);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (realCamera && perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [perm, realCamera, requestPerm]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSecs(Math.min(PROOF_SECONDS, Math.floor((Date.now() - recStart.current) / 1000))), 200);
    return () => clearInterval(id);
  }, [recording]);

  const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shutter.value }] }));
  const bump = () => {
    shutter.set(withSequence(withTiming(0.86, { duration: 80 }), withSpring(1)));
  };

  // ----- capture handlers -----

  const takePhoto = async () => {
    bump();
    haptic.thud();
    const p = await cam.current?.takePictureAsync({ quality: 0.8 });
    if (p?.uri) {
      setPhoto(p.uri);
      setStep("proof");
    }
  };

  const startProof = async () => {
    if (!cam.current) return;
    haptic.thud();
    setSecs(0);
    setRecording(true);
    recStart.current = Date.now();
    progress.set(0);
    progress.set(withTiming(1, { duration: PROOF_SECONDS * 1000, easing: Easing.linear }));
    try {
      const v = await cam.current.recordAsync({ maxDuration: PROOF_SECONDS });
      if (v?.uri) {
        setProof(v.uri);
        haptic.success();
        setStep("review");
      }
    } finally {
      setRecording(false);
      progress.set(0);
    }
  };

  const stopProof = () => {
    if (Date.now() - recStart.current < MIN_PROOF * 1000) return;
    cam.current?.stopRecording();
  };

  const pick = async (kind: "images" | "videos") => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [kind], quality: 0.8, videoMaxDuration: PROOF_SECONDS });
    const uri = r.assets?.[0]?.uri;
    if (!uri) return;
    if (kind === "images") {
      setPhoto(uri);
      setStep("proof");
    } else {
      setProof(uri);
      setStep("review");
    }
  };

  const applyDemo = () => {
    bump();
    haptic.thud();
    const demo = DEMO_BY_ACTION[action];
    if (step === "snap") {
      setPhoto(demo.photo);
      setStep("proof");
    } else {
      setProof(demo.clip);
      setStep("review");
    }
  };

  const post = () => {
    if (!photo || !proof) return;
    const s = useApp.getState();
    const before = s.myPosts;
    const name = s.profile.name;
    const wasUnlocked = postedToday(before);
    const goalsBefore = sdgsOf(before);
    const leagueBefore = leagueOf(before, name);
    const isDrop =
      action === drop.action && !before.some((p) => p.isDrop && new Date(p.createdAt).toDateString() === new Date().toDateString());
    addPost({
      action,
      photo: typeof photo === "string" ? persistMedia(photo) : photo,
      proof: typeof proof === "string" ? persistMedia(proof) : proof,
      caption: caption.trim(),
      audience,
      place: shareSpot ? pulse.place.name : "Somewhere green",
      isDrop,
      squadId: audience === "squad" ? squadId : undefined,
    });
    const after = useApp.getState().myPosts;
    const leagueAfter = leagueOf(after, name);
    const rankBefore = leagueBefore.findIndex((r) => r.me) + 1;
    const rankAfter = leagueAfter.findIndex((r) => r.me) + 1;
    setResult({
      seeds: ACTIONS[action].seeds + (isDrop ? 10 : 0),
      streak: streakOf(after),
      unlocked: !wasUnlocked,
      isDrop,
      action,
      rankBefore,
      rankAfter,
      passed: leagueAfter.slice(rankAfter, rankBefore).map((r) => r.name),
      next: rankAfter > 1 ? { name: leagueAfter[rankAfter - 2].name, gap: leagueAfter[rankAfter - 2].points - leagueAfter[rankAfter - 1].points } : undefined,
      newGoals: ACTIONS[action].sdgs.filter((g) => !goalsBefore.has(g)),
    });
    setStep("done");
  };

  // ----- render -----

  if (step === "done" && result) return <Done {...result} />;

  if (step === "review" && photo && proof) {
    const a = ACTIONS[action];
    const isDropAct = action === drop.action;
    return (
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            paddingTop: top + 6,
            paddingHorizontal: 16,
            paddingBottom: 6,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            icon="back"
            label="Retake"
            onPress={() => {
              setProof(null);
              setStep("proof");
            }}
          />
          <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3 }}>Your BeGreen</Text>
          <IconButton icon="close" label="Discard" onPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 26, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={ZoomIn.springify().damping(15)} style={{ paddingHorizontal: 44, paddingTop: 6, transform: [{ rotate: "-1.5deg" }] }}>
            <View style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.16)", borderRadius: R.lg }}>
              <ProofMedia photo={photo} proof={proof} active />
            </View>
          </Animated.View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Mono color={C.ink} style={{ flex: 1 }}>
                What did you do?
              </Mono>
              <Press onPress={() => router.push({ pathname: "/guide", params: { action, from: "capture" } })} accessibilityLabel="How to">
                <Mono color={C.mute}>How to →</Mono>
              </Press>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -16 }}>
              <View style={{ width: 10 }} />
              {order.map((x) => (
                <Chip key={x.id} label={x.label} icon={x.icon} active={x.id === action} onPress={() => setPicked(x.id)} />
              ))}
              <View style={{ width: 10 }} />
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <SdgTags goals={a.sdgs} />
              {isDropAct && (
                <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="bolt" size={11} color={C.ink} />
                  <Mono color={C.ink}>Today’s Drop +10</Mono>
                </Animated.View>
              )}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row" }}>
              <Mono color={C.ink} style={{ flex: 1 }}>
                Caption
              </Mono>
              <Mono>{caption.length}/180</Mono>
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={`Today I ${a.verb}…`}
              placeholderTextColor={C.faint}
              multiline
              maxLength={180}
              style={{
                minHeight: 64,
                borderRadius: R.md,
                backgroundColor: C.card,
                padding: 16,
                paddingTop: 15,
                fontSize: 16,
                fontFamily: F.regular,
                color: C.ink,
              }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -16 }}>
              <View style={{ width: 10 }} />
              {a.captions.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    haptic.tap();
                    setCaption(c);
                  }}
                  accessibilityRole="button"
                  style={{ paddingHorizontal: 12, height: 32, justifyContent: "center", borderRadius: R.pill, borderWidth: 1, borderColor: C.line }}
                >
                  <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.ink2 }}>“{c}”</Text>
                </Pressable>
              ))}
              <View style={{ width: 10 }} />
            </ScrollView>
          </View>

          <View style={{ gap: 12 }}>
            <Mono color={C.ink}>Who sees it</Mono>
            <Segmented<Audience>
              value={audience}
              onChange={setAudience}
              options={[
                { value: "friends", label: "Friends" },
                { value: "squad", label: "Squad" },
                { value: "public", label: "Everyone" },
              ]}
            />
            {audience === "squad" && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {squads.map((s) => (
                  <Chip key={s.id} label={s.name} active={s.id === squadId} onPress={() => setSquadId(s.id)} />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16 }}>
            <Icon name="location" size={16} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 15 }}>Show area · {pulse.place.name}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>Neighbourhood only. Never your exact spot.</Text>
            </View>
            <LeafSwitch value={shareSpot} onValueChange={setShareSpot} label="Show my area" />
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingBottom: bottom + 10, paddingTop: 8 }}>
          <Button label="Post BeGreen" kind="green" trailing={`+${a.seeds + (isDropAct ? 10 : 0)}`} onPress={post} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Camera steps
  const isProof = step === "proof";
  const hint = isProof ? ACTIONS[action].proofHint : "Snap the thing. The bike, the bin, the bottle, the plant.";
  const noCamera = !realCamera || (perm && !perm.granted);

  return (
    <View style={{ flex: 1, backgroundColor: C.black }}>
      <View style={{ paddingTop: top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton icon="close" label="Close camera" bg={C.night2} color={C.white} onPress={() => router.back()} />
        <Steps step={step} />
        <IconButton
          icon="help"
          label="How to"
          bg={C.night2}
          color={C.white}
          onPress={() => router.push({ pathname: "/guide", params: { action, from: "capture" } })}
        />
      </View>

      <View style={{ flex: 1, padding: 10, paddingTop: 14 }}>
        <View style={{ flex: 1, borderRadius: 32, borderCurve: "continuous", overflow: "hidden", backgroundColor: C.night2 }}>
          {noCamera ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 36 }}>
              <Icon name={isProof ? "video" : "camera"} size={28} color={C.white} />
              <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 22, letterSpacing: -0.7, textAlign: "center" }}>
                {realCamera ? "Camera access needed" : "No camera here"}
              </Text>
              <Text style={{ color: C.nightMute, fontFamily: F.regular, textAlign: "center", lineHeight: 21 }}>
                {realCamera
                  ? "BeGreen needs the camera to capture your proof."
                  : "You’re on a simulator or the web. Use your library, or tap the shutter for a demo capture."}
              </Text>
              {realCamera && perm && !perm.granted && <Button label="Allow camera" kind="inverse" onPress={requestPerm} />}
            </View>
          ) : (
            <CameraView
              ref={cam}
              style={{ flex: 1 }}
              facing={facing}
              mode={isProof ? "video" : "picture"}
              mute
              flash={flash ? "on" : "off"}
              enableTorch={isProof && flash}
              mirror={facing === "front"}
              onCameraReady={() => setReady(true)}
            />
          )}

          {isProof && photo && (
            <Animated.View
              entering={ZoomIn.springify()}
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                width: 84,
                aspectRatio: 4 / 5,
                borderRadius: 14,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: C.white,
              }}
            >
              <Image source={photo} style={{ flex: 1 }} contentFit="cover" />
            </Animated.View>
          )}

          <View style={{ position: "absolute", top: 16, right: 16 }}>
            {recording ? (
              <Animated.View
                entering={FadeIn}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.red, paddingHorizontal: 10, height: 26, borderRadius: R.pill }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.white }} />
                <Mono color={C.white}>00:0{secs}</Mono>
              </Animated.View>
            ) : (
              <View style={{ backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, height: 26, borderRadius: R.pill, justifyContent: "center" }}>
                <Mono color={C.white}>{ACTIONS[action].label}</Mono>
              </View>
            )}
          </View>

          <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 16, alignItems: "center" }}>
            <Animated.View
              key={`${step}${recording}`}
              entering={FadeInDown.springify().damping(18)}
              exiting={FadeOut}
              style={{ backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.md, maxWidth: 320 }}
            >
              <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 14, textAlign: "center", lineHeight: 19 }}>
                {recording ? "Recording. Keep it in frame." : hint}
              </Text>
            </Animated.View>
          </View>
        </View>
      </View>

      <View style={{ paddingBottom: bottom + (noCamera ? 24 : 12), paddingTop: 6, paddingHorizontal: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {noCamera ? (
          <IconButton icon="photo" label="Pick from library" bg={C.night2} color={C.white} size={50} onPress={() => pick(isProof ? "videos" : "images")} />
        ) : (
          <IconButton
            icon={flash ? "bolt" : "boltOff"}
            label="Toggle flash"
            bg={C.night2}
            color={C.white}
            size={50}
            onPress={() => setFlash((f) => !f)}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={noCamera ? "Use demo capture" : isProof ? (recording ? "Stop recording" : "Record proof") : "Take photo"}
          disabled={!noCamera && !ready}
          onPress={noCamera ? applyDemo : isProof ? (recording ? stopProof : startProof) : takePhoto}
          style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center" }}
        >
          {isProof && !noCamera ? (
            <RecordRing progress={progress} />
          ) : (
            <View style={{ position: "absolute", width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: C.white }} />
          )}
          <Animated.View style={shutterStyle}>
            <View
              style={{
                width: recording ? 32 : 70,
                height: recording ? 32 : 70,
                borderRadius: recording ? 8 : 35,
                backgroundColor: isProof ? C.red : C.white,
              }}
            />
          </Animated.View>
          {noCamera && (
            <Text style={{ position: "absolute", bottom: -18, fontFamily: F.monoMedium, fontSize: 10, color: C.nightMute, letterSpacing: 0.4 }}>
              {isProof ? "DEMO PROOF" : "DEMO SNAP"}
            </Text>
          )}
        </Pressable>

        <IconButton
          icon="flip"
          label="Flip camera"
          bg={C.night2}
          color={C.white}
          size={50}
          onPress={() => !recording && setFacing((f) => (f === "back" ? "front" : "back"))}
        />
      </View>
    </View>
  );
}
