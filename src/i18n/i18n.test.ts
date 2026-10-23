import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { searchItems } from "@/data/guide";
import { translate } from "@/i18n/catalog";
import { formatNumber, monthName, timeAgo, weekdayInitials } from "@/i18n/format";
import { languageFromTag } from "@/i18n/locale";
import { applyPersisted, normalizeQuestTitle } from "@/i18n/persist";
import { SAMPLE_PULSE } from "@/services/env";
import { buildDrop, localizeDrop } from "@/services/drop";
import { buildInsights } from "@/services/interpret";
import { answerLocally } from "@/services/leaf";

const numbers = (text: string) => text.match(/\d+(?:[.,]\d+)?/g)?.map((n) => n.replace(",", ".")) ?? [];

describe("language", () => {
  it("follows Italian, and uses English for English and everything else", () => {
    assert.equal(languageFromTag("it"), "it");
    assert.equal(languageFromTag("it-IT"), "it");
    assert.equal(languageFromTag("it_CH"), "it");
    assert.equal(languageFromTag("en"), "en");
    assert.equal(languageFromTag("en-GB"), "en");
    assert.equal(languageFromTag("fr-FR"), "en");
    assert.equal(languageFromTag(""), "en");
    assert.equal(languageFromTag(undefined), "en");
  });

  it("fills a missing language without dropping saved posts or squads", () => {
    const saved = applyPersisted(
      {
        language: undefined,
        profile: { name: "You", handle: "you", role: "student" },
        place: { name: "Your area", lat: 1, lon: 2 },
        myPosts: [{ id: "me-1" }],
        verified: { p1: true },
        squads: [{ quest: { title: "Car-free week", goal: 10 } }],
        bonusSeeds: 4,
      },
      "it",
    );
    assert.equal(saved.language, "it");
    assert.equal(saved.profile.name, "");
    assert.equal(saved.place.name, "");
    assert.deepEqual(saved.myPosts, [{ id: "me-1" }]);
    assert.deepEqual(saved.verified, { p1: true });
    assert.equal(saved.bonusSeeds, 4);
    assert.equal(saved.squads[0].quest.title, "carFreeWeek");
    assert.equal(saved.squads[0].quest.goal, 10);
  });

  it("keeps an explicit language and a chosen name", () => {
    const saved = applyPersisted({ language: "en", profile: { name: "Luca", handle: "luca" }, myPosts: [{ id: "a" }] }, "it");
    assert.equal(saved.language, "en");
    assert.equal(saved.profile.name, "Luca");
    assert.deepEqual(saved.myPosts, [{ id: "a" }]);
    assert.equal(normalizeQuestTitle("First 10 proofs"), "firstProofs");
    assert.equal(normalizeQuestTitle("Classe 4B"), "Classe 4B");
  });
});

describe("formatting", () => {
  it("groups thousands and decimals for the active locale", () => {
    assert.equal(formatNumber(1234567.8, "it"), "1.234.567,8");
    assert.equal(formatNumber(1234567.8, "en"), "1,234,567.8");
  });

  it("uses Italian weekday initials and month names", () => {
    assert.deepEqual(weekdayInitials("it"), ["L", "M", "M", "G", "V", "S", "D"]);
    assert.deepEqual(weekdayInitials("en"), ["M", "T", "W", "T", "F", "S", "S"]);
    const october = new Date(2026, 9, 23);
    assert.equal(monthName(october, "it"), "Ottobre");
    assert.equal(monthName(october, "en"), "October");
  });

  it("localises relative time", () => {
    const now = 1_700_000_000_000;
    assert.equal(timeAgo(now - 5_000, "en", now), "now");
    assert.equal(timeAgo(now - 5_000, "it", now), "ora");
    assert.equal(timeAgo(now - 5 * 60_000, "en", now), "5m");
    assert.equal(timeAgo(now - 5 * 60_000, "it", now), "5 min");
    assert.equal(timeAgo(now - 3 * 3_600_000, "en", now), "3h");
    assert.equal(timeAgo(now - 3 * 3_600_000, "it", now), "3 h");
    assert.equal(timeAgo(now - 2 * 86_400_000, "en", now), "2d");
    assert.equal(timeAgo(now - 2 * 86_400_000, "it", now), "2 g");
  });
});

describe("guide search", () => {
  it("finds the same cards from either language", () => {
    const bins = (q: string) => searchItems(q).map((item) => item.bin);
    assert.deepEqual(bins("pizza box"), ["paper"]);
    assert.deepEqual(bins("Tetra Pak"), ["paper"]);
    assert.deepEqual(bins("scontrino"), ["residual"]);
    assert.deepEqual(bins("receipt"), ["residual"]);
    assert.ok(searchItems("umido").length > 0);
    assert.ok(searchItems("umido").every((item) => item.bin === "organic"));
    assert.equal(translate("it", "items.receipt.name"), "Scontrino");
    assert.equal(translate("en", "items.receipt.name"), "Receipt");
    assert.equal(translate("it", "bins.organic.name"), "Umido / organico");
    assert.equal(translate("it", "items.pizzaBox.tip").length > 0, true);
  });
});

describe("generated copy", () => {
  const community = { carFree: 7421, areaName: "Municipio 3" };

  it("keeps the measured numbers when the Drop changes language", () => {
    const en = buildDrop(SAMPLE_PULSE, "c:2026-10-23", "en");
    const it = buildDrop(SAMPLE_PULSE, "c:2026-10-23", "it");
    assert.equal(en.action, it.action);
    assert.notEqual(en.title, it.title);
    assert.deepEqual(numbers(`${en.why} ${en.metric}`), numbers(`${it.why} ${it.metric}`));
    assert.match(en.metric, /31\.2/);
    assert.match(it.metric, /31,2/);
    assert.match(it.title, /auto|strada/i);
  });

  it("reads a shared Drop in each person's language from its stored readings", () => {
    const fromItalianPhone = buildDrop(SAMPLE_PULSE, "c:2026-10-23", "it");
    const readInEnglish = localizeDrop(fromItalianPhone, "en");
    const builtInEnglish = buildDrop(SAMPLE_PULSE, "c:2026-10-23", "en");
    assert.equal(readInEnglish.title, builtInEnglish.title);
    assert.equal(readInEnglish.why, builtInEnglish.why);
    assert.equal(readInEnglish.metric, builtInEnglish.metric);
    assert.equal(localizeDrop({ ...fromItalianPhone, data: {} }, "en").title, fromItalianPhone.title);
    const { city: _city, ...withoutCity } = fromItalianPhone.data;
    assert.match(localizeDrop({ ...fromItalianPhone, data: withoutCity }, "en", "Segrate").why, /Segrate/);
  });

  it("explains the same pulse in both languages", () => {
    const en = buildInsights(SAMPLE_PULSE, community, "en");
    const it = buildInsights(SAMPLE_PULSE, community, "it");
    assert.deepEqual(
      en.map((item) => item.key),
      it.map((item) => item.key),
    );
    const airEn = en.find((item) => item.key === "air");
    const airIt = it.find((item) => item.key === "air");
    assert.equal(airEn?.value, airIt?.value);
    assert.match(airEn?.explain.comune ?? "", /7,421/);
    assert.match(airIt?.explain.comune ?? "", /7\.421/);
    assert.notEqual(airEn?.explain.me, airIt?.explain.me);
  });
});

describe("Leaf", () => {
  const insights = buildInsights(SAMPLE_PULSE, { carFree: 12, areaName: "Milano" }, "it");
  const base = { pulse: SAMPLE_PULSE, insights, audience: "me" as const };

  it("answers Italian and English questions in the interface language and cites sources", () => {
    for (const question of ["aria", "bike"]) {
      const it = answerLocally(question, { ...base, language: "it" });
      const en = answerLocally(question, { ...base, language: "en", insights: buildInsights(SAMPLE_PULSE, { carFree: 12, areaName: "Milano" }, "en") });
      assert.ok(it.cites.includes("cams"));
      assert.ok(en.cites.includes("cams"));
      assert.match(it.text, /Sì|bici|aria/i);
      assert.match(en.text, /Yes|bike|air/i);
      assert.deepEqual(numbers(it.text), numbers(en.text));
    }

    const trust = answerLocally("affidabilità", { ...base, language: "it" });
    assert.match(trust.text, /Attenzione|modello|Misura/i);
    assert.ok(trust.cites.length > 0);

    const species = answerLocally("species", { ...base, language: "en", insights: buildInsights(SAMPLE_PULSE, { carFree: 12, areaName: "Milano" }, "en") });
    assert.match(species.text, /species/i);
    assert.ok(species.cites.includes("inat"));

    const suggested = translate("it", "answers.suggested.trust");
    const fromChip = answerLocally(suggested, { ...base, language: "it" });
    assert.match(fromChip.text, /Attenzione|modello|Misura/i);
    assert.ok(fromChip.cites.length > 0);
  });
});
