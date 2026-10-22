import "expo-sqlite/localStorage/install";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ACTIONS, type ActionId } from "@/data/actions";
import { DEMO_CLIP, FRIENDS, HERO_PHOTOS, ME_ID, SEED_POSTS, SEED_SQUADS, USERS, WEEKLY } from "@/data/seed";
import type { Audience, Comment, Explain, Post, Role, Squad } from "@/data/types";
import { DEFAULT_PLACE, type Place, type Pulse } from "@/services/env";

export type Profile = { name: string; handle: string; role: Role };

type State = {
  onboarded: boolean;
  profile: Profile;
  explain: Explain;
  place: Place;
  pulse: Pulse | null;
  myPosts: Post[];
  verified: Record<string, true>;
  reacted: Record<string, string>;
  comments: Record<string, Comment[]>;
  squads: Squad[];
  bonusSeeds: number;
  nudged: Record<string, number>;
};

type Actions = {
  finishOnboarding: (p: Profile, withDemo: boolean) => void;
  setExplain: (e: Explain) => void;
  setPlace: (p: Place) => void;
  setPulse: (p: Pulse) => void;
  addPost: (p: {
    action: ActionId;
    photo: string | number;
    proof: string | number;
    caption: string;
    audience: Audience;
    place: string;
    isDrop: boolean;
    squadId?: string;
  }) => Post;
  verify: (postId: string) => void;
  react: (postId: string, emoji: string) => void;
  comment: (postId: string, text: string) => void;
  createSquad: (s: Pick<Squad, "name" | "kind" | "place">) => Squad;
  joinSquad: (code: string) => Squad | null;
  nudge: (userId: string) => void;
  reset: () => void;
};

const initial: State = {
  onboarded: false,
  profile: { name: "", handle: "", role: "student" },
  explain: "me",
  place: DEFAULT_PLACE,
  pulse: null,
  myPosts: [],
  verified: {},
  reacted: {},
  comments: {},
  squads: SEED_SQUADS,
  bonusSeeds: 0,
  nudged: {},
};

const D = 864e5;

// A short history so a fresh demo has a streak and Memories to look at.
function demoHistory(): Post[] {
  const acts: ActionId[] = ["move", "refill", "sort", "move", "plant", "rewear", "move", "spot", "sort"];
  const days = [1, 2, 3, 5, 6, 9, 11, 12, 15];
  return days.map((d, i) => ({
    id: `me-demo-${d}`,
    authorId: ME_ID,
    action: acts[i],
    photo: HERO_PHOTOS[i % HERO_PHOTOS.length],
    proof: DEMO_CLIP,
    caption: "",
    place: DEFAULT_PLACE.name,
    createdAt: Date.now() - d * D - 3 * 3600e3,
    verifiedBy: ["giulia", "marco", "nico"].slice(0, 2 + (i % 2)),
    reactions: { "💚": 4 + i },
    comments: [],
    audience: "friends",
  }));
}

export const useApp = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      finishOnboarding: (profile, withDemo) =>
        set({
          onboarded: true,
          profile,
          explain: profile.role === "student" ? "me" : profile.role === "comune" ? "comune" : "class",
          myPosts: withDemo ? demoHistory() : [],
        }),
      setExplain: (explain) => set({ explain }),
      setPlace: (place) => set({ place }),
      setPulse: (pulse) => set({ pulse }),
      addPost: (input) => {
        const post: Post = {
          id: `me-${Date.now()}`,
          authorId: ME_ID,
          verifiedBy: [],
          reactions: {},
          comments: [],
          createdAt: Date.now(),
          ...input,
        };
        set({
          myPosts: [post, ...get().myPosts],
          squads: input.squadId
            ? get().squads.map((s) =>
                s.id === input.squadId
                  ? {
                      ...s,
                      points: s.points + ACTIONS[input.action].seeds,
                      quest: s.quest.action === input.action ? { ...s.quest, progress: s.quest.progress + 1 } : s.quest,
                      monthly: { ...s.monthly, [input.action]: (s.monthly[input.action] ?? 0) + 1 },
                    }
                  : s,
              )
            : get().squads,
        });
        return post;
      },
      verify: (postId) => {
        if (get().verified[postId]) return;
        set({ verified: { ...get().verified, [postId]: true }, bonusSeeds: get().bonusSeeds + 2 });
      },
      react: (postId, emoji) => {
        const r = { ...get().reacted };
        if (r[postId] === emoji) delete r[postId];
        else r[postId] = emoji;
        set({ reacted: r });
      },
      comment: (postId, text) => {
        const c: Comment = { id: `c-${Date.now()}`, authorId: ME_ID, text, createdAt: Date.now() };
        set({ comments: { ...get().comments, [postId]: [...(get().comments[postId] ?? []), c] } });
      },
      createSquad: ({ name, kind, place }) => {
        const s: Squad = {
          id: `s-${Date.now()}`,
          name,
          kind,
          place,
          memberIds: [ME_ID],
          memberCount: 1,
          code:
            name
              .replace(/[^a-z0-9]/gi, "")
              .slice(0, 6)
              .toUpperCase() + Math.floor(Math.random() * 90 + 10),
          points: 0,
          quest: { title: "First 10 proofs", action: "sort", goal: 10, progress: 0, endsInDays: 7 },
          monthly: {},
        };
        set({ squads: [s, ...get().squads] });
        return s;
      },
      joinSquad: (code) => {
        const c = code.trim().toUpperCase();
        return get().squads.find((s) => s.code === c) ?? null;
      },
      nudge: (userId) => set({ nudged: { ...get().nudged, [userId]: Date.now() } }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "begreen-v1",
      storage: createJSONStorage(() => localStorage),
      // Bundled assets (numbers) are stable across reloads in the same build.
      partialize: (s) => ({
        onboarded: s.onboarded,
        profile: s.profile,
        explain: s.explain,
        place: s.place,
        pulse: s.pulse,
        myPosts: s.myPosts,
        verified: s.verified,
        reacted: s.reacted,
        comments: s.comments,
        squads: s.squads,
        bonusSeeds: s.bonusSeeds,
        nudged: s.nudged,
      }),
    },
  ),
);

// ---------- derived ----------

const dayStr = (t: number) => new Date(t).toDateString();

export function postedToday(posts: Post[]) {
  const today = dayStr(Date.now());
  return posts.some((p) => dayStr(p.createdAt) === today);
}

export function streakOf(posts: Post[]) {
  const days = new Set(posts.map((p) => dayStr(p.createdAt)));
  let n = 0;
  // Today counts if posted; otherwise the streak is still alive from yesterday.
  let t = Date.now();
  if (!days.has(dayStr(t))) t -= D;
  while (days.has(dayStr(t))) {
    n++;
    t -= D;
  }
  return n;
}

export function seedsOf(posts: Post[], bonus: number) {
  return posts.reduce((a, p) => a + ACTIONS[p.action].seeds + (p.isDrop ? 10 : 0), 0) + bonus;
}

export function withInteractions(p: Post, s: Pick<State, "verified" | "reacted" | "comments">): Post {
  const v = s.verified[p.id] && !p.verifiedBy.includes(ME_ID) ? [...p.verifiedBy, ME_ID] : p.verifiedBy;
  const mine = s.reacted[p.id];
  const reactions = mine ? { ...p.reactions, [mine]: (p.reactions[mine] ?? 0) + 1 } : p.reactions;
  return { ...p, verifiedBy: v, reactions, comments: [...p.comments, ...(s.comments[p.id] ?? [])] };
}

export function useAllPosts(): Post[] {
  const myPosts = useApp((s) => s.myPosts);
  const verified = useApp((s) => s.verified);
  const reacted = useApp((s) => s.reacted);
  const comments = useApp((s) => s.comments);
  return [...myPosts, ...SEED_POSTS]
    .map((p) => withInteractions(p, { verified, reacted, comments }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ---------- competition ----------

const WEEK = 7 * D;

export function weeklyOf(posts: Post[]) {
  const since = Date.now() - WEEK;
  return posts.filter((p) => p.createdAt > since).reduce((a, p) => a + ACTIONS[p.action].seeds + (p.isDrop ? 10 : 0), 0);
}

export type Racer = { id: string; name: string; avatar?: number | string; points: number; me: boolean; postedToday: boolean };

// This week's friends race. Friends' totals are demo values; yours is real.
export function leagueOf(myPosts: Post[], meName: string): Racer[] {
  const recent = (id: string) => SEED_POSTS.some((p) => p.authorId === id && Date.now() - p.createdAt < D);
  const friends: Racer[] = FRIENDS.map((id) => ({
    id,
    name: USERS[id].name,
    avatar: USERS[id].avatar,
    points: WEEKLY[id] ?? 0,
    me: false,
    postedToday: recent(id),
  }));
  const me: Racer = { id: ME_ID, name: meName || "You", points: weeklyOf(myPosts), me: true, postedToday: postedToday(myPosts) };
  // Ties go to you: it feels better and you earned it.
  return [...friends, me].sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
}

export function useLeague() {
  const myPosts = useApp((s) => s.myPosts);
  const name = useApp((s) => s.profile.name);
  return leagueOf(myPosts, name);
}

export function sdgsOf(posts: Post[]) {
  const set = new Set<number>();
  posts.forEach((p) => ACTIONS[p.action].sdgs.forEach((g) => set.add(g)));
  return set;
}

// One nudge per friend every 6 hours. Memes, not spam.
export function nudgedRecently(at?: number) {
  return !!at && Date.now() - at < 6 * 3600e3;
}

// Monday 00:00 next week, for "resets in".
export function weekResetIn() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + ((8 - n.getDay()) % 7 || 7));
  return Math.ceil((next.getTime() - n.getTime()) / D);
}
