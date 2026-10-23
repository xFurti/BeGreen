import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/use-i18n";
import type { Language } from "@/i18n/schema";
import { C, F, R } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
];

// Binary switch. Each pole keeps its own language name. The group name follows the active language.
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("language.label")}
      style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: R.pill, padding: 3, flexShrink: 1 }}
    >
      {OPTIONS.map((option) => {
        const on = option.value === language;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: on, checked: on }}
            aria-checked={on}
            onPress={() => {
              if (on) return;
              haptic.tap();
              setLanguage(option.value);
            }}
            style={{
              paddingHorizontal: compact ? 10 : 12,
              height: compact ? 28 : 32,
              borderRadius: R.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? C.bg : "transparent",
            }}
          >
            <Text
              numberOfLines={1}
              style={{ fontFamily: F.medium, fontSize: compact ? 12 : 13, letterSpacing: -0.15, color: on ? C.ink : C.mute }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
