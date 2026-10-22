import type { IconName } from "@/components/icon";
import type { ActionId } from "@/data/actions";
import { NATURE_STOP } from "@/services/quest/route";

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

export const isNature = (stop: string) => stop === NATURE_STOP;
export const NATURE = { name: "Natura intorno a te", subtitle: "Le specie che vivono vicino a te, adesso", act: "spot" as ActionId };
export const stopName = (stop: string) => (isNature(stop) ? NATURE.name : getPlace(stop).name);

// Static requires: Metro needs literal paths.
export const QUEST_IMAGES: { full: Record<string, number>; crops: Record<string, number> } = {
  full: {
    "giardino-jacquard": require("../../../assets/quest/full/giardino-jacquard.jpg"),
    "lanificio-conte": require("../../../assets/quest/full/lanificio-conte.jpg"),
    "roggia-maestra": require("../../../assets/quest/full/roggia-maestra.jpg"),
  },
  crops: {
    "clue-jq-2": require("../../../assets/quest/crops/clue-jq-2.jpg"),
    "clue-lc-2": require("../../../assets/quest/crops/clue-lc-2.jpg"),
    "clue-rm-1": require("../../../assets/quest/crops/clue-rm-1.jpg"),
  },
};

export const THREADS: Record<Thread, { title: string; short: string; icon: IconName; sdgs: number[]; pitch: string; act: ActionId }> = {
  water: {
    title: "Il filo dell'acqua e dell'energia",
    short: "Acqua & energia",
    icon: "drop",
    sdgs: [6, 7, 15],
    pitch: "Dall'acqua che faceva girare le ruote e accendeva la luce, fino alla natura che vive intorno a te.",
    act: "save",
  },
  reuse: {
    title: "Il filo del riuso",
    short: "Riuso",
    icon: "recycle",
    sdgs: [11, 12, 15],
    pitch: "Una fabbrica rinata, un'area di lavoro diventata giardino, e la natura che vive intorno a te.",
    act: "rewear",
  },
  green: {
    title: "Il filo del verde",
    short: "Verde & natura",
    icon: "tree",
    sdgs: [11, 15],
    pitch: "Dall'acqua di tutti al verde di città, fino alle specie che vivono intorno a te.",
    act: "spot",
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
