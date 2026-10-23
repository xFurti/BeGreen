import "expo-sqlite/localStorage/install";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { toast } from "@/components/toast";
import {
  ALTO_VICENTINO,
  BUNDLED_COMMUNITIES,
  CHALLENGE_TEMPLATES,
  examplesFor,
  isCity,
  type ChallengeEntry,
  type ChallengeTemplateId,
  type Community,
  type CommunityChallenge,
  type FlagReason,
  type Member,
  type Spot,
} from "@/data/community";
import type { Comune, Post } from "@/data/types";
import { translate, type MessageKey } from "@/i18n/catalog";
import { NO_FILTERS, type MapFilters } from "@/services/community-search";
import * as api from "@/services/community";
import { bboxAround } from "@/services/geo";
import { standings, type Standing } from "@/services/leaderboard";
import { hasBackend } from "@/services/supabase";
import { useApp } from "@/store/app-store";

// The community side of BeGreen: which communities you're in, their shared maps, challenges and your
// saves. A cache of the backend (or, without one, this phone's own copy), kept apart from the feed store.

type Role = Member["role"];

type State = {
  // The community you joined first: synced first.
  primary: string | null;
  roles: Record<string, Role>;
  catalog: Community[];
  spots: Spot[];
  saved: Record<string, number>;
  going: Record<string, true>;
  reacted: Record<string, string>;
  myFlags: Record<string, FlagReason[]>;
  challenges: CommunityChallenge[];
  entries: ChallengeEntry[];
  members: Record<string, Member[]>;
  // Proofs taken in each community's comuni (ids into the feed store's posts).
  postIds: Record<string, string[]>;
  blocked: string[];
  invites: Record<string, string>;
  filters: MapFilters;
  syncedAt: Record<string, number>;
  // A place published from this phone: its local id, which screens and proofs may still hold, to the server's.
  aliases: Record<string, string>;
};

export type NewSpot = Omit<Spot, "id" | "authorId" | "createdAt" | "updatedAt" | "saves" | "going" | "reactions" | "comments" | "status"> & {
  status?: Spot["status"];
  challengeId?: string;
};

type Actions = {
  join: (id: string, invite?: string) => Promise<boolean>;
  // A group's invite code alone: the id of the community it opened, or null.
  joinByCode: (code: string) => Promise<string | null>;
  leave: (id: string) => Promise<void>;
  create: (c: Omit<Community, "id">) => Promise<Community>;
  addSpot: (s: NewSpot) => Spot;
  editSpot: (id: string, p: api.SpotPatch) => void;
  removeSpot: (id: string) => void;
  toggleSave: (id: string) => void;
  toggleGoing: (id: string) => void;
  react: (id: string, emoji: string) => void;
  comment: (id: string, text: string) => void;
  flag: (id: string, reason: FlagReason, note: string) => void;
  verify: (id: string) => void;
  hide: (id: string, hidden: boolean) => void;
  launch: (c: { communityId: string; template?: ChallengeTemplateId; title: string; body: string; goal: number; days: number }) => Promise<CommunityChallenge>;
  contribute: (challengeId: string, e: { spotId?: string; note?: string }) => void;
  block: (userId: string, on: boolean) => void;
  setFilters: (f: Partial<MapFilters>) => void;
  reset: () => void;
};

const initial: State = {
  primary: null,
  roles: {},
  catalog: BUNDLED_COMMUNITIES,
  spots: [],
  saved: {},
  going: {},
  reacted: {},
  myFlags: {},
  challenges: [],
  entries: [],
  members: {},
  postIds: {},
  blocked: [],
  invites: {},
  filters: NO_FILTERS,
  syncedAt: {},
  aliases: {},
};

const localId = () => `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const me = () => useApp.getState().userId;
const tr = (key: MessageKey) => translate(useApp.getState().language, key);

function fail(e: unknown) {
  if (__DEV__) console.warn(e);
  toast(tr("shared.offline"), "refresh");
}

const patch = (spots: Spot[], id: string, f: (s: Spot) => Spot) => spots.map((s) => (s.id === id ? f(s) : s));
const isLocal = (id: string) => id.startsWith("local-") || id.startsWith("example-");

export const useCommunity = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      join: async (id, invite) => {
        if (hasBackend) {
          const ok = await api.joinCommunity(id, invite);
          if (!ok) return false;
        } else if (!get().catalog.some((c) => c.id === id)) return false;
        set({ roles: { ...get().roles, [id]: get().roles[id] ?? "member" }, primary: get().primary ?? id });
        void syncCommunity(id);
        return true;
      },
      joinByCode: async (raw) => {
        const code = raw.trim().toUpperCase();
        if (code.length < 4) return null;
        const id = hasBackend ? await api.joinByCode(code) : (Object.entries(get().invites).find(([, c]) => c === code)?.[0] ?? null);
        if (!id) return null;
        set({ roles: { ...get().roles, [id]: get().roles[id] ?? "member" }, primary: get().primary ?? id, invites: { ...get().invites, [id]: code } });
        await syncCommunity(id);
        return id;
      },
      leave: async (id) => {
        if (hasBackend) await api.leaveCommunity(me(), id);
        const roles = { ...get().roles };
        delete roles[id];
        set({ roles, primary: get().primary === id ? (Object.keys(roles)[0] ?? null) : get().primary });
      },
      create: async (input) => {
        const id = communityIdFor(input.name);
        const c: Community = { ...input, id, memberCount: 1 };
        const localCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
        // Every group has a code to invite friends with; the server makes it, or this phone does offline.
        const invite = hasBackend ? await api.createCommunity(c) : !isCity(c) || c.visibility === "private" ? localCode() : null;
        set({
          catalog: [c, ...get().catalog.filter((x) => x.id !== id)],
          roles: { ...get().roles, [id]: "moderator" },
          primary: get().primary ?? id,
          ...(invite ? { invites: { ...get().invites, [id]: invite } } : {}),
        });
        return c;
      },
      addSpot: ({ challengeId, ...input }) => {
        const now = Date.now();
        const spot: Spot = {
          status: "active",
          ...input,
          id: localId(),
          authorId: me(),
          createdAt: now,
          updatedAt: now,
          saves: 0,
          going: 0,
          reactions: {},
          comments: [],
          pending: hasBackend,
        };
        set({ spots: [spot, ...get().spots] });
        if (hasBackend) void publishSpot(spot, challengeId);
        else if (challengeId) get().contribute(challengeId, { spotId: spot.id });
        return spot;
      },
      editSpot: (id, p) => {
        set({
          spots: patch(get().spots, id, (s) => ({ ...s, ...p, updatedAt: Date.now(), status: p.status ?? (s.status === "toVerify" ? "active" : s.status) })),
        });
        // The server clears "to verify" when the author edits, the same way.
        if (hasBackend && !isLocal(id)) api.updateSpot(id, p).catch(fail);
      },
      removeSpot: (id) => {
        set({ spots: get().spots.filter((s) => s.id !== id) });
        if (hasBackend && !isLocal(id)) api.deleteSpot(id).catch(fail);
      },
      toggleSave: (id) => {
        const on = !get().saved[id];
        const saved = { ...get().saved };
        if (on) saved[id] = Date.now();
        else delete saved[id];
        set({ saved, spots: patch(get().spots, id, (s) => ({ ...s, saves: Math.max(0, s.saves + (on ? 1 : -1)) })) });
        if (hasBackend && !isLocal(id)) api.setSaved(me(), id, on).catch(fail);
      },
      toggleGoing: (id) => {
        const on = !get().going[id];
        const going = { ...get().going };
        if (on) going[id] = true;
        else delete going[id];
        set({ going, spots: patch(get().spots, id, (s) => ({ ...s, going: Math.max(0, s.going + (on ? 1 : -1)) })) });
        if (hasBackend && !isLocal(id)) api.setGoing(me(), id, on).catch(fail);
      },
      react: (id, emoji) => {
        const prev = get().reacted[id];
        const next = prev === emoji ? null : emoji;
        const reacted = { ...get().reacted };
        if (next) reacted[id] = next;
        else delete reacted[id];
        set({
          reacted,
          spots: patch(get().spots, id, (s) => {
            const reactions = { ...s.reactions };
            if (prev) reactions[prev] = Math.max(0, (reactions[prev] ?? 1) - 1);
            if (next) reactions[next] = (reactions[next] ?? 0) + 1;
            return { ...s, reactions };
          }),
        });
        if (hasBackend && !isLocal(id)) api.setSpotReaction(me(), id, next).catch(fail);
      },
      comment: (id, text) => {
        const c = { id: localId(), authorId: me(), text, createdAt: Date.now() };
        set({ spots: patch(get().spots, id, (s) => ({ ...s, comments: [...s.comments, c] })) });
        if (hasBackend && !isLocal(id)) api.addSpotComment(id, text).catch(fail);
      },
      flag: (id, reason, note) => {
        const mine = get().myFlags[id] ?? [];
        if (mine.includes(reason)) return;
        set({ myFlags: { ...get().myFlags, [id]: [...mine, reason] } });
        if (hasBackend && !isLocal(id)) api.flagSpot(id, reason, note).then(() => syncCommunity(get().spots.find((s) => s.id === id)?.communityId), fail);
      },
      verify: (id) => {
        set({ spots: patch(get().spots, id, (s) => ({ ...s, verifiedAt: Date.now(), status: s.status === "toVerify" ? "active" : s.status })) });
        if (hasBackend && !isLocal(id)) api.verifySpot(id).catch(fail);
      },
      hide: (id, hidden) => {
        set({ spots: patch(get().spots, id, (s) => ({ ...s, hidden })) });
        if (hasBackend && !isLocal(id)) api.setHidden(id, hidden).catch(fail);
      },
      launch: async ({ communityId, template, title, body, goal, days }) => {
        const now = Date.now();
        const draft = {
          communityId,
          template,
          title,
          body,
          category: template ? CHALLENGE_TEMPLATES[template].category : undefined,
          goal,
          startsAt: now,
          endsAt: now + days * 864e5,
        };
        const c = hasBackend ? await api.insertChallenge(draft) : { ...draft, id: localId(), createdBy: me() };
        set({ challenges: [...get().challenges, c] });
        return c;
      },
      contribute: (challengeId, { spotId, note = "" }) => {
        const entry: ChallengeEntry = { id: localId(), challengeId, userId: me(), spotId, note, createdAt: Date.now() };
        set({ entries: [...get().entries, entry] });
        if (!hasBackend || isLocal(challengeId)) return;
        api
          .insertEntry(entry)
          .then((saved) => set({ entries: get().entries.map((e) => (e.id === entry.id ? saved : e)) }))
          .catch(fail);
      },
      block: (userId, on) => {
        set({ blocked: on ? [...new Set([...get().blocked, userId])] : get().blocked.filter((b) => b !== userId) });
        if (hasBackend) api.setBlocked(me(), userId, on).catch(fail);
      },
      setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
      reset: () => set(initial),
    }),
    {
      name: "begreen-community-v1",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        // Bundled communities always come from this build, so their map and copy stay current.
        const catalog = [...BUNDLED_COMMUNITIES, ...(p.catalog ?? []).filter((c) => !BUNDLED_COMMUNITIES.some((b) => b.id === c.id))];
        return { ...current, ...p, catalog, filters: { ...NO_FILTERS, ...p.filters } };
      },
    },
  ),
);

// Stable, readable ids: "comune-6542283", "classe-4b-schio-k3f".
export function communityIdFor(name: string, suffix = Math.random().toString(36).slice(2, 5)) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "community"}-${suffix}`;
}

// The territory community for a Comune: one per Comune, created by whoever gets there first.
export function comuneCommunity(c: Comune): Community {
  return {
    id: `comune-${c.id}`,
    name: c.name,
    kind: "territory",
    description: "",
    descriptionKey: "community.catalog.comune",
    // "Schio · Vicenza", but just "Verona" when the province has the city's name.
    area: [c.name, c.province].filter((x, i, all) => !!x && all.indexOf(x) === i).join(" · "),
    visibility: "public",
    center: { lat: c.lat, lon: c.lon },
    bbox: bboxAround({ lat: c.lat, lon: c.lon }, 5),
    comuni: [c.name],
  };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

// The community that covers your Comune, if there is one; otherwise your Comune's own (maybe not created yet).
export function suggestedCommunity(comune: Comune | null, catalog: Community[]): { community: Community; exists: boolean } | null {
  if (!comune) return null;
  const covering = catalog.find((c) => c.kind === "territory" && c.comuni.some((n) => norm(n) === norm(comune.name)));
  if (covering) return { community: covering, exists: true };
  const own = comuneCommunity(comune);
  const known = catalog.find((c) => c.id === own.id);
  return { community: known ?? own, exists: !!known };
}

// Joins the Comune's community, creating it the first time someone asks (who becomes its first moderator).
export async function joinComuneCommunity(c: Comune): Promise<Community> {
  const own = comuneCommunity(c);
  const s = useCommunity.getState();
  const known = s.catalog.find((x) => x.id === own.id) ?? own;
  let role: Role = "member";
  if (hasBackend) {
    if (!(await api.joinCommunity(own.id))) {
      await api.createCommunity(own);
      role = "moderator";
    }
    // Offline there's only you: the city starts with you as its moderator.
  } else role = "moderator";
  const now = useCommunity.getState();
  useCommunity.setState({
    catalog: [known, ...now.catalog.filter((x) => x.id !== own.id)],
    roles: { ...now.roles, [own.id]: now.roles[own.id] ?? role },
    primary: now.primary ?? own.id,
  });
  void syncCommunity(own.id);
  return known;
}

// The Comune behind a city community made from one ("comune-<id>"), to join or create it.
export function comuneOf(c: Community): Comune | null {
  if (!isCity(c) || !c.id.startsWith("comune-")) return null;
  const [, province] = c.area.split(" · ");
  return { id: c.id.slice("comune-".length), name: c.name, province, lat: c.center.lat, lon: c.center.lon };
}

// Joins a city: a Comune's own (created on the first join) or a bundled territory like Alto Vicentino.
export async function joinCity(c: Community): Promise<boolean> {
  const comune = comuneOf(c);
  if (comune) {
    await joinComuneCommunity(comune);
    return true;
  }
  return useCommunity.getState().join(c.id);
}

// Cities opened from search this session: kept in the catalog through syncs until someone creates them.
const previews = new Set<string>();

// A city you found in search but nobody has started yet: shown so you can look before joining.
export function previewCity(c: Comune): Community {
  const own = comuneCommunity(c);
  const s = useCommunity.getState();
  const known = s.catalog.find((x) => x.id === own.id);
  if (known) return known;
  previews.add(own.id);
  useCommunity.setState({ catalog: [...s.catalog, own] });
  return own;
}

// ---------- sync ----------

const publishing = new Set<string>();

async function publishSpot(spot: Spot, challengeId?: string) {
  if (publishing.has(spot.id)) return;
  publishing.add(spot.id);
  try {
    const saved = await api.insertSpot(me(), spot);
    const s = useCommunity.getState();
    useCommunity.setState({
      // Keep the local photo on screen: no flicker while the uploaded copy loads.
      spots: s.spots.map((x) => (x.id === spot.id ? { ...saved, photo: spot.photo ?? saved.photo } : x)),
      saved: s.saved[spot.id] ? { ...s.saved, [saved.id]: s.saved[spot.id] } : s.saved,
      aliases: { ...s.aliases, [spot.id]: saved.id },
    });
    if (challengeId) useCommunity.getState().contribute(challengeId, { spotId: saved.id });
  } catch (e) {
    if (__DEV__) console.warn(e);
    toast(tr("community.savedLocally"), "refresh");
  } finally {
    publishing.delete(spot.id);
  }
}

let syncing: Promise<void> | null = null;

// Refreshes the catalog, your memberships and the communities you're in (plus `extra`, one you're exploring).
export function syncCommunity(extra?: string): Promise<void> {
  if (!hasBackend) return Promise.resolve();
  if (syncing) return syncing.then(() => (extra && !useCommunity.getState().syncedAt[extra] ? syncCommunity(extra) : undefined));
  syncing = (async () => {
    const uid = useApp.getState().userId;
    if (!uid || !useApp.getState().onboarded) return;
    for (const p of useCommunity.getState().spots.filter((x) => x.pending)) await publishSpot(p);

    const [catalog, roles, blocked] = await Promise.all([api.fetchCommunities(), api.fetchMemberships(uid), api.fetchBlocks()]);
    const state = useCommunity.getState();
    const merged = [...catalog, ...state.catalog.filter((c) => !catalog.some((x) => x.id === c.id) && (roles[c.id] || previews.has(c.id)))];
    // The page you opened comes first, so the limit below never drops it.
    const ids = [...new Set([extra, state.primary, ...Object.keys(roles)].filter((x): x is string => !!x && merged.some((c) => c.id === x)))].slice(0, 8);
    const results = await Promise.all(ids.map((id) => api.fetchCommunity(uid, merged.find((c) => c.id === id)!).then((d) => [id, d] as const)));
    const invites = Object.fromEntries(
      await Promise.all(
        Object.entries(roles)
          .filter(([id]) => {
            const c = merged.find((x) => x.id === id);
            return !!c && (!isCity(c) || c.visibility === "private");
          })
          .map(async ([id]) => [id, (await api.communityInvite(id).catch(() => null)) ?? ""]),
      ),
    );

    const s = useCommunity.getState();
    const fetchedIds = new Set(ids);
    let spots = s.spots.filter((x) => x.pending || !fetchedIds.has(x.communityId));
    let challenges = s.challenges.filter((x) => !fetchedIds.has(x.communityId));
    const keptChallenges = new Set(challenges.map((c) => c.id));
    let entries = s.entries.filter((e) => keptChallenges.has(e.challengeId));
    const members = { ...s.members };
    const postIds = { ...s.postIds };
    const saved = { ...s.saved };
    const going = { ...s.going };
    const reacted = { ...s.reacted };
    const myFlags = { ...s.myFlags };
    const posts: Post[] = [];
    let profiles = {};
    for (const [id, d] of results) {
      spots = [...spots, ...d.spots];
      challenges = [...challenges, ...d.challenges];
      entries = [...entries, ...d.entries];
      members[id] = d.members;
      postIds[id] = d.posts.map((p) => p.id);
      for (const sp of d.spots) {
        if (d.saved.has(sp.id)) saved[sp.id] = saved[sp.id] ?? Date.now();
        else delete saved[sp.id];
        if (d.going.has(sp.id)) going[sp.id] = true;
        else delete going[sp.id];
        if (d.reacted[sp.id]) reacted[sp.id] = d.reacted[sp.id];
        else delete reacted[sp.id];
        if (d.myFlags[sp.id]) myFlags[sp.id] = d.myFlags[sp.id];
      }
      posts.push(...d.posts);
      profiles = { ...profiles, ...d.profiles };
    }
    const now = Date.now();
    useCommunity.setState({
      catalog: [...BUNDLED_COMMUNITIES.filter((b) => !merged.some((c) => c.id === b.id)), ...merged],
      roles,
      primary: s.primary && roles[s.primary] ? s.primary : (Object.keys(roles)[0] ?? null),
      blocked,
      spots,
      challenges,
      entries,
      members,
      postIds,
      saved,
      going,
      reacted,
      myFlags,
      invites: { ...s.invites, ...invites },
      syncedAt: { ...s.syncedAt, ...Object.fromEntries(ids.map((id) => [id, now])) },
    });
    // Proofs taken in the community join the shared feed cache, so they can be verified and reacted to.
    const app = useApp.getState();
    const known = new Set(app.posts.map((p) => p.id));
    useApp.setState({ posts: [...app.posts, ...posts.filter((p) => !known.has(p.id))], profiles: { ...app.profiles, ...profiles } });
  })()
    .catch((e) => {
      if (__DEV__) console.warn(e);
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

// ---------- selectors ----------

// A stable empty list: a selector returning a fresh [] re-renders forever.
export const NO_FLAGS: FlagReason[] = [];

export function useCommunityById(id?: string | null): Community | undefined {
  const catalog = useCommunity((s) => s.catalog);
  return id ? (catalog.find((c) => c.id === id) ?? (id === ALTO_VICENTINO.id ? ALTO_VICENTINO : undefined)) : undefined;
}

// The communities you're in, split the way the Community tab shows them.
export function useJoined(): { cities: Community[]; groups: Community[] } {
  const catalog = useCommunity((s) => s.catalog);
  const roles = useCommunity((s) => s.roles);
  return useMemo(() => {
    const mine = catalog.filter((c) => roles[c.id]);
    return { cities: mine.filter(isCity), groups: mine.filter((c) => !isCity(c)) };
  }, [catalog, roles]);
}

const norm2 = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// This week's leaderboard. A group ranks its members wherever they post; a city ranks whoever posted there.
export function useStandings(c?: Community): Standing[] {
  const posts = useApp((s) => s.posts);
  const me = useApp((s) => s.userId);
  const comune = useApp((s) => s.comune);
  const members = useCommunity((s) => (c ? s.members[c.id] : undefined));
  const fetched = useCommunity((s) => (c ? s.postIds[c.id] : undefined));
  const blocked = useCommunity((s) => s.blocked);
  return useMemo(() => {
    if (!c) return [];
    const inArea = new Set(fetched ?? []);
    const ids = (members ?? []).map((m) => m.userId).filter((id) => !blocked.includes(id));
    if (!isCity(c)) {
      const team = new Set([me, ...ids]);
      return standings(posts, { me, members: ids, counts: (p) => team.has(p.authorId) && p.audience !== "squad" });
    }
    const mineHere = !!comune && c.comuni.some((n) => norm2(n) === norm2(comune.name));
    return standings(posts, {
      me,
      counts: (p) => !blocked.includes(p.authorId) && p.audience !== "squad" && (inArea.has(p.id) || (mineHere && p.comuneId === comune!.id)),
    });
  }, [c, posts, me, comune, members, fetched, blocked]);
}

// Your squad mates: the people BeGreen knows you know.
export function useFriendIds(): Set<string> {
  const squads = useApp((s) => s.squads);
  const meId = useApp((s) => s.userId);
  return useMemo(() => new Set(squads.flatMap((q) => q.memberIds).filter((id) => id !== meId)), [squads, meId]);
}

// A community's places as you should see them: no one you blocked, nothing hidden (except your own).
// Only real places: the map is a real one, so nothing is placed on it that isn't there.
export function useCommunitySpots(c?: Community): { spots: Spot[]; real: number } {
  const all = useCommunity((s) => s.spots);
  const blocked = useCommunity((s) => s.blocked);
  const meId = useApp((s) => s.userId);
  return useMemo(() => {
    if (!c) return { spots: [], real: 0 };
    const real = all.filter((s) => s.communityId === c.id && !blocked.includes(s.authorId) && (!s.hidden || s.authorId === meId));
    return { spots: real, real: real.length };
  }, [all, blocked, c, meId]);
}

// The place a proof can point to: the server's id once published; nothing for examples or places still uploading.
export function linkableSpotId(id?: string): string | undefined {
  if (!id || id.startsWith("example-")) return undefined;
  const real = useCommunity.getState().aliases[id] ?? id;
  return hasBackend && isLocal(real) ? undefined : real;
}

export function useSpot(id?: string): Spot | undefined {
  const spot = useCommunity((s) => s.spots.find((x) => x.id === (id && s.aliases[id]) || x.id === id));
  const catalog = useCommunity((s) => s.catalog);
  return useMemo(() => {
    if (spot || !id?.startsWith("example-")) return spot;
    for (const c of catalog) {
      const hit = examplesFor(c).find((x) => x.id === id);
      if (hit) return hit;
    }
    return undefined;
  }, [spot, id, catalog]);
}
