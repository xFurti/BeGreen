import type { Post } from "@/data/types";

// Old challenges must never open today's sheet. Demo proofs are built for today.
export function isCurrentDrop(post: Pick<Post, "isDemo" | "challengeId">, currentId: string) {
  return post.isDemo === true || post.challengeId === currentId;
}
