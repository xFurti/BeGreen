import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  askTheComune,
  betterThan,
  citizenPm25,
  levelFromShare,
  nearestComune,
  parseSensorCommunity,
  pm10Level,
  recyclingLevel,
  type ComuneStats,
} from "../src/services/comune-levels.ts";

const root = path.resolve(import.meta.dirname, "..");
const comuni: ComuneStats[] = JSON.parse(readFileSync(path.join(root, "src/data/comuni-vicenza.json"), "utf8"));

test("il dataset copre i 113 comuni della provincia di Vicenza con codici ISTAT unici", () => {
  assert.equal(comuni.length, 113);
  assert.equal(new Set(comuni.map((c) => c.istat)).size, 113);
  for (const c of comuni) {
    assert.match(c.istat, /^024\d{3}$/);
    assert.ok(c.lat && c.lon && c.population, `${c.name}: posizione e popolazione`);
    assert.ok(c.soilSealedPct! > 0 && c.soilSealedPct! < 100, `${c.name}: suolo`);
    assert.ok(c.recyclingPct! > 0 && c.recyclingPct! <= 100, `${c.name}: raccolta differenziata`);
    assert.ok(c.co2Kt! >= 0 && c.pm10T! >= 0, `${c.name}: emissioni`);
  }
});

test("una posizione a Schio trova Schio; lontano dalla provincia nessun comune", () => {
  assert.equal(nearestComune(comuni, 45.71, 11.36)?.name, "Schio");
  assert.equal(nearestComune(comuni, 45.46, 9.19), undefined);
});

test("il confronto provinciale rispetta la direzione dell'indicatore", () => {
  const list = [1, 2, 3, 4, 5].map((v, i) => ({ istat: String(i), name: String(i), soilSealedPct: v }));
  const pick = (c: ComuneStats) => c.soilSealedPct;
  assert.equal(betterThan(list, 1, pick, false), 1);
  assert.equal(betterThan(list, 5, pick, false), 0);
  assert.equal(betterThan(list, 5, pick, true), 1);
  assert.equal(levelFromShare(0.9), "good");
  assert.equal(levelFromShare(0.5), "ok");
  assert.equal(levelFromShare(0.1), "bad");
  assert.equal(levelFromShare(undefined), "info");
});

test("soglie ufficiali: raccolta differenziata 65% e PM10 2030", () => {
  assert.equal(recyclingLevel(60), "bad");
  assert.equal(recyclingLevel(70), "ok");
  assert.equal(recyclingLevel(80), "good");
  assert.equal(pm10Level(27, 24), "bad");
  assert.equal(pm10Level(19, 10), "ok");
  assert.equal(pm10Level(14, 2), "good");
});

test("i sensori cittadini: ultima lettura per sensore, valori anomali scartati, mediana", () => {
  const r = (id: number, at: string, p2: string, indoor = 0) => ({
    timestamp: at,
    location: { latitude: "45.7", longitude: "11.3", indoor },
    sensor: { id },
    sensordatavalues: [
      { value_type: "P1", value: "10" },
      { value_type: "P2", value: p2 },
    ],
  });
  const readings = parseSensorCommunity([
    r(1, "2026-10-22 10:00:00", "50"),
    r(1, "2026-10-22 10:05:00", "8"), // newer reading wins
    r(2, "2026-10-22 10:05:00", "12"),
    r(3, "2026-10-22 10:05:00", "881.97"), // saturated sensor
    r(4, "2026-10-22 10:05:00", "0.00"), // stuck at zero
    r(5, "2026-10-22 10:05:00", "30", 1), // indoor
    { sensor: { id: 6 }, sensordatavalues: [{ value_type: "temperature", value: "20" }], location: {} },
  ]);
  assert.equal(readings.length, 4);
  assert.deepEqual(citizenPm25(readings), { median: 10, sensors: 2 });
  assert.equal(citizenPm25([]), undefined);
  assert.deepEqual(parseSensorCommunity({ error: true }), []);
});

test("la domanda al Comune parte dall'indicatore peggiore", () => {
  const schio = comuni.find((c) => c.name === "Schio")!;
  assert.match(askTheComune(schio, { pm10: "bad" }), /home heating/);
  assert.match(askTheComune({ ...schio, pm10Top: "Trasporto su strada" }, { pm10: "bad" }), /cycling/);
  assert.match(askTheComune(schio, { recycling: "bad" }), /65%/);
});
