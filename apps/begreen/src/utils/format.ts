import * as Haptics from "expo-haptics";

export function timeAgo(t: number) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function compact(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const ios = process.env.EXPO_OS === "ios";

export const haptic = {
  tap: () => ios && Haptics.selectionAsync(),
  soft: () => ios && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  thud: () => ios && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => ios && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
