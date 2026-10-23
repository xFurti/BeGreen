import { Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { CATEGORIES, eventPhase, type Spot, type SpotCategory } from "@/data/community";
import { F, fixed } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// Resolved reports and past events stay on the map as history, greyed out.
export const PAST = fixed.past;

export function pinColor(s: Spot) {
  if (s.kind === "report" && s.status === "resolved") return PAST;
  if (s.kind === "event" && eventPhase(s) === "ended") return PAST;
  return CATEGORIES[s.category].color;
}

export const PIN = { w: 38, h: 46 };

// A drop-shaped pin with the layer's colour and symbol. Examples are dashed, verified places carry a check.
export function SpotPin({ spot, selected }: { spot: Spot; selected?: boolean }) {
  const { C } = useTheme();
  const color = pinColor(spot);
  const size = selected ? 36 : 30;
  return (
    <View style={{ width: PIN.w, height: PIN.h, alignItems: "center", justifyContent: "flex-end" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderBottomRightRadius: 4,
          transform: [{ rotate: "45deg" }],
          backgroundColor: spot.isExample ? C.white : color,
          borderWidth: 2,
          borderColor: spot.isExample ? color : selected ? C.ink : C.white,
          borderStyle: spot.isExample ? "dashed" : "solid",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 7,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        <View style={{ transform: [{ rotate: "-45deg" }] }}>
          <Icon name={CATEGORIES[spot.category].icon} size={selected ? 16 : 14} color={spot.isExample ? color : C.white} />
        </View>
      </View>
      {!!spot.verifiedAt && (
        <View
          style={{
            position: "absolute",
            top: selected ? -2 : 4,
            right: 0,
            width: 15,
            height: 15,
            borderRadius: 8,
            backgroundColor: C.leaf,
            borderWidth: 1.5,
            borderColor: C.white,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={8} color={C.onLeaf} />
        </View>
      )}
    </View>
  );
}

// Several pins too close to tell apart. Tapping zooms in.
export function ClusterPin({ count, categories }: { count: number; categories: SpotCategory[] }) {
  const { C } = useTheme();
  const ring = [...new Set(categories)].slice(0, 4);
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: C.forest,
        borderWidth: 2,
        borderColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
      }}
    >
      <Text style={{ fontFamily: F.monoMedium, fontSize: 14, color: C.lime }}>{count}</Text>
      <View style={{ position: "absolute", bottom: 4, flexDirection: "row", gap: 2 }}>
        {ring.map((c) => (
          <View key={c} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: CATEGORIES[c].color }} />
        ))}
      </View>
    </View>
  );
}

// A small dot for static previews.
export function SpotDot({ spot }: { spot: Spot }) {
  const { C } = useTheme();
  const color = pinColor(spot);
  return (
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: spot.isExample ? C.white : color,
        borderWidth: 2,
        borderColor: spot.isExample ? color : C.white,
        borderStyle: spot.isExample ? "dashed" : "solid",
      }}
    />
  );
}
