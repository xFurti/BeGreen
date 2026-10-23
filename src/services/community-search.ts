import { eventPhase, type Spot, type SpotCategory } from "@/data/community";
import { distanceKm, type LatLon } from "@/services/geo";

// Map filters and the search box ("Where can I fix a bike?", "Events this weekend?"). Pure and offline.

export type MapFilters = {
  // Empty: every category.
  categories: SpotCategory[];
  upcoming: boolean;
  popular: boolean;
  fresh: boolean;
  openReports: boolean;
  friends: boolean;
  family: boolean;
  // Only places within this many km of you (needs your location).
  nearKm: number | null;
  examples: boolean;
};

export const NO_FILTERS: MapFilters = {
  categories: [],
  upcoming: false,
  popular: false,
  fresh: false,
  openReports: false,
  friends: false,
  family: false,
  nearKm: null,
  examples: true,
};

export function activeFilterCount(f: MapFilters) {
  return (
    (f.categories.length ? 1 : 0) +
    [f.upcoming, f.popular, f.fresh, f.openReports, f.friends, f.family, f.nearKm != null].filter(Boolean).length
  );
}

export type FilterContext = { now: number; friendIds: Set<string>; me: LatLon | null };

const WEEK = 7 * 864e5;
// "Most saved or liked": at least this many saves and reactions together.
const POPULAR = 2;

export const popularity = (s: Spot) => s.saves + Object.values(s.reactions).reduce((a, n) => a + n, 0);

export function applyFilters(spots: Spot[], f: MapFilters, ctx: FilterContext): Spot[] {
  return spots.filter((s) => {
    if (s.isExample && !f.examples) return false;
    if (f.categories.length && !f.categories.includes(s.category)) return false;
    if (f.upcoming && (s.kind !== "event" || eventPhase(s, ctx.now) === "ended")) return false;
    if (f.popular && popularity(s) < POPULAR) return false;
    if (f.fresh && ctx.now - s.createdAt > WEEK) return false;
    if (f.openReports && (s.kind !== "report" || s.status === "resolved")) return false;
    if (f.friends && !ctx.friendIds.has(s.authorId)) return false;
    // Only where it's been checked: a family tag on an unverified place isn't a promise.
    if (f.family && !(s.family && s.verifiedAt)) return false;
    if (f.nearKm != null) {
      if (!ctx.me || s.lat == null || s.lon == null) return false;
      if (distanceKm(ctx.me, { lat: s.lat, lon: s.lon }) > f.nearKm) return false;
    }
    return true;
  });
}

// ---------- search ----------

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Word stems in Italian and English that point to a map layer.
const INTENTS: Record<SpotCategory, string[]> = {
  repair: ["ripar", "aggiust", "repair", "fix", "riuso", "riutil", "reuse", "officin", "ciclofficin"],
  swap: ["scamb", "baratt", "prest", "don", "swap", "share", "condivid", "lend", "borrow", "give"],
  gardens: ["orto", "orti", "giardin", "garden", "associaz", "volontar", "allotment"],
  events: ["event", "incontr", "pulizi", "passeggiat", "mercatin", "cleanup", "meetup", "walk"],
  reports: ["segnal", "rifiut", "abbandon", "degrad", "litter", "report", "problem", "trascur", "neglect"],
  discover: ["scopr", "nascost", "interess", "negoz", "usato", "vintage", "thrift", "parco", "park", "discover", "hidden", "second", "shop"],
  moments: ["moment", "foto", "photo", "meme"],
};
const NEAR = ["vicino", "vicin", "near", "nearby", "intorno", "around"];
const WEEKEND = ["weekend", "sabato", "domenica", "saturday", "sunday"];
const STOP = new Set(
  (
    "dove posso quali quale ci sono c e e un una uno il lo la le gli i di da del della dei per mi me a al alla in con che cosa " +
    "questo questa this where can i a an the is are there what which any some to for of my me in at on do does find trovare cerco fine settimana"
  ).split(" "),
);

export type Query = { categories: SpotCategory[]; near: boolean; weekend: boolean; words: string[] };

export function parseQuery(q: string): Query {
  const text = normalize(q);
  const words = text.split(" ").filter(Boolean);
  const categories = new Set<SpotCategory>();
  let near = /vicino a me|near me/.test(text);
  let weekend = /fine settimana|this weekend/.test(text);
  const rest: string[] = [];
  for (const w of words) {
    if (STOP.has(w)) continue;
    let used = false;
    for (const [cat, stems] of Object.entries(INTENTS) as [SpotCategory, string[]][]) {
      if (stems.some((s) => w.startsWith(s))) {
        categories.add(cat);
        used = true;
      }
    }
    if (NEAR.some((s) => w.startsWith(s))) near = used = true;
    if (WEEKEND.some((s) => w.startsWith(s))) weekend = used = true;
    // Category words still help match titles ("repair café"), other words only match text.
    if (!used || w.length > 3) rest.push(w);
  }
  if (weekend) categories.add("events");
  return { categories: [...categories], near, weekend, words: rest };
}

// Saturday 00:00 to Sunday 23:59 of this week (today counts if it's the weekend).
export function weekendRange(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay();
  const toSat = day === 0 ? -1 : 6 - day;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + toSat).getTime();
  return { start, end: start + 2 * 864e5 - 1 };
}

const stem = (w: string) => (w.length > 5 ? w.slice(0, w.length - 2) : w);

export function searchSpots(spots: Spot[], q: string, ctx: FilterContext, text: (s: Spot) => string): Spot[] {
  const query = parseQuery(q);
  if (!query.categories.length && !query.words.length && !query.near) return [];
  const { start, end } = weekendRange(ctx.now);
  const scored = spots
    .map((s) => {
      if (query.weekend && (s.kind !== "event" || !s.startsAt || s.startsAt > end || (s.endsAt ?? s.startsAt) < start)) return null;
      const hay = normalize(text(s));
      const hits = query.words.filter((w) => hay.includes(stem(w))).length;
      const inCategory = query.categories.includes(s.category);
      if (query.categories.length && !inCategory && !hits) return null;
      if (!query.categories.length && query.words.length && !hits) return null;
      const km = ctx.me && s.lat != null && s.lon != null ? distanceKm(ctx.me, { lat: s.lat, lon: s.lon }) : null;
      if (query.near && ctx.me && (km == null || km > 5)) return null;
      return { s, score: hits * 2 + (inCategory ? 3 : 0) - (km ?? 0) / 10 + (s.verifiedAt ? 0.5 : 0) };
    })
    .filter((x): x is { s: Spot; score: number } => x !== null);
  return scored.sort((a, b) => b.score - a.score).map((x) => x.s);
}
