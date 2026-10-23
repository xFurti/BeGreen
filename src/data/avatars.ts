import type { IconName } from "@/components/icon";
import { fixed } from "@/theme/tokens";

export type AvatarArt = IconName | "leafMark" | "sprout";

export const AVATARS = [
  { id: "leaf", art: "leafMark", bg: fixed.avatarMint, fg: fixed.avatarLeaf },
  { id: "sprout", art: "sprout", bg: fixed.avatarMint2, fg: fixed.forest },
  { id: "tree", art: "tree", bg: fixed.avatarMint, fg: fixed.forest },
  { id: "bug", art: "nature", bg: fixed.avatarMint2, fg: fixed.avatarLeaf },
  { id: "drop", art: "drop", bg: fixed.avatarCard, fg: fixed.blue },
  { id: "sun", art: "sun", bg: fixed.avatarCard, fg: fixed.amber },
  { id: "bike", art: "bike", bg: fixed.avatarMint2, fg: fixed.forest },
  { id: "seed", art: "seed", bg: fixed.forest, fg: fixed.lime },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const avatarById = (id: AvatarId) => AVATARS.find((avatar) => avatar.id === id)!;

export const isAvatarId = (value: unknown): value is AvatarId =>
  typeof value === "string" && (AVATARS as readonly { id: string }[]).some((avatar) => avatar.id === value);
