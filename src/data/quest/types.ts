// Caccia verde: types for the curated quest graph (places, links, clues, facts, sources).
// Content is in Italian; every fact and link carries the exact quote it comes from.

export type Thread = "water" | "reuse" | "green";
export type CheckMode = "onsite" | "remote";

/** [x0, y0, x1, y1] in relative coordinates (0–1) on the full photo */
export type Box = [number, number, number, number];

export type QuestPhoto = {
  /** key in QUEST_IMAGES.full, file at assets/quest/full/<key>.jpg */
  key: string;
  title: string;
  author: string;
  license: string;
  url: string;
  alt: string;
  w: number;
  h: number;
};

export type QuestPlace = {
  id: string;
  name: string;
  subtitle: string;
  wikidataId: string;
  coord: [number, number];
  approxCoord?: boolean;
  threads: Thread[];
  /** "Racconto": declared narrative colour, one line per thread, never with numbers or names */
  flavor: Record<Thread, string>;
  /** "Lo sapevi?": a hook for young people, always backed by facts of this place */
  curiosity: { text: string; factIds: string[] };
  photo: QuestPhoto;
};

export type QuestLink = {
  id: string;
  from: string;
  to: string;
  thread: Thread;
  text: string;
  sourceId: string;
  quote: string;
};

export type QuestClue = {
  id: string;
  placeId: string;
  /** key in QUEST_IMAGES.crops, file at assets/quest/crops/<key>.jpg */
  crop: string;
  title: string;
  alt: string;
  hints: string[];
  check: { question: string; answers: string[] };
  boxes: Box[];
  sourceId: string;
  toVerify?: string;
};

export type QuestFact = {
  id: string;
  placeId: string;
  text: string;
  /** the same fact, told by the place in first person */
  voice: string;
  threads: Thread[];
  sourceId: string;
  quote: string;
};

export type QuestSource = {
  id: string;
  title: string;
  author: string;
  url: string;
  kind: "web" | "archivio" | "catalogo";
  license: string;
  accessed: string;
  /** repo path of the saved text the quotes are checked against */
  snapshot?: string;
};

export type QuestPath = { thread: Thread; stops: string[]; links: string[] };

/** One sentence of "Il luogo parla": it cites facts, or it is declared flavour */
export type Sentence = { text: string; factIds?: string[]; flavor?: boolean };

export type Narration = { sentences: Sentence[]; fallback: boolean; log: string[] };
