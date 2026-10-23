import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIONS } from "@/data/actions";
import { translator, translate } from "@/i18n/catalog";
import { actionCopy } from "@/i18n/content";
import { applyPersisted } from "@/i18n/persist";
import { buildDrop, localizeDrop, type Drop } from "@/services/drop";
import { DEFAULT_PLACE, fetchNature, fetchPulse, SAMPLE_PULSE, type Pulse } from "@/services/env";
import { buildInsights } from "@/services/interpret";
import { answerLocally, askLeaf } from "@/services/leaf";

const community = { carFree: 0, areaName: "Milano" };
// What Leaf shows for an answer: the verdict, then the body.
const shown = (a: { headline?: string; text: string }) => [a.headline, a.text].filter(Boolean).join("\n\n");
const forbidden = /squirrel|pigeon|sciurus|columba|birds?|bugs?|uccell|insett|this guy/i;
const empty: Pulse = { place: DEFAULT_PLACE, fetchedAt: Date.now(), sample: false, nature: { speciesCount: 0, top: [], taxon: "Plantae" } };

test("iNaturalist filters plants in the request and maps only Plantae, using the filtered total", async (t) => {
  const groups = ["Plantae", "Aves", "Mammalia", "Insecta", "Reptilia", "Amphibia", "Actinopterygii", "Arachnida", "Mollusca", "Animalia", "Fungi", undefined];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("iconic_taxa"), "Plantae");
    assert.equal(query.get("radius"), "10");
    assert.equal(query.get("quality_grade"), "research");
    assert.equal(query.get("locale"), "it");
    assert.match(query.get("d1")!, /^\d{4}-\d{2}-\d{2}$/);
    return Response.json({
      total_results: 87,
      results: groups.map((group, id) => ({ count: 5, taxon: {
        id, name: id === 0 ? "Hedera helix" : "Excluded taxon", iconic_taxon_name: group,
        preferred_common_name: "Edera", default_photo: { medium_url: "https://example.test/ivy.jpg", attribution: "Observer (CC BY)" },
      } })),
    });
  });
  const nature = await fetchNature(DEFAULT_PLACE, "it");
  assert.equal(nature.speciesCount, 87); // Not the number of cards in the first page.
  assert.equal(nature.taxon, "Plantae");
  assert.equal(nature.locale, "it");
  assert.deepEqual(nature.top, [{ id: 0, name: "Hedera helix", common: "Edera", photo: "https://example.test/ivy.jpg", attribution: "Observer (CC BY)", count: 5, group: "Plantae" }]);
});

test("zero plant results stay zero even when the other sources fail; offline samples contain only plants", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("inaturalist")) return Response.json({ total_results: 0, results: [] });
    throw new Error("offline");
  });
  const pulse = await fetchPulse(DEFAULT_PLACE);
  assert.equal(pulse.sample, false);
  assert.equal(pulse.nature?.speciesCount, 0);
  assert.deepEqual(pulse.nature?.top, []);

  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const offline = await fetchPulse(DEFAULT_PLACE);
  assert.equal(offline.sample, true);
  assert.ok(offline.nature!.top.length > 0);
  assert.ok(offline.nature!.top.every((s) => s.group === "Plantae"));
  assert.doesNotMatch(JSON.stringify(offline.nature), forbidden);
});

for (const language of ["en", "it"] as const) {
  test(`${language}: empty Nature explains 0 records for every audience and does not generate a spot Drop`, () => {
    const insight = buildInsights(empty, community, language).find((i) => i.key === "nature")!;
    assert.equal(insight.value, "0");
    for (const text of Object.values(insight.explain)) {
      assert.match(text, /^0 /);
      assert.match(text, /plant|piant/);
      assert.doesNotMatch(text, /most seen|più vista/i);
    }
    assert.equal(buildDrop(empty, "milano:2026-10-23", language).action, "refill");
  });

  test(`${language}: new and stored Drops speak about plants and preserve identity`, () => {
    const pulse = { ...empty, nature: SAMPLE_PULSE.nature };
    const drop = buildDrop(pulse, "milano:2026-10-23", language);
    assert.equal(drop.action, "spot");
    assert.equal(drop.data.plantSpecies, SAMPLE_PULSE.nature!.speciesCount);
    assert.equal(drop.data.species, undefined);
    assert.match(drop.title, /287/);
    assert.match(drop.why, /plant|piant/);
    assert.doesNotMatch(JSON.stringify(drop), forbidden);

    const legacy: Drop = { ...drop, title: "Old bird challenge", why: "Spot a bird or bug", metric: "999 species", shared: true, data: { species: 999 } };
    const shown = localizeDrop(legacy, language);
    assert.equal(shown.id, legacy.id);
    assert.equal(shown.action, "spot");
    assert.equal(shown.shared, true);
    assert.equal(shown.data.species, 999); // Keep the stored snapshot; do not relabel its mixed count.
    assert.match(shown.title, /plant|piant/);
    assert.doesNotMatch(shown.title + shown.why + shown.metric, /999|bird|bug/);

    const pickup = buildDrop({ ...empty, nature: undefined, areas: SAMPLE_PULSE.areas }, drop.id, language);
    assert.equal(pickup.action, "pickup");
    assert.doesNotMatch(pickup.why, /animal/);
  });

  test(`${language}: Leaf's old and new nature questions list plants; animal questions explain the scope`, async (t) => {
    const ctx = { pulse: SAMPLE_PULSE, insights: buildInsights(SAMPLE_PULSE, community, language), audience: "me" as const, language };
    const questions = ["What lives near me?", "Che cosa vive vicino a me?", "species", translate(language, "answers.suggested.live")];
    for (const question of questions) {
      const answer = answerLocally(question, ctx);
      assert.match(shown(answer), /Common Daisy/);
      assert.doesNotMatch(shown(answer), forbidden);
      assert.ok(answer.cites.includes("inat"));
    }
    for (const question of ["any birds near me?", "any bugs outside?", "uccelli vicino a me?", "insetti nel parco?"]) {
      const answer = answerLocally(question, ctx);
      assert.match(shown(answer), /animals are not included|animali non sono inclusi/);
      assert.match(shown(answer), /Common Daisy/);
      assert.doesNotMatch(shown(answer), forbidden);
    }
    const zero = answerLocally("species", { ...ctx, pulse: empty });
    assert.match(shown(zero), /^0 /);
    assert.doesNotMatch(shown(zero), /most seen|più viste/i);
    const missing = answerLocally("species", { ...ctx, pulse: { ...empty, nature: undefined } });
    assert.doesNotMatch(shown(missing), /Common Daisy|^0 /);

    const previous = process.env.EXPO_PUBLIC_LEAF_ENDPOINT;
    process.env.EXPO_PUBLIC_LEAF_ENDPOINT = "https://example.test/leaf";
    t.after(() => {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_LEAF_ENDPOINT;
      else process.env.EXPO_PUBLIC_LEAF_ENDPOINT = previous;
    });
    const remote = t.mock.method(globalThis, "fetch", async () => { throw new Error("Nature must use the filtered local readings"); });
    assert.equal((await askLeaf("What lives near me?", ctx)).mode, "local");
    assert.equal((await askLeaf("any birds near me?", ctx)).mode, "local");
    assert.equal(remote.mock.callCount(), 0);
  });

  test(`${language}: the existing spot ID renders plant instructions with the same rewards`, () => {
    const action = actionCopy(translator(language), "spot");
    assert.equal(action.id, "spot");
    assert.equal(action.seeds, ACTIONS.spot.seeds);
    assert.match(action.label, /plant|piant/);
    assert.doesNotMatch(JSON.stringify(action), forbidden);
  });
}

test("persisted mixed Nature is invalidated without removing readings, profiles or existing spot proofs", () => {
  const posts = [{ id: "old-spot", action: "spot", caption: "My observation" }];
  const saved = { language: "it", pulse: { ...SAMPLE_PULSE, nature: { speciesCount: 999, top: [{ name: "Sciurus carolinensis", group: "Mammalia" }] } }, myPosts: posts, profile: { name: "Ada", handle: "ada" } };
  const next = applyPersisted(saved, "en");
  assert.equal(next.pulse.nature, undefined);
  assert.equal(next.pulse.fetchedAt, 0);
  assert.deepEqual(next.pulse.air, SAMPLE_PULSE.air);
  assert.deepEqual(next.pulse.water, SAMPLE_PULSE.water);
  assert.deepEqual(next.pulse.soil, SAMPLE_PULSE.soil);
  assert.deepEqual(next.pulse.areas, SAMPLE_PULSE.areas);
  assert.deepEqual(next.myPosts, posts);
  assert.deepEqual(next.profile, saved.profile);
  assert.equal(applyPersisted({ pulse: SAMPLE_PULSE }, "en").pulse, SAMPLE_PULSE);
});
