import * as Location from "expo-location";
import { create } from "zustand";

import type { LatLon } from "@/services/geo";

// Your position, only when you ask for it (near me, add a place here). Never stored, never shared.
type LocationState = { loc: LatLon | null; status: "idle" | "asking" | "ok" | "denied" | "unavailable"; at: number };

const useLocationStore = create<LocationState>(() => ({ loc: null, status: "idle", at: 0 }));

export async function requestMyLocation(): Promise<LatLon | null> {
  const s = useLocationStore.getState();
  if (s.loc && Date.now() - s.at < 5 * 60e3) return s.loc;
  useLocationStore.setState({ status: "asking" });
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      useLocationStore.setState({ status: "denied" });
      return null;
    }
    const pos =
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ??
      (await Location.getLastKnownPositionAsync().catch(() => null));
    if (!pos) {
      useLocationStore.setState({ status: "unavailable" });
      return null;
    }
    const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    useLocationStore.setState({ loc, status: "ok", at: Date.now() });
    return loc;
  } catch {
    useLocationStore.setState({ status: "unavailable" });
    return null;
  }
}

export function useMyLocation() {
  return useLocationStore();
}
