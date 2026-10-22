// BeGreen design tokens.
// White paper, black ink, one living green. Green marks growth and action (your row, the shutter,
// verified proofs, goals moved); data keeps its own signal colours (air bands, sources).

export const C = {
  bg: "#FFFFFF",
  ink: "#0A0A0A",
  ink2: "#3A3A3C",
  mute: "#8E8E93",
  faint: "#C7C7CC",
  line: "#ECECEC",
  card: "#F5F5F4",
  card2: "#EAEAE8",
  night: "#0A0A0A",
  night2: "#1A1A1A",
  nightLine: "#2A2A2A",
  nightMute: "#8A8A8A",
  white: "#FFFFFF",
  black: "#000000",
  // Brand greens
  forest: "#0B3D2A", // deep canopy: dark surfaces, green text on white
  forest2: "#174D39",
  forestLine: "#24604A",
  forestMute: "#8FB5A2",
  leaf: "#1F8A4C", // the brand green: icons, fills, progress (4.5:1 on white)
  lime: "#B6F23C", // new growth: accents on dark only
  mint: "#E6F6EC", // soft tint for cards and tracks
  mint2: "#CFE8D8",
  // Signals
  green: "#1F9D55",
  amber: "#C98A00",
  red: "#E5484D",
  blue: "#3E63DD",
  violet: "#6E56CF",
} as const;

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

export const T = {
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

export const shadow = {
  soft: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
  lift: "0 2px 6px rgba(0,0,0,0.08), 0 18px 44px rgba(0,0,0,0.14)",
} as const;
