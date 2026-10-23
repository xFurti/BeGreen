import { ACTIONS } from "../data/actions.ts";
import type { Post } from "../data/types.ts";
import type { Drop } from "./drop.ts";

export const DROP_BONUS = 10;

export function seedsFor(post: Pick<Post, "action" | "isDrop" | "challengeId">) {
  return ACTIONS[post.action].seeds + (post.isDrop || post.challengeId ? DROP_BONUS : 0);
}

export function canClaimDrop(drop: Pick<Drop, "id" | "day" | "offline" | "shared">, posts: Pick<Post, "authorId" | "challengeId">[], userId: string, backend: boolean, now = new Date()) {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return drop.day === day && !drop.offline && (!backend || !!drop.shared) &&
    !posts.some((p) => p.authorId === userId && p.challengeId === drop.id);
}

// A different unique constraint (or a network failure) must never remove the bonus.
export function isChallengeDuplicate(error: unknown) {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === "23505" && !!e.message?.includes("posts_one_per_challenge");
}

export async function publishWithReward(post: Post, publish: (p: Post) => Promise<Post>, onDuplicate: (regular: Post) => void): Promise<Post> {
  try {
    return await publish(post);
  } catch (error) {
    if (!post.challengeId || !isChallengeDuplicate(error)) throw error;
    const regular = { ...post, challengeId: undefined, isDrop: false };
    onDuplicate(regular);
    return publish(regular);
  }
}
