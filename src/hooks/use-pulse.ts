import * as Location from "expo-location";
import { useEffect, useMemo } from "react";
import { create } from "zustand";

import { translate } from "@/i18n/catalog";
import type { Language } from "@/i18n/schema";
import { buildDrop } from "@/services/drop";
import { fetchAreas, fetchNature, fetchPulse, SAMPLE_PULSE, type Place, type Pulse } from "@/services/env";
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
    setPulse(await fetchPulse(p, useApp.getState().pulse, useApp.getState().language));
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
    let name = "";
    if (process.env.EXPO_OS !== "web") {
      const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      name = g?.city ?? g?.subregion ?? g?.region ?? name;
    }
    return { lat, lon, name };
  } catch {
    return null;
  }
}

const SAMPLE_SPECIES = {
  "Sciurus carolinensis": "ref.sampleSpecies.squirrel",
  "Columba palumbus": "ref.sampleSpecies.pigeon",
  "Hedera helix": "ref.sampleSpecies.ivy",
} as const;

function presentPulse(pulse: Pulse, lang: Language): Pulse {
  if (!pulse.nature) return pulse;
  if (pulse.sample) {
    return {
      ...pulse,
      nature: {
        ...pulse.nature,
        top: pulse.nature.top.map((species) => {
          const key = SAMPLE_SPECIES[species.name as keyof typeof SAMPLE_SPECIES];
          return key ? { ...species, common: translate(lang, key) } : species;
        }),
      },
    };
  }
  if ((pulse.nature.locale ?? "en") !== lang) {
    return { ...pulse, nature: { ...pulse.nature, top: pulse.nature.top.map((species) => ({ ...species, common: undefined })) } };
  }
  return pulse;
}

export function usePulse() {
  const pulse = useApp((s) => s.pulse);
  const place = useApp((s) => s.place);
  const explain = useApp((s) => s.explain);
  const squads = useApp((s) => s.squads);
  const language = useApp((s) => s.language);
  const loading = useLoading((s) => s.loading);

  useEffect(() => {
    const stale = !pulse || Date.now() - pulse.fetchedAt > FRESH_MS || pulse.place.lat !== place.lat || pulse.place.lon !== place.lon;
    if (stale) refreshPulse(!pulse);
  }, [pulse, place]);

  useEffect(() => {
    if (!pulse || pulse.sample || !pulse.nature || (pulse.nature.locale ?? "en") === language) return;
    let cancel = false;
    const here = pulse.place;
    fetchNature(here, language)
      .then((nature) => {
        if (cancel) return;
        const cur = useApp.getState().pulse;
        if (!cur || cur.place.lat !== here.lat || cur.place.lon !== here.lon) return;
        useApp.getState().setPulse({ ...cur, nature });
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [language, pulse]);

  const data = useMemo(() => presentPulse(pulse ?? { ...SAMPLE_PULSE, place }, language), [pulse, place, language]);

  const derived = useMemo(() => {
    const comune = squads.find((s) => s.kind === "comune");
    const insights = buildInsights(data, {
      carFree: comune?.monthly.move ?? 0,
      areaName: comune?.name.split("·").pop()?.trim() ?? data.place.name,
    }, language);
    return { insights, drop: buildDrop(data, language) };
  }, [data, squads, language]);

  return { pulse: data, ready: !!pulse, loading: loading || !pulse, refresh: refreshPulse, explain, ...derived };
}
