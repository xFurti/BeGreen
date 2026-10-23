import {
  BUNDLED_COMMUNITIES,
  type BBox,
  type ChallengeEntry,
  type Community,
  type CommunityChallenge,
  type CommunityKind,
  type FlagReason,
  type Member,
  type Spot,
  type SpotCategory,
  type SpotKind,
  type SpotStatus,
  type Visibility,
} from "@/data/community";
import type { Comment, Post, User } from "@/data/types";
import { db, POST, PROFILE, readFeed, toUser, uploadPhoto, type PostRow, type ProfileRow } from "@/services/social";
import type { GroupProgress } from "@/services/groups";
import { signedMedia } from "@/services/storage-media";

// Community data on Supabase. Pure data access, like social.ts: the store decides what to keep.

const D = 864e5;

type CommunityRow = {
  id: string;
  name: string;
  kind: CommunityKind;
  description: string;
  area: string;
  visibility: Visibility;
  center_lat: number;
  center_lon: number;
  bbox: BBox;
  comuni: string[];
  community_members?: { count: number }[];
};

type SpotRow = {
  id: string;
  community_id: string;
  author_id: string;
  kind: SpotKind;
  category: SpotCategory;
  title: string;
  body: string;
  photo: string | null;
  lat: number | null;
  lon: number | null;
  precise: boolean;
  address: string;
  status: SpotStatus;
  starts_at: string | null;
  ends_at: string | null;
  family: boolean;
  visibility: "public" | "community";
  prompt_day: string | null;
  verified_at: string | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
  author: ProfileRow | null;
  spot_saves: { user_id: string }[];
  spot_going: { user_id: string }[];
  spot_reactions: { user_id: string; emoji: string }[];
  spot_comments: { id: string; author_id: string; text: string; created_at: string; author: ProfileRow | null }[];
};

type ChallengeRow = {
  id: string;
  community_id: string;
  template: string | null;
  title: string;
  body: string;
  category: SpotCategory | null;
  goal: number;
  starts_at: string;
  ends_at: string;
  created_by: string;
  challenge_entries: { id: string; user_id: string; spot_id: string | null; note: string; created_at: string }[];
};

const SPOT =
  "id, community_id, author_id, kind, category, title, body, photo, lat, lon, precise, address, status, starts_at, ends_at, family, visibility, " +
  `prompt_day, verified_at, hidden, created_at, updated_at, author:profiles!spots_author_id_fkey(${PROFILE}), ` +
  `spot_saves(user_id), spot_going(user_id), spot_reactions(user_id, emoji), spot_comments(id, author_id, text, created_at, author:profiles!spot_comments_author_id_fkey(${PROFILE}))`;

const ms = (s: string | null) => (s ? Date.parse(s) : undefined);

export function toCommunity(r: CommunityRow): Community {
  const bundled = BUNDLED_COMMUNITIES.find((c) => c.id === r.id);
  return {
    // A bundled community keeps its translated description.
    ...(bundled ?? {}),
    id: r.id,
    name: r.name,
    kind: r.kind,
    description: r.description,
    descriptionKey: bundled?.descriptionKey,
    area: r.area,
    visibility: r.visibility,
    center: { lat: r.center_lat, lon: r.center_lon },
    bbox: r.bbox,
    comuni: r.comuni,
    memberCount: r.community_members?.[0]?.count,
  };
}

export type SpotState = { saved: Set<string>; going: Set<string>; reacted: Record<string, string>; profiles: Record<string, User> };

function toSpots(rows: SpotRow[], me: string): { spots: Spot[] } & SpotState {
  const profiles: Record<string, User> = {};
  const saved = new Set<string>();
  const going = new Set<string>();
  const reacted: Record<string, string> = {};
  const add = (p: ProfileRow | null) => p && (profiles[p.id] = toUser(p));
  const spots = rows.map((r): Spot => {
    add(r.author);
    r.spot_comments.forEach((c) => add(c.author));
    if (r.spot_saves.some((x) => x.user_id === me)) saved.add(r.id);
    if (r.spot_going.some((x) => x.user_id === me)) going.add(r.id);
    const reactions: Record<string, number> = {};
    r.spot_reactions.forEach((x) => {
      reactions[x.emoji] = (reactions[x.emoji] ?? 0) + 1;
      if (x.user_id === me) reacted[r.id] = x.emoji;
    });
    const comments: Comment[] = r.spot_comments
      .map((c) => ({ id: c.id, authorId: c.author_id, text: c.text, createdAt: Date.parse(c.created_at) }))
      .sort((a, b) => a.createdAt - b.createdAt);
    return {
      id: r.id,
      communityId: r.community_id,
      authorId: r.author_id,
      kind: r.kind,
      category: r.category,
      title: r.title,
      body: r.body,
      photo: r.photo ?? undefined,
      lat: r.lat ?? undefined,
      lon: r.lon ?? undefined,
      precise: r.precise,
      address: r.address,
      status: r.status,
      startsAt: ms(r.starts_at),
      endsAt: ms(r.ends_at),
      family: r.family,
      visibility: r.visibility,
      promptDay: r.prompt_day ?? undefined,
      verifiedAt: ms(r.verified_at),
      hidden: r.hidden,
      createdAt: Date.parse(r.created_at),
      updatedAt: Date.parse(r.updated_at),
      saves: r.spot_saves.length,
      going: r.spot_going.length,
      reactions,
      comments,
    };
  });
  return { spots, saved, going, reacted, profiles };
}

function toChallenges(rows: ChallengeRow[]): { challenges: CommunityChallenge[]; entries: ChallengeEntry[] } {
  const entries: ChallengeEntry[] = [];
  const challenges = rows.map((r): CommunityChallenge => {
    r.challenge_entries.forEach((e) =>
      entries.push({ id: e.id, challengeId: r.id, userId: e.user_id, spotId: e.spot_id ?? undefined, note: e.note, createdAt: Date.parse(e.created_at) }),
    );
    return {
      id: r.id,
      communityId: r.community_id,
      template: (r.template ?? undefined) as CommunityChallenge["template"],
      title: r.title,
      body: r.body,
      category: r.category ?? undefined,
      goal: r.goal,
      startsAt: Date.parse(r.starts_at),
      endsAt: Date.parse(r.ends_at),
      createdBy: r.created_by,
    };
  });
  return { challenges, entries };
}

// ---------- reads ----------

export async function fetchCommunities(ids: string[] = []): Promise<Community[]> {
  const { data, error } = await db().from("communities").select("*, community_members(count)").order("created_at").limit(100);
  if (error) throw error;
  const rows = data as CommunityRow[];
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) {
    const more = await db().from("communities").select("*, community_members(count)").in("id", missing);
    if (more.error) throw more.error;
    rows.push(...more.data as CommunityRow[]);
  }
  return rows.map(toCommunity);
}

export async function fetchMemberships(me: string): Promise<Record<string, Member["role"]>> {
  const { data, error } = await db().from("community_members").select("community_id, role").eq("user_id", me);
  if (error) throw error;
  return Object.fromEntries((data as { community_id: string; role: Member["role"] }[]).map((m) => [m.community_id, m.role]));
}

export type CommunityData = {
  spots: Spot[];
  challenges: CommunityChallenge[];
  entries: ChallengeEntry[];
  members: Member[];
  posts: Post[];
  profiles: Record<string, User>;
  myFlags: Record<string, FlagReason[]>;
  progress?: GroupProgress;
} & Omit<SpotState, "profiles">;

// Everything a community page needs: its map, challenges, members and the proofs taken in it.
export async function fetchCommunity(me: string, c: Community): Promise<CommunityData> {
  const s = db();
  const [spotsRes, challengesRes, membersRes, flagsRes, comuniRes, progressRes] = await Promise.all([
    s.from("spots").select(SPOT).eq("community_id", c.id).order("created_at", { ascending: false }).limit(300),
    s
      .from("community_challenges")
      .select("*, challenge_entries(id, user_id, spot_id, note, created_at)")
      .eq("community_id", c.id)
      .gte("ends_at", new Date(Date.now() - 60 * D).toISOString())
      .order("ends_at"),
    s.from("community_members").select(`user_id, role, profile:profiles!community_members_user_id_fkey(${PROFILE})`).eq("community_id", c.id).limit(500),
    s.from("spot_flags").select("spot_id, reason").eq("user_id", me),
    c.comuni.length ? s.from("comuni").select("id").in("name", c.comuni) : Promise.resolve({ data: [], error: null }),
    s.from("group_progress").select("points, quest, months").eq("community_id", c.id).maybeSingle(),
  ]);
  for (const r of [spotsRes, challengesRes, membersRes, flagsRes, comuniRes, progressRes]) if (r.error) throw r.error;

  const spotRows = spotsRes.data as unknown as SpotRow[];
  const media = await signedMedia(spotRows.flatMap((r) => r.photo ? [r.photo] : []));
  const spotData = toSpots(spotRows.map((r) => ({ ...r, photo: r.photo ? media.get(r.photo) as string : null })), me);
  const { challenges, entries } = toChallenges(challengesRes.data as unknown as ChallengeRow[]);
  const memberRows = membersRes.data as unknown as { user_id: string; role: Member["role"]; profile: ProfileRow | null }[];
  const profiles = { ...spotData.profiles };
  memberRows.forEach((m) => m.profile && (profiles[m.profile.id] = toUser(m.profile)));
  const myFlags: Record<string, FlagReason[]> = {};
  (flagsRes.data as { spot_id: string; reason: FlagReason }[]).forEach((f) => (myFlags[f.spot_id] = [...(myFlags[f.spot_id] ?? []), f.reason]));

  // Proofs taken at the community's places, and (for a city) recent proofs from the comuni it covers.
  const comuneIds = (comuniRes.data as { id: string }[]).map((x) => x.id);
  const since = new Date(Date.now() - 8 * D).toISOString();
  const linked = `${POST}, spot:spots!inner(community_id)`;
  const postQueries: PromiseLike<{ data: unknown; error: unknown }>[] = c.kind === "territory"
    ? [s.from("posts").select(linked).eq("spot.community_id", c.id).in("audience", ["comune", "public"]).limit(120)]
    : [];
  if (comuneIds.length && c.kind === "territory") {
    postQueries.push(
      s.from("posts").select(POST).in("comune_id", comuneIds).in("audience", ["comune", "public"]).gte("created_at", since).order("created_at", { ascending: false }).limit(120),
    );
  }
  // A group's leaderboard and feed: what its members posted this week, wherever they are.
  if (c.kind !== "territory") {
    postQueries.push(
      s.from("posts").select(POST).eq("group_id", c.id).order("created_at", { ascending: false }).limit(200),
    );
  }
  const rows: PostRow[] = [];
  for (const r of await Promise.all(postQueries)) {
    if (r.error) throw r.error;
    rows.push(...(r.data as PostRow[]));
  }
  const feed = await readFeed(rows, me);

  return {
    spots: spotData.spots,
    saved: spotData.saved,
    going: spotData.going,
    reacted: spotData.reacted,
    challenges,
    entries,
    members: memberRows.map((m) => ({ userId: m.user_id, role: m.role })),
    posts: feed.posts,
    profiles: { ...feed.profiles, ...profiles },
    myFlags,
    progress: progressRes.data as GroupProgress | undefined,
  };
}

export async function fetchBlocks(): Promise<string[]> {
  const { data, error } = await db().from("blocks").select("blocked_id");
  if (error) throw error;
  return (data as { blocked_id: string }[]).map((b) => b.blocked_id);
}

export async function communityInvite(id: string): Promise<string | null> {
  const { data, error } = await db().rpc("community_invite", { c: id });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// ---------- membership ----------

export async function joinCommunity(id: string, invite?: string): Promise<boolean> {
  const { data, error } = await db().rpc("join_community", { c: id, invite: invite ?? null });
  if (error) throw error;
  return !!data;
}

// Join with an invite code alone: the id of the community it opens, or null.
export async function joinByCode(code: string, target?: string): Promise<string | null> {
  const { data, error } = await db().rpc("join_group_by_code", { invite: code, target: target ?? null });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function resolveGroupInvite(code: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db().rpc("resolve_group_invite", { invite: code });
  if (error) throw error;
  return data ?? [];
}

export async function leaveCommunity(me: string, id: string) {
  const { error } = await db().from("community_members").delete().eq("community_id", id).eq("user_id", me);
  if (error) throw error;
}

export async function createCommunity(c: Community): Promise<string | null> {
  const { data, error } = await db().rpc("create_community", {
    c: c.id,
    p_name: c.name,
    p_kind: c.kind,
    p_description: c.description,
    p_area: c.area,
    p_visibility: c.visibility,
    lat: c.center.lat,
    lon: c.center.lon,
    p_bbox: c.bbox,
    p_comuni: c.comuni,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// ---------- places ----------

const iso = (t?: number) => (t ? new Date(t).toISOString() : null);

export async function insertSpot(me: string, s: Spot): Promise<Spot> {
  const photo = s.photo != null ? await uploadPhoto(me, s.photo) : null;
  const { data, error } = await db()
    .from("spots")
    .insert({
      community_id: s.communityId,
      kind: s.kind,
      category: s.category,
      title: s.title,
      body: s.body,
      photo,
      lat: s.lat ?? null,
      lon: s.lon ?? null,
      precise: s.precise,
      address: s.address,
      status: s.status,
      starts_at: iso(s.startsAt),
      ends_at: iso(s.endsAt),
      family: s.family,
      visibility: s.visibility,
      prompt_day: s.promptDay ?? null,
    })
    .select(SPOT)
    .single();
  if (error) throw error;
  return toSpots([data as unknown as SpotRow], me).spots[0];
}

export type SpotPatch = Partial<Pick<Spot, "title" | "body" | "address" | "status" | "startsAt" | "endsAt" | "family" | "category">>;

export async function updateSpot(id: string, p: SpotPatch) {
  const row: Record<string, unknown> = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.body !== undefined) row.body = p.body;
  if (p.address !== undefined) row.address = p.address;
  if (p.status !== undefined) row.status = p.status;
  if (p.category !== undefined) row.category = p.category;
  if (p.family !== undefined) row.family = p.family;
  if ("startsAt" in p) row.starts_at = iso(p.startsAt);
  if ("endsAt" in p) row.ends_at = iso(p.endsAt);
  // Nothing changed but the author confirmed it's still right: that's an update too.
  if (!Object.keys(row).length) row.updated_at = new Date().toISOString();
  const { error } = await db().from("spots").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteSpot(id: string) {
  const { error } = await db().from("spots").delete().eq("id", id);
  if (error) throw error;
}

export async function setHidden(id: string, hidden: boolean) {
  const { error } = await db().from("spots").update({ hidden }).eq("id", id);
  if (error) throw error;
}

export async function verifySpot(id: string) {
  const { error } = await db().rpc("verify_spot", { s: id });
  if (error) throw error;
}

async function toggle(table: "spot_saves" | "spot_going", me: string, spotId: string, on: boolean) {
  const s = db();
  const { error } = on
    ? await s.from(table).upsert({ spot_id: spotId, user_id: me }, { onConflict: "spot_id,user_id", ignoreDuplicates: true })
    : await s.from(table).delete().eq("spot_id", spotId).eq("user_id", me);
  if (error) throw error;
}

export const setSaved = (me: string, spotId: string, on: boolean) => toggle("spot_saves", me, spotId, on);
export const setGoing = (me: string, spotId: string, on: boolean) => toggle("spot_going", me, spotId, on);

export async function setSpotReaction(me: string, spotId: string, emoji: string | null) {
  const s = db();
  const { error } = emoji
    ? await s.from("spot_reactions").upsert({ spot_id: spotId, user_id: me, emoji }, { onConflict: "spot_id,user_id" })
    : await s.from("spot_reactions").delete().eq("spot_id", spotId).eq("user_id", me);
  if (error) throw error;
}

export async function addSpotComment(spotId: string, text: string) {
  const { error } = await db().from("spot_comments").insert({ spot_id: spotId, text });
  if (error) throw error;
}

export async function flagSpot(spotId: string, reason: FlagReason, note: string) {
  const { error } = await db().from("spot_flags").insert({ spot_id: spotId, reason, note });
  if (error && error.code !== "23505") throw error;
}

// ---------- challenges ----------

export async function insertChallenge(c: Omit<CommunityChallenge, "id" | "createdBy">): Promise<CommunityChallenge> {
  const { data, error } = await db()
    .from("community_challenges")
    .insert({
      community_id: c.communityId,
      template: c.template ?? null,
      title: c.title,
      body: c.body,
      category: c.category ?? null,
      goal: c.goal,
      starts_at: iso(c.startsAt),
      ends_at: iso(c.endsAt),
    })
    .select("*, challenge_entries(id, user_id, spot_id, note, created_at)")
    .single();
  if (error) throw error;
  return toChallenges([data as unknown as ChallengeRow]).challenges[0];
}

export async function insertEntry(e: Pick<ChallengeEntry, "challengeId" | "spotId" | "note">): Promise<ChallengeEntry> {
  const { data, error } = await db()
    .from("challenge_entries")
    .insert({ challenge_id: e.challengeId, spot_id: e.spotId ?? null, note: e.note })
    .select("id, challenge_id, user_id, spot_id, note, created_at")
    .single();
  if (error) throw error;
  const r = data as { id: string; challenge_id: string; user_id: string; spot_id: string | null; note: string; created_at: string };
  return { id: r.id, challengeId: r.challenge_id, userId: r.user_id, spotId: r.spot_id ?? undefined, note: r.note, createdAt: Date.parse(r.created_at) };
}

// ---------- blocking ----------

export async function setBlocked(me: string, userId: string, on: boolean) {
  const s = db();
  const { error } = on
    ? await s.from("blocks").upsert({ user_id: me, blocked_id: userId }, { onConflict: "user_id,blocked_id", ignoreDuplicates: true })
    : await s.from("blocks").delete().eq("user_id", me).eq("blocked_id", userId);
  if (error) throw error;
}
