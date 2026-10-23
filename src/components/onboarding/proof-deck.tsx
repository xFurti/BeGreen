import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Icon } from "@/components/icon";
import { LeafBurst } from "@/components/nature";
import { HERO_PHOTOS } from "@/data/demo";
import { useI18n } from "@/i18n/use-i18n";
import { C, F, R } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const ACircle = Animated.createAnimatedComponent(Circle);

function VerifyRing({ taps, reducedMotion }: { taps: number; reducedMotion: boolean }) {
  const size = 74;
  const radius = 31;
  const length = 2 * Math.PI * radius;
  const progress = useSharedValue(taps / 3);
  useEffect(() => {
    progress.value = reducedMotion ? taps / 3 : withTiming(taps / 3, { duration: 220 });
  }, [progress, reducedMotion, taps]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  return (
    <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.mint2} strokeWidth={4} fill="none" />
      <ACircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={C.lime}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${length} ${length}`}
        fill="none"
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

export function ProofDeck({ width, active }: { width: number; active: boolean }) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [order, setOrder] = useState([0, 1, 2, 3]);
  const [taps, setTaps] = useState(0);
  const [burst, setBurst] = useState(0);
  const translateX = useSharedValue(0);
  const verifiedScale = useSharedValue(0);
  const cardWidth = width * 0.5;
  const cardHeight = cardWidth * 1.25;
  const finishSwipe = () => {
    setOrder((current) => [...current.slice(1), current[0]]);
    translateX.set(0);
    haptic.soft();
  };
  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((event) => {
      translateX.set(event.translationX);
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 80 || Math.abs(event.velocityX) > 500) {
        translateX.set(withTiming((event.translationX || event.velocityX) > 0 ? width : -width, { duration: 180 }, (done) => {
          if (done) runOnJS(finishSwipe)();
        }));
      } else {
        translateX.set(withSpring(0, { damping: 16, stiffness: 220 }));
      }
    });
  const top = order[0];
  const topStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotate: `${translateX.value / 18}deg` }],
  }));
  const verifiedStyle = useAnimatedStyle(() => ({ transform: [{ scale: verifiedScale.value }] }));
  const verify = () => {
    if (!active || taps >= 3) return;
    const next = taps + 1;
    setTaps(next);
    haptic.tap();
    if (next === 3) {
      haptic.success();
      verifiedScale.set(reducedMotion ? 1 : withSpring(1, { damping: 14, stiffness: 220 }));
      if (!reducedMotion) setBurst((id) => id + 1);
    }
  };
  const showVerified = taps >= 3;
  return (
    <View style={{ alignItems: "center", paddingTop: 4, gap: 12 }}>
      <View style={{ width: width * 0.82, height: cardHeight + 18, alignItems: "center", justifyContent: "center" }}>
        {order
          .slice()
          .reverse()
          .map((photo) => {
            const position = order.indexOf(photo);
            const isTop = photo === top;
            const card = (
              <Animated.View
                key={photo}
                style={[
                  {
                    position: "absolute",
                    left: (width * 0.82 - cardWidth) / 2,
                    top: 9,
                    width: cardWidth,
                    height: cardHeight,
                    borderRadius: 22,
                    overflow: "hidden",
                    borderWidth: 3,
                    borderColor: C.white,
                    boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
                    transform: [
                      { translateX: position === 1 ? -8 : position === 2 ? 8 : 0 },
                      { translateY: position * 9 },
                      { scale: 1 - position * 0.045 },
                      { rotate: `${(position - 1) * 7}deg` },
                    ],
                  },
                  isTop && topStyle,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("onboarding.deckA11y")}
                  accessibilityHint={t("onboarding.deckHint")}
                  onPress={() => {
                    if (active) finishSwipe();
                  }}
                  style={{ flex: 1 }}
                >
                  <Image source={HERO_PHOTOS[photo]} style={{ flex: 1 }} contentFit="cover" />
                </Pressable>
              </Animated.View>
            );
            return isTop ? <GestureDetector key={photo} gesture={pan}>{card}</GestureDetector> : card;
          })}
        {showVerified && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn}
            style={[
              { position: "absolute", bottom: -2, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.forest, paddingHorizontal: 12, height: 30, borderRadius: R.pill },
              verifiedStyle,
            ]}
          >
            <Icon name="checkSeal" size={13} color={C.lime} />
            <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 13 }}>{t("onboarding.verifiedBy3")}</Text>
          </Animated.View>
        )}
        {burst > 0 && <LeafBurst id={burst} />}
      </View>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: F.medium, color: C.forest, fontSize: 14 }}>{t("onboarding.verifyHint")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.verifyButton")}
          accessibilityValue={{ min: 0, max: 3, now: taps }}
          onPress={verify}
          style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}
        >
          <VerifyRing taps={taps} reducedMotion={!!reducedMotion} />
          <Icon name={showVerified ? "checkSeal" : "leaf"} size={22} color={C.lime} />
        </Pressable>
      </View>
    </View>
  );
}
