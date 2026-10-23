import * as Device from "expo-device";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
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
import { DEMO_BY_ACTION } from "@/data/demo";
import type { Audience, Media } from "@/data/types";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { actionCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { HIDDEN_PLACE } from "@/i18n/persist";
import { usePulse } from "@/hooks/use-pulse";
import { persistMedia } from "@/services/media";
import { canStopProof, displaySeconds, noteProgress, outcomeFromRecording, PROOF_SECONDS } from "@/services/proof-recording.mjs";
import { hasBackend } from "@/services/supabase";
import { leagueOf, mineOf, postedToday, sdgsOf, streakOf, useApp, useAuthor } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

type Step = "snap" | "proof" | "review" | "done";
// The camera runs at 4:3; held upright that's 3 wide by 4 tall.
const CAMERA_RATIO = 3 / 4;

type Size = { width: number; height: number };

// The largest 3:4 box that covers the frame, centred. The frame clips the overflow,
// so the preview is cropped like `cover` instead of being stretched to fit.
function coverBox({ width, height }: Size) {
  const w = Math.max(width, height * CAMERA_RATIO);
  const h = w / CAMERA_RATIO;
  return { position: "absolute", width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 } as const;
}

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
  const { t } = useI18n();
  const items = [
    { k: "snap", n: "01", label: t("capture.snap") },
    { k: "proof", n: "02", label: t("capture.prove") },
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
  const { t } = useI18n();
  const a = actionCopy(t, r.action);
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
          {r.isDrop ? t("capture.dropComplete") : t("capture.youDid")}
        </Mono>
        <SdgTags goals={a.sdgs} dark />
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Animated.Text style={[T.mega, { color: C.lime, fontSize: 128, lineHeight: 128, fontVariant: ["tabular-nums"] }, big]}>
          +{n}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(300)} style={{ fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.white }}>
          {r.isDrop ? t("capture.seedsDrop") : t("capture.seedsPlain")}
        </Animated.Text>
      </View>

      <View>
        <Row icon="flame" title={t("capture.streak", { count: r.streak })} sub={r.streak > 1 ? t("capture.streakKeep") : t("capture.streakOne")} right="+1" delay={250} />
        <Row
          icon="league"
          title={t("capture.rank", { rank: r.rankAfter })}
          sub={
            r.passed.length
              ? t("capture.passed", { names: `${r.passed.slice(0, 2).join(" & ")}${r.passed.length > 2 ? ` +${r.passed.length - 2}` : ""}` })
              : r.next
                ? t("capture.moreToPass", { gap: r.next.gap, name: r.next.name })
                : t("capture.defend")
          }
          right={climbed > 0 ? `↑${climbed}` : "—"}
          delay={380}
        />
        {r.newGoals.length > 0 && (
          <Row icon="globe" title={t("capture.newGoals")} sub={r.newGoals.map((g) => `SDG ${g}`).join(" · ")} delay={510} />
        )}
        {r.unlocked && <Row icon="lock" title={t("capture.unlocked")} sub={t("capture.unlockedSub")} delay={640} />}
      </View>

      <View style={{ flexDirection: "row", gap: 10, paddingTop: 16 }}>
        <Button
          label={t("common.share")}
          icon="share"
          kind="glass"
          onPress={() => Share.share({ message: t("capture.shareText", { verb: a.verb }) })}
        />
        <Button label={t("capture.seeFeed")} kind="inverse" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
}

// ---------- Screen ----------

export default function Capture() {
  const params = useLocalSearchParams<{ action?: ActionId }>();
  const { top, bottom } = useSafeAreaInsets();
  const { ref: keyboardRoot, cover } = useKeyboardCover();
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
  const [frame, setFrame] = useState<Size | null>(null);
  const [proofFailed, setProofFailed] = useState(false);
  const alive = useRef(true);
  const recordingRef = useRef(false);
  const nativeSeconds = useRef<number | null>(null);
  const progress = useSharedValue(0);
  const shutter = useSharedValue(1);

  const [picked, setPicked] = useState<ActionId | undefined>(params.action);
  const action: ActionId = picked ?? drop.action;
  // The suggested act leads the chip row, so it's visible without scrolling.
  const [order] = useState(() => [ACTIONS[action], ...ACTION_LIST.filter((x) => x.id !== action)]);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<Audience>("comune");
  const [shareSpot, setShareSpot] = useState(true);
  const squads = useApp((s) => s.squads);
  const comune = useApp((s) => s.comune);
  const [squadId, setSquadId] = useState<string | undefined>(squads[0]?.id);
  const addPost = useApp((s) => s.addPost);
  const author = useAuthor();
  const [result, setResult] = useState<Result | null>(null);
  const { t } = useI18n();
  const place = comune?.name ?? pulse.place.name;
  // Only a challenge the backend knows about can be claimed (or any, when running on-device only).
  const dropDone = useApp((s) => s.posts.some((p) => p.authorId === s.userId && p.challengeId === drop.id));
  const dropOpen = !drop.offline && (drop.shared || !hasBackend) && !dropDone;

  useEffect(() => {
    if (realCamera && perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [perm, realCamera, requestPerm]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
    const camera = cam.current;
    if (!camera || recordingRef.current) return;
    haptic.thud();
    recordingRef.current = true;
    nativeSeconds.current = null;
    setProofFailed(false);
    setSecs(0);
    setRecording(true);
    progress.set(0);
    let outcome = outcomeFromRecording(undefined);
    try {
      outcome = outcomeFromRecording(
        await camera.recordAsync({ maxDuration: PROOF_SECONDS, progressUpdateInterval: 0.2, codec: "avc1" }),
      );
    } catch (error) {
      outcome = outcomeFromRecording(undefined, error);
    } finally {
      recordingRef.current = false;
      if (alive.current) {
        setRecording(false);
        progress.set(0);
      }
    }
    if (!alive.current) return;
    if (outcome.kind === "saved") {
      setProof(outcome.uri);
      setProofFailed(false);
      haptic.success();
      setStep("review");
      return;
    }
    setProofFailed(true);
  };

  const stopProof = () => {
    if (!canStopProof({ nativeSeconds: nativeSeconds.current })) return;
    cam.current?.stopRecording();
  };

  const onRecordingProgress = useCallback(
    (event: { duration: number; fileSize: number }) => {
      if (!recordingRef.current) return;
      const next = noteProgress({ nativeSeconds: nativeSeconds.current }, event);
      nativeSeconds.current = next.nativeSeconds;
      if (!alive.current || next.nativeSeconds == null) return;
      setSecs(displaySeconds(next));
      progress.set(withTiming(Math.min(1, next.nativeSeconds / PROOF_SECONDS), { duration: 200, easing: Easing.linear }));
    },
    [progress],
  );

  const closeCamera = () => {
    alive.current = false;
    if (recordingRef.current) cam.current?.stopRecording();
    router.back();
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
    const before = mineOf(s.posts, s.userId);
    const wasUnlocked = postedToday(before);
    const goalsBefore = sdgsOf(before);
    const leagueBefore = leagueOf(s.posts, s.userId, s.comune?.id, author);
    const isDrop = action === drop.action && dropOpen;
    const toSquad = audience === "squad" && squadId ? squadId : undefined;
    addPost({
      action,
      photo: typeof photo === "string" ? persistMedia(photo) : photo,
      proof: typeof proof === "string" ? persistMedia(proof) : proof,
      caption: caption.trim(),
      audience: audience === "squad" && !toSquad ? "comune" : audience,
      place: shareSpot ? place : HIDDEN_PLACE,
      challengeId: isDrop ? drop.id : undefined,
      squadId: toSquad,
    });
    const now = useApp.getState();
    const after = mineOf(now.posts, now.userId);
    const leagueAfter = leagueOf(now.posts, now.userId, now.comune?.id, author);
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
    const a = actionCopy(t, action);
    const isDropAct = action === drop.action && dropOpen;
    return (
      <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg, paddingBottom: cover }}>
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
            label={t("capture.retake")}
            onPress={() => {
              setProof(null);
              setStep("proof");
            }}
          />
          <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3 }}>{t("capture.your")}</Text>
          <IconButton icon="close" label={t("capture.discard")} onPress={() => router.back()} />
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
                {t("capture.what")}
              </Mono>
              <Press onPress={() => router.push({ pathname: "/guide", params: { action, from: "capture" } })} accessibilityLabel={t("common.howTo")}>
                <Mono color={C.mute}>{t("capture.howTo")}</Mono>
              </Press>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -16 }}>
              <View style={{ width: 10 }} />
              {order.map((x) => (
                <Chip key={x.id} label={actionCopy(t, x.id).label} icon={x.icon} active={x.id === action} onPress={() => setPicked(x.id)} />
              ))}
              <View style={{ width: 10 }} />
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <SdgTags goals={a.sdgs} />
              {isDropAct && (
                <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="bolt" size={11} color={C.ink} />
                  <Mono color={C.ink}>{t("capture.dropBonus")}</Mono>
                </Animated.View>
              )}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row" }}>
              <Mono color={C.ink} style={{ flex: 1 }}>
                {t("capture.caption")}
              </Mono>
              <Mono>{caption.length}/180</Mono>
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t("capture.captionPh", { verb: a.verb })}
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
            <Mono color={C.ink}>{t("capture.who")}</Mono>
            <Segmented<Audience>
              value={audience}
              onChange={setAudience}
              options={[
                { value: "comune", label: place },
                { value: "squad", label: t("common.squad") },
                { value: "public", label: t("common.everyone") },
              ]}
            />
            {audience === "squad" &&
              (squads.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {squads.map((s) => (
                    <Chip key={s.id} label={s.name} active={s.id === squadId} onPress={() => setSquadId(s.id)} />
                  ))}
                </ScrollView>
              ) : (
                <Text style={T.caption}>{t("capture.noSquad", { place })}</Text>
              ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16 }}>
            <Icon name="location" size={16} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 15 }}>{t("capture.showArea", { place: place || t("common.yourArea") })}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>{t("capture.neighbourhood")}</Text>
            </View>
            <LeafSwitch value={shareSpot} onValueChange={setShareSpot} label={t("capture.showMine")} />
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingBottom: cover > 0 ? 10 : bottom + 10, paddingTop: 8 }}>
          <Button label={t("capture.post")} kind="green" trailing={`+${a.seeds + (isDropAct ? 10 : 0)}`} onPress={post} />
        </View>
      </View>
    );
  }

  // Camera steps
  const isProof = step === "proof";
  const hint = isProof ? actionCopy(t, action).proofHint : t("capture.snapHint");
  const noCamera = !realCamera || (perm && !perm.granted);

  return (
    <View style={{ flex: 1, backgroundColor: C.black }}>
      <View style={{ paddingTop: top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton icon="close" label={t("capture.close")} bg={C.night2} color={C.white} onPress={closeCamera} />
        <Steps step={step} />
        <IconButton
          icon="help"
          label={t("common.howTo")}
          bg={C.night2}
          color={C.white}
          onPress={() => router.push({ pathname: "/guide", params: { action, from: "capture" } })}
        />
      </View>

      <View style={{ flex: 1, padding: 10, paddingTop: 14 }}>
        <View
          style={{ flex: 1, borderRadius: 32, borderCurve: "continuous", overflow: "hidden", backgroundColor: C.night2 }}
          onLayout={({ nativeEvent: { layout: l } }) =>
            setFrame((f) => (f?.width === l.width && f.height === l.height ? f : { width: l.width, height: l.height }))
          }
        >
          {noCamera ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 36 }}>
              <Icon name={isProof ? "video" : "camera"} size={28} color={C.white} />
              <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 22, letterSpacing: -0.7, textAlign: "center" }}>
                {realCamera ? t("capture.needCamera") : t("capture.noCamera")}
              </Text>
              <Text style={{ color: C.nightMute, fontFamily: F.regular, textAlign: "center", lineHeight: 21 }}>
                {realCamera ? t("capture.needBody") : t("capture.noBody")}
              </Text>
              {realCamera && perm && !perm.granted && <Button label={t("capture.allow")} kind="inverse" onPress={requestPerm} />}
            </View>
          ) : (
            // Mounted once the frame is measured, so the preview starts at its final size.
            frame && (
              <CameraView
                ref={cam}
                style={coverBox(frame)}
                ratio="4:3"
                facing={facing}
                mode={isProof ? "video" : "picture"}
                videoQuality="720p"
                videoBitrate={4_000_000}
                mute
                flash={flash ? "on" : "off"}
                enableTorch={isProof && flash}
                mirror={facing === "front"}
                onCameraReady={() => setReady(true)}
                onRecordingProgress={onRecordingProgress}
              />
            )
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
                <Mono color={C.white}>{actionCopy(t, action).label}</Mono>
              </View>
            )}
          </View>

          <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 16, alignItems: "center" }}>
            <Animated.View
              key={`${step}${recording}${proofFailed}`}
              entering={FadeInDown.springify().damping(18)}
              exiting={FadeOut}
              style={{ backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.md, maxWidth: 320 }}
            >
              <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 14, textAlign: "center", lineHeight: 19 }}>
                {recording ? t("capture.recording") : proofFailed ? t("capture.proofFailed") : hint}
              </Text>
            </Animated.View>
          </View>
        </View>
      </View>

      <View style={{ paddingBottom: bottom + (noCamera ? 24 : 12), paddingTop: 6, paddingHorizontal: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {noCamera ? (
          <IconButton icon="photo" label={t("capture.library")} bg={C.night2} color={C.white} size={50} onPress={() => pick(isProof ? "videos" : "images")} />
        ) : (
          <IconButton
            icon={flash ? "bolt" : "boltOff"}
            label={t("capture.flash")}
            bg={C.night2}
            color={C.white}
            size={50}
            onPress={() => setFlash((f) => !f)}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={noCamera ? t("capture.demoShutter") : isProof ? (recording ? t("capture.stop") : t("capture.record")) : t("capture.take")}
          disabled={!noCamera && !ready}
          onPress={noCamera ? applyDemo : isProof ? (recording ? stopProof : startProof) : takePhoto}
          style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center" }}
        >
          {isProof && !noCamera ? (
            <RecordRing progress={progress} />
          ) : (
            <Svg width={88} height={88} pointerEvents="none" style={{ position: "absolute" }}>
              <Circle cx={44} cy={44} r={41} stroke={C.white} strokeWidth={4} fill="none" />
            </Svg>
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
              {isProof ? t("capture.demoProof") : t("capture.demoSnap")}
            </Text>
          )}
        </Pressable>

        <IconButton
          icon="flip"
          label={t("capture.flip")}
          bg={C.night2}
          color={C.white}
          size={50}
          onPress={() => !recording && setFacing((f) => (f === "back" ? "front" : "back"))}
        />
      </View>
    </View>
  );
}
