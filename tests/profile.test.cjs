const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanProfile,
  validProfile,
  calendarMonth,
  hasLocation,
  mapPreview,
  profileMapPins,
  profileMapCamera,
} = require("../src/utils/profile.ts");

test("profile trims names and handles while rejecting empty or invalid usernames", () => {
  const p = cleanProfile("  Alex Green  ", " @Alex_Green ", "student");
  assert.deepEqual(p, { name: "Alex Green", handle: "alex_green", role: "student" });
  assert.equal(validProfile(p), true);
  assert.equal(validProfile(cleanProfile("Alex", "@Alex.Green", "teacher")), true);
  for (const handle of ["a", "bad handle", "bad!", "x".repeat(25)])
    assert.equal(validProfile(cleanProfile("Alex", handle, "teacher")), false);
  assert.equal(validProfile(cleanProfile("  ", "alex", "student")), false);
});

test("calendar uses Monday first, includes leap day, pads rows and excludes other years", () => {
  const posts = [
    { id: "old", createdAt: new Date(2023, 1, 3).getTime() },
    { id: "early", createdAt: new Date(2024, 1, 29, 8).getTime() },
    { id: "late", createdAt: new Date(2024, 1, 29, 20).getTime() },
  ];
  const { cells, byDay } = calendarMonth(new Date(2024, 1, 1), posts);
  assert.deepEqual(cells.slice(0, 5), [null, null, null, 1, 2]);
  assert.equal(cells.filter(Boolean).length, 29);
  assert.equal(cells.length % 7, 0);
  assert.deepEqual(
    byDay.get(29).map((p) => p.id),
    ["late", "early"],
  );
  assert.equal(byDay.has(3), false);
  assert.equal(calendarMonth(new Date(2026, 1, 1), []).cells.filter(Boolean).length, 28);
});

test("map omits private, legacy and invalid locations instead of fabricating pins", () => {
  assert.equal(hasLocation({ place: "Milano" }), false);
  assert.equal(hasLocation({ location: { lat: NaN, lon: 9 } }), false);
  assert.equal(hasLocation({ location: { lat: 90, lon: 9 } }), false);
  assert.equal(hasLocation({ location: { lat: 45, lon: 181 } }), false);
  assert.equal(hasLocation({ location: { lat: 0, lon: 0 } }), true);
});

test("profile map never fills empty or private history with demo pins", () => {
  assert.deepEqual(profileMapPins([]), []);
  const shared = { id: "shared", photo: 7, location: { lat: 45.46, lon: 9.19 } };
  const posts = [
    { id: "private", photo: 5 },
    { id: "legacy", place: "Milano" },
    { id: "invalid", location: { lat: NaN, lon: 9 } },
    { ...shared, id: "demo", isDemo: true },
    { ...shared, id: "hidden", place: "hidden" },
    shared,
  ];
  assert.deepEqual(profileMapPins(posts), [{ id: "shared", photo: 7, latitude: 45.46, longitude: 9.19 }]);
});

test("profile map camera frames the markers with a finite zoom even for one or no posts", () => {
  const pins = [
    { latitude: 45.45, longitude: 9.17 },
    { latitude: 45.47, longitude: 9.21 },
  ];
  const camera = profileMapCamera(pins);
  assert.equal(camera.latitude, 45.46);
  assert.ok(Math.abs(camera.longitude - 9.19) < 1e-10);
  for (const points of [pins, [pins[0]], []]) {
    const view = profileMapCamera(points);
    assert.ok(Number.isFinite(view.zoom) && view.zoom >= 2 && view.zoom <= 13);
  }
});

test("map requests only viewport tiles, covers its centre and wraps at the date line", () => {
  for (const lon of [9.19, 179.99, -179.99]) {
    const tiles = mapPreview(45.46, lon, 350);
    assert.ok(tiles.length >= 4 && tiles.length <= 9);
    assert.ok(tiles.some((t) => t.left <= 175 && t.left + 256 >= 175 && t.top <= 130 && t.top + 256 >= 130));
    for (const t of tiles) {
      assert.ok(t.left < 350 && t.left + 256 > 0 && t.top < 260 && t.top + 256 > 0);
      const [, x, y] = t.url.match(/\/12\/(\d+)\/(\d+)\.png$/);
      assert.ok(+x >= 0 && +x < 4096 && +y >= 0 && +y < 4096);
    }
  }
});

const { saveProfileChanges } = require("../src/utils/profile.ts");
test("editing preserves the title and only returns saved data after persistence", async () => {
  const current = { name: "Alex", handle: "alex", role: "student", badgeId: "first-proof" };
  let release;
  const writes = [];
  const saving = saveProfileChanges(current, { name: " Alex Green ", handle: " @Alex.Green ", role: "teacher" }, async (p) => {
    writes.push(p);
    await new Promise((r) => {
      release = r;
    });
  });
  let done = false;
  saving.then(() => {
    done = true;
  });
  await Promise.resolve();
  assert.equal(done, false);
  assert.deepEqual(current, { name: "Alex", handle: "alex", role: "student", badgeId: "first-proof" });
  assert.deepEqual(writes, [{ name: "Alex Green", handle: "alex.green", role: "teacher", badgeId: "first-proof" }]);
  release();
  assert.deepEqual(await saving, writes[0]);
});
test("failed or invalid profile edits leave the current profile untouched", async () => {
  const current = { name: "Alex", handle: "alex", role: "student", badgeId: "first-proof" };
  for (const failure of [new Error("offline"), Object.assign(new Error("taken"), { code: "23505" })]) {
    await assert.rejects(
      saveProfileChanges(current, { name: "Other", handle: "other", role: "teacher" }, async () => {
        throw failure;
      }),
      (e) => e === failure,
    );
  }
  let called = false;
  await assert.rejects(
    saveProfileChanges(current, { name: "", handle: "a", role: "student" }, async () => {
      called = true;
    }),
  );
  assert.equal(called, false);
  assert.equal(current.name, "Alex");
  assert.equal(current.badgeId, "first-proof");
});
