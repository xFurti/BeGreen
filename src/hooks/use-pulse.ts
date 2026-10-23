import { useEffect, useMemo } from "react";
import { create } from "zustand";

import { ensureChallenge } from "@/services/challenge";
import { buildDrop, challengeId } from "@/services/drop";
import { fetchAreas, fetchPulse, SAMPLE_PULSE, type Pulse } from "@/services/env";
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
    const pulse = await fetchPulse(place, useApp.getState().pulse);
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
  const { comune, challenge } = useApp.getState();
  if (!comune) return;
  const id = challengeId(comune.id);
  if (challenge?.id === id && !challenge.offline && (challenge.shared || !hasBackend)) return;
  const next = await ensureChallenge(comune, pulse);
  if (useApp.getState().comune?.id === comune.id) useApp.getState().setChallenge(next);
}

export function usePulse() {
  const pulse = useApp((s) => s.pulse);
  const place = useApp((s) => s.place);
  const comune = useApp((s) => s.comune);
  const challenge = useApp((s) => s.challenge);
  const explain = useApp((s) => s.explain);
  const posts = useApp((s) => s.posts);
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

  const data = useMemo(() => pulse ?? { ...SAMPLE_PULSE, place }, [pulse, place]);

  const derived = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const carFree = posts.filter(
      (p) => !p.isDemo && p.action === "move" && p.comuneId === comune?.id && new Date(p.createdAt).toISOString().startsWith(month),
    ).length;
    const insights = buildInsights(data, { carFree, areaName: comune?.name ?? data.place.name });
    const drop = challenge?.id === expected ? challenge : { ...buildDrop(data, expected), offline: true };
    return { insights, drop };
  }, [data, posts, comune, challenge, expected]);

  // Not ready while today's shared challenge is still on its way, so its title doesn't flip.
  const settled = challenge?.id === expected || !loading;
  return { pulse: data, ready: !!pulse && settled, loading: loading || !pulse, refresh: refreshPulse, explain, ...derived };
}
