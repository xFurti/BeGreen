import * as Device from "expo-device";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
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
import { SeedBuddy } from "@/components/seed-buddy";
import { SeedTip, useMySeed } from "@/components/seed-ui";
import { toast } from "@/components/toast";
import { Button, Chip, IconButton, LiveDot, Mono, Press, SdgTags, useCountUp } from "@/components/ui";
import { CATEGORIES } from "@/data/community";
import { ACTION_LIST, ACTIONS, type ActionId } from "@/data/actions";
import { DEMO_BY_ACTION } from "@/data/demo";
import { plantStage, STAGE_IDS } from "@/data/seeds";
import type { Audience, Media } from "@/data/types";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { actionCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { HIDDEN_PLACE } from "@/i18n/persist";
import { usePulse } from "@/hooks/use-pulse";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { persistMedia, proofWithinBudget } from "@/services/media";
import { canStopProof, displaySeconds, noteProgress, outcomeFromRecording, PROOF_SECONDS } from "@/services/proof-recording.mjs";
import { canClaimDrop, DROP_BONUS, seedsFor } from "@/services/rewards";
import { hasBackend } from "@/services/supabase";
import { mineOf, postedToday, sdgsOf, seedsOf, streakOf, useApp } from "@/store/app-store";
import { linkableSpotId, syncCommunity, useCommunity, useJoined } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
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
  const { C } = useTheme();
  const r = size / 2 - 3;
  const len = 2 * Math.PI * r;
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - progress.value) }));
  return (
    <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.ring} strokeWidth={4} fill="none" />
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
  const { C } = useTheme();
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
  const { C } = useTheme();
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
  photo: Media;
  destination: string;
  pending: boolean;
  newGoals: number[];
  // Your seed's stage before and after this proof, when it grew.
  grew?: { from: number; to: number };
};

// The moment your seed grows: it shows the old stage, then springs into the new one.
function Grew({ from, to, delay }: { from: number; to: number; delay: number }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const seed = useMySeed();
  const [stage, setStage] = useState(from);
  useEffect(() => {
    const id = setTimeout(() => {
      haptic.success();
      setStage(to);
    }, delay + 500);
    return () => clearTimeout(id);
  }, [to, delay]);
  const label = to >= 4 ? t("seed.growth.grewMax") : t("seed.growth.grew", { stage: t(`seed.stages.${STAGE_IDS[to]}`) });
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: R.lg,
        borderCurve: "continuous",
        backgroundColor: C.forest2,
        borderWidth: 1,
        borderColor: C.forestLine,
      }}
    >
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.mint, alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
        <SeedBuddy seed={seed} stage={stage} mood="wow" size={52} animated />
      </View>
      <Text style={{ flex: 1, fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, color: C.lime }}>{label}</Text>
    </Animated.View>
  );
}

function StatCard({
  icon,
  badge,
  title,
  sub,
  delay,
}: {
  icon: IconName;
  badge: string;
  title: string;
  sub: string;
  delay: number;
}) {
  const { C } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={{
        flex: 1,
        backgroundColor: C.forest2,
        borderRadius: R.lg,
        borderCurve: "continuous",
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: C.forestLine,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={16} color={C.lime} />
        </View>
        <View style={{ paddingHorizontal: 8, height: 22, borderRadius: R.pill, backgroundColor: C.forest, justifyContent: "center" }}>
          <Mono color={C.lime}>{badge}</Mono>
        </View>
      </View>
      <View style={{ gap: 3 }}>
        <Text style={{ fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.3, color: C.white }}>{title}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.forestMute }}>{sub}</Text>
      </View>
    </Animated.View>
  );
}

function BannerRow({
  icon,
  title,
  sub,
  goals,
  delay,
}: {
  icon: IconName;
  title: string;
  sub?: string;
  goals?: number[];
  delay: number;
}) {
  const { C } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: R.lg,
        borderCurve: "continuous",
        backgroundColor: C.forest2,
        borderWidth: 1,
        borderColor: C.forestLine,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={17} color={C.lime} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, color: C.white }}>{title}</Text>
        {sub && <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.forestMute }}>{sub}</Text>}
      </View>
      {goals && goals.length > 0 && <SdgTags goals={goals} dark />}
    </Animated.View>
  );
}

function Done(r: Result) {
  const { C } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const n = useCountUp(r.seeds, 850);
  const { t } = useI18n();
  const a = actionCopy(t, r.action);
  const scale = useSharedValue(0.75);
  useEffect(() => {
    haptic.success();
    scale.set(withSpring(1, { damping: 12, stiffness: 160 }));
  }, [scale]);
  const big = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{ flex: 1, backgroundColor: C.forest, paddingTop: top + 12, paddingBottom: bottom + 12, paddingHorizontal: 20, overflow: "hidden" }}
    >
      <Blobs colors={[C.leaf, C.lime]} opacity={0.18} size={320} />
      <Burst />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            height: 30,
            borderRadius: R.pill,
            backgroundColor: C.forest2,
            borderWidth: 1,
            borderColor: C.forestLine,
          }}
        >
          <Icon name={r.isDrop ? "bolt" : "checkSeal"} size={13} color={C.lime} />
          <Mono color={C.lime}>{r.isDrop ? t("capture.dropComplete") : t("capture.youDid")}</Mono>
        </View>
        <SdgTags goals={a.sdgs} dark />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 12, paddingVertical: 6 }}
      >
        <Animated.View
          entering={ZoomIn.springify().damping(16)}
          style={{
            backgroundColor: C.forest2,
            borderRadius: R.xl,
            borderCurve: "continuous",
            padding: 20,
            gap: 16,
            borderWidth: 1,
            borderColor: C.forestLine,
            overflow: "hidden",
          }}
        >
          <View pointerEvents="none" style={{ position: "absolute", right: -22, top: -22, opacity: 0.1 }}>
            <LeafMark size={140} color={C.lime} vein={C.forest2} rotate={-18} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Animated.View style={[{ alignSelf: "flex-start" }, big]}>
                <Text
                  style={{
                    fontFamily: F.semibold,
                    fontSize: 72,
                    lineHeight: 84,
                    letterSpacing: -3.5,
                    color: C.lime,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  +{n}
                </Text>
              </Animated.View>
              <Text style={{ fontFamily: F.semibold, fontSize: 19, letterSpacing: -0.4, color: C.white }}>
                {t("capture.seedsEarned")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 2 }}>
                {r.isDrop && <Icon name="bolt" size={12} color={C.lime} />}
                <Text style={{ fontFamily: F.regular, fontSize: 13, color: r.isDrop ? C.lime : C.forestMute }}>
                  {r.isDrop ? t("capture.basePlusDrop", { base: ACTIONS[r.action].seeds, bonus: DROP_BONUS }) : t("capture.baseSeeds")}
                </Text>
              </View>
            </View>

            <View
              style={{
                width: 88,
                aspectRatio: 4 / 5,
                borderRadius: R.md,
                borderCurve: "continuous",
                overflow: "hidden",
                borderWidth: 2,
                borderColor: C.white,
                backgroundColor: C.forest,
                transform: [{ rotate: "2deg" }],
                boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
              }}
            >
              <Image source={r.photo} style={{ flex: 1 }} contentFit="cover" />
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: C.lime,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="check" size={12} color={C.forest} />
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.forestLine }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
              <Icon name={a.icon} size={18} color={C.lime} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, color: C.white }}>{a.label}</Text>
              <Text numberOfLines={2} style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.forestMute }}>
                {a.impact.note}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard
            icon="flame"
            badge="+1"
            title={t("capture.streak", { count: r.streak })}
            sub={r.streak > 1 ? t("capture.streakKeep") : t("capture.streakOne")}
            delay={180}
          />
          <StatCard
            icon="people"
            badge="+1"
            title={r.pending ? t("groups.pending") : t("groups.destination", { name: r.destination })}
            sub={t(r.pending ? "groups.pendingBody" : "groups.contribution")}
            delay={260}
          />
        </View>

        {r.newGoals.length > 0 && (
          <BannerRow icon="globe" title={t("capture.newGoals")} goals={r.newGoals} delay={340} />
        )}
        {r.unlocked && (
          <BannerRow icon="lock" title={t("capture.unlocked")} sub={t("capture.unlockedSub")} delay={420} />
        )}
        {r.grew && <Grew from={r.grew.from} to={r.grew.to} delay={500} />}
        {r.newGoals.length > 0 && (
          <SeedTip
            id="goals"
            stage={r.grew?.to ?? 1}
            text={t("seed.tips.goals", { goals: [...r.newGoals].sort((a, b) => a - b).map((g) => `SDG ${g}`).join(", ") })}
          />
        )}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 10, paddingTop: 12 }}>
        <Button
          label={t("common.share")}
          icon="share"
          kind="glass"
          onPress={() => Share.share({ message: t("capture.shareText", { verb: a.verb }) })}
        />
        <Button label={t("capture.seeFeed")} icon="arrowRight" kind="inverse" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
}

function PublishBar({
  seeds,
  isDrop,
  posting,
  disabled,
  onPress,
}: {
  seeds: number;
  isDrop: boolean;
  posting: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const { t } = useI18n();
  const badgeScale = useSharedValue(1);
  const spin = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    badgeScale.set(withSequence(withTiming(1.16, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 240 })));
  }, [seeds, badgeScale]);

  useEffect(() => {
    if (posting) {
      spin.set(withRepeat(withSequence(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 650, easing: Easing.inOut(Easing.sin) })), -1, true));
      sweep.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) }), -1, true));
    } else {
      spin.set(0);
      sweep.set(0);
    }
  }, [posting, spin, sweep]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-10 + spin.value * 24}deg` }, { scale: 1 + spin.value * 0.12 }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    width: "42%",
    transform: [{ translateX: sweep.value * 190 }],
  }));

  return (
    <Press
      onPress={onPress}
      disabled={posting || disabled}
      scale={0.98}
      accessibilityLabel={`${t("capture.post")} +${seeds}`}
      style={{
        height: 58,
        borderRadius: R.pill,
        borderCurve: "continuous",
        backgroundColor: C.forest,
        paddingLeft: 20,
        paddingRight: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        overflow: "hidden",
        boxShadow: "0 10px 26px rgba(0,0,0,0.16)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        <Animated.View style={leafStyle}>
          <LeafMark size={20} color={C.lime} vein={C.forest} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: C.white, fontFamily: F.semibold, fontSize: 16, letterSpacing: -0.2 }}>
            {posting ? t("capture.posting") : t("capture.post")}
          </Text>
          {posting && (
            <Text numberOfLines={1} style={{ color: C.forestMute, fontFamily: F.regular, fontSize: 12 }}>
              {t("capture.postingSub")}
            </Text>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 34,
            paddingHorizontal: 12,
            borderRadius: R.pill,
            backgroundColor: C.forest2,
            borderWidth: 1,
            borderColor: C.forestLine,
          },
          badgeStyle,
        ]}
      >
        {isDrop && <Icon name="bolt" size={12} color={C.lime} />}
        <Text style={{ fontFamily: F.monoMedium, fontSize: 13.5, color: C.lime, fontVariant: ["tabular-nums"] }}>
          +{seeds}
        </Text>
      </Animated.View>

      {posting && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: C.forest2 }}>
          <Animated.View style={[{ height: "100%", borderRadius: 2, backgroundColor: C.lime }, barStyle]} />
        </View>
      )}
    </Press>
  );
}

// ---------- Screen ----------

export default function Capture() {
  // The camera steps and the Done screen are dark in both themes; only the review follows it.
  const { C, T, scheme } = useTheme();
  const params = useLocalSearchParams<{ action?: ActionId; spot?: string; group?: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
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
  const [actsOpen, setActsOpen] = useState(false);
  const [order] = useState(() => [ACTIONS[action], ...ACTION_LIST.filter((x) => x.id !== action)]);
  const [caption, setCaption] = useState("");
  const { groups } = useJoined();
  const [initialGroup] = useState(() => params.group ?? groups.find((g) => g.id === useCommunity.getState().spots.find((s) => s.id === params.spot)?.communityId)?.id);
  const [audience, setAudience] = useState<Audience>(initialGroup ? "group" : "comune");
  const [shareSpot, setShareSpot] = useState(true);
  const comune = useApp((s) => s.comune);
  const [groupId, setGroupId] = useState<string | undefined>(initialGroup);
  const selectedGroup = groups.find((g) => g.id === groupId);
  const addPost = useApp((s) => s.addPost);
  // The community place this proof was taken at: from its page, or picked here.
  const [spotId, setSpotId] = useState<string | undefined>(params.spot);
  const primaryCommunity = useCommunity((s) => s.primary);
  const savedSpots = useCommunity((s) => s.saved);
  const allSpots = useCommunity((s) => s.spots);
  const spotChoices = allSpots
    .filter((x) => !x.hidden && x.lat != null && (audience === "group" ? x.communityId === groupId : !groups.some((g) => g.id === x.communityId) && (x.id === params.spot || x.communityId === primaryCommunity)))
    .sort((a, b) => Number(b.id === params.spot) - Number(a.id === params.spot) || (savedSpots[b.id] ?? 0) - (savedSpots[a.id] ?? 0) || b.createdAt - a.createdAt)
    .slice(0, 8);
  const [result, setResult] = useState<Result | null>(null);
  const { t } = useI18n();
  const place = comune?.name ?? pulse.place.name;
  // Only a challenge the backend knows about can be claimed (or any, when running on-device only).
  const dropOpen = useApp((s) => canClaimDrop(drop, s.posts, s.userId, hasBackend));
  const [posting, setPosting] = useState(false);
  const submitting = useRef(false);

  useEffect(() => { void syncCommunity(params.group); }, [params.group]);

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
    const asset = r.assets?.[0];
    const uri = asset?.uri;
    if (!uri) return;
    if (kind === "videos") {
      let size = asset.fileSize ?? null;
      if (size == null && process.env.EXPO_OS !== "web" && uri.startsWith("file:")) {
        try {
          size = new File(uri).size;
        } catch {
          size = null;
        }
      }
      if (!proofWithinBudget(size)) {
        toast(t("capture.proofTooLarge"));
        return;
      }
    }
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

  const post = async () => {
    if (!photo || !proof || submitting.current) return;
    if (audience === "group" && !selectedGroup) {
      toast(t("groups.chooseGroup"));
      return;
    }
    submitting.current = true;
    setPosting(true);
    try {
      const s = useApp.getState();
      const before = mineOf(s.posts, s.userId);
      const wasUnlocked = postedToday(before);
      const goalsBefore = sdgsOf(before);
      const isDrop = action === drop.action && canClaimDrop(drop, s.posts, s.userId, hasBackend);
      const posted = await addPost({
        action,
        photo: typeof photo === "string" ? persistMedia(photo) : photo,
        proof: typeof proof === "string" ? persistMedia(proof) : proof,
        caption: caption.trim(),
        audience,
        place: shareSpot ? place : HIDDEN_PLACE,
        // The Comune centre is an area reference, never the location of the act.
        location: shareSpot && comune ? {lat: comune.lat, lon: comune.lon} : undefined,
        challengeId: isDrop ? drop.id : undefined,
        groupId: audience === "group" ? groupId : undefined,
        spotId: spotChoices.some((s) => s.id === spotId) ? linkableSpotId(spotId) : undefined,
      });
      const now = useApp.getState();
      const after = mineOf(now.posts, now.userId);
      const stageBefore = plantStage(seedsOf(before, s.verifiedCount));
      const stageAfter = plantStage(seedsOf(after, now.verifiedCount));
      setResult({
        seeds: seedsFor(posted),
        streak: streakOf(after),
        unlocked: !wasUnlocked,
        isDrop: !!posted.isDrop,
        action,
        photo,
        destination: audience === "group" ? selectedGroup!.name : audience === "public" ? t("common.everyone") : place,
        pending: !!posted.pending,
        newGoals: ACTIONS[action].sdgs.filter((g) => !goalsBefore.has(g)),
        grew: stageAfter > stageBefore ? { from: stageBefore, to: stageAfter } : undefined,
      });
      setStep("done");
    } catch {
      toast(t(audience === "group" ? "groups.chooseGroup" : "shared.checkConnection"));
    } finally {
      submitting.current = false;
      setPosting(false);
    }
  };

  // ----- render -----

  if (step === "done" && result)
    return (
      <>
        <StatusBar style="light" />
        <Done {...result} />
      </>
    );

  if (step === "review" && photo && proof) {
    const a = actionCopy(t, action);
    const isDropAct = action === drop.action && dropOpen;
    const totalSeeds = seedsFor({ action, isDrop: isDropAct });
    const audienceOptions: { value: Audience; icon: IconName; label: string }[] = [
      { value: "comune", icon: "building", label: t("common.comune") },
      { value: "group", icon: "people", label: t("groups.group") },
      { value: "public", icon: "globe", label: t("common.everyone") },
    ];
    return (
      <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg, paddingBottom: cover }}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <View
          style={{
            paddingTop: top + 6,
            paddingHorizontal: 16,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            icon="back"
            label={t("capture.retake")}
            onPress={() => {
              if (posting) return;
              setProof(null);
              setStep("proof");
            }}
          />
          <Text style={{ fontFamily: F.semibold, fontSize: 17, letterSpacing: -0.3, color: C.ink }}>{t("capture.your")}</Text>
          <IconButton icon="close" label={t("capture.discard")} onPress={() => !posting && router.back()} />
        </View>

        <ScrollView
          ref={scrollerRef}
          {...scrollProps}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 22, paddingBottom: scrollPaddingBottom(24, cover > 0 ? 16 : 0) }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={ZoomIn.springify().damping(15)}
            style={{ paddingHorizontal: 40, paddingTop: 4, transform: [{ rotate: posting ? "0deg" : "-1.2deg" }] }}
          >
            <View style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.16)", borderRadius: R.lg }}>
              <ProofMedia photo={photo} proof={proof} active />
              {posting && (
                <Animated.View
                  entering={FadeIn.duration(180)}
                  exiting={FadeOut.duration(150)}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 10,
                    height: 26,
                    borderRadius: R.pill,
                    backgroundColor: C.forest,
                    borderWidth: 1,
                    borderColor: C.forestLine,
                  }}
                >
                  <LiveDot color={C.lime} size={6} />
                  <Text style={{ fontFamily: F.monoMedium, fontSize: 10.5, color: C.white, letterSpacing: 0.3 }}>
                    {t("capture.postingSub")}
                  </Text>
                </Animated.View>
              )}
            </View>
          </Animated.View>

          <View style={[{ gap: 22 }, posting && { opacity: 0.55 }]} pointerEvents={posting ? "none" : "auto"}>
            {/* What did you do — Active gesture card + expandable 2-col grid */}
            <Animated.View layout={LinearTransition.springify().damping(19)} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Mono color={C.ink}>{t("capture.what")}</Mono>
                <Press
                  onPress={() => router.push({ pathname: "/guide", params: { action, from: "capture" } })}
                  accessibilityLabel={t("common.howTo")}
                  hitSlop={8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon name="book" size={12} color={C.forestInk} />
                  <Mono color={C.forestInk}>{t("capture.howTo")}</Mono>
                </Press>
              </View>

              <View
                style={{
                  backgroundColor: isDropAct ? C.mint : C.card,
                  borderRadius: R.lg,
                  borderCurve: "continuous",
                  padding: 14,
                  gap: 12,
                  borderWidth: 1,
                  borderColor: isDropAct ? C.band : C.line,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${a.label}. ${actsOpen ? t("capture.hideActs") : t("capture.changeAct")}`}
                  onPress={() => {
                    haptic.tap();
                    setActsOpen((o) => !o);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: isDropAct ? C.forest : C.mint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={a.icon} size={20} color={isDropAct ? C.lime : C.forestInk} />
                  </View>

                  <View style={{ flex: 1, gap: 5 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>
                      {a.label}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                      {isDropAct && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingHorizontal: 7,
                            height: 20,
                            borderRadius: R.pill,
                            backgroundColor: C.forest,
                          }}
                        >
                          <Icon name="bolt" size={10} color={C.lime} />
                          <Text style={{ fontFamily: F.monoMedium, fontSize: 10, color: C.lime, letterSpacing: 0.3 }}>
                            {t("capture.dropTag")}
                          </Text>
                        </View>
                      )}
                      <SdgTags goals={a.sdgs} />
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      height: 32,
                      paddingHorizontal: 11,
                      borderRadius: R.pill,
                      backgroundColor: C.bg,
                      borderWidth: 1,
                      borderColor: C.line,
                    }}
                  >
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.forestInk }}>
                      {actsOpen ? t("capture.hideActs") : t("capture.changeAct")}
                    </Text>
                    <View style={{ transform: [{ rotate: actsOpen ? "-90deg" : "90deg" }] }}>
                      <Icon name="chevron" size={11} color={C.forestInk} />
                    </View>
                  </View>
                </Pressable>

                {actsOpen && (
                  <Animated.View entering={FadeInDown.springify().damping(18)} style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDropAct ? C.band : C.line }}>
                    <Mono color={C.mute}>{t("capture.allActs")}</Mono>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {order.map((x) => {
                        const selected = x.id === action;
                        const xDrop = x.id === drop.action && dropOpen;
                        const xSeeds = seedsFor({ action: x.id, isDrop: xDrop });
                        const copy = actionCopy(t, x.id);
                        return (
                          <View key={x.id} style={{ width: "48%", flexGrow: 1 }}>
                            <Press
                              scale={0.97}
                              accessibilityLabel={`${copy.label} +${xSeeds}`}
                              onPress={() => {
                                setPicked(x.id);
                                setActsOpen(false);
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                paddingHorizontal: 11,
                                paddingVertical: 10,
                                minHeight: 54,
                                borderRadius: R.md,
                                borderCurve: "continuous",
                                backgroundColor: selected ? C.forest : C.bg,
                                borderWidth: 1,
                                borderColor: selected ? C.forest : C.line,
                              }}
                            >
                              <Icon name={x.icon} size={15} color={selected ? C.lime : C.forestInk} />
                              <Text
                                numberOfLines={2}
                                style={{
                                  flex: 1,
                                  fontFamily: F.medium,
                                  fontSize: 13,
                                  lineHeight: 16,
                                  letterSpacing: -0.2,
                                  color: selected ? C.white : C.ink,
                                }}
                              >
                                {copy.label}
                              </Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                                {xDrop && <Icon name="bolt" size={10} color={selected ? C.lime : C.forestInk} />}
                                <Text style={{ fontFamily: F.monoMedium, fontSize: 11, color: selected ? C.lime : C.mute }}>
                                  +{xSeeds}
                                </Text>
                              </View>
                            </Press>
                          </View>
                        );
                      })}
                    </View>
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            {/* Caption + wrapped suggestion pills */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Mono color={C.ink}>{t("capture.caption")}</Mono>
                <Mono color={caption.length > 160 ? C.amber : C.mute}>{caption.length}/180</Mono>
              </View>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder={t("capture.captionPh", { verb: a.verb })}
                placeholderTextColor={C.faint}
                multiline
                maxLength={180}
                style={{
                  minHeight: 68,
                  borderRadius: R.md,
                  borderCurve: "continuous",
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.line,
                  padding: 15,
                  paddingTop: 14,
                  fontSize: 16,
                  fontFamily: F.regular,
                  color: C.ink,
                }}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {a.captions.map((c) => {
                  const chosen = caption === c;
                  return (
                    <Press
                      key={c}
                      scale={0.97}
                      accessibilityLabel={c}
                      onPress={() => setCaption(chosen ? "" : c)}
                      style={{
                        paddingHorizontal: 11,
                        paddingVertical: 7,
                        borderRadius: R.pill,
                        backgroundColor: chosen ? C.mint : C.bg,
                        borderWidth: 1,
                        borderColor: chosen ? C.band : C.line,
                        maxWidth: "100%",
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: chosen ? F.medium : F.regular,
                          fontSize: 13,
                          color: chosen ? C.forestInk : C.ink2,
                        }}
                      >
                        “{c}”
                      </Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            {spotChoices.length > 0 && (
              <View style={{ gap: 10 }}>
                <Mono color={C.ink}>{t("community.capture.where")}</Mono>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <Chip label={t("community.capture.none")} active={!spotId} onPress={() => setSpotId(undefined)} />
                  {spotChoices.map((x) => (
                    <Chip key={x.id} label={x.title} icon={CATEGORIES[x.category].icon} active={x.id === spotId} onPress={() => setSpotId(x.id)} />
                  ))}
                </View>
                <Text style={T.caption}>{t("community.capture.hint")}</Text>
              </View>
            )}

            {/* Who sees it + Location privacy in a unified card */}
            <View style={{ gap: 10 }}>
              <Mono color={C.ink}>{t("capture.who")}</Mono>
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: R.lg,
                  borderCurve: "continuous",
                  padding: 14,
                  gap: 14,
                  borderWidth: 1,
                  borderColor: C.line,
                }}
              >
                <View style={{ gap: 10 }}>
                  <View
                    accessibilityRole="tablist"
                    accessibilityLabel={t("capture.who")}
                    style={{ flexDirection: "row", backgroundColor: C.card2, borderRadius: R.pill, padding: 3, gap: 3 }}
                  >
                    {audienceOptions.map((o) => {
                      const on = o.value === audience;
                      return (
                        <Pressable
                          key={o.value}
                          accessibilityRole="tab"
                          accessibilityLabel={o.label}
                          accessibilityState={{ selected: on }}
                          aria-selected={process.env.EXPO_OS === "web" ? on : undefined}
                          onPress={() => {
                            if (on) return;
                            haptic.tap();
                            setAudience(o.value);
                          }}
                          style={{
                            flex: 1,
                            height: 36,
                            paddingHorizontal: 8,
                            borderRadius: R.pill,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            backgroundColor: on ? C.raised : "transparent",
                            boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)" : undefined,
                          }}
                        >
                          <Icon name={o.icon} size={13} color={on ? C.forestInk : C.mute} />
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                            style={{
                              fontFamily: F.medium,
                              fontSize: 13.5,
                              letterSpacing: -0.15,
                              color: on ? C.forestInk : C.mute,
                            }}
                          >
                            {o.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Animated.View key={audience} entering={FadeIn.duration(160)} style={{ gap: 8 }}>
                    {audience === "comune" && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}>
                        <Icon name="building" size={13} color={C.forestInk} />
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.ink2 }}>
                          {t("capture.audienceComune", { place })}
                        </Text>
                      </View>
                    )}

                    {audience === "public" && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}>
                        <Icon name="globe" size={13} color={C.forestInk} />
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.ink2 }}>
                          {t("capture.audiencePublic")}
                        </Text>
                      </View>
                    )}

                    {audience === "group" &&
                      (groups.length ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {groups.map((s) => (
                            <Chip key={s.id} label={s.name} icon="people" active={s.id === groupId} onPress={() => setGroupId(s.id)} />
                          ))}
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 }}>
                          <Icon name="info" size={14} color={C.mute} />
                          <Text style={[T.caption, { flex: 1 }]}>{t("groups.noGroups")}</Text>
                        </View>
                      ))}
                    {audience === "group" && <Text style={T.caption}>{selectedGroup
                      ? t(selectedGroup.visibility === "private" ? "groups.groupPrivate" : "groups.groupPublic", { name: selectedGroup.name })
                      : t("groups.chooseGroup")}</Text>}
                  </Animated.View>
                </View>

                <View style={{ height: 1, backgroundColor: C.line }} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: shareSpot ? C.mint : C.card2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={shareSpot ? "location" : "lock"} size={16} color={shareSpot ? C.forestInk : C.mute} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>
                        {t("capture.showMine")}
                      </Text>
                      {shareSpot && (
                        <View
                          style={{
                            paddingHorizontal: 7,
                            height: 20,
                            borderRadius: R.pill,
                            backgroundColor: C.mint,
                            justifyContent: "center",
                            flexShrink: 1,
                          }}
                        >
                          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11.5, color: C.forestInk }}>
                            {place || t("common.yourArea")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.mute }}>
                      {shareSpot ? t("capture.neighbourhood") : t("capture.hiddenSpot")}
                    </Text>
                  </View>
                  <LeafSwitch value={shareSpot} onValueChange={setShareSpot} label={t("capture.showMine")} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: cover > 0 ? 10 : bottom + 10, paddingTop: 8 }}>
          <PublishBar seeds={totalSeeds} isDrop={isDropAct} posting={posting} disabled={audience === "group" && !selectedGroup} onPress={post} />
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
      <StatusBar style="light" />
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
                videoQuality="480p"
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
              <View style={{ backgroundColor: C.scrim, paddingHorizontal: 10, height: 26, borderRadius: R.pill, justifyContent: "center" }}>
                <Mono color={C.white}>{actionCopy(t, action).label}</Mono>
              </View>
            )}
          </View>

          <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 16, alignItems: "center" }}>
            <Animated.View
              key={`${step}${recording}${proofFailed}`}
              entering={FadeInDown.springify().damping(18)}
              exiting={FadeOut}
              style={{ backgroundColor: C.scrim, paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.md, maxWidth: 320 }}
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
