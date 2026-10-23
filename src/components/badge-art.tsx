import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import type { BadgeId } from "@/data/badges";
import { badgeArt } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// One medal for every badge: white face, ink drawing, lime ring when earned — a sticker,
// like the SeedBuddy art, so it reads the same on the forest tile in both themes.
// Locked badges flip to a faint engraved version whose ring fills with the progress made.
const RING_R = 106;
const RING_C = 2 * Math.PI * RING_R;

type Palette = { face: string; ink: string; leaf: string; lime: string; earned: boolean };

function Glyph({ id, p }: { id: BadgeId; p: Palette }) {
  switch (id) {
    // Viewfinder framing the first sprout: the first proof photographed.
    case "first-proof":
      return (
        <>
          <G fill="none" stroke={p.ink} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M72 104V76H100M140 76H168V104M168 136V164H140M100 164H72V136" />
          </G>
          <Path d="M120 154V128" stroke={p.ink} strokeWidth={8} strokeLinecap="round" />
          <Path d="M119 133C117 111 104 99 84 97 87 120 101 131 119 133Z" fill={p.leaf} />
          <Path d="M121 133C123 111 136 99 156 97 153 120 139 131 121 133Z" fill={p.leaf} />
        </>
      );
    // Streak flame with the 7 carved through it.
    case "streak-7":
      return (
        <>
          <Path
            d="M120 40C124 62 134 76 146 90 158 104 164 120 164 138 164 168 146 196 120 196 94 196 76 168 76 138 76 116 88 98 100 82 103 92 109 100 117 105 112 84 110 60 120 40Z"
            fill={p.lime}
          />
          <Path
            d="M99 104H141L114 174"
            fill="none"
            stroke={p.earned ? p.ink : p.face}
            strokeWidth={15}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    // The trip that did not burn fuel.
    case "car-free-5":
      return (
        <G fill="none" stroke={p.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={80} cy={152} r={26} />
          <Circle cx={160} cy={152} r={26} />
          <Path d="M80 152L116 152 134 100 98 100 80 152M116 152L98 100M134 100L160 152" />
          <Path d="M90 94H106" />
          <Path d="M134 100L148 88M148 88H160" />
        </G>
      );
    // A plant under the magnifier: observe before you name it.
    case "spotter":
      return (
        <>
          <Circle cx={106} cy={108} r={42} fill="none" stroke={p.ink} strokeWidth={12} />
          <Path d="M138 140L166 168" stroke={p.ink} strokeWidth={16} strokeLinecap="round" />
          <Path d="M106 132C102 108 112 92 132 86 132 112 122 128 106 132Z" fill={p.leaf} />
        </>
      );
    // Shield and check: ten proofs verified for the community.
    case "verifier-10":
      return (
        <>
          <Path d="M120 48L172 70V118C172 156 150 180 120 196 90 180 68 156 68 118V70Z" fill={p.ink} />
          <Path
            d="M94 120L114 141 150 96"
            fill="none"
            stroke={p.earned ? p.lime : p.face}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    // One globe for the shared goals.
    case "goals-10":
      return (
        <G fill="none" stroke={p.ink} strokeWidth={8}>
          <Circle cx={120} cy={120} r={56} />
          <Ellipse cx={120} cy={120} rx={26} ry={56} />
          <Path d="M64 120H176" />
          <Path d="M73 96Q120 113 167 96" />
          <Path d="M73 144Q120 161 167 144" />
        </G>
      );
  }
}

export function BadgeArt({
  id,
  size,
  earned = true,
  progress,
}: {
  id: BadgeId;
  size: number;
  earned?: boolean;
  progress?: number;
}) {
  const { C } = useTheme();
  const p: Palette = earned
    ? { face: badgeArt.face, ink: badgeArt.ink, leaf: badgeArt.leaf, lime: badgeArt.lime, earned }
    : { face: C.card2, ink: C.faint, leaf: C.faint, lime: C.faint, earned };
  const frac = earned ? 0 : Math.max(0, Math.min(1, progress ?? 0));
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" style={{ flexShrink: 0 }}>
      <Circle cx={120} cy={120} r={112} fill={p.face} />
      <Circle cx={120} cy={120} r={RING_R} fill="none" stroke={earned ? p.lime : C.faint} strokeWidth={8} />
      {frac > 0 && (
        <Circle
          cx={120}
          cy={120}
          r={RING_R}
          fill="none"
          stroke={C.leaf}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={[frac * RING_C, RING_C]}
          transform="rotate(-90 120 120)"
        />
      )}
      <Glyph id={id} p={p} />
    </Svg>
  );
}
