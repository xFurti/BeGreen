import "expo-sqlite/localStorage/install";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { toast } from "@/components/toast";
import { ACTIONS, type ActionId } from "@/data/actions";
import { badgeById, isBadgeId, type BadgeId, type BadgeStats } from "@/data/badges";
import { DEMO_AUTHOR } from "@/data/demo";
import type { Audience, Comune, Explain, Post, Role, Squad, User } from "@/data/types";
import { translate, type MessageKey } from "@/i18n/catalog";
import { deviceLanguage } from "@/i18n/device";
import { applyPersisted } from "@/i18n/persist";
import type { Language } from "@/i18n/schema";
import { saveComune } from "@/services/comuni";
import type { Drop } from "@/services/drop";
import { DEFAULT_PLACE, type Place, type Pulse } from "@/services/env";
import { existingLocal, preferLocal } from "@/services/media";
import {
  addComment,
  addVerification,
  countMyVerifications,
  fetchFeed,
  fetchProfiles,
  fetchSquads,
  HandleTaken,
  insertSquad,
  joinByCode,
  publishPost,
  saveProfile,
  setReaction,
} from "@/services/social";
import { ensureSession, hasBackend } from "@/services/supabase";

export type Profile = { name: string; handle: string; role: Role; badgeId: BadgeId | null };

type State = {
  language: Language;
  onboarded: boolean;
  // Supabase user id, or a device-only id when no backend is configured.
  userId: string;
  profile: Profile;
  explain: Explain;
  comune: Comune | null;
  place: Place;
  pulse: Pulse | null;
  challenge: Drop | null;
  // Everything we know about: your proofs and the shared feed. A cache of the backend.
  posts: Post[];
  profiles: Record<string, User>;
  reacted: Record<string, string>;
  squads: Squad[];
  localSquads: Squad[];
  localMedia: Record<string, { photo?: string; proof?: string }>;
  verifiedCount: number;
  nudged: Record<string, number>;
  syncedAt: number;
};

type NewPost = {
  action: ActionId;
  photo: string | number;
  proof: string | number;
  caption: string;
  audience: Audience;
  place: string;
  challengeId?: string;
  squadId?: string;
};

type Actions = {
  finishOnboarding: (p: Omit<Profile, "badgeId"> & { badgeId?: BadgeId | null }) => void;
  setExplain: (e: Explain) => void;
  setComune: (c: Comune) => void;
  setPulse: (p: Pulse) => void;
  setChallenge: (d: Drop) => void;
  addPost: (p: NewPost) => Post;
  verify: (postId: string) => void;
  react: (postId: string, emoji: string) => void;
  comment: (postId: string, text: string) => void;
  createSquad: (s: Pick<Squad, "name" | "kind" | "place" | "quest">) => Promise<Squad>;
  joinSquad: (code: string) => Promise<Squad | null>;
  nudge: (userId: string) => void;
  equipBadge: (id: BadgeId | null) => void;
  setLanguage: (language: Language) => void;
  reset: () => void;
};

const localId = () => `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const initial: State = {
  language: deviceLanguage(),
  onboarded: false,
  userId: "",
  profile: { name: "", handle: "", role: "student", badgeId: null },
  explain: "me",
  comune: null,
  place: DEFAULT_PLACE,
  pulse: null,
  challenge: null,
  posts: [],
  profiles: {},
  reacted: {},
  squads: [],
  localSquads: [],
  localMedia: {},
  verifiedCount: 0,
  nudged: {},
  syncedAt: 0,
};

const D = 864e5;

const tr = (key: MessageKey) => translate(useApp.getState().language, key);

function fail(e: unknown) {
  if (__DEV__) console.warn(e);
  toast(tr("shared.offline"), "refresh");
}

const patchPost = (posts: Post[], id: string, f: (p: Post) => Post) => posts.map((p) => (p.id === id ? f(p) : p));

export const useApp = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      finishOnboarding: (p) => {
        const profile = { ...p, badgeId: p.badgeId ?? null };
        set({
          onboarded: true,
          profile,
          userId: get().userId || localId(),
          explain: profile.role === "student" ? "me" : profile.role === "comune" ? "comune" : "class",
        });
      },
      setExplain: (explain) => set({ explain }),
      setComune: (comune) => {
        const same = get().comune?.id === comune.id;
        set({
          comune,
          place: { lat: comune.lat, lon: comune.lon, name: comune.name },
          ...(same ? {} : { challenge: null, pulse: null, localSquads: [] }),
        });
        // During onboarding there's no session yet: registerProfile saves the Comune.
        if (!hasBackend || !get().onboarded) return;
        saveComune(comune)
          .then(() => {
            const s = get();
            if (s.onboarded && s.userId) return saveProfile(s.userId, s.profile, comune);
          })
          .then(() => syncSocial())
          .catch(fail);
      },
      setPulse: (pulse) => set({ pulse }),
      setChallenge: (challenge) => set({ challenge }),
      addPost: (input) => {
        const s = get();
        const post: Post = {
          id: localId(),
          authorId: s.userId,
          verifiedBy: [],
          reactions: {},
          comments: [],
          createdAt: Date.now(),
          comuneId: s.comune?.id,
          isDrop: !!input.challengeId,
          pending: hasBackend,
          ...input,
        };
        set({
          posts: [post, ...s.posts],
          squads: input.squadId
            ? s.squads.map((q) =>
                q.id === input.squadId
                  ? {
                      ...q,
                      points: q.points + ACTIONS[input.action].seeds + (input.challengeId ? 10 : 0),
                      quest: q.quest.action === input.action ? { ...q.quest, progress: q.quest.progress + 1 } : q.quest,
                      monthly: { ...q.monthly, [input.action]: (q.monthly[input.action] ?? 0) + 1 },
                    }
                  : q,
              )
            : s.squads,
        });
        if (hasBackend) void publish(post);
        return post;
      },
      verify: (postId) => {
        const s = get();
        const post = s.posts.find((p) => p.id === postId);
        if (!post || post.isDemo || post.pending || post.authorId === s.userId || post.verifiedBy.includes(s.userId)) return;
        set({
          posts: patchPost(s.posts, postId, (p) => ({ ...p, verifiedBy: [...p.verifiedBy, s.userId] })),
          verifiedCount: s.verifiedCount + 1,
        });
        if (hasBackend) addVerification(postId).catch(fail);
      },
      react: (postId, emoji) => {
        const s = get();
        const post = s.posts.find((p) => p.id === postId);
        if (!post || post.isDemo) return;
        const prev = s.reacted[postId];
        const next = prev === emoji ? null : emoji;
        const reactions = { ...post.reactions };
        if (prev) reactions[prev] = Math.max(0, (reactions[prev] ?? 1) - 1);
        if (next) reactions[next] = (reactions[next] ?? 0) + 1;
        const reacted = { ...s.reacted };
        if (next) reacted[postId] = next;
        else delete reacted[postId];
        set({ reacted, posts: patchPost(s.posts, postId, (p) => ({ ...p, reactions })) });
        if (hasBackend && !post.pending) setReaction(s.userId, postId, next).catch(fail);
      },
      comment: (postId, text) => {
        const s = get();
        const post = s.posts.find((p) => p.id === postId);
        if (!post || post.isDemo) return;
        const c = { id: localId(), authorId: s.userId, text, createdAt: Date.now() };
        set({ posts: patchPost(s.posts, postId, (p) => ({ ...p, comments: [...p.comments, c] })) });
        if (hasBackend && !post.pending) addComment(postId, text).catch(fail);
      },
      createSquad: async ({ name, kind, place, quest }) => {
        const s = get();
        const code =
          name
            .replace(/[^a-z0-9]/gi, "")
            .slice(0, 6)
            .toUpperCase()
            .padEnd(4, "X") + Math.floor(Math.random() * 90 + 10);
        const draft: Squad = {
          id: localId(),
          name,
          kind,
          place,
          comuneId: s.comune?.id,
          memberIds: [s.userId],
          memberCount: 1,
          code,
          points: 0,
          quest: { ...quest, progress: 0 },
          monthly: {},
        };
        const squad = hasBackend ? await insertSquad(s.userId, draft) : draft;
        set({ squads: [squad, ...get().squads], localSquads: [squad, ...get().localSquads] });
        return squad;
      },
      joinSquad: async (code) => {
        const c = code.trim().toUpperCase();
        const s = get();
        const known = s.squads.find((q) => q.code === c);
        if (known) return known;
        if (!hasBackend) return null;
        const squad = await joinByCode(s.userId, c);
        if (squad) set({ squads: [squad, ...get().squads.filter((q) => q.id !== squad.id)] });
        return squad;
      },
      nudge: (userId) => set({ nudged: { ...get().nudged, [userId]: Date.now() } }),
      equipBadge: (id) => {
        const s = get();
        const stats = badgeStatsOf(mineOf(s.posts, s.userId), s.verifiedCount);
        if (id && !badgeById(id).earned(stats)) return;
        const profile = { ...s.profile, badgeId: id };
        set({ profile });
        if (hasBackend && s.onboarded && s.userId) saveProfile(s.userId, profile, s.comune).catch(fail);
      },
      setLanguage: (language) => set({ language }),
      reset: () => set({ ...initial, language: get().language }),
    }),
    {
      name: "begreen-v2",
      storage: createJSONStorage(() => localStorage),
      // Bundled assets (numbers) are stable across reloads in the same build.
      partialize: (s): State => ({
        language: s.language,
        onboarded: s.onboarded,
        userId: s.userId,
        profile: s.profile,
        explain: s.explain,
        comune: s.comune,
        place: s.place,
        pulse: s.pulse,
        challenge: s.challenge,
        posts: s.posts,
        profiles: s.profiles,
        reacted: s.reacted,
        squads: s.squads,
        localSquads: s.localSquads,
        localMedia: s.localMedia,
        verifiedCount: s.verifiedCount,
        nudged: s.nudged,
        syncedAt: s.syncedAt,
      }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Record<string, unknown>;
        const merged = applyPersisted(raw, deviceLanguage()) as Partial<State>;
        return {
          ...current,
          ...merged,
          profile: {
            ...current.profile,
            ...merged.profile,
            badgeId: isBadgeId(merged.profile?.badgeId) ? merged.profile.badgeId : null,
          },
        };
      },
    },
  ),
);

// ---------- sync with the shared backend ----------

// A post being uploaded must not be sent again by a sync running at the same time.
const publishing = new Set<string>();
// Server id → when this device finished publishing it, so a sync that started earlier doesn't drop it.
const published = new Map<string, number>();

async function publish(post: Post) {
  if (publishing.has(post.id)) return;
  publishing.add(post.id);
  try {
    await send(post);
  } finally {
    publishing.delete(post.id);
  }
}

async function send(post: Post): Promise<void> {
  try {
    const saved = await publishPost(useApp.getState().userId, post);
    published.set(saved.id, Date.now());
    // Keep the local files on screen: no flicker while the uploaded copies load.
    const photo = typeof post.photo === "string" && post.photo.startsWith("file:") ? post.photo : undefined;
    const proof = typeof post.proof === "string" && post.proof.startsWith("file:") ? post.proof : undefined;
    useApp.setState({
      posts: patchPost(useApp.getState().posts, post.id, () => ({ ...saved, photo: post.photo, proof: post.proof })),
      ...(photo || proof ? { localMedia: { ...useApp.getState().localMedia, [saved.id]: { photo, proof } } } : {}),
    });
  } catch (e) {
    // Already did today's challenge (e.g. from another phone): post it as a regular proof.
    if ((e as { code?: string }).code === "23505" && post.challengeId) return send({ ...post, challengeId: undefined, isDrop: false });
    if (__DEV__) console.warn(e);
    toast(tr("shared.savedLocally"), "refresh");
  }
}

let syncing: Promise<void> | null = null;

export function syncSocial(): Promise<void> {
  if (!hasBackend) return Promise.resolve();
  if (syncing) return syncing;
  syncing = (async () => {
    const startedAt = Date.now();
    const s = useApp.getState();
    if (!s.onboarded || !s.comune) return;
    const uid = await ensureSession();
    if (!uid) return;
    if (uid !== s.userId) {
      // A new anonymous account (e.g. the session was cleared): carry the profile over.
      useApp.setState({ userId: uid, posts: s.posts.map((p) => (p.authorId === s.userId ? { ...p, authorId: uid } : p)) });
      await registerProfile(s.profile, s.comune);
    }
    for (const p of useApp.getState().posts.filter((x) => x.pending)) await publish(p);

    const { mine, local } = await fetchSquads(uid, s.comune.id);
    const [feed, verifiedCount] = await Promise.all([
      fetchFeed(
        uid,
        s.comune.id,
        mine.map((q) => q.id),
      ),
      countMyVerifications(uid),
    ]);
    const known = { ...useApp.getState().profiles, ...feed.profiles };
    const missing = [...new Set([...mine, ...local].flatMap((q) => q.memberIds))].filter((id) => !known[id]);
    const members = await fetchProfiles(missing).catch(() => ({}));
    // Keep what's still uploading, and your proofs that finished uploading after the feed was fetched.
    const fetched = new Set(feed.posts.map((p) => p.id));
    const keep = useApp.getState().posts.filter((p) => p.pending || ((published.get(p.id) ?? 0) >= startedAt && !fetched.has(p.id)));
    const localMedia = Object.fromEntries(
      Object.entries(useApp.getState().localMedia)
        .map(([id, media]) => {
          const photo = existingLocal(media.photo);
          const proof = existingLocal(media.proof);
          return photo || proof ? [id, { ...(photo ? { photo } : {}), ...(proof ? { proof } : {}) }] : null;
        })
        .filter((entry): entry is [string, { photo?: string; proof?: string }] => entry !== null),
    );
    useApp.setState({
      posts: [...keep, ...preferLocal(feed.posts, localMedia)],
      profiles: { ...known, ...members },
      reacted: feed.myReactions,
      squads: mine,
      localSquads: local,
      localMedia,
      verifiedCount,
      syncedAt: Date.now(),
    });
    dropStaleBadge();
  })()
    .catch((e) => {
      if (__DEV__) console.warn(e);
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

// Creates (or updates) your public profile. Throws HandleTaken if someone has your handle.
export async function registerProfile(p: Omit<Profile, "badgeId"> & { badgeId?: BadgeId | null }, comune: Comune | null) {
  if (!hasBackend) return;
  const profile = { ...p, badgeId: p.badgeId ?? null };
  const uid = await ensureSession();
  if (!uid) return;
  useApp.setState({ userId: uid });
  if (comune) await saveComune(comune);
  try {
    await saveProfile(uid, profile, comune);
  } catch (e) {
    if (!(e instanceof HandleTaken) || useApp.getState().onboarded === false) throw e;
    // Re-registering after a lost session: keep the name, pick a free variant of the handle.
    const handle = `${profile.handle.slice(0, 20)}${Math.floor(Math.random() * 900 + 100)}`;
    await saveProfile(uid, { ...profile, handle }, comune);
    useApp.setState({ profile: { ...profile, handle } });
  }
}

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

export function badgeStatsOf(posts: Post[], verified: number): BadgeStats {
  return {
    posts: posts.length,
    streak: streakOf(posts),
    carFree: posts.filter((p) => p.action === "move").length,
    spotted: posts.some((p) => p.action === "spot"),
    verified,
    goals: sdgsOf(posts).size,
  };
}

// A title expires when its requirement is no longer met.
export function dropStaleBadge() {
  const s = useApp.getState();
  if (s.profile.badgeId && !badgeById(s.profile.badgeId).earned(badgeStatsOf(mineOf(s.posts, s.userId), s.verifiedCount))) useApp.getState().equipBadge(null);
}

const seedsFor = (p: Post) => ACTIONS[p.action].seeds + (p.isDrop ? 10 : 0);

// Two seeds for every proof you verify.
export function seedsOf(posts: Post[], verified: number) {
  return posts.reduce((a, p) => a + seedsFor(p), 0) + verified * 2;
}

export function useMyPosts(): Post[] {
  const posts = useApp((s) => s.posts);
  const me = useApp((s) => s.userId);
  return mineOf(posts, me);
}

export function mineOf(posts: Post[], me: string) {
  return posts.filter((p) => p.authorId === me && !p.isDemo);
}

export function useAuthor() {
  const profiles = useApp((s) => s.profiles);
  const me = useApp((s) => s.userId);
  const profile = useApp((s) => s.profile);
  const language = useApp((s) => s.language);
  return (id: string): User => {
    const t = (key: MessageKey) => translate(language, key);
    if (id === DEMO_AUTHOR.id) return { ...DEMO_AUTHOR, name: t("demo.author"), tag: t("demo.tag") };
    if (id === me) return { id, name: profile.name || t("common.you"), handle: profile.handle || t("common.youInline"), role: profile.role, badgeId: profile.badgeId, tag: t("common.you") };
    return profiles[id] ?? { id, name: t("shared.someone"), handle: "someone" };
  };
}

// ---------- competition ----------

const WEEK = 7 * D;

export function weeklyOf(posts: Post[]) {
  const since = Date.now() - WEEK;
  return posts.filter((p) => p.createdAt > since).reduce((a, p) => a + seedsFor(p), 0);
}

export type Racer = { id: string; name: string; badgeId?: BadgeId | null; avatar?: number | string; points: number; me: boolean; postedToday: boolean };

// This week's race between everyone posting in your Comune, from real proofs.
export function leagueOf(posts: Post[], me: string, comuneId: string | undefined, who: (id: string) => Pick<User, "name" | "badgeId">): Racer[] {
  const since = Date.now() - WEEK;
  const byAuthor = new Map<string, Post[]>();
  byAuthor.set(me, []);
  for (const p of posts) {
    if (p.isDemo || p.createdAt <= since) continue;
    if (p.authorId !== me && p.comuneId !== comuneId) continue;
    byAuthor.set(p.authorId, [...(byAuthor.get(p.authorId) ?? []), p]);
  }
  const racers = [...byAuthor].map(([id, ps]) => ({
    id,
    name: who(id).name,
    badgeId: who(id).badgeId,
    points: ps.reduce((a, p) => a + seedsFor(p), 0),
    me: id === me,
    postedToday: postedToday(ps),
  }));
  // Ties go to you: it feels better and you earned it.
  return racers.sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
}

export function useLeague() {
  const posts = useApp((s) => s.posts);
  const me = useApp((s) => s.userId);
  const comuneId = useApp((s) => s.comune?.id);
  const author = useAuthor();
  return leagueOf(posts, me, comuneId, author);
}

export function sdgsOf(posts: Post[]) {
  const set = new Set<number>();
  posts.forEach((p) => ACTIONS[p.action].sdgs.forEach((g) => set.add(g)));
  return set;
}

// One nudge per person every 6 hours. Memes, not spam.
export function nudgedRecently(at?: number) {
  return !!at && Date.now() - at < 6 * 3600e3;
}

// Monday 00:00 next week, for "resets in".
export function weekResetIn() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + ((8 - n.getDay()) % 7 || 7));
  return Math.ceil((next.getTime() - n.getTime()) / D);
}
