import { useColorScheme } from "react-native";

import { useApp } from "@/store/app-store";
import { THEMES, type Theme } from "@/theme/tokens";

// The palette and type styles for the theme in use: the one picked in Me, or the phone's when that's "system".
// Every component that colours something calls this, so a switch repaints the screen in place.
export function useTheme(): Theme {
  const pref = useApp((s) => s.theme);
  const system = useColorScheme();
  return THEMES[pref === "system" ? (system === "dark" ? "dark" : "light") : pref];
}
