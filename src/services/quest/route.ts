import type { Thread } from "../../data/quest/types";

// The Caccia verde follows one route, from water to living nature:
// a canal that powered the town → a mill that made electricity and got a second life →
// a factory yard turned garden → the nature around you right now (live open data).
// The thread chosen from your act changes the emphasis of the stories and the act suggested at the end.

export const NATURE_STOP = "natura";
export const ROUTE = ["roggia-maestra", "lanificio-conte", "giardino-jacquard", NATURE_STOP] as const;
export const ROUTE_LINKS = ["link-rm-lc", "link-lc-jq", "link-jq-nat"] as const;
export const STOPS = ROUTE.length;

export type QuestPath = { thread: Thread; stops: string[]; links: string[] };

export const routeFor = (thread: Thread): QuestPath => ({ thread, stops: [...ROUTE], links: [...ROUTE_LINKS] });

/** A saved run is playable only if it follows the current route (older saves may not). */
export const isCurrentRoute = (stops: string[]) => stops.length === ROUTE.length && stops.every((s, i) => s === ROUTE[i]);
