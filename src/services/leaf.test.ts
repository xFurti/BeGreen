import assert from "node:assert/strict";
import { test } from "node:test";

import { translate } from "@/i18n/catalog";
import type { Language } from "@/i18n/schema";
import { SAMPLE_PULSE } from "@/services/env";
import { buildInsights, type Insight } from "@/services/interpret";
import { answerLocally, askLeaf, SUGGESTED_KEYS, suggestionsFor } from "@/services/leaf";

const community = { carFree: 12, areaName: "Milano" };
const ctxFor = (language: Language) => ({ pulse: SAMPLE_PULSE, insights: buildInsights(SAMPLE_PULSE, community, language), audience: "me" as const, language });
const withLevel = (insights: Insight[], key: Insight["key"], level: Insight["level"]) => insights.map((i) => (i.key === key ? { ...i, level } : i));

for (const language of ["it", "en"] as const) {
  const ctx = ctxFor(language);

  test(`${language}: Leaf opens with at most three suggestions, led by what is wrong today`, () => {
    const calm = ctx.insights.map((i) => ({ ...i, level: "good" as const }));
    assert.equal(suggestionsFor(calm).length, 3);
    assert.equal(suggestionsFor(withLevel(calm, "air", "bad"))[0].key, "answers.suggested.bike");
    assert.equal(suggestionsFor(withLevel(calm, "air", "bad"))[1].key, "answers.suggested.pm");
    assert.equal(suggestionsFor(withLevel(calm, "water", "bad"))[0].key, "answers.suggested.dry");
  });

  test(`${language}: every answer has a verdict, and every suggestion or follow-up lands on a real answer`, () => {
    const generic = answerLocally("???", ctx).headline;
    for (const key of SUGGESTED_KEYS) {
      const answer = answerLocally(translate(language, key), ctx);
      assert.ok(answer.headline, key);
      assert.ok(answer.followUps?.length, key);
      // Only "how's it looking today?" is meant to reach the summary.
      if (key !== "answers.suggested.today") assert.notEqual(answer.headline, generic, key);
      for (const follow of answer.followUps ?? []) assert.ok(answerLocally(follow, ctx).headline, follow);
    }
  });

  test(`${language}: re-asking for another audience changes only tailored answers`, () => {
    const bike = translate(language, "answers.suggested.bike");
    const forMe = answerLocally(bike, ctx);
    const forClass = answerLocally(bike, { ...ctx, audience: "class" });
    assert.equal(forMe.tailored, true);
    assert.notEqual(forMe.text, forClass.text);
    assert.equal(forMe.headline, forClass.headline);
    assert.equal(answerLocally(translate(language, "answers.suggested.pm"), ctx).tailored, false);
  });
}

test("the AI backend can send a structured answer; bad fields are dropped and a bad body falls back", async (t) => {
  const ctx = ctxFor("it");
  const previous = process.env.EXPO_PUBLIC_LEAF_ENDPOINT;
  process.env.EXPO_PUBLIC_LEAF_ENDPOINT = "https://example.test/leaf";
  t.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_LEAF_ENDPOINT;
    else process.env.EXPO_PUBLIC_LEAF_ENDPOINT = previous;
  });

  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      text: "Oggi sì.",
      headline: "Vai in bici",
      cites: ["cams", "made-up", "toString", "__proto__"],
      facts: [{ label: "PM2.5", value: 8, unit: "µg/m³", level: "good" }, { label: "" }],
      followUps: ["E domani?", 3, "E per la classe?", "Troppe"],
    }),
  );
  const ai = await askLeaf("bici?", ctx);
  assert.equal(ai.mode, "ai");
  assert.equal(ai.headline, "Vai in bici");
  assert.deepEqual(ai.cites, ["cams"]);
  assert.deepEqual(ai.facts, [{ label: "PM2.5", value: "8", unit: "µg/m³", level: "good" }]);
  assert.deepEqual(ai.followUps, ["E domani?", "E per la classe?"]);

  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => Response.json({ cites: ["cams"] }));
  const fallback = await askLeaf("bici?", ctx);
  assert.equal(fallback.mode, "local");
  assert.ok(fallback.headline);
});

test("suggestions skip questions the loaded data cannot answer", () => {
  const onlyAirAndNature = ctxFor("en").insights.filter((i) => i.key === "air" || i.key === "nature").map((i) => ({ ...i, level: "good" as const }));
  const keys = suggestionsFor(onlyAirAndNature).map((s) => s.key);
  assert.ok(!keys.includes("answers.suggested.bike"));
  assert.deepEqual(keys, ["answers.suggested.live", "answers.suggested.class", "answers.suggested.pm"]);
});

test("dry soil makes the dry verdict say yes even when it is only amber in Pulse", () => {
  const pulse = { ...SAMPLE_PULSE, water: undefined, soil: { ...SAMPLE_PULSE.soil!, moisture: 0.15 } };
  const insights = buildInsights(pulse, community, "it");
  const answer = answerLocally(translate("it", "answers.suggested.dry"), { pulse, insights, audience: "me", language: "it" });
  assert.equal(answer.headline, translate("it", "answers.dryYesHead"));
});
