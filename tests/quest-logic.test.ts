import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { QuestFact, QuestLink, QuestPlace, Thread } from "../src/data/quest/types";
import { checkGrounding, flavorViolation, parseNarration } from "../src/services/quest/grounding.ts";
import { fixtureProvider, hallucinatingProvider, narrate } from "../src/services/quest/narrate.ts";
import { buildPath, STOPS } from "../src/services/quest/path.ts";
import { isPaid, maxQuestSeeds, questSeedsSince, stopSeeds } from "../src/services/quest/seeds.ts";
import { insideBoxes, isRightAnswer, normalize } from "../src/services/quest/verify.ts";

const root = path.resolve(import.meta.dirname, "..");
const load = <T>(f: string): T => JSON.parse(readFileSync(path.join(root, "src/data/quest", f), "utf8"));
const places = load<QuestPlace[]>("places.json");
const links = load<QuestLink[]>("links.json");
const facts = load<QuestFact[]>("facts.json");
const THREADS: Thread[] = ["water", "reuse", "green"];

// ---------- path ----------

test("percorso: stesso filo → stesso percorso, di 3 tappe diverse", () => {
  for (const t of THREADS) {
    const a = buildPath(t, places, links);
    assert.deepEqual(a, buildPath(t, places, links));
    assert.equal(a.stops.length, STOPS);
    assert.equal(new Set(a.stops).size, STOPS);
  }
});

test("percorso: ogni collegamento usato esiste, ha fonte e unisce le tappe in ordine", () => {
  const byId = new Map(links.map((l) => [l.id, l]));
  for (const t of THREADS) {
    const p = buildPath(t, places, links);
    assert.equal(p.links.length, p.stops.length - 1);
    p.links.forEach((id, i) => {
      const l = byId.get(id)!;
      assert.ok(l && l.sourceId && l.quote, id);
      assert.equal(l.from, p.stops[i]);
      assert.equal(l.to, p.stops[i + 1]);
    });
  }
});

test("percorso: privilegia i collegamenti del filo scelto", () => {
  for (const t of THREADS) {
    const p = buildPath(t, places, links);
    assert.ok(p.links.every((id) => links.find((l) => l.id === id)!.thread === t), `${t}: ${p.links.join(", ")}`);
  }
});

test("percorso: un collegamento senza fonte non viene mai usato", () => {
  const broken = links.map((l) => ({ ...l, sourceId: "" }));
  assert.throws(() => buildPath("water", places, broken));
});

// ---------- grounding ----------

const fa = places.find((p) => p.id === "fabbrica-alta")!;
const faFacts = facts.filter((f) => f.placeId === fa.id);
const allowed = new Set(faFacts.map((f) => f.id));

test("grounding: schema rifiuta output malformati", () => {
  assert.equal(parseNarration(null), null);
  assert.equal(parseNarration({ sentences: [] }), null);
  assert.equal(parseNarration({ sentences: [{ text: 42 }] }), null);
  assert.equal(parseNarration({ sentences: [{ text: "ok", factIds: "fact-fa-1" }] }), null);
  assert.deepEqual(parseNarration({ sentences: [{ text: "ok", factIds: ["fact-fa-1"] }] }), [{ text: "ok", factIds: ["fact-fa-1"] }]);
});

test("grounding: rifiuta un fatto inventato o di un altro luogo", () => {
  assert.equal(checkGrounding([{ text: "x", factIds: ["fact-inventato-99"] }], allowed).ok, false);
  assert.equal(checkGrounding([{ text: "x", factIds: ["fact-rm-1"] }], allowed).ok, false);
  assert.equal(checkGrounding([{ text: "x", factIds: ["fact-fa-1"] }], allowed).ok, true);
});

test("grounding: una frase senza fonte deve essere racconto dichiarato, senza date né nomi", () => {
  assert.equal(checkGrounding([{ text: "Sono vecchia." }], allowed).ok, false);
  assert.equal(checkGrounding([{ text: "Sono vecchia.", flavor: true }], allowed).ok, true);
  assert.ok(flavorViolation("Nel 1797 ho visto passare tutti."));
  assert.ok(flavorViolation("Qui ha dormito anche Napoleone."));
  assert.equal(flavorViolation("Mi senti, ma non mi vedi."), null);
});

test("narrazione: il narratore a fixture supera i controlli", async () => {
  for (const t of THREADS) {
    const n = await narrate({ place: fa, facts: faFacts, thread: t }, fixtureProvider);
    assert.equal(n.fallback, false, n.log.join("\n"));
    assert.ok(n.sentences.some((s) => s.flavor) && n.sentences.some((s) => s.factIds?.length));
  }
});

test("narrazione: un'allucinazione viene rifiutata e sostituita dal testo di riserva", async () => {
  const n = await narrate({ place: fa, facts: faFacts, thread: "water" }, hallucinatingProvider);
  assert.equal(n.fallback, true);
  assert.ok(n.log.some((l) => l.includes("fact-inventato-99")));
  assert.ok(n.log.some((l) => l.includes("numero o una data")));
  assert.ok(n.sentences.every((s) => s.factIds?.every((id) => allowed.has(id))));
});

// ---------- verify ----------

test("verifica: tocco dentro e fuori dal riquadro", () => {
  const boxes: [number, number, number, number][] = [[0.4, 0.4, 0.6, 0.6]];
  assert.equal(insideBoxes(0.5, 0.5, boxes), true);
  assert.equal(insideBoxes(0.4, 0.6, boxes), true);
  assert.equal(insideBoxes(0.39, 0.5, boxes), false);
  assert.equal(insideBoxes(0.5, 0.61, boxes), false);
});

test("verifica: normalizzazione di accenti, maiuscole, articoli e spazi", () => {
  assert.equal(normalize("  La   Navetta! "), "navetta");
  assert.equal(normalize("Perché"), "perche");
  assert.ok(isRightAnswer("LAVATOIO", ["lavatoio"]));
  assert.ok(isRightAnswer("l'campana", ["campana"]));
  assert.ok(!isRightAnswer("", ["campana"]));
  assert.ok(!isRightAnswer("campanile", ["campana"]));
});

// ---------- seeds ----------

test("seeds: −5 per aiuto con un minimo, pagati una volta sola", () => {
  assert.equal(stopSeeds(0), 15);
  assert.equal(stopSeeds(1), 10);
  assert.equal(stopSeeds(5), 5);
  assert.equal(maxQuestSeeds(3), 70);
  const log = [
    { at: 100, seeds: 15, key: "stop:a" },
    { at: 300, seeds: 25, key: "thread:water" },
  ];
  assert.ok(isPaid(log, "stop:a") && !isPaid(log, "stop:b"));
  assert.equal(questSeedsSince(log), 40);
  assert.equal(questSeedsSince(log, 200), 25);
});
