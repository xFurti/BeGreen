import type { ActionId } from "@/data/actions";

// A bundled asset (require()) or a file / remote URI.
export type Media = number | string;

export type Role = "student" | "teacher" | "association" | "comune";
export type Explain = "me" | "class" | "comune";

export type User = {
  id: string;
  name: string;
  handle: string;
  role?: Role;
  avatar?: Media;
  tag?: string;
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
  place: string;
  createdAt: number;
  verifiedBy: string[];
  reactions: Record<string, number>;
  comments: Comment[];
  isDrop?: boolean;
  challengeId?: string;
  comuneId?: string;
  audience: Audience;
  squadId?: string;
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
