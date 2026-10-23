import * as Haptics from "expo-haptics";

const ios = process.env.EXPO_OS === "ios";

export const haptic = {
  tap: () => ios && Haptics.selectionAsync(),
  soft: () => ios && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  thud: () => ios && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => ios && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
