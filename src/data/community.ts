import type { IconName } from "@/components/icon";
import type { Comment, Media } from "@/data/types";
import { fixed as C } from "@/theme/tokens";

// The Community: people, groups and places. Two kinds, and the app treats them differently:
// - a city ("territory"): a real place anyone can find and join, built around its map;
// - a group (friends, a class, an association, a neighbourhood): joined with an invite code, built around its leaderboard.

export type CommunityKind = "territory" | "school" | "association" | "neighbourhood" | "friends";
export type Visibility = "public" | "private";
export type BBox = { w: number; s: number; e: number; n: number };

export type Community = {
  id: string;
  name: string;
  kind: CommunityKind;
  description: string;
  // i18n key for the description of a bundled community, so it follows the app language.
  descriptionKey?: string;
  area: string;
  visibility: Visibility;
  center: { lat: number; lon: number };
  bbox: BBox;
  // Comuni the community covers: their proofs show up in its feed.
  comuni: string[];
  memberCount?: number;
};

// What someone shares…
export type SpotKind = "discovery" | "useful" | "event" | "challenge" | "report" | "moment";
// …and the map layer it sits on.
export type SpotCategory = "discover" | "repair" | "gardens" | "swap" | "events" | "reports" | "moments";
export type SpotStatus = "active" | "toVerify" | "resolved" | "done";
export type FlagReason = "outdated" | "wrong" | "inappropriate" | "resolved";

export type Spot = {
  id: string;
  communityId: string;
  authorId: string;
  kind: SpotKind;
  category: SpotCategory;
  title: string;
  body: string;
  photo?: Media;
  // Absent for a moment shared without a place: it stays off the map.
  lat?: number;
  lon?: number;
  precise: boolean;
  address: string;
  status: SpotStatus;
  startsAt?: number;
  endsAt?: number;
  family: boolean;
  visibility: "public" | "community";
  promptDay?: string;
  verifiedAt?: number;
  hidden?: boolean;
  createdAt: number;
  updatedAt: number;
  saves: number;
  going: number;
  reactions: Record<string, number>;
  comments: Comment[];
  // Example content for a quiet community: clearly labelled, never saved, flagged or counted.
  isExample?: boolean;
  // Saved on this device, not yet on the shared map.
  pending?: boolean;
};

export type CommunityChallenge = {
  id: string;
  communityId: string;
  template?: ChallengeTemplateId;
  title: string;
  body: string;
  category?: SpotCategory;
  goal: number;
  startsAt: number;
  endsAt: number;
  createdBy: string;
};

export type ChallengeEntry = { id: string; challengeId: string; userId: string; spotId?: string; note: string; createdAt: number };

export type Member = { userId: string; role: "member" | "moderator" };

// ---------- map layers ----------

export const CATEGORIES: Record<SpotCategory, { color: string; icon: IconName }> = {
  discover: { color: C.layerDiscover, icon: "sparkle" },
  repair: { color: C.layerRepair, icon: "wrench" },
  gardens: { color: C.layerGardens, icon: "plant" },
  swap: { color: C.layerSwap, icon: "swap" },
  events: { color: C.layerEvents, icon: "calendar" },
  reports: { color: C.layerReports, icon: "alert" },
  moments: { color: C.layerMoments, icon: "camera" },
};
export const CATEGORY_LIST = Object.keys(CATEGORIES) as SpotCategory[];

export const KINDS: Record<SpotKind, { icon: IconName; category: SpotCategory }> = {
  discovery: { icon: "sparkle", category: "discover" },
  useful: { icon: "wrench", category: "repair" },
  event: { icon: "calendar", category: "events" },
  challenge: { icon: "flag", category: "events" },
  report: { icon: "alert", category: "reports" },
  moment: { icon: "camera", category: "moments" },
};
export const KIND_LIST = Object.keys(KINDS) as SpotKind[];

export const COMMUNITY_KIND_ICON: Record<CommunityKind, IconName> = {
  territory: "map",
  school: "school",
  association: "people",
  neighbourhood: "building",
  friends: "people",
};

export const isCity = (c: Pick<Community, "kind">) => c.kind === "territory";

// ---------- bundled communities ----------

// Mirrors the row seeded in supabase/migrations/20261025000000_community.sql.
export const ALTO_VICENTINO: Community = {
  id: "alto-vicentino",
  name: "Alto Vicentino",
  kind: "territory",
  description: "",
  descriptionKey: "community.catalog.altoVicentino",
  area: "Alto Vicentino · Provincia di Vicenza",
  visibility: "public",
  center: { lat: 45.71, lon: 11.44 },
  bbox: { w: 11.3, s: 45.63, e: 11.58, n: 45.79 },
  comuni: [
    "Arsiero", "Breganze", "Caltrano", "Calvene", "Carrè", "Chiuppano", "Cogollo del Cengio", "Fara Vicentino", "Laghi",
    "Lugo di Vicenza", "Malo", "Marano Vicentino", "Monte di Malo", "Montecchio Precalcino", "Pedemonte", "Piovene Rocchette",
    "Posina", "Salcedo", "San Vito di Leguzzano", "Santorso", "Sarcedo", "Schio", "Thiene", "Tonezza del Cimone",
    "Torrebelvicino", "Valdastico", "Valli del Pasubio", "Velo d'Astico", "Villaverla", "Zanè", "Zugliano",
  ],
};

export const BUNDLED_COMMUNITIES: Community[] = [ALTO_VICENTINO];

// ---------- collective challenges ----------

export type ChallengeTemplateId = "fivePlaces" | "reuse" | "swap" | "thrift" | "cleanup" | "neglected" | "walk";

// Starter challenges any member can launch. Collaborative, concrete, no moral score.
export const CHALLENGE_TEMPLATES: Record<ChallengeTemplateId, { icon: IconName; category?: SpotCategory; goal: number; days: number }> = {
  fivePlaces: { icon: "sparkle", category: "discover", goal: 5, days: 14 },
  reuse: { icon: "recycle", category: "repair", goal: 10, days: 14 },
  swap: { icon: "swap", category: "swap", goal: 1, days: 21 },
  thrift: { icon: "shirt", category: "discover", goal: 3, days: 14 },
  cleanup: { icon: "trash", category: "events", goal: 8, days: 21 },
  neglected: { icon: "alert", category: "reports", goal: 3, days: 30 },
  walk: { icon: "map", category: "discover", goal: 6, days: 14 },
};
export const CHALLENGE_TEMPLATE_LIST = Object.keys(CHALLENGE_TEMPLATES) as ChallengeTemplateId[];

// ---------- the daily prompt ----------

// Simple and optional: skipping a day costs nothing.
export const DAILY_PROMPTS = ["reused", "green", "discovery", "secondHand", "repair", "hidden"] as const;
export type DailyPrompt = (typeof DAILY_PROMPTS)[number];

export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function promptOf(t = Date.now()): DailyPrompt {
  const d = new Date(t);
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return DAILY_PROMPTS[days % DAILY_PROMPTS.length];
}

// ---------- examples for a quiet community ----------

// Shown only while a community has few real places, labelled as examples everywhere,
// and placed on town centres with generic titles: they never claim a real place exists.
const EXAMPLES: { kind: SpotKind; category: SpotCategory; key: string; dLat: number; dLon: number; event?: number }[] = [
  { kind: "useful", category: "repair", key: "repair", dLat: 0.004, dLon: -0.07 },
  { kind: "discovery", category: "discover", key: "thrift", dLat: -0.002, dLon: 0.035 },
  { kind: "useful", category: "gardens", key: "garden", dLat: -0.03, dLon: -0.02 },
  { kind: "event", category: "events", key: "cleanup", dLat: 0.03, dLon: 0.01, event: 3 },
  { kind: "report", category: "reports", key: "litter", dLat: -0.045, dLon: 0.07 },
  { kind: "useful", category: "swap", key: "swap", dLat: 0.012, dLon: 0.09 },
];

export const EXAMPLE_AUTHOR = "example";
// Below this many real places, examples fill the map (and can be switched off).
export const EXAMPLE_UNDER = 5;
export const EXAMPLE_KEYS = EXAMPLES.map((e) => e.key);

export function examplesFor(c: Community, now = Date.now()): Spot[] {
  return EXAMPLES.map((e, i) => ({
    id: `example-${c.id}-${e.key}`,
    communityId: c.id,
    authorId: EXAMPLE_AUTHOR,
    kind: e.kind,
    category: e.category,
    title: `community.examples.${e.key}.title`,
    body: `community.examples.${e.key}.body`,
    lat: c.center.lat + e.dLat,
    lon: c.center.lon + e.dLon,
    precise: false,
    address: "",
    status: "active",
    startsAt: e.event ? new Date(now + e.event * 864e5).setHours(9, 30, 0, 0) : undefined,
    family: false,
    visibility: "public",
    createdAt: now - (i + 1) * 3 * 3600e3,
    updatedAt: now - (i + 1) * 3 * 3600e3,
    saves: 0,
    going: 0,
    reactions: {},
    comments: [],
    isExample: true,
  }));
}

// ---------- derived state ----------

export type EventPhase = "upcoming" | "ongoing" | "ended";

// An event without an end is over at the end of its day.
export function eventPhase(s: Pick<Spot, "startsAt" | "endsAt">, now = Date.now()): EventPhase | null {
  if (!s.startsAt) return null;
  const end = s.endsAt ?? new Date(s.startsAt).setHours(23, 59, 59, 999);
  if (now > end) return "ended";
  if (now >= s.startsAt) return "ongoing";
  return "upcoming";
}

export function challengeProgress(c: CommunityChallenge, entries: ChallengeEntry[], now = Date.now()) {
  const mine = entries.filter((e) => e.challengeId === c.id);
  const people = new Set(mine.map((e) => e.userId));
  const byPerson = new Map<string, number>();
  mine.forEach((e) => byPerson.set(e.userId, (byPerson.get(e.userId) ?? 0) + 1));
  return {
    count: mine.length,
    people: people.size,
    places: mine.filter((e) => e.spotId).length,
    pct: Math.min(1, mine.length / Math.max(1, c.goal)),
    done: mine.length >= c.goal,
    open: now >= c.startsAt && now <= c.endsAt,
    daysLeft: Math.max(0, Math.ceil((c.endsAt - now) / 864e5)),
    // Who contributed, most first: a thank-you list, not a leaderboard.
    contributors: [...byPerson].sort((a, b) => b[1] - a[1]).map(([userId, n]) => ({ userId, n })),
  };
}
