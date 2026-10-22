import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { NatureData } from "../src/services/env";
import type { QuestFact, QuestPlace, Thread } from "../src/data/quest/types";
import { checkGrounding, flavorViolation, parseNarration } from "../src/services/quest/grounding.ts";
import { fixtureProvider, hallucinatingProvider, narrate } from "../src/services/quest/narrate.ts";
import { buildNatureStop, INAT, OSM } from "../src/services/quest/nature.ts";
import { isCurrentRoute, ROUTE, routeFor, STOPS } from "../src/services/quest/route.ts";
import { isPaid, maxQuestSeeds, questSeedsSince, stopSeeds } from "../src/services/quest/seeds.ts";
import { insideBoxes, isRightAnswer, normalize } from "../src/services/quest/verify.ts";

const root = path.resolve(import.meta.dirname, "..");
const load = <T>(f: string): T => JSON.parse(readFileSync(path.join(root, "src/data/quest", f), "utf8"));
const places = load<QuestPlace[]>("places.json");
const facts = load<QuestFact[]>("facts.json");
const THREADS: Thread[] = ["water", "reuse", "green"];

// ---------- route ----------

test("percorso: stesso per ogni filo, 4 tappe, le vecchie partite salvate non sono più giocabili", () => {
  for (const t of THREADS) assert.deepEqual(routeFor(t).stops, [...ROUTE]);
  assert.equal(STOPS, 4);
  assert.ok(isCurrentRoute([...ROUTE]));
  assert.ok(!isCurrentRoute(["fabbrica-alta", "roggia-maestra", "lanificio-conte"]));
});

// ---------- nature stop (live data) ----------

const nature: NatureData = {
  speciesCount: 214,
  top: [
    { id: 1, name: "Passer italiae", common: "Italian Sparrow", count: 12, photo: "https://x/1.jpg" },
    { id: 2, name: "Hedera helix", common: "Common Ivy", count: 31, photo: "https://x/2.jpg" },
    { id: 3, name: "Erithacus rubecula", common: "European Robin", count: 9 },
    { id: 4, name: "Bombus terrestris", count: 4 },
  ],
};

test("natura: la specie da trovare è la più osservata, 3 scelte diverse, domanda col luogo", () => {
  const s = buildNatureStop(nature, [{ id: 9, name: "Parco Naturale X", km: 7.4 }], "Schio")!;
  assert.equal(s.target.id, 2);
  assert.equal(s.options.length, 3);
  assert.equal(new Set(s.options.map((o) => o.id)).size, 3);
  assert.ok(s.options.some((o) => o.id === s.target.id));
  assert.match(s.question, /Schio/);
});

test("natura: ogni numero viene dai dati e cita la sua fonte; il racconto è pulito", () => {
  const s = buildNatureStop(nature, [{ id: 9, name: "Parco Naturale X", km: 7.4 }], "Schio")!;
  for (const x of s.sentences) {
    if (x.flavor) assert.equal(flavorViolation(x.text), null, x.text);
    else assert.ok(x.sourceId === INAT || x.sourceId === OSM, x.text);
    if (/\d/.test(x.text)) assert.ok(!x.flavor && x.sourceId, x.text);
  }
  const all = s.sentences.map((x) => x.text).join(" ");
  assert.match(all, /31 osservazioni/);
  assert.match(all, /214 specie/);
  assert.match(all, /Parco Naturale X, a 7\.4 km/);
});

test("natura: senza aree protette non ne inventa una; senza specie non c'è tappa", () => {
  const s = buildNatureStop(nature, undefined, "Schio")!;
  assert.ok(s.sentences.every((x) => x.sourceId !== OSM));
  assert.equal(buildNatureStop({ speciesCount: 0, top: [] }, [], "Schio"), null);
  assert.equal(buildNatureStop(undefined, [], "Schio"), null);
});

// ---------- grounding ----------

const lc = places.find((p) => p.id === "lanificio-conte")!;
const lcFacts = facts.filter((f) => f.placeId === lc.id);
const allowed = new Set(lcFacts.map((f) => f.id));

test("grounding: schema rifiuta output malformati", () => {
  assert.equal(parseNarration(null), null);
  assert.equal(parseNarration({ sentences: [] }), null);
  assert.equal(parseNarration({ sentences: [{ text: 42 }] }), null);
  assert.equal(parseNarration({ sentences: [{ text: "ok", factIds: "fact-lc-1" }] }), null);
  assert.deepEqual(parseNarration({ sentences: [{ text: "ok", factIds: ["fact-lc-1"] }] }), [{ text: "ok", factIds: ["fact-lc-1"] }]);
});

test("grounding: rifiuta un fatto inventato o di un altro luogo", () => {
  assert.equal(checkGrounding([{ text: "x", factIds: ["fact-inventato-99"] }], allowed).ok, false);
  assert.equal(checkGrounding([{ text: "x", factIds: ["fact-rm-1"] }], allowed).ok, false);
  assert.equal(checkGrounding([{ text: "x", factIds: ["fact-lc-1"] }], allowed).ok, true);
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
    const n = await narrate({ place: lc, facts: lcFacts, thread: t }, fixtureProvider);
    assert.equal(n.fallback, false, n.log.join("\n"));
    assert.ok(n.sentences.some((s) => s.flavor) && n.sentences.some((s) => s.factIds?.length));
  }
});

test("narrazione: un'allucinazione viene rifiutata e sostituita dal testo di riserva", async () => {
  const n = await narrate({ place: lc, facts: lcFacts, thread: "water" }, hallucinatingProvider);
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
  assert.equal(maxQuestSeeds(4), 85);
  const log = [
    { at: 100, seeds: 15, key: "stop:a" },
    { at: 300, seeds: 25, key: "thread:water" },
  ];
  assert.ok(isPaid(log, "stop:a") && !isPaid(log, "stop:b"));
  assert.equal(questSeedsSince(log), 40);
  assert.equal(questSeedsSince(log, 200), 25);
});
