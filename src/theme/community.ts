import { CATEGORIES, type SpotCategory } from "@/data/community";
import type { Palette } from "@/theme/tokens";

export function categoryChipColors(C: Palette, category: SpotCategory, active: boolean) {
  const color = CATEGORIES[category].color;
  // These two map colours need deeper fills for small white labels (4.5:1).
  const fill = category === "swap" ? C.layerSwapStrong : category === "reports" ? C.layerReportsStrong : color;
  return {
    background: active ? fill : C.card,
    text: active ? C.white : C.ink,
    icon: active ? C.white : color,
    border: active ? fill : C.mute,
  };
}
