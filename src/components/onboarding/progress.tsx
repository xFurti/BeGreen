import { Pressable, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { useTheme } from "@/theme/use-theme";

function Segment({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const { C } = useTheme();
  const fill = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [index - 1, index], [0, 100], "clamp")}%`,
  }));
  return (
    <View style={{ height: 4, alignSelf: "stretch", borderRadius: 2, overflow: "hidden", backgroundColor: C.mint2 }}>
      <Animated.View style={[{ height: "100%", backgroundColor: C.leaf }, fill]} />
    </View>
  );
}

export function OnboardingProgress({
  count,
  page,
  progress,
  onPress,
  stepLabel,
  segmentLabel,
}: {
  count: number;
  page: number;
  progress: SharedValue<number>;
  onPress: (index: number) => void;
  stepLabel: (index: number) => string;
  segmentLabel: (index: number) => string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={stepLabel(page)}
      accessibilityValue={{ min: 1, max: count, now: page + 1 }}
      style={{ flexDirection: "row", gap: 4 }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Pressable key={index} hitSlop={8} accessibilityRole="button" accessibilityLabel={segmentLabel(index)} onPress={() => onPress(index)} style={{ flex: 1 }}>
          <Segment index={index} progress={progress} />
        </Pressable>
      ))}
    </View>
  );
}
