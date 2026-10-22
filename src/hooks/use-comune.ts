import { useEffect } from "react";
import { create } from "zustand";

import { fetchCitizenAir, fetchSpecies, resolveComune, statsFor, type ComuneId } from "@/services/comune";
import type { ComuneStats } from "@/services/comune-levels";
import type { Place } from "@/services/env";
import { useApp } from "@/store/app-store";

type Live<T> = { status: "loading" } | { status: "ok"; value: T } | { status: "error" };

export type ComuneView = {
  id?: ComuneId;
  stats?: ComuneStats;
  citizenAir: Live<{ median: number; sensors: number } | undefined>;
  species: Live<{ species: number; records: number }>;
};

const EMPTY: ComuneView = { citizenAir: { status: "loading" }, species: { status: "loading" } };

// One lookup per ~1 km place, kept for the session. Each part loads on its own: one slow API never blanks the section.
const useViews = create<Record<string, ComuneView>>(() => ({}));

function load(key: string, place: Place) {
  if (useViews.getState()[key]) return;
  useViews.setState({ [key]: EMPTY });
  const patch = (p: Partial<ComuneView>) => useViews.setState((s) => ({ [key]: { ...(s[key] ?? EMPTY), ...p } }));
  resolveComune(place).then((id) => patch({ id, stats: statsFor(id) }));
  fetchCitizenAir(place).then(
    (value) => patch({ citizenAir: { status: "ok", value } }),
    () => patch({ citizenAir: { status: "error" } }),
  );
  fetchSpecies(place).then(
    (value) => patch({ species: { status: "ok", value } }),
    () => patch({ species: { status: "error" } }),
  );
}

export function useComune(): ComuneView {
  const place = useApp((s) => s.place);
  const key = `${place.lat},${place.lon}`;
  const view = useViews((s) => s[key]);
  useEffect(() => load(key, place), [key, place]);
  return view ?? EMPTY;
}
