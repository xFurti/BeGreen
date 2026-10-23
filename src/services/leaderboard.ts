import type { Post } from "@/data/types";
import { seedsFor } from "@/services/rewards";

// The weekly leaderboard of a community: Seeds from real proofs in the last 7 days. Pure, so it's unit tested.

const DAY = 864e5;
export const WEEK = 7 * DAY;

export { seedsFor };

export type Standing = { userId: string; points: number; proofs: number; me: boolean; postedToday: boolean };

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

// `counts` says which proofs belong to the community. `members` are listed even with no proof yet
// (a group of friends); a city lists only the people who posted. You're always on the board.
export function standings(
  posts: Post[],
  { me, members = [], counts, now = Date.now() }: { me: string; members?: string[]; counts: (p: Post) => boolean; now?: number },
): Standing[] {
  const since = now - WEEK;
  const rows = new Map<string, Standing>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { userId: id, points: 0, proofs: 0, me: id === me, postedToday: false }));
    return r;
  };
  row(me);
  members.forEach(row);
  const seen = new Set<string>();
  for (const p of posts) {
    if (p.isDemo || p.createdAt <= since || seen.has(p.id) || !counts(p)) continue;
    seen.add(p.id);
    const r = row(p.authorId);
    r.points += seedsFor(p);
    r.proofs += 1;
    if (sameDay(p.createdAt, now)) r.postedToday = true;
  }
  // Ties go to you, then to whoever posted more.
  return [...rows.values()].sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0) || b.proofs - a.proofs);
}

// Your place on the board, and who's just ahead.
export function rankOf(board: Standing[]) {
  const i = board.findIndex((r) => r.me);
  return { rank: i + 1, ahead: i > 0 ? board[i - 1] : undefined, mine: board[i] };
}
