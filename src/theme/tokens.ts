// BeGreen design tokens.
// White paper, black ink, one living green. Green marks growth and action (your row, the shutter,
// verified proofs, goals moved); data keeps its own signal colours (air bands, sources).
// Two palettes with the same keys. Read them through `useTheme()`, never at import time.

// The same in both themes: dark surfaces (camera, forest cards), brand accents and data signals.
// Data files may import these directly.
export const fixed = {
  night: "#0A0A0A",
  night2: "#1A1A1A",
  nightLine: "#2A2A2A",
  nightMute: "#8A8A8A",
  white: "#FFFFFF", // on dark surfaces and media only; the page itself is `bg`
  black: "#000000",
  // Brand greens
  forest: "#0B3D2A", // deep canopy: dark surfaces, in both themes
  forest2: "#174D39",
  forestLine: "#24604A",
  forestMute: "#8FB5A2",
  lime: "#B6F23C", // new growth: accents on dark only
  // Signals
  green: "#1F9D55",
  amber: "#C98A00",
  red: "#E5484D",
  blue: "#3E63DD",
  violet: "#6E56CF",
  grey: "#8E8E93",
  // On dark surfaces in both themes (camera, forest cards, photo scrims).
  glass: "rgba(255,255,255,0.12)",
  glassLine: "rgba(255,255,255,0.28)",
  ring: "rgba(255,255,255,0.22)",
  scrim: "rgba(0,0,0,0.5)",
  // Brand Kit — logo, app icon and splash. Never Proof Lime on white (1.4:1).
  canopy: "#152315",
  proofLime: "#C8E61A",
  // Community map: the seven layers, history pins (resolved, ended), the land under OSM tiles, the Love your city mark.
  layerDiscover: "#6E56CF",
  layerRepair: "#2F5BD3",
  layerGardens: "#1B7D44",
  layerSwap: "#D9480F",
  layerEvents: "#C2255C",
  layerReports: "#B07800",
  // Accessible chip fills; keep the map's category colours unchanged.
  layerSwapStrong: "#C8400B",
  layerReportsStrong: "#936400",
  layerMoments: "#0E7C86",
  past: "#9AA39A",
  mapLand: "#F2EFE9",
  loveRed: "#EB2127",
} as const;

const lightRoles = {
  bg: "#FFFFFF",
  ink: "#0A0A0A",
  ink2: "#3A3A3C",
  mute: "#8E8E93",
  faint: "#C7C7CC",
  line: "#ECECEC",
  card: "#F5F5F4",
  card2: "#EAEAE8",
  raised: "#FFFFFF", // the selected pill of a Segmented
  veil: "rgba(255,255,255,0.96)", // under the status bar
  bar: "rgba(255,255,255,0.98)", // tab bar
  forestInk: "#0B3D2A", // green text and icons on the page
  leaf: "#1B7D44", // the brand green: icons, fills, progress (5.2:1 on white, 4.6:1 on mint)
  onLeaf: "#FFFFFF", // text on a leaf fill
  mint: "#E6F6EC", // soft tint for cards and tracks
  mint2: "#CFE8D8",
  // Chart bars, progress tracks and outlines. Same as mint2 in light, so the light theme does not move.
  band: "#CFE8D8",
};

export type Palette = typeof fixed & { [K in keyof typeof lightRoles]: string };

export const light: Palette = { ...fixed, ...lightRoles };

export const dark: Palette = {
  ...fixed,
  bg: "#0B0B0B",
  ink: "#F2F2EF",
  ink2: "#C9C9C6",
  mute: "#9B9BA1", // 6.4:1 on card
  faint: "#5E5E63",
  line: "#262626",
  card: "#181818",
  card2: "#232323",
  raised: "#2C2C2E",
  veil: "rgba(11,11,11,0.96)",
  bar: "rgba(11,11,11,0.98)",
  forestInk: "#A6E3BC", // 10:1 on mint
  leaf: "#3DBB72", // 8:1 on bg, 6.4:1 on mint
  onLeaf: "#0A0A0A", // 8:1 on the lighter leaf; white would be 2.6:1
  mint: "#11261A",
  mint2: "#1C3B2A",
  // 3.7:1 on bg, 3.4:1 on card, 3:1 on mint. mint2 is 1.6:1 on bg, so bars drawn with it vanish.
  band: "#34785A",
};

// Geist for everything; Geist Mono for labels, numbers and metadata.
export const F = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  mono: "GeistMono_400Regular",
  monoMedium: "GeistMono_500Medium",
} as const;

export const R = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const S = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

function type(C: Palette) {
  return {
    mega: { fontFamily: F.medium, fontSize: 112, lineHeight: 112, letterSpacing: -7, color: C.ink },
    hero: { fontFamily: F.medium, fontSize: 44, lineHeight: 46, letterSpacing: -2, color: C.ink },
    display: { fontFamily: F.medium, fontSize: 34, lineHeight: 38, letterSpacing: -1.4, color: C.ink },
    title: { fontFamily: F.medium, fontSize: 22, lineHeight: 27, letterSpacing: -0.7, color: C.ink },
    headline: { fontFamily: F.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2, color: C.ink },
    body: { fontFamily: F.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.15, color: C.ink },
    callout: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1, color: C.ink2 },
    caption: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.mute },
    label: {
      fontFamily: F.monoMedium,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: C.mute,
    },
    num: { fontFamily: F.medium, fontVariant: ["tabular-nums"], letterSpacing: -1, color: C.ink },
  } as const;
}

export const shadow = {
  soft: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
  lift: "0 2px 6px rgba(0,0,0,0.08), 0 18px 44px rgba(0,0,0,0.14)",
} as const;

export type Scheme = "light" | "dark";
export type Theme = { scheme: Scheme; C: Palette; T: ReturnType<typeof type> };

export const THEMES: Record<Scheme, Theme> = {
  light: { scheme: "light", C: light, T: type(light) },
  dark: { scheme: "dark", C: dark, T: type(dark) },
};
