import type { IconName } from "@/components/icon";
import type { ActionId } from "@/data/actions";

import cluesJson from "./clues.json";
import factsJson from "./facts.json";
import linksJson from "./links.json";
import placesJson from "./places.json";
import sourcesJson from "./sources.json";
import type { QuestClue, QuestFact, QuestLink, QuestPlace, QuestSource, Thread } from "./types";

export type { CheckMode, QuestClue, QuestFact, QuestLink, QuestPlace, QuestSource, Sentence, Thread } from "./types";

export const PLACES = placesJson as unknown as QuestPlace[];
export const LINKS = linksJson as unknown as QuestLink[];
export const CLUES = cluesJson as unknown as QuestClue[];
export const FACTS = factsJson as unknown as QuestFact[];
export const QUEST_SOURCES = sourcesJson as unknown as QuestSource[];

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
const places = byId(PLACES);
const links = byId(LINKS);
const facts = byId(FACTS);
const sources = byId(QUEST_SOURCES);

export const getPlace = (id: string) => places.get(id)!;
export const getLink = (id: string) => links.get(id)!;
export const getFact = (id: string) => facts.get(id);
export const getQuestSource = (id: string) => sources.get(id);
export const clueOf = (placeId: string) => CLUES.find((c) => c.placeId === placeId)!;
export const factsOf = (placeId: string) => FACTS.filter((f) => f.placeId === placeId);

// Static requires: Metro needs literal paths.
export const QUEST_IMAGES: { full: Record<string, number>; crops: Record<string, number> } = {
  full: {
    "fabbrica-alta": require("../../../assets/quest/full/fabbrica-alta.jpg"),
    "giardino-jacquard": require("../../../assets/quest/full/giardino-jacquard.jpg"),
    "lanificio-conte": require("../../../assets/quest/full/lanificio-conte.jpg"),
    "monumento-tessitore": require("../../../assets/quest/full/monumento-tessitore.jpg"),
    "quartiere-operaio": require("../../../assets/quest/full/quartiere-operaio.jpg"),
    "roggia-maestra": require("../../../assets/quest/full/roggia-maestra.jpg"),
  },
  crops: {
    "clue-fa-1": require("../../../assets/quest/crops/clue-fa-1.jpg"),
    "clue-jq-1": require("../../../assets/quest/crops/clue-jq-1.jpg"),
    "clue-lc-1": require("../../../assets/quest/crops/clue-lc-1.jpg"),
    "clue-nqo-1": require("../../../assets/quest/crops/clue-nqo-1.jpg"),
    "clue-omo-1": require("../../../assets/quest/crops/clue-omo-1.jpg"),
    "clue-rm-1": require("../../../assets/quest/crops/clue-rm-1.jpg"),
  },
};

export const THREADS: Record<Thread, { title: string; short: string; icon: IconName; sdgs: number[]; pitch: string }> = {
  water: {
    title: "Il filo dell'acqua e dell'energia",
    short: "Acqua & energia",
    icon: "drop",
    sdgs: [6, 7],
    pitch: "Un canale, due fabbriche e la luce elettrica fatta con l'acqua.",
  },
  reuse: {
    title: "Il filo del riuso",
    short: "Riuso",
    icon: "recycle",
    sdgs: [11, 12],
    pitch: "Fabbriche che non si buttano: diventano giardini, piazze e musei.",
  },
  green: {
    title: "Il filo del verde e della comunità",
    short: "Verde & comunità",
    icon: "tree",
    sdgs: [11, 15],
    pitch: "Orti, giardini aperti a tutti e beni da curare insieme.",
  },
};

// The quest follows the act you just proved.
const THREAD_BY_ACTION: Record<ActionId, Thread> = {
  refill: "water",
  save: "water",
  move: "water",
  sort: "reuse",
  rewear: "reuse",
  plate: "reuse",
  pickup: "reuse",
  plant: "green",
  spot: "green",
  crew: "green",
};

export const threadFor = (action: ActionId) => THREAD_BY_ACTION[action];
