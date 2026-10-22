import "expo-sqlite/localStorage/install";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ACTIONS, type ActionId } from "@/data/actions";
import type { CheckMode, Thread } from "@/data/quest";
import { DEMO_CLIP, FRIENDS, HERO_PHOTOS, ME_ID, SEED_POSTS, SEED_SQUADS, USERS, WEEKLY } from "@/data/seed";
import type { Audience, Comment, Explain, Post, Role, Squad } from "@/data/types";
import { DEFAULT_PLACE, type Place, type Pulse } from "@/services/env";
import { isCurrentRoute, routeFor } from "@/services/quest/route";
import { isPaid, questSeedsSince, stopKey, stopSeeds, THREAD_BONUS, threadKey, type QuestSeed } from "@/services/quest/seeds";

export type Profile = { name: string; handle: string; role: Role };

export type StopResult = { mode: CheckMode; hints: number; tries: number; seeds: number };

// The Caccia verde in progress: unlocked by a post, persisted so it can be resumed.
export type QuestRun = {
  thread: Thread;
  stops: string[];
  links: string[];
  step: number;
  solved: Record<string, StopResult>;
  startedAt: number;
  done: boolean;
  bonus: number;
};

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
  quest: QuestRun | null;
  questSeeds: QuestSeed[];
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
  startQuest: (thread: Thread) => QuestRun;
  solveStop: (placeId: string, r: Omit<StopResult, "seeds">) => number;
  nextStop: () => void;
  finishQuest: () => number;
  abandonQuest: () => void;
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
  quest: null,
  questSeeds: [],
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
      startQuest: (thread) => {
        const cur = activeQuest(get().quest);
        if (cur && cur.thread === thread) return cur;
        const run: QuestRun = { ...routeFor(thread), step: 0, solved: {}, startedAt: Date.now(), done: false, bonus: 0 };
        set({ quest: run });
        return run;
      },
      solveStop: (placeId, r) => {
        const { quest, questSeeds } = get();
        if (!quest) return 0;
        if (quest.solved[placeId]) return quest.solved[placeId].seeds;
        const key = stopKey(placeId);
        const seeds = isPaid(questSeeds, key) ? 0 : stopSeeds(r.hints);
        set({
          quest: { ...quest, solved: { ...quest.solved, [placeId]: { ...r, seeds } } },
          questSeeds: seeds ? [...questSeeds, { at: Date.now(), seeds, key }] : questSeeds,
        });
        return seeds;
      },
      nextStop: () => {
        const q = get().quest;
        if (q) set({ quest: { ...q, step: Math.min(q.step + 1, q.stops.length - 1) } });
      },
      finishQuest: () => {
        const { quest, questSeeds } = get();
        if (!quest) return 0;
        if (quest.done) return quest.bonus;
        const key = threadKey(quest.thread);
        const bonus = isPaid(questSeeds, key) ? 0 : THREAD_BONUS;
        set({
          quest: { ...quest, done: true, bonus },
          questSeeds: bonus ? [...questSeeds, { at: Date.now(), seeds: bonus, key }] : questSeeds,
        });
        return bonus;
      },
      abandonQuest: () => set({ quest: null }),
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
        quest: s.quest,
        questSeeds: s.questSeeds,
      }),
    },
  ),
);

// ---------- derived ----------

/** A saved run that can still be played: on the current route (older saves may not be) */
export const playableQuest = (q: QuestRun | null) => (q && isCurrentRoute(q.stops) ? q : null);
/** A playable run that isn't finished yet: what "Riprendi" resumes */
export const activeQuest = (q: QuestRun | null) => {
  const p = playableQuest(q);
  return p && !p.done ? p : null;
};

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

export function weeklyOf(posts: Post[], questLog: QuestSeed[] = []) {
  const since = Date.now() - WEEK;
  return (
    posts.filter((p) => p.createdAt > since).reduce((a, p) => a + ACTIONS[p.action].seeds + (p.isDrop ? 10 : 0), 0) +
    questSeedsSince(questLog, since)
  );
}

export type Racer = { id: string; name: string; avatar?: number | string; points: number; me: boolean; postedToday: boolean };

// This week's friends race. Friends' totals are demo values; yours is real.
export function leagueOf(myPosts: Post[], meName: string, questLog: QuestSeed[] = []): Racer[] {
  const recent = (id: string) => SEED_POSTS.some((p) => p.authorId === id && Date.now() - p.createdAt < D);
  const friends: Racer[] = FRIENDS.map((id) => ({
    id,
    name: USERS[id].name,
    avatar: USERS[id].avatar,
    points: WEEKLY[id] ?? 0,
    me: false,
    postedToday: recent(id),
  }));
  const me: Racer = { id: ME_ID, name: meName || "You", points: weeklyOf(myPosts, questLog), me: true, postedToday: postedToday(myPosts) };
  // Ties go to you: it feels better and you earned it.
  return [...friends, me].sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
}

export function useLeague() {
  const myPosts = useApp((s) => s.myPosts);
  const name = useApp((s) => s.profile.name);
  const questLog = useApp((s) => s.questSeeds);
  return leagueOf(myPosts, name, questLog);
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
