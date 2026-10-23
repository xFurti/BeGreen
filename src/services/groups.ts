import type { ActionId } from "@/data/actions";
import type { Community } from "@/data/community";
import type { Comune, Post, Squad } from "@/data/types";

export type GroupProgress = {
  points: number;
  quest: { title: string; action: ActionId; goal: number; progress: number; endsAt: string } | null;
  months: Record<string, Partial<Record<ActionId, number>>>;
};

export const legacyGroupId = (id: string) => `squad:${id}`;
export const postGroupId = (p: Pick<Post, "groupId" | "squadId">) => p.groupId ?? (p.squadId ? legacyGroupId(p.squadId) : undefined);
export const isGroupPost = (p: Pick<Post, "audience">) => p.audience === "group" || p.audience === "squad";
export const monthKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 7);

export function localSquadGroup(s: Squad, comune: Comune | null, now = Date.now()): { community: Community; progress: GroupProgress } {
  const center = comune && (!s.comuneId || s.comuneId === comune.id) ? { lat: comune.lat, lon: comune.lon } : { lat: 0, lon: 0 };
  return {
    community: {
      id: legacyGroupId(s.id),
      name: s.name,
      kind: s.kind === "class" ? "school" : s.kind === "comune" ? "neighbourhood" : s.kind,
      description: "",
      area: s.place,
      visibility: "private",
      center,
      bbox: { w: center.lon - 0.04, e: center.lon + 0.04, s: center.lat - 0.04, n: center.lat + 0.04 },
      comuni: comune && s.comuneId === comune.id ? [comune.name] : [],
      memberCount: s.memberCount,
    },
    progress: {
      points: s.points,
      quest: { ...s.quest, endsAt: new Date(now + s.quest.endsInDays * 864e5).toISOString() },
      months: { [monthKey(now)]: { ...s.monthly } },
    },
  };
}

export function groupPosts(posts: Post[], groupId: string, blocked: string[] = []) {
  return posts.filter((p) => !p.isDemo && postGroupId(p) === groupId && !blocked.includes(p.authorId));
}

export function assertDestination(audience: Post["audience"], groupId: string | undefined, joined: string[]) {
  if (audience === "squad" || (audience === "group" && (!groupId || !joined.includes(groupId)))) throw new Error("Choose a group you belong to");
  if (audience !== "group" && groupId) throw new Error("A group proof needs a group destination");
}
