import { useMemo } from "react";

import { isCity, type Community, type Spot } from "@/data/community";
import type { Post } from "@/data/types";
import { useApp } from "@/store/app-store";
import { useCommunity, useCommunitySpots } from "@/store/community-store";

// What a community feed shows: places and moments people shared, and proofs: those taken in a city,
// or those posted by a group's members.
export function useCommunityFeed(c?: Community) {
  const { spots } = useCommunitySpots(c);
  const posts = useApp((s) => s.posts);
  const blocked = useCommunity((s) => s.blocked);
  const fetched = useCommunity((s) => (c ? s.postIds[c.id] : undefined));
  const comuneId = useApp((s) => s.comune?.id);
  const myComune = useApp((s) => s.comune?.name);
  const meId = useApp((s) => s.userId);
  const members = useCommunity((s) => (c ? s.members[c.id] : undefined));
  return useMemo(() => {
    if (!c) return [];
    const spotIds = new Set(spots.map((s) => s.id));
    const inArea = new Set(fetched ?? []);
    const team = new Set([meId, ...(members ?? []).map((m) => m.userId)]);
    const covers = (p: Post) =>
      (p.spotId && spotIds.has(p.spotId)) ||
      inArea.has(p.id) ||
      (isCity(c) ? !!myComune && c.comuni.includes(myComune) && p.comuneId === comuneId : team.has(p.authorId));
    const proofs = posts.filter((p) => !p.isDemo && p.audience !== "squad" && !blocked.includes(p.authorId) && covers(p));
    type Item = { kind: "spot"; at: number; spot: Spot } | { kind: "post"; at: number; post: Post };
    const items: Item[] = [
      ...spots.filter((s) => !s.hidden).map((spot): Item => ({ kind: "spot", at: spot.createdAt, spot })),
      ...proofs.map((post): Item => ({ kind: "post", at: post.createdAt, post })),
    ];
    return items.sort((a, b) => b.at - a.at);
  }, [c, spots, posts, blocked, comuneId, myComune, fetched, meId, members]);
}

