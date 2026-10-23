import assert from "node:assert/strict";
import { test } from "node:test";

import { composerInset, keyboardCover } from "./keyboard-inset.mjs";

test("sotto l'header la barra sale di tutta la tastiera", () => {
  const header = 96;
  const contentHeight = 740;
  const keyboardTop = 520;
  assert.equal(keyboardCover(header, contentHeight, keyboardTop), 316);
});

test("se la vista finisce già sulla tastiera non aggiunge spazio", () => {
  assert.equal(keyboardCover(96, 424, 520), 0);
  assert.equal(keyboardCover(0, 800, 800), 0);
});

test("coordinate assenti non alzano la barra", () => {
  assert.equal(keyboardCover(0, 0, 500), 0);
  assert.equal(keyboardCover(0, 800, 0), 0);
  assert.equal(keyboardCover(Number.NaN, 800, 400), 0);
});

test("a tastiera aperta l'inset sicuro non si somma alla copertura", () => {
  assert.equal(composerInset(48, 0), 58);
  assert.equal(composerInset(48, 316), 326);
  assert.ok(composerInset(48, 316) < 48 + 10 + 316);
});
