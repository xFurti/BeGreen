import type { QuestLink, QuestPath, QuestPlace, Thread } from "../../data/quest/types";

export const STOPS = 3;

/**
 * Deterministic path builder: no model here, it's where a hallucination would hurt most.
 * Explores every simple path on the curated graph (only links with a source and a quote)
 * and keeps the best score; ties go to alphabetical order.
 */
export function buildPath(thread: Thread, places: QuestPlace[], links: QuestLink[], n = STOPS): QuestPath {
  const allowed = links.filter((l) => l.sourceId && l.quote);
  const placeScore = new Map(places.map((p) => [p.id, p.threads.includes(thread) ? 2 : 0]));
  const linkScore = (l: QuestLink) => (l.thread === thread ? 3 : 1);
  let best: { stops: string[]; links: string[]; score: number } | null = null;

  const explore = (stops: string[], used: string[], score: number) => {
    if (stops.length === n) {
      if (!best || score > best.score || (score === best.score && stops.join(">") < best.stops.join(">"))) {
        best = { stops: [...stops], links: [...used], score };
      }
      return;
    }
    const last = stops[stops.length - 1];
    for (const l of allowed) {
      if (l.from !== last || stops.includes(l.to)) continue;
      explore([...stops, l.to], [...used, l.id], score + linkScore(l) + (placeScore.get(l.to) ?? 0));
    }
  };

  for (const p of [...places].sort((a, b) => a.id.localeCompare(b.id))) explore([p.id], [], placeScore.get(p.id) ?? 0);
  if (!best) throw new Error("No path possible with this data");
  const b = best as { stops: string[]; links: string[] };
  return { thread, stops: b.stops, links: b.links };
}
