/* eslint-disable import/first */
process.env.TZ = "Europe/Rome";

import assert from "node:assert/strict";
import { test } from "node:test";

import { daysTo2030 } from "../src/data/sdgs.ts";

test("conta i giorni di calendario fino alla fine del 2030", () => {
  assert.equal(daysTo2030(new Date(2026, 9, 23, 9, 27).getTime()), 1531);
  assert.equal(daysTo2030(new Date(2026, 9, 24, 0, 1).getTime()), 1530);
  assert.equal(daysTo2030(new Date(2030, 11, 31, 12).getTime()), 1);
  assert.equal(daysTo2030(new Date(2031, 0, 1, 0, 1).getTime()), 0);
  // la notte del cambio d'ora sposta il conto di un solo giorno
  assert.equal(daysTo2030(new Date(2026, 9, 24, 23, 30).getTime()), 1530);
  assert.equal(daysTo2030(new Date(2026, 9, 25, 0, 30).getTime()), 1529);
});