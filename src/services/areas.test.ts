import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLACE, fetchAreas } from "@/services/env";

test("a map request that never answers still lets the card stop loading", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", () => new Promise<Response>(() => {}));
  const pending = assert.rejects(fetchAreas(DEFAULT_PLACE, 50), /timed out/);
  t.mock.timers.tick(50);
  await pending;
});

test("every mirror failing is an error, not a silent spinner", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  await assert.rejects(fetchAreas(DEFAULT_PLACE), /unavailable/);
});

test("areas keep only named mapped results, deduplicated and sorted by distance", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: string, init?: RequestInit) => {
    assert.match(String(init?.body), /protected_area/);
    assert.match(String(init?.body), /nature_reserve/);
    return Response.json({
      elements: [
        { id: 1, tags: { name: "Parco lontano" }, center: { lat: 45.9, lon: 9.2 } },
        { id: 2, tags: { name: "Parco vicino" }, center: { lat: 45.5, lon: 9.2 } },
        { id: 3, tags: { name: "Parco vicino" }, center: { lat: 45.6, lon: 9.3 } },
        { id: 4, tags: {}, center: { lat: 45.5, lon: 9.2 } },
        { id: 5, tags: { name: "Senza centro" } },
      ],
    });
  });
  const areas = await fetchAreas(DEFAULT_PLACE);
  assert.deepEqual(
    areas.map((a) => a.name),
    ["Parco vicino", "Parco lontano"],
  );
  assert.ok(areas[0].km < areas[1].km);
});
