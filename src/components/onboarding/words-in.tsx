import { Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export function WordsIn({ text }: { text: string }) {
  const { T } = useTheme();
  const reducedMotion = useReducedMotion();
  if (reducedMotion) {
    return (
      <Text maxFontSizeMultiplier={1.2} style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>
        {text}
      </Text>
    );
  }
  let index = 0;
  return (
    <View style={{ gap: 0 }}>
      {text.split("\n").map((line, lineIndex) => (
        <View key={`${line}-${lineIndex}`} style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {line.split(" ").map((word) => {
            const delay = index++ * 45;
            return (
              <Animated.Text
                key={`${word}-${delay}`}
                entering={FadeInDown.delay(delay).springify()}
                maxFontSizeMultiplier={1.2}
                style={{ fontFamily: F.medium, fontSize: 38, lineHeight: 40, letterSpacing: -1.8, color: T.hero.color }}
              >
                {word}
                {" "}
              </Animated.Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}
