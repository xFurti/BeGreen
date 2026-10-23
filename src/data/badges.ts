import type { MessageKey } from "@/i18n/catalog";

export const BADGE_IDS = ["first-proof", "streak-7", "car-free-5", "spotter", "verifier-10", "goals-10"] as const;
export type BadgeId = (typeof BADGE_IDS)[number];
// What a person has done, counted once by the store. Badges are pure functions of this.
export type BadgeStats = { posts: number; streak: number; carFree: number; spotted: boolean; verified: number; goals: number };
export type Badge = {
  id: BadgeId;
  name: MessageKey;
  requirement: MessageKey;
  earned: (s: BadgeStats) => boolean;
  // Only for counted requirements: current value and goal, shown as "2/5 car-free trips".
  progress?: { key: MessageKey; of: (s: BadgeStats) => number; goal: number };
};

export const BADGES: readonly Badge[] = [
  { id: "first-proof", name: "badges.firstProof.name", requirement: "badges.firstProof.req", earned: (s) => s.posts > 0 },
  {
    id: "streak-7",
    name: "badges.streak7.name",
    requirement: "badges.streak7.req",
    earned: (s) => s.streak >= 7,
    progress: { key: "badges.streak7.progress", of: (s) => s.streak, goal: 7 },
  },
  {
    id: "car-free-5",
    name: "badges.carFree5.name",
    requirement: "badges.carFree5.req",
    earned: (s) => s.carFree >= 5,
    progress: { key: "badges.carFree5.progress", of: (s) => s.carFree, goal: 5 },
  },
  { id: "spotter", name: "badges.spotter.name", requirement: "badges.spotter.req", earned: (s) => s.spotted },
  {
    id: "verifier-10",
    name: "badges.verifier10.name",
    requirement: "badges.verifier10.req",
    earned: (s) => s.verified >= 10,
    progress: { key: "badges.verifier10.progress", of: (s) => s.verified, goal: 10 },
  },
  {
    id: "goals-10",
    name: "badges.goals10.name",
    requirement: "badges.goals10.req",
    earned: (s) => s.goals >= 10,
    progress: { key: "badges.goals10.progress", of: (s) => s.goals, goal: 10 },
  },
];

export const isBadgeId = (x: unknown): x is BadgeId => typeof x === "string" && (BADGE_IDS as readonly string[]).includes(x);
export const badgeById = (id: BadgeId) => BADGES.find((b) => b.id === id)!;
export const earnedBadges = (s: BadgeStats) => BADGES.filter((b) => b.earned(s)).map((b) => b.id);
