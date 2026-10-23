import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";

import { Icon, type IconName } from "@/components/icon";
import { C, F, shadow } from "@/theme/tokens";

// Kept apart from ui.tsx: the store raises toasts, and ui.tsx reads the store's language.

type ToastMsg = { id: number; text: string; icon?: IconName };
const useToast = create<{ msg: ToastMsg | null }>(() => ({ msg: null }));
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, icon?: IconName) {
  clearTimeout(toastTimer);
  useToast.setState({ msg: { id: Date.now(), text, icon } });
  toastTimer = setTimeout(() => useToast.setState({ msg: null }), 2400);
}

export function Toaster() {
  const msg = useToast((s) => s.msg);
  const { top } = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <Animated.View
      key={msg.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={{ position: "absolute", top: top + 8, left: 0, right: 0, alignItems: "center" }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: C.forest,
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 44,
          borderRadius: 22,
          boxShadow: shadow.lift,
          maxWidth: "90%",
        }}
      >
        {msg.icon && <Icon name={msg.icon} size={15} color={C.lime} />}
        <Text numberOfLines={2} style={{ flexShrink: 1, color: C.white, fontFamily: F.medium, fontSize: 14, lineHeight: 19, letterSpacing: -0.1 }}>
          {msg.text}
        </Text>
      </View>
    </Animated.View>
  );
}
