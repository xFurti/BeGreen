import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canStopProof,
  displaySeconds,
  noteProgress,
  outcomeFromRecording,
} from "./proof-recording.mjs";

const idle = { nativeSeconds: null };

test("un evento vuoto non fa partire il cronometro nativo", () => {
  assert.deepEqual(noteProgress(idle, { duration: 0, fileSize: 0 }), idle);
  assert.equal(canStopProof(idle), false);
  assert.equal(displaySeconds(idle), 0);
});

test("lo stop resta chiuso finché il nativo non ha 2 secondi di video", () => {
  const started = noteProgress(idle, { duration: 0, fileSize: 1200 });
  assert.equal(started.nativeSeconds, 0);
  assert.equal(canStopProof(started), false);

  const early = noteProgress(started, { duration: 1.9, fileSize: 80_000 });
  assert.equal(canStopProof(early), false);
  assert.equal(displaySeconds(early), 1);

  const ready = noteProgress(early, { duration: 2, fileSize: 90_000 });
  assert.equal(canStopProof(ready), true);
  assert.equal(displaySeconds(ready), 2);
});

test("il cronometro non torna indietro e si ferma a 5 secondi", () => {
  const clock = noteProgress({ nativeSeconds: 4.2 }, { duration: 3, fileSize: 10 });
  assert.equal(clock.nativeSeconds, 4.2);
  assert.equal(displaySeconds(noteProgress(clock, { duration: 5.4, fileSize: 10 })), 5);
});

test("valori non numerici non sbloccano lo stop", () => {
  const clock = noteProgress(idle, { duration: Number.NaN, fileSize: Number.POSITIVE_INFINITY });
  assert.deepEqual(clock, idle);
  assert.equal(canStopProof(clock), false);
});

test("una registrazione risolta con uri viene tenuta", () => {
  assert.deepEqual(outcomeFromRecording({ uri: "file:///clip.mp4" }), {
    kind: "saved",
    uri: "file:///clip.mp4",
  });
});

test("senza file la prova è fallita, anche se il nativo rifiuta", () => {
  assert.deepEqual(outcomeFromRecording(undefined), { kind: "failed" });
  assert.deepEqual(outcomeFromRecording({ uri: "" }), { kind: "failed" });
  assert.deepEqual(
    outcomeFromRecording(undefined, new Error("Video recording failed: No valid data")),
    { kind: "failed" },
  );
});

test("se il rifiuto porta comunque un uri, la clip si usa", () => {
  assert.deepEqual(
    outcomeFromRecording(undefined, { message: "Video recording failed", userInfo: { uri: "file:///kept.mp4" } }),
    { kind: "saved", uri: "file:///kept.mp4" },
  );
  assert.deepEqual(outcomeFromRecording(undefined, { cause: { outputUri: "content://proof" } }), {
    kind: "saved",
    uri: "content://proof",
  });
});
