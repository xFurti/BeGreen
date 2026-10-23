import assert from "node:assert/strict";
import { test } from "node:test";
import { MEDIA_LIFETIME, socialRefresh } from "@/services/social-refresh";

test("cache reuse plus a missed polling tick still leaves time before signed URLs expire", () => {
  assert.ok(MEDIA_LIFETIME.reuseForMs + MEDIA_LIFETIME.renewEveryMs < MEDIA_LIFETIME.expiresInSeconds * 1000);
});

test("realtime events do not stop periodic signed-media renewal", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  let count = 0;
  const refresh = socialRefresh(() => { count++; }, () => true);
  t.after(refresh.stop);
  refresh.soon();
  t.mock.timers.tick(800);
  assert.equal(count, 1);
  t.mock.timers.tick(120000);
  assert.equal(count, 2);
  t.mock.timers.tick(120000);
  assert.equal(count, 3);
});

test("cleanup cancels the interval even without receiving a realtime event", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  let count = 0;
  const refresh = socialRefresh(() => { count++; }, () => true);
  refresh.stop();
  t.mock.timers.tick(120000);
  assert.equal(count, 0);
});

test("events are debounced, background polling is paused, and cleanup cancels pending work", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  let count = 0;
  let active = false;
  const refresh = socialRefresh(() => { count++; }, () => active);
  t.after(refresh.stop);
  t.mock.timers.tick(120000);
  assert.equal(count, 0);
  active = true;
  refresh.soon();
  t.mock.timers.tick(400);
  refresh.soon();
  t.mock.timers.tick(799);
  assert.equal(count, 0);
  t.mock.timers.tick(1);
  assert.equal(count, 1);
  refresh.soon();
  refresh.stop();
  t.mock.timers.tick(240000);
  assert.equal(count, 1);
});
