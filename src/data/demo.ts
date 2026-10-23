import { ACTIONS, type ActionId } from "@/data/actions";
import type { Media, Post, User } from "@/data/types";
import type { Drop } from "@/services/drop";

// Bundled photos (Unsplash licence) and 5 s proof clips rendered from them.
// Used by the demo capture on simulators and by the example proofs for today's challenge.

const img = {
  bikeWhite: require("../../assets/demo/bike-white.jpg"),
  bikeBlack: require("../../assets/demo/bike-black.jpg"),
  bus: require("../../assets/demo/bus.jpg"),
  binsPark: require("../../assets/demo/bins-park.jpg"),
  binsColor: require("../../assets/demo/bins-color.jpg"),
  recycle: require("../../assets/demo/recycle-blue.jpg"),
  beachLitter: require("../../assets/demo/beach-litter.jpg"),
  beachCleanup: require("../../assets/demo/beach-cleanup.jpg"),
  oceanPlastic: require("../../assets/demo/ocean-plastic.jpg"),
  bottleGreen: require("../../assets/demo/bottle-green.jpg"),
  bottles: require("../../assets/demo/bottles.jpg"),
  meshBag: require("../../assets/demo/mesh-bag.jpg"),
  seedpots: require("../../assets/demo/seedpots.jpg"),
  seedlings: require("../../assets/demo/seedlings.jpg"),
  soil: require("../../assets/demo/soil.jpg"),
  fern: require("../../assets/demo/fern-hands.jpg"),
  forest: require("../../assets/demo/forest.jpg"),
  veggies: require("../../assets/demo/veggies.jpg"),
  leftovers: require("../../assets/demo/leftovers.jpg"),
  thriftFlat: require("../../assets/demo/thrift-flatlay.jpg"),
  thriftRack: require("../../assets/demo/thrift-rack.jpg"),
  sprig: require("../../assets/demo/sprig.jpg"),
  ecosign: require("../../assets/demo/ecosign.jpg"),
  bales: require("../../assets/demo/plastic-bales.jpg"),
};

const clip = {
  bike: require("../../assets/proof/bike-black.mp4"),
  bins: require("../../assets/proof/bins-color.mp4"),
  recycle: require("../../assets/proof/recycle-blue.mp4"),
  cleanup: require("../../assets/proof/beach-cleanup.mp4"),
  bottle: require("../../assets/proof/bottle-green.mp4"),
  soil: require("../../assets/proof/soil.mp4"),
  forest: require("../../assets/proof/forest.mp4"),
  leftovers: require("../../assets/proof/leftovers.mp4"),
  thrift: require("../../assets/proof/thrift-rack.mp4"),
  bales: require("../../assets/proof/plastic-bales.mp4"),
};

const SETS: Record<ActionId, { photos: number[]; clip: number }> = {
  move: { photos: [img.bikeWhite, img.bus, img.bikeBlack], clip: clip.bike },
  sort: { photos: [img.binsPark, img.recycle, img.binsColor], clip: clip.recycle },
  pickup: { photos: [img.beachLitter, img.beachCleanup, img.oceanPlastic], clip: clip.cleanup },
  refill: { photos: [img.bottleGreen, img.bottles, img.meshBag], clip: clip.bottle },
  plant: { photos: [img.seedpots, img.seedlings, img.soil], clip: clip.soil },
  spot: { photos: [img.fern, img.forest], clip: clip.forest },
  plate: { photos: [img.veggies, img.leftovers], clip: clip.leftovers },
  rewear: { photos: [img.thriftFlat, img.thriftRack], clip: clip.thrift },
  save: { photos: [img.sprig], clip: clip.bottle },
  crew: { photos: [img.ecosign, img.bales], clip: clip.bales },
};

// Used by the demo capture on simulators, so the demo matches the chosen act.
export const DEMO_BY_ACTION = Object.fromEntries(
  (Object.keys(SETS) as ActionId[]).map((a) => [a, { photo: SETS[a].photos[0], clip: SETS[a].clip }]),
) as Record<ActionId, { photo: number; clip: number }>;

export const HERO_PHOTOS = [img.fern, img.bikeWhite, img.seedpots, img.beachLitter];

// Bundled media can't be uploaded by reference, so shared posts store "asset:<key>" instead.
const REGISTRY: Record<string, number> = {};
(Object.keys(SETS) as ActionId[]).forEach((a) => {
  SETS[a].photos.forEach((p, i) => (REGISTRY[`${a}.photo.${i}`] = p));
  REGISTRY[`${a}.proof`] = SETS[a].clip;
});

export function assetKey(m: number): string | null {
  const hit = Object.entries(REGISTRY).find(([, v]) => v === m);
  return hit ? `asset:${hit[0]}` : null;
}

export function resolveMedia(m: string): Media {
  return m.startsWith("asset:") ? (REGISTRY[m.slice(6)] ?? m) : m;
}

export const DEMO_AUTHOR: User = { id: "demo", name: "BeGreen example", handle: "example", tag: "Demo" };

// Example proofs for today's challenge, so a quiet Comune still shows what the Drop looks like.
export function demoPostsFor(drop: Drop, place: string): Post[] {
  const set = SETS[drop.action];
  const captions = ACTIONS[drop.action].captions;
  const midnight = new Date().setHours(0, 0, 0, 0);
  return [0, 1, 2].map((i) => ({
    id: `demo-${drop.id}-${i}`,
    authorId: DEMO_AUTHOR.id,
    action: drop.action,
    photo: set.photos[i % set.photos.length],
    proof: set.clip,
    caption: captions[i % captions.length],
    place,
    createdAt: Math.max(midnight + 60e3 * (i + 1), Date.now() - (i + 1) * 47 * 60e3),
    verifiedBy: [],
    reactions: {},
    comments: [],
    isDrop: true,
    audience: "public",
    isDemo: true,
  }));
}
