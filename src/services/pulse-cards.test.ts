import assert from "node:assert/strict";
import { test } from "node:test";

import { translator } from "@/i18n/catalog";
import { DEFAULT_PLACE, SAMPLE_PULSE, type Pulse } from "@/services/env";
import { buildInsights } from "@/services/interpret";
import { pulseCards } from "@/services/pulse-cards";

const missing: Pulse = { place: DEFAULT_PLACE, fetchedAt: 0, sample: false };
const community = { carFree: 0, areaName: DEFAULT_PLACE.name };

test("missing sources stay discoverable without fabricated readings or action rewards", () => {
  const cards = pulseCards(missing, buildInsights(missing, community, "it"), translator("it"));
  assert.equal(cards.length, 6);
  for (const card of cards) {
    assert.equal(card.state, "unavailable");
    assert.equal(card.value, "—");
    assert.equal(card.act, undefined);
    assert.ok(card.sources.length);
  }
});

test("an empty map result is zero; loading and failed maps never become zero", () => {
  for (const lang of ["en", "it"] as const) {
    for (const state of ["empty", "loading", "error"] as const) {
      const pulse: Pulse = { ...missing, ...(state === "empty" ? { areas: [] } : { areasStatus: state }) };
      const areas = pulseCards(pulse, buildInsights(pulse, community, lang), translator(lang)).find(c => c.key === "areas")!;
      assert.equal(areas.value, state === "empty" ? "0" : "—");
      assert.equal(areas.state, state === "empty" ? "ready" : state === "loading" ? "loading" : "unavailable");
      assert.equal(areas.act, undefined);
      assert.ok(areas.explain.me);
    }
  }
});

test("a failed source does not hide working data or change the associated action", () => {
  const pulse = { ...SAMPLE_PULSE, nature: undefined };
  const insights = buildInsights(pulse, community, "it");
  const cards = pulseCards(pulse, insights, translator("it"));
  assert.equal(cards.find(c => c.key === "nature")!.state, "unavailable");
  for (const key of ["air", "weather", "water", "soil"] as const) {
    const original = insights.find(i => i.key === key)!;
    const card = cards.find(c => c.key === key)!;
    assert.equal(card.state, "ready");
    assert.equal(card.value, original.value);
    assert.deepEqual(card.act, original.act);
  }
});

test("rainfall has an unambiguous localized title without rewriting the shared insights", () => {
  for (const lang of ["it", "en"] as const) {
    const t = translator(lang);
    const insights = buildInsights(SAMPLE_PULSE, community, lang);
    const before = structuredClone(insights);
    const water = pulseCards(SAMPLE_PULSE, insights, t).find(c => c.key === "water")!;
    assert.equal(water.label, t("pulse.rain"));
    assert.deepEqual(insights, before);
  }
});
