import { useState } from "react";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, runOnJS } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { HERO_PHOTOS } from "@/data/demo";
import { useI18n } from "@/i18n/use-i18n";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export function ProofDeck({ width, active }: { width: number; active: boolean }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [order, setOrder] = useState([0, 1, 2, 3]);
  const translateX = useSharedValue(0);
  const cardWidth = width * 0.5;
  const cardHeight = cardWidth * 1.25;
  const finishSwipe = () => {
    setOrder((current) => [...current.slice(1), current[0]]);
    translateX.set(0);
    haptic.soft();
  };
  const pan = Gesture.Pan()
    .enabled(active && !reducedMotion)
    .onUpdate((event) => translateX.set(event.translationX))
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 80 || Math.abs(event.velocityX) > 500) {
        translateX.set(withTiming((event.translationX || event.velocityX) > 0 ? width : -width, { duration: 180 }, (done) => {
          if (done) runOnJS(finishSwipe)();
        }));
      } else translateX.set(withSpring(0, { damping: 16, stiffness: 220 }));
    });
  const topStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }, { rotate: `${translateX.value / 18}deg` }] }));
  const top = order[0];
  return (
    <View style={{ alignItems: "center", paddingTop: 4 }}>
      <View style={{ width: width * 0.82, height: cardHeight + 18, alignItems: "center", justifyContent: "center" }}>
        {order.slice().reverse().map((photo) => {
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
                    { rotate: `${position === 1 ? -4 : position === 2 ? 4 : 0}deg` },
                  ],
                },
                isTop && topStyle,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("onboarding.deckA11y")}
                accessibilityHint={t("onboarding.deckHint")}
                onPress={() => active && finishSwipe()}
                style={{ flex: 1 }}
              >
                <Image source={HERO_PHOTOS[photo]} style={{ flex: 1 }} contentFit="cover" />
                {isTop && (
                  <View style={{ position: "absolute", bottom: 10, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.forest, paddingHorizontal: 12, height: 30, borderRadius: R.pill }}>
                    <Icon name="checkSeal" size={13} color={C.lime} />
                    <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 13 }}>{t("onboarding.verifiedBy3")}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
          return isTop ? <GestureDetector key={photo} gesture={pan}>{card}</GestureDetector> : card;
        })}
      </View>
    </View>
  );
}
