import * as Location from "expo-location";
import { useEffect, useMemo } from "react";
import { create } from "zustand";

import { buildDrop } from "@/services/drop";
import { fetchAreas, fetchPulse, SAMPLE_PULSE, type Place } from "@/services/env";
import { buildInsights } from "@/services/interpret";
import { useApp } from "@/store/app-store";

const FRESH_MS = 20 * 60 * 1000;
let inflight: Promise<void> | null = null;

const useLoading = create<{ loading: boolean }>(() => ({ loading: false }));

export function refreshPulse(relocate = false): Promise<void> {
  if (inflight) return inflight;
  useLoading.setState({ loading: true });
  inflight = (async () => {
    const { setPlace, setPulse } = useApp.getState();
    let p = useApp.getState().place;
    if (relocate) {
      const here = await locate();
      if (here) {
        p = here;
        setPlace(here);
      }
    }
    setPulse(await fetchPulse(p, useApp.getState().pulse));
    const place = p;
    fetchAreas(place)
      .then((areas) => ({ areas, areasStatus: undefined }))
      .catch(() => ({ areas: undefined, areasStatus: "error" as const }))
      .then((patch) => {
        const cur = useApp.getState().pulse;
        if (!cur || cur.place.lat !== place.lat || cur.place.lon !== place.lon) return;
        if (!patch.areas && cur.areas) return; // keep the last good list
        useApp.getState().setPulse({ ...cur, ...patch });
      });
  })().finally(() => {
    inflight = null;
    useLoading.setState({ loading: false });
  });
  return inflight;
}

export async function locate(): Promise<Place | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    // Coarsen to ~1 km: enough for local data, kinder to privacy.
    const lat = Math.round(pos.coords.latitude * 100) / 100;
    const lon = Math.round(pos.coords.longitude * 100) / 100;
    let name = "Your area";
    if (process.env.EXPO_OS !== "web") {
      const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      name = g?.city ?? g?.subregion ?? g?.region ?? name;
    }
    return { lat, lon, name };
  } catch {
    return null;
  }
}

export function usePulse() {
  const pulse = useApp((s) => s.pulse);
  const place = useApp((s) => s.place);
  const explain = useApp((s) => s.explain);
  const squads = useApp((s) => s.squads);
  const loading = useLoading((s) => s.loading);

  useEffect(() => {
    const stale = !pulse || Date.now() - pulse.fetchedAt > FRESH_MS || pulse.place.lat !== place.lat || pulse.place.lon !== place.lon;
    if (stale) refreshPulse(!pulse);
  }, [pulse, place]);

  const data = useMemo(() => pulse ?? { ...SAMPLE_PULSE, place }, [pulse, place]);

  const derived = useMemo(() => {
    const comune = squads.find((s) => s.kind === "comune");
    const insights = buildInsights(data, {
      carFree: comune?.monthly.move ?? 0,
      areaName: comune?.name.split("·").pop()?.trim() ?? data.place.name,
    });
    return { insights, drop: buildDrop(data) };
  }, [data, squads]);

  return { pulse: data, ready: !!pulse, loading: loading || !pulse, refresh: refreshPulse, explain, ...derived };
}
