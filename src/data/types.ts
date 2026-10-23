import type { ActionId } from "@/data/actions";
import type { BadgeId } from "@/data/badges";
import type { SeedId } from "@/data/seeds";

// A bundled asset (require()) or a file / remote URI.
export type Media = number | string;

export type Role = "student" | "teacher" | "association" | "comune";
export type Explain = "me" | "class" | "comune";

export type User = {
  id: string;
  name: string;
  handle: string;
  role?: Role;
  badgeId?: BadgeId | null;
  avatar?: Media;
  tag?: string;
  // The seed they planted, and their lifetime Seeds when known: how far their plant has grown.
  seed?: SeedId;
  seeds?: number;
};

// An Italian Comune. `id` is its GeoNames admin3 id, stable across devices.
export type Comune = { id: string; name: string; province?: string; region?: string; lat: number; lon: number };

export type Comment = { id: string; authorId: string; text: string; createdAt: number };

// "comune": everyone in your Comune · "squad": members only · "public": everyone everywhere.
export type Audience = "comune" | "squad" | "public";

export type Post = {
  id: string;
  authorId: string;
  action: ActionId;
  photo: Media;
  proof: Media; // 5-second proof video
  caption: string;
  captionKey?: string;
  place: string;
  // Comune centre recorded on this device only; legacy/hidden-area proofs omit it.
  location?: { lat: number; lon: number };
  createdAt: number;
  verifiedBy: string[];
  reactions: Record<string, number>;
  comments: Comment[];
  isDrop?: boolean;
  challengeId?: string;
  comuneId?: string;
  audience: Audience;
  squadId?: string;
  // The community place this proof was taken at.
  spotId?: string;
  // Example proof for today's challenge: never verified, never counted.
  isDemo?: boolean;
  // Saved on this device, not yet on the shared feed.
  pending?: boolean;
};

export type SquadKind = "class" | "association" | "comune" | "friends";

export type Squad = {
  id: string;
  name: string;
  kind: SquadKind;
  place: string;
  comuneId?: string;
  memberIds: string[];
  memberCount: number;
  code: string;
  points: number;
  quest: { title: string; action: ActionId; goal: number; progress: number; endsInDays: number };
  // Aggregated, anonymised acts per action this month. Used by the community report.
  monthly: Partial<Record<ActionId, number>>;
};
