import { useEffect, useMemo } from "react";
import { create } from "zustand";

import { translate } from "@/i18n/catalog";
import type { Language } from "@/i18n/schema";
import { ensureChallenge } from "@/services/challenge";
import { buildDrop, challengeId, localizeDrop } from "@/services/drop";
import { fetchAreas, fetchNature, fetchPulse, SAMPLE_PULSE, type Pulse } from "@/services/env";
import { buildInsights } from "@/services/interpret";
import { hasBackend } from "@/services/supabase";
import { useApp } from "@/store/app-store";

const FRESH_MS = 20 * 60 * 1000;
let inflight: Promise<void> | null = null;

const useLoading = create<{ loading: boolean }>(() => ({ loading: false }));

// Live data for the Comune you picked (its coordinates, not your GPS).
export function refreshPulse(): Promise<void> {
  if (inflight) return inflight;
  useLoading.setState({ loading: true });
  inflight = (async () => {
    const place = useApp.getState().place;
    const pulse = await fetchPulse(place, useApp.getState().pulse, useApp.getState().language);
    useApp.getState().setPulse(pulse);
    await syncChallenge(pulse);
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

// Once today's challenge is settled it doesn't change, even when slower data arrives later.
async function syncChallenge(pulse: Pulse) {
  const { comune, challenge, language } = useApp.getState();
  if (!comune) return;
  const id = challengeId(comune.id);
  if (challenge?.id === id && !challenge.offline && (challenge.shared || !hasBackend)) return;
  const next = await ensureChallenge(comune, pulse, language);
  if (useApp.getState().comune?.id === comune.id) useApp.getState().setChallenge(next);
}

const SAMPLE_SPECIES = {
  "Bellis perennis": "ref.sampleSpecies.daisy",
  "Taraxacum officinale": "ref.sampleSpecies.dandelion",
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
  const comune = useApp((s) => s.comune);
  const challenge = useApp((s) => s.challenge);
  const explain = useApp((s) => s.explain);
  const posts = useApp((s) => s.posts);
  const language = useApp((s) => s.language);
  const loading = useLoading((s) => s.loading);
  const expected = challengeId(comune?.id ?? place.name);

  useEffect(() => {
    const stale =
      !pulse ||
      Date.now() - pulse.fetchedAt > FRESH_MS ||
      pulse.place.lat !== place.lat ||
      pulse.place.lon !== place.lon ||
      (!!comune && challenge?.id !== expected);
    if (stale) refreshPulse();
  }, [pulse, place, comune, challenge, expected]);

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
    const month = new Date().toISOString().slice(0, 7);
    const carFree = posts.filter(
      (p) => !p.isDemo && p.action === "move" && p.comuneId === comune?.id && new Date(p.createdAt).toISOString().startsWith(month),
    ).length;
    const insights = buildInsights(data, { carFree, areaName: comune?.name ?? data.place.name }, language);
    const drop =
      challenge?.id === expected ? localizeDrop(challenge, language, comune?.name ?? data.place.name) : { ...buildDrop(data, expected, language), offline: true };
    return { insights, drop };
  }, [data, posts, comune, challenge, expected, language]);

  // Not ready while today's shared challenge is still on its way, so its title doesn't flip.
  const settled = challenge?.id === expected || !loading;
  return { pulse: data, ready: !!pulse && settled, loading: loading || !pulse, refresh: refreshPulse, explain, ...derived };
}
