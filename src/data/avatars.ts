import type { IconName } from "@/components/icon";
import { C } from "@/theme/tokens";

export type AvatarArt = IconName | "leafMark" | "sprout";

export const AVATARS = [
  { id: "leaf", art: "leafMark", bg: C.mint, fg: C.leaf },
  { id: "sprout", art: "sprout", bg: C.mint2, fg: C.forest },
  { id: "tree", art: "tree", bg: C.mint, fg: C.forest },
  { id: "bug", art: "nature", bg: C.mint2, fg: C.leaf },
  { id: "drop", art: "drop", bg: C.card, fg: C.blue },
  { id: "sun", art: "sun", bg: C.card, fg: C.amber },
  { id: "bike", art: "bike", bg: C.mint2, fg: C.forest },
  { id: "seed", art: "seed", bg: C.forest, fg: C.lime },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const avatarById = (id: AvatarId) => AVATARS.find((avatar) => avatar.id === id)!;

export const isAvatarId = (value: unknown): value is AvatarId =>
  typeof value === "string" && (AVATARS as readonly { id: string }[]).some((avatar) => avatar.id === value);
