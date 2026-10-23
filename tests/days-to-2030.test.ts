/* eslint-disable import/first */
process.env.TZ = "Europe/Rome";

import assert from "node:assert/strict";
import { test } from "node:test";

import { daysTo2030 } from "../src/data/sdgs.ts";

test("conta i giorni di calendario fino al 1 gennaio 2030", () => {
  assert.equal(daysTo2030(new Date(2026, 9, 23, 9, 27).getTime()), 1166);
  assert.equal(daysTo2030(new Date(2026, 9, 24, 0, 1).getTime()), 1165);
  assert.equal(daysTo2030(new Date(2029, 11, 31, 12).getTime()), 1);
  assert.equal(daysTo2030(new Date(2030, 0, 1, 0, 1).getTime()), 0);
  // la notte del cambio d'ora sposta il conto di un solo giorno
  assert.equal(daysTo2030(new Date(2026, 9, 24, 23, 30).getTime()), 1165);
  assert.equal(daysTo2030(new Date(2026, 9, 25, 0, 30).getTime()), 1164);
});

test("il traguardo resta il 1 gennaio 2030 anche cambiando fuso durante la sessione", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["Europe/Rome", "America/New_York", "Pacific/Honolulu", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(daysTo2030(new Date(2029, 11, 31, 12).getTime()), 1, zone);
      assert.equal(daysTo2030(new Date(2030, 0, 1, 0, 1).getTime()), 0, zone);
    }
  } finally {
    process.env.TZ = previous;
  }
});
