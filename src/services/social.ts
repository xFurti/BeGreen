import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";

import type { ActionId } from "@/data/actions";
import { isBadgeId, type BadgeId } from "@/data/badges";
import { assetKey, resolveMedia } from "@/data/demo";
import { isSeedId, type SeedId } from "@/data/seeds";
import type { Audience, Comment, Comune, Media, Post, Role, Squad, SquadKind, User } from "@/data/types";
import { shrinkPhoto } from "@/services/media";
import { signedMedia } from "@/services/storage-media";
import { proofPath } from "@/services/storage-path";
import { SUPABASE_KEY, SUPABASE_URL, supabase } from "@/services/supabase";

// The shared social layer on Supabase. Pure data access: the store decides what to keep.

const D = 864e5;

export type ProfileRow = { id: string; name: string; handle: string; role: Role; badge_id: string | null; seed: string | null };
export type PostRow = {
  id: string;
  author_id: string;
  comune_id: string | null;
  challenge_id: string | null;
  action: ActionId;
  photo: string;
  proof: string;
  caption: string;
  place: string;
  audience: Audience;
  squad_id: string | null;
  group_id: string | null;
  spot_id: string | null;
  created_at: string;
  author: ProfileRow | null;
  verifications: { user_id: string; user: ProfileRow | null }[];
  reactions: { user_id: string; emoji: string }[];
  comments: { id: string; author_id: string; text: string; created_at: string; author: ProfileRow | null }[];
};
type SquadRow = {
  id: string;
  name: string;
  kind: SquadKind;
  place: string;
  comune_id: string | null;
  code: string;
  points: number;
  quest: { title: string; action: ActionId; goal: number; progress: number; endsAt: string };
  monthly: Partial<Record<ActionId, number>>;
  month: string;
  squad_members: { user_id: string }[];
};

export const PROFILE = "id, name, handle, role, badge_id, seed";
// posts and profiles are also linked through verifications, reactions and comments: name the FK for each embed.
export const POST =
  "id, author_id, comune_id, challenge_id, action, photo, proof, caption, place, audience, squad_id, group_id, spot_id, created_at, " +
  `author:profiles!posts_author_id_fkey(${PROFILE}), verifications(user_id, user:profiles!verifications_user_id_fkey(${PROFILE})), ` +
  `reactions(user_id, emoji), comments(id, author_id, text, created_at, author:profiles!comments_author_id_fkey(${PROFILE}))`;
const SQUAD = "id, name, kind, place, comune_id, code, points, quest, monthly, month, squad_members(user_id)";

export const toUser = (p: ProfileRow): User => ({
  id: p.id,
  name: p.name,
  handle: p.handle,
  role: p.role,
  badgeId: isBadgeId(p.badge_id) ? p.badge_id : null,
  seed: isSeedId(p.seed) ? p.seed : undefined,
});

export type Feed = { posts: Post[]; profiles: Record<string, User>; myReactions: Record<string, string> };

export function toFeed(rows: PostRow[], me: string): Feed {
  const profiles: Record<string, User> = {};
  const myReactions: Record<string, string> = {};
  const add = (p: ProfileRow | null) => p && (profiles[p.id] = toUser(p));
  const seen = new Set<string>();
  const posts: Post[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    add(r.author);
    r.verifications.forEach((v) => add(v.user));
    r.comments.forEach((c) => add(c.author));
    const reactions: Record<string, number> = {};
    r.reactions.forEach((x) => {
      reactions[x.emoji] = (reactions[x.emoji] ?? 0) + 1;
      if (x.user_id === me) myReactions[r.id] = x.emoji;
    });
    const comments: Comment[] = r.comments
      .map((c) => ({ id: c.id, authorId: c.author_id, text: c.text, createdAt: Date.parse(c.created_at) }))
      .sort((a, b) => a.createdAt - b.createdAt);
    posts.push({
      id: r.id,
      authorId: r.author_id,
      action: r.action,
      photo: resolveMedia(r.photo),
      proof: resolveMedia(r.proof),
      caption: r.caption,
      place: r.place,
      createdAt: Date.parse(r.created_at),
      verifiedBy: r.verifications.map((v) => v.user_id),
      reactions,
      comments,
      isDrop: !!r.challenge_id,
      challengeId: r.challenge_id ?? undefined,
      comuneId: r.comune_id ?? undefined,
      audience: r.audience === "squad" ? "group" : r.audience,
      squadId: r.squad_id ?? undefined,
      groupId: r.group_id ?? undefined,
      spotId: r.spot_id ?? undefined,
    });
  }
  posts.sort((a, b) => b.createdAt - a.createdAt);
  return { posts, profiles, myReactions };
}

export async function readFeed(rows: PostRow[], me: string): Promise<Feed> {
  const media = await signedMedia(rows.flatMap((r) => [r.photo, r.proof]));
  return toFeed(rows.map((r) => ({ ...r, photo: media.get(r.photo) as string, proof: media.get(r.proof) as string })), me);
}

function toSquad(r: SquadRow): Squad {
  const members = r.squad_members.map((m) => m.user_id);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const ends = Date.parse(r.quest.endsAt);
  const live = ends > Date.now();
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    place: r.place,
    comuneId: r.comune_id ?? undefined,
    memberIds: members,
    memberCount: members.length,
    code: r.code,
    points: r.points,
    quest: {
      title: r.quest.title,
      action: r.quest.action,
      // Three proofs per member per week, never below the goal set at creation.
      goal: Math.max(r.quest.goal, members.length * 3),
      progress: live ? r.quest.progress : 0,
      endsInDays: live ? Math.ceil((ends - Date.now()) / D) : 7,
    },
    monthly: r.month === thisMonth ? r.monthly : {},
  };
}

export function db() {
  if (!supabase) throw new Error("No backend configured");
  return supabase;
}

// Your Comune this week, public proofs from everywhere, your squads, your friends and your own history.
export async function fetchFeed(me: string, comuneId: string, groupIds: string[], following: string[] = []): Promise<Feed> {
  const s = db();
  const since = (days: number) => new Date(Date.now() - days * D).toISOString();
  const queries = [
    s.from("posts").select(POST).eq("comune_id", comuneId).gte("created_at", since(8)).order("created_at", { ascending: false }).limit(150),
    s.from("posts").select(POST).eq("audience", "public").gte("created_at", since(3)).order("created_at", { ascending: false }).limit(60),
    s.from("posts").select(POST).eq("author_id", me).order("created_at", { ascending: false }).limit(400),
  ];
  if (groupIds.length) {
    queries.push(
      s
        .from("posts")
        .select(POST)
        .in("group_id", groupIds)
        .gte("created_at", since(30))
        .order("created_at", { ascending: false })
        .limit(120),
    );
  }
  if (following.length) {
    queries.push(
      s
        .from("posts")
        .select(POST)
        .in("author_id", following.slice(0, 200))
        .gte("created_at", since(30))
        .order("created_at", { ascending: false })
        .limit(150),
    );
  }
  const results = await Promise.all(queries);
  const rows: PostRow[] = [];
  for (const r of results) {
    if (r.error) throw r.error;
    rows.push(...(r.data as unknown as PostRow[]));
  }
  return readFeed(rows, me);
}

export async function fetchGroupIds(me: string): Promise<string[]> {
  const { data, error } = await db().from("community_members").select("community_id, community:communities!inner(kind)").eq("user_id", me).neq("community.kind", "territory");
  if (error) throw error;
  return (data ?? []).map((r) => r.community_id as string);
}

// ---------- following ----------

// Who someone follows (for you: your friends) and who follows them.
export async function fetchFollows(me: string): Promise<{ following: string[]; followers: string[] }> {
  const s = db();
  const [out, inc] = await Promise.all([
    s.from("follows").select("followee_id").eq("follower_id", me).order("created_at", { ascending: false }),
    s.from("follows").select("follower_id").eq("followee_id", me).order("created_at", { ascending: false }),
  ]);
  if (out.error) throw out.error;
  if (inc.error) throw inc.error;
  return {
    following: (out.data as { followee_id: string }[]).map((r) => r.followee_id),
    followers: (inc.data as { follower_id: string }[]).map((r) => r.follower_id),
  };
}

export async function setFollow(me: string, userId: string, on: boolean) {
  const s = db();
  const { error } = on
    ? await s.from("follows").upsert({ follower_id: me, followee_id: userId }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true })
    : await s.from("follows").delete().eq("follower_id", me).eq("followee_id", userId);
  if (error) throw error;
}

// People by handle or name, to find friends to follow.
export async function searchProfiles(q: string, me: string): Promise<User[]> {
  const term = q.trim().replace(/^@/, "").replace(/[%_,()]/g, "");
  if (term.length < 2) return [];
  const { data, error } = await db()
    .from("profiles")
    .select(PROFILE)
    .or(`handle.ilike.%${term}%,name.ilike.%${term}%`)
    .neq("id", me)
    .limit(20);
  if (error) throw error;
  return (data as ProfileRow[]).map(toUser);
}

// Who else planted a seed in your Comune: people you may know.
export async function fetchNearbyProfiles(comuneId: string, me: string): Promise<User[]> {
  const { data, error } = await db().from("profiles").select(PROFILE).eq("comune_id", comuneId).neq("id", me).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data as ProfileRow[]).map(toUser);
}

export async function countMyVerifications(me: string): Promise<number> {
  const { count, error } = await db().from("verifications").select("post_id", { count: "exact", head: true }).eq("user_id", me);
  if (error) throw error;
  return count ?? 0;
}

// Your squads plus every squad in your Comune (for the local ranking).
export async function fetchSquads(me: string, comuneId: string): Promise<{ mine: Squad[]; local: Squad[] }> {
  const s = db();
  const { data: memberships, error: e1 } = await s.from("squad_members").select("squad_id").eq("user_id", me);
  if (e1) throw e1;
  const ids = (memberships ?? []).map((m) => m.squad_id as string);
  const filter = ids.length ? `comune_id.eq.${comuneId},id.in.(${ids.join(",")})` : `comune_id.eq.${comuneId}`;
  const { data, error } = await s.from("squads").select(SQUAD).or(filter).order("points", { ascending: false }).limit(50);
  if (error) throw error;
  const all = (data as unknown as SquadRow[]).map(toSquad);
  return { mine: all.filter((x) => x.memberIds.includes(me)), local: all.filter((x) => x.comuneId === comuneId) };
}

export async function fetchProfiles(ids: string[]): Promise<Record<string, User>> {
  if (!ids.length) return {};
  const { data, error } = await db().from("profiles").select(PROFILE).in("id", ids);
  if (error) throw error;
  return Object.fromEntries((data as ProfileRow[]).map((p) => [p.id, toUser(p)]));
}

export class HandleTaken extends Error {}

export async function saveProfile(
  me: string,
  p: { name: string; handle: string; role: Role; badgeId?: BadgeId | null; seed?: SeedId | null },
  comune: Comune | null,
) {
  const { error } = await db()
    .from("profiles")
    .upsert(
      { id: me, name: p.name, handle: p.handle, role: p.role, badge_id: p.badgeId ?? null, seed: p.seed ?? null, comune_id: comune?.id ?? null },
      { onConflict: "id" },
    );
  if (error?.code === "23505") throw new HandleTaken(p.handle);
  if (error) throw error;
}

// Editing identity must not overwrite a badge or Comune changed by another flow.
export async function saveProfileDetails(me: string, p: { name: string; handle: string; role: Role }) {
  const { error } = await db()
    .from("profiles")
    .update({ name: p.name, handle: p.handle, role: p.role })
    .eq("id", me)
    .select("id")
    .single();
  if (error?.code === "23505") throw new HandleTaken(p.handle);
  if (error) throw error;
}

export async function handleFree(handle: string, me: string | null): Promise<boolean> {
  const { data, error } = await db().from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (error) throw error;
  return !data || data.id === me;
}

// Which of these handles nobody has yet. Works before sign-in (onboarding checks while you type).
export async function freeHandles(candidates: string[]): Promise<Set<string>> {
  const { data, error } = await db().rpc("free_handles", { candidates: candidates.slice(0, 12) });
  if (error) throw error;
  return new Set((data as string[] | null) ?? []);
}

// Lifetime Seeds of these people, computed by the database: how far each plant has grown.
export async function fetchSeeds(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const { data, error } = await db().rpc("profile_seeds", { ids: ids.slice(0, 200) });
  if (error) throw error;
  return Object.fromEntries(((data as { id: string; seeds: number }[] | null) ?? []).map((r) => [r.id, r.seeds]));
}

// How many seeds are planted in a Comune: "you're seed no. X".
export async function countPlanted(comuneId: string): Promise<number> {
  const { count, error } = await db().from("profiles").select("id", { count: "exact", head: true }).eq("comune_id", comuneId);
  if (error) throw error;
  return count ?? 0;
}

// ---------- media ----------

function ext(uri: string, kind: "photo" | "proof") {
  const m = uri.split("?")[0].match(/\.(jpe?g|png|heic|webp|mp4|mov|m4v|webm)$/i);
  return (m?.[1] ?? (kind === "photo" ? "jpg" : "mp4")).toLowerCase();
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  webp: "image/webp",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const ok = (status: number) => status >= 200 && status < 300;

// Uploads the file from disk; falls back to a second transport and refuses an empty object.
async function putObject(file: File, type: string, path: string): Promise<void> {
  const s = db();
  const token = (await s.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("No session");
  const url = `${SUPABASE_URL}/storage/v1/object/proofs/${path}`;
  const headers = (upsert: boolean) => ({
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_KEY,
    "Content-Type": type,
    "x-upsert": String(upsert),
    // Paths are unique timestamps: long CDN cache cuts origin hits without hurting updates.
    "Cache-Control": "private, max-age=300",
  });
  // Authenticated HEAD on the object API — not the public CDN URL — and require a real byte length.
  const stored = async () => {
    const head = await fetch(url, { method: "HEAD", headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY } });
    const len = Number(head.headers.get("content-length"));
    return head.ok && Number.isFinite(len) && len > 0;
  };
  const errors: string[] = [];
  try {
    const r = await file.upload(url, { httpMethod: "POST", mimeType: type, headers: headers(false) });
    if (ok(r.status) && (await stored())) return;
    errors.push(`upload task ${r.status}: ${r.body.slice(0, 120)}`);
  } catch (e) {
    errors.push(`upload task: ${String((e as Error).message ?? e)}`);
  }
  try {
    const r = await expoFetch(url, { method: "POST", headers: headers(true), body: await file.bytes() });
    if (r.ok && (await stored())) return;
    errors.push(`fetch ${r.status}: ${(await r.text()).slice(0, 120)}`);
  } catch (e) {
    errors.push(`fetch: ${String((e as Error).message ?? e)}`);
  }
  throw new Error(errors.join(" · "));
}

async function upload(me: string, m: Media, kind: "photo" | "proof"): Promise<string> {
  // Bundled demo media are numbers on native and objects or local URLs on web: never upload them.
  // Native files are uploaded directly from disk, without passing the body through JavaScript.
  const key = assetKey(m);
  if (key) return key;
  if (typeof m !== "string") throw new Error("Unknown bundled media");
  const existing = proofPath(m, SUPABASE_URL);
  if (existing) return `storage:proofs/${existing}`;
  if (/^(https?:|asset:)/.test(m)) return m;
  const isWeb = process.env.EXPO_OS === "web";
  let bytes: ArrayBuffer;
  let type: string;
  if (isWeb) {
    const blob = await (await fetch(m)).blob();
    bytes = await blob.arrayBuffer();
    type = blob.type || (kind === "photo" ? "image/jpeg" : "video/mp4");
  } else {
    if (kind === "photo") m = await shrinkPhoto(m);
    type = MIME[ext(m, kind)] ?? "application/octet-stream";
  }
  const e = Object.entries(MIME).find(([, v]) => v === type)?.[0] ?? ext(m, kind);
  const path = `${me}/${Date.now()}-${kind}.${e}`;
  const s = db();
  if (isWeb) {
    const { error } = await s.storage.from("proofs").upload(path, bytes!, { contentType: type, upsert: false, cacheControl: "300" });
    if (error) throw error;
  } else {
    await putObject(new File(m), type, path);
  }
  return `storage:proofs/${path}`;
}

// A photo for the community map, in the same public bucket and folder rules as proofs.
export const uploadPhoto = (me: string, m: Media) => upload(me, m, "photo");

// ---------- writes ----------

export async function publishPost(me: string, p: Post): Promise<Post> {
  const [photo, proof] = await Promise.all([upload(me, p.photo, "photo"), upload(me, p.proof, "proof")]);
  const { data, error } = await db()
    .from("posts")
    .insert({
      author_id: me,
      comune_id: p.comuneId ?? null,
      challenge_id: p.challengeId ?? null,
      action: p.action,
      photo,
      proof,
      caption: p.caption,
      place: p.place,
      audience: p.audience,
      squad_id: p.squadId ?? null,
      group_id: p.groupId ?? null,
      spot_id: p.spotId ?? null,
    })
    .select(POST)
    .single();
  if (error) throw error;
  return (await readFeed([data as unknown as PostRow], me)).posts[0];
}

// Only your own proofs: RLS refuses anyone else's. Row media stays in the bucket.
export async function deletePost(postId: string) {
  const { error } = await db().from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function addVerification(postId: string) {
  const { error } = await db().from("verifications").insert({ post_id: postId });
  if (error && error.code !== "23505") throw error;
}

export async function setReaction(me: string, postId: string, emoji: string | null) {
  const s = db();
  const { error } = emoji
    ? await s.from("reactions").upsert({ post_id: postId, user_id: me, emoji }, { onConflict: "post_id,user_id" })
    : await s.from("reactions").delete().eq("post_id", postId).eq("user_id", me);
  if (error) throw error;
}

export async function addComment(postId: string, text: string) {
  const { error } = await db().from("comments").insert({ post_id: postId, text });
  if (error) throw error;
}

export async function insertSquad(me: string, s: Omit<Squad, "id" | "memberIds" | "memberCount" | "points" | "monthly">): Promise<Squad> {
  const c = db();
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = attempt === 0 ? s.code : s.code.replace(/\d+$/, "") + Math.floor(Math.random() * 900 + 100);
    const { data, error } = await c
      .from("squads")
      .insert({
        name: s.name,
        kind: s.kind,
        place: s.place,
        comune_id: s.comuneId ?? null,
        code,
        quest: {
          title: s.quest.title,
          action: s.quest.action,
          goal: s.quest.goal,
          progress: 0,
          endsAt: new Date(Date.now() + s.quest.endsInDays * D).toISOString(),
        },
      })
      .select("id")
      .single();
    if (error?.code === "23505") continue;
    if (error) throw error;
    const { error: e2 } = await c.from("squad_members").insert({ squad_id: data.id, user_id: me });
    if (e2) throw e2;
    const { data: full, error: e3 } = await c.from("squads").select(SQUAD).eq("id", data.id).single();
    if (e3) throw e3;
    return toSquad(full as unknown as SquadRow);
  }
  throw new Error("Couldn't find a free squad code");
}

export async function joinByCode(me: string, code: string): Promise<Squad | null> {
  const c = db();
  const { data, error } = await c.from("squads").select("id").eq("code", code).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { error: e2 } = await c.from("squad_members").insert({ squad_id: data.id, user_id: me });
  if (e2 && e2.code !== "23505") throw e2;
  const { data: full, error: e3 } = await c.from("squads").select(SQUAD).eq("id", data.id).single();
  if (e3) throw e3;
  return toSquad(full as unknown as SquadRow);
}

// Something changed on the shared feed or a community map: proofs, places, verifications, comments, reactions.
export function subscribeFeed(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const s = supabase;
  const ch = s.channel("feed");
  for (const table of ["posts", "verifications", "comments", "reactions", "spots", "spot_comments", "spot_reactions", "challenge_entries", "community_members", "group_progress", "follows"]) {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  ch.subscribe();
  return () => {
    s.removeChannel(ch);
  };
}
