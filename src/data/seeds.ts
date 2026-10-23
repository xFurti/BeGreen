// Your seed: the buddy you plant at onboarding and grow with every proof.
// Pure data and rules, shared by the app and the tests. The species list mirrors the
// `profiles.seed` check in supabase/migrations; keep the two in sync.

import { seedArt } from "../theme/tokens.ts";

export const SEED_IDS = ["sunflower", "oak", "lavender", "poppy", "tomato", "fir"] as const;
export type SeedId = (typeof SEED_IDS)[number];

// What grows on top once the plant is fully grown.
export type Bloom = "flower" | "spikes" | "fruit" | "canopy" | "cone";

export type SeedSpecies = {
  id: SeedId;
  bloom: Bloom;
  // Petals, fruit or crown; the seed's coat; the eye of the flower.
  color: string;
  coat: string;
  heart: string;
};

export const SEEDS: Record<SeedId, SeedSpecies> = {
  sunflower: { id: "sunflower", bloom: "flower", ...seedArt.species.sunflower },
  oak: { id: "oak", bloom: "canopy", ...seedArt.species.oak },
  lavender: { id: "lavender", bloom: "spikes", ...seedArt.species.lavender },
  poppy: { id: "poppy", bloom: "flower", ...seedArt.species.poppy },
  tomato: { id: "tomato", bloom: "fruit", ...seedArt.species.tomato },
  fir: { id: "fir", bloom: "cone", ...seedArt.species.fir },
};

export function isSeedId(v: unknown): v is SeedId {
  return typeof v === "string" && (SEED_IDS as readonly string[]).includes(v);
}

// Someone who never picked a seed (older profiles, demo people) still gets one, always the same.
export function seedOf(id: string, chosen?: string | null): SeedId {
  if (isSeedId(chosen)) return chosen;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SEED_IDS[h % SEED_IDS.length];
}

// Seed · Sprout · Seedling · Plant · Bloom. The first proof (any Seeds at all) makes it sprout.
export const STAGE_IDS = ["seed", "sprout", "seedling", "plant", "bloom"] as const;
export type StageId = (typeof STAGE_IDS)[number];
export const STAGE_AT = [0, 1, 60, 200, 500] as const;

export type Growth = { stage: number; id: StageId; seeds: number; next?: number; toNext: number; progress: number };

// A plant only grows: Seeds never go down, so neither does the stage.
export function plantStage(seeds: number): number {
  const s = Math.max(0, seeds);
  let stage = 0;
  STAGE_AT.forEach((at, i) => {
    if (s >= at) stage = i;
  });
  return stage;
}

export function growthOf(seeds: number): Growth {
  const s = Math.max(0, Math.floor(seeds));
  const stage = plantStage(s);
  const next = STAGE_AT[stage + 1];
  const from = STAGE_AT[stage];
  return {
    stage,
    id: STAGE_IDS[stage],
    seeds: s,
    next,
    toNext: next == null ? 0 : next - s,
    progress: next == null ? 1 : (s - from) / (next - from),
  };
}

export type Mood = "happy" | "thirsty" | "cough" | "wow" | "sleepy";

// How the buddy reacts to today's ground in your Comune. Bad air beats dry soil.
export function moodFromGround(g: { aqi?: number; dryDays?: number; rain7?: number; moisture?: number }): Mood {
  if (g.aqi != null && g.aqi > 60) return "cough";
  if ((g.dryDays != null && g.dryDays >= 5 && (g.rain7 ?? 0) < 2) || (g.moisture != null && g.moisture < 0.12)) return "thirsty";
  return "happy";
}

// A grown plant whose streak broke looks a little thirsty until the next proof. Never smaller.
export function moodFromStreak(seeds: number, streak: number): Mood {
  return seeds > 0 && streak === 0 ? "thirsty" : "happy";
}

// Handle suggestions when the one you want is taken: free variants to tap.
export function handleVariants(handle: string, name = ""): string[] {
  const base = handle.slice(0, 20);
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out = [
    words.length > 1 ? `${words[0]}.${words[words.length - 1]}`.slice(0, 24) : "",
    `${base}.green`.slice(0, 24),
    `${base}_${new Date().getFullYear() % 100}`,
    `${base}${Math.floor(Math.random() * 90 + 10)}`,
    `${base}.seed`.slice(0, 24),
  ];
  return [...new Set(out.filter((h) => /^[a-z0-9._]{2,24}$/.test(h) && h !== handle))];
}
