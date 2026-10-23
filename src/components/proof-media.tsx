import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components/icon";
import type { Media } from "@/data/types";
import { F, light, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// The BeGreen frame: the "thing" (photo) + the "proof" (5-second clip) in one tile.
// Inspired by the dual-camera tile, but the inset is a video that proves the act happened.

function Proof({ src, playing, fit = "cover" }: { src: Media; playing: boolean; fit?: "cover" | "contain" }) {
  const player = useVideoPlayer(src as never, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit={fit}
      nativeControls={false}
      allowsPictureInPicture={false}
      pointerEvents="none"
    />
  );
}

// The big emoji that pops when you double-tap.
function Pop({ emoji, id }: { emoji: string; id: number }) {
  const s = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    s.set(withSequence(withSpring(1.15, { damping: 9, stiffness: 260 }), withTiming(1, { duration: 120 })));
    o.set(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 260 })));
  }, [id, s, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * -20}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" } as never, a]}>
      <Text style={{ fontSize: 110 }}>{emoji}</Text>
    </Animated.View>
  );
}

export function ProofMedia({
  photo,
  proof,
  active = true,
  locked = false,
  lockHint = false,
  verified = false,
  radius = R.lg,
  aspect = 4 / 5,
  onPressMain,
  onDoubleTap,
  popEmoji = "💚",
}: {
  photo: Media;
  proof: Media;
  active?: boolean;
  locked?: boolean;
  lockHint?: boolean;
  verified?: boolean;
  radius?: number;
  aspect?: number;
  onPressMain?: () => void;
  onDoubleTap?: () => void;
  popEmoji?: string;
}) {
  const { C, scheme } = useTheme();
  const [swapped, setSwapped] = useState(false);
  const [pop, setPop] = useState(0);
  const lastTap = useRef(0);
  const single = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(single.current), []);

  const photoEl = <Image source={photo} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />;
  const videoEl = <Proof src={proof} playing={active && !locked} />;

  const onTap = () => {
    const now = Date.now();
    if (onDoubleTap && now - lastTap.current < 280) {
      clearTimeout(single.current);
      lastTap.current = 0;
      haptic.soft();
      setPop(now);
      onDoubleTap();
      return;
    }
    lastTap.current = now;
    if (!onPressMain) return;
    if (!onDoubleTap) return onPressMain();
    clearTimeout(single.current);
    single.current = setTimeout(onPressMain, 280);
  };

  return (
    <View
      style={{
        width: "100%",
        aspectRatio: aspect,
        borderRadius: radius,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: C.card2,
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onTap} disabled={locked || (!onPressMain && !onDoubleTap)}>
        {swapped ? videoEl : photoEl}
      </Pressable>

      {!locked && (
        <Animated.View
          layout={LinearTransition.springify()}
          style={{ position: "absolute", top: 12, left: 12, width: "29%", aspectRatio: 4 / 5 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={swapped ? "Show photo large" : "Show proof clip large"}
            onPress={() => {
              haptic.soft();
              setSwapped((s) => !s);
            }}
            style={{
              flex: 1,
              borderRadius: 14,
              borderCurve: "continuous",
              overflow: "hidden",
              borderWidth: 2,
              borderColor: C.white,
              backgroundColor: C.black,
              boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
            }}
          >
            {swapped ? photoEl : videoEl}
          </Pressable>
        </Animated.View>
      )}

      {!locked && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 9,
            height: 24,
            borderRadius: R.pill,
            backgroundColor: C.scrim,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
          <Text style={{ color: C.white, fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.5 }}>PROOF 0:05</Text>
        </View>
      )}

      {!locked && verified && (
        <Animated.View
          entering={FadeIn}
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingLeft: 6,
            paddingRight: 9,
            height: 24,
            borderRadius: R.pill,
            backgroundColor: C.white,
          }}
        >
          {/* A white pill on the photo in both themes, so it keeps the light green. */}
          <Icon name="checkSeal" size={14} color={light.leaf} />
          <Text style={{ color: C.forest, fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.5 }}>VERIFIED</Text>
        </Animated.View>
      )}

      {pop > 0 && <Pop key={pop} id={pop} emoji={popEmoji} />}

      {locked && (
        <Animated.View entering={FadeIn} style={{ position: "absolute", inset: 0 } as never}>
          <BlurView intensity={70} tint={scheme} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
              <Icon name="lock" size={19} color={C.lime} />
            </View>
            {lockHint && (
              <View style={{ alignItems: "center", gap: 6, paddingHorizontal: 40 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.6, color: C.ink }}>Post yours to see theirs.</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink2, textAlign: "center" }}>
                  Do one green thing, prove it, and today’s feed unlocks.
                </Text>
              </View>
            )}
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}
