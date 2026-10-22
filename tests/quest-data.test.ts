import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { QuestClue, QuestFact, QuestLink, QuestPlace, QuestSource } from "../src/data/quest/types";
import { flavorViolation } from "../src/services/quest/grounding.ts";

const root = path.resolve(import.meta.dirname, "..");
const load = <T>(f: string): T => JSON.parse(readFileSync(path.join(root, "src/data/quest", f), "utf8"));

const places = load<QuestPlace[]>("places.json");
const links = load<QuestLink[]>("links.json");
const clues = load<QuestClue[]>("clues.json");
const facts = load<QuestFact[]>("facts.json");
const sources = load<QuestSource[]>("sources.json");
const source = new Map(sources.map((s) => [s.id, s]));
const place = new Map(places.map((p) => [p.id, p]));

test("ogni fatto, indizio e collegamento ha una fonte valida", () => {
  for (const x of [...facts, ...clues, ...links]) assert.ok(source.has(x.sourceId), `${x.id}: ${x.sourceId}`);
});

test("ogni citazione compare alla lettera nello snapshot salvato della fonte", () => {
  for (const x of [...facts, ...links]) {
    const s = source.get(x.sourceId)!;
    assert.ok(s.snapshot, `${x.id}: la fonte ${s.id} non ha uno snapshot`);
    const text = readFileSync(path.join(root, s.snapshot!), "utf8");
    assert.ok(text.includes(x.quote), `${x.id}: «${x.quote}»`);
  }
});

test("ogni foto ha autore, licenza aperta, link Commons, file e dimensioni", () => {
  for (const p of places) {
    assert.ok(p.photo.author, p.id);
    assert.match(p.photo.license, /^(CC BY|CC BY-SA|CC0|Public domain)/, p.id);
    assert.match(p.photo.url, /^https:\/\/commons\.wikimedia\.org\//, p.id);
    assert.ok(existsSync(path.join(root, "assets/quest/full", `${p.photo.key}.jpg`)), p.photo.key);
    assert.ok(p.photo.w > 0 && p.photo.h > 0, p.id);
  }
});

test("ogni indizio punta a un luogo, ha ritaglio, due aiuti, risposte e riquadri validi", () => {
  for (const c of clues) {
    assert.ok(place.has(c.placeId), c.id);
    assert.ok(existsSync(path.join(root, "assets/quest/crops", `${c.crop}.jpg`)), c.crop);
    assert.equal(c.hints.length, 2, c.id);
    assert.ok(c.check.answers.length > 0, c.id);
    for (const [x0, y0, x1, y1] of c.boxes) assert.ok(0 <= x0 && x0 < x1 && x1 <= 1 && 0 <= y0 && y0 < y1 && y1 <= 1, c.id);
  }
});

test("luoghi completi: almeno 3 fatti e un indizio, racconto pulito, curiosità con fatti del luogo", () => {
  for (const p of places) {
    const own = facts.filter((f) => f.placeId === p.id);
    assert.ok(own.length >= 3, p.id);
    assert.ok(clues.some((c) => c.placeId === p.id), p.id);
    for (const [thread, line] of Object.entries(p.flavor)) assert.equal(flavorViolation(line), null, `${p.id}.${thread}: ${line}`);
    assert.ok(p.curiosity.factIds.length > 0, p.id);
    for (const id of p.curiosity.factIds) assert.ok(own.some((f) => f.id === id), `${p.id}: curiosità cita ${id}`);
  }
});

test("collegamenti tra luoghi esistenti, id univoci, ogni filo ha almeno due collegamenti", () => {
  for (const l of links) assert.ok(place.has(l.from) && place.has(l.to), l.id);
  for (const xs of [places, links, clues, facts, sources]) assert.equal(new Set(xs.map((x) => x.id)).size, xs.length);
  for (const t of ["water", "reuse", "green"]) assert.ok(links.filter((l) => l.thread === t).length >= 2, t);
});
