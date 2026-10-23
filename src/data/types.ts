import type { ActionId } from "@/data/actions";

// A bundled asset (require()) or a file / remote URI.
export type Media = number | string;

export type User = {
  id: string;
  name: string;
  handle: string;
  avatar?: Media;
  tag?: string; // school or association
};

export type Comment = { id: string; authorId: string; text: string; createdAt: number };

export type Audience = "friends" | "squad" | "public";

export type Post = {
  id: string;
  authorId: string;
  action: ActionId;
  photo: Media;
  proof: Media; // 5-second proof video
  caption: string;
  place: string;
  // Optional approximate area saved at capture time; legacy/private posts have no coordinates.
  location?: { lat: number; lon: number };
  createdAt: number;
  verifiedBy: string[];
  reactions: Record<string, number>;
  comments: Comment[];
  isDrop?: boolean;
  audience: Audience;
  squadId?: string;
};

export type SquadKind = "class" | "association" | "comune" | "friends";

export type Squad = {
  id: string;
  name: string;
  kind: SquadKind;
  place: string;
  memberIds: string[];
  memberCount: number;
  code: string;
  points: number;
  quest: { title: string; action: ActionId; goal: number; progress: number; endsInDays: number };
  // Aggregated, anonymised acts per action this month. Used by the community report.
  monthly: Partial<Record<ActionId, number>>;
};

export type Role = "student" | "teacher" | "association" | "comune";
export type Explain = "me" | "class" | "comune";
