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
import { useI18n } from "@/i18n/use-i18n";
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
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      contentFit={fit}
      nativeControls={false}
      allowsPictureInPicture={false}
      useExoShutter={false}
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
  priority = "normal",
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
  priority?: "low" | "normal" | "high";
  onPressMain?: () => void;
  onDoubleTap?: () => void;
  popEmoji?: string;
}) {
  const { C, scheme } = useTheme();
  const { t } = useI18n();
  const [swapped, setSwapped] = useState(false);
  const [loadedPhoto, setLoadedPhoto] = useState<Media | null>(() => (typeof photo === "number" ? photo : null));
  const [pop, setPop] = useState(0);
  const lastTap = useRef(0);
  const single = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(single.current), []);

  const photoReady = typeof photo === "number" || loadedPhoto === photo;
  const showClip = !locked && active && (swapped || photoReady);
  const mainPhoto = (
    <Image
      source={photo}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      priority={priority}
      transition={200}
      onLoad={() => setLoadedPhoto(photo)}
      onError={() => setLoadedPhoto(photo)}
    />
  );
  const insetPhoto = (
    <Image
      source={photo}
      style={{ position: "absolute", inset: 0 } as never}
      priority="low"
      contentFit="cover"
      blurRadius={swapped ? 0 : 14}
    />
  );

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
        {swapped ? (
          <View style={{ flex: 1 }}>
            {mainPhoto}
            {showClip && <Proof src={proof} playing={active && !locked} />}
          </View>
        ) : (
          mainPhoto
        )}
      </Pressable>

      {!locked && (
        <Animated.View
          layout={LinearTransition.springify()}
          style={{ position: "absolute", top: 12, left: 12, width: "29%", aspectRatio: 4 / 5 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={swapped ? t("proof.showPhoto") : t("proof.showClip")}
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
            <View style={{ flex: 1 }}>
              {insetPhoto}
              {!showClip && !swapped && (
                <View
                  pointerEvents="none"
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: C.scrim }}
                >
                  <Icon name="play" size={18} color={C.white} />
                </View>
              )}
              {showClip && !swapped && <Proof src={proof} playing={active && !locked} />}
            </View>
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
          <Text style={{ color: C.white, fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.5 }}>{t("common.proof")}</Text>
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
          <Text style={{ color: C.forest, fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.5 }}>{t("common.verified")}</Text>
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
                <Text style={{ fontFamily: F.medium, fontSize: 20, letterSpacing: -0.6, color: C.ink, textAlign: "center" }}>{t("proof.lockTitle")}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink2, textAlign: "center" }}>{t("proof.lockBody")}</Text>
              </View>
            )}
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}
