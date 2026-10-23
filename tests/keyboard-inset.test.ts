import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  composerInset,
  focusedScrollOffset,
  keyboardCover,
  keyboardFrameBottom,
  resolveKeyboardTop,
  scrollPaddingBottom,
} from "../src/services/keyboard-inset.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return walk(file);
    return file.endsWith(".ts") || file.endsWith(".tsx") ? [file] : [];
  });
}

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

test("su Android quando screenY resta sul fondo del frame usa l'altezza reale della tastiera", () => {
  assert.equal(resolveKeyboardTop(836, 316, 836), 520);
  assert.equal(keyboardCover(96, 740, 836, 316, 836), 316);
  // Se invece screenY è già il bordo superiore della tastiera, non sottrae due volte.
  assert.equal(resolveKeyboardTop(520, 316, 836), 520);
  assert.equal(keyboardCover(96, 740, 520, 316, 836), 316);
  // E se la vista si è già ridotta sopra la tastiera, la copertura resta zero.
  assert.equal(keyboardCover(96, 424, 520, 316, 836), 0);
});

test("finestra e root già ridotte restano sul fondo del display", () => {
  // Display 836, IME 316, window and root already resized to 520, screenY already the keyboard top.
  const frame = keyboardFrameBottom(836, 520, 520);
  assert.equal(frame, 836);
  assert.equal(resolveKeyboardTop(520, 316, frame), 520);
  assert.equal(keyboardCover(0, 520, resolveKeyboardTop(520, 316, frame)), 0);
  // The unreduced display bottom still corrects a screenY stuck on the full frame.
  assert.equal(resolveKeyboardTop(836, 316, frame), 520);
});

test("a tastiera aperta l'inset sicuro non si somma alla copertura", () => {
  assert.equal(composerInset(48, 0), 58);
  assert.equal(composerInset(48, 316), 326);
  assert.ok(composerInset(48, 316) < 48 + 10 + 316);
});

test("lo scroll aggiunge il padding della tastiera solo quando è aperta", () => {
  assert.equal(scrollPaddingBottom(40, 0), 40);
  assert.equal(scrollPaddingBottom(40, 320), 360);
  assert.equal(scrollPaddingBottom(-10, 320), 320);
});

test("porta il campo focalizzato sopra la tastiera senza muovere i campi già visibili", () => {
  // Campo commento in basso su spot/[id] coperto dalla tastiera: scorre in alto quanto basta.
  const nextY = focusedScrollOffset({
    scrollY: 300,
    scrollTop: 96,
    scrollHeight: 748,
    inputTop: 640,
    inputHeight: 50,
    keyboardTop: 500,
  });
  assert.equal(nextY, 518);

  // Barra di ricerca già visibile nella metà alta dello schermo: nessuno scroll superfluo.
  assert.equal(
    focusedScrollOffset({
      scrollY: 0,
      scrollTop: 80,
      scrollHeight: 764,
      inputTop: 180,
      inputHeight: 50,
      keyboardTop: 500,
    }),
    null,
  );

  // Campo finito parzialmente sopra il bordo superiore dello scroll: risale per mostrarlo.
  assert.equal(
    focusedScrollOffset({
      scrollY: 200,
      scrollTop: 100,
      scrollHeight: 600,
      inputTop: 80,
      inputHeight: 48,
      keyboardTop: 500,
    }),
    164,
  );
});

test("ogni schermata con TextInput usa useKeyboardCover e nessuna lascia KeyboardAvoidingView spento su Android", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const missingCover: string[] = [];
  const brokenAvoidingView: string[] = [];

  for (const file of walk(path.join(root, "src"))) {
    if (file.endsWith("use-keyboard-cover.ts")) continue;
    // Archived squad screens stay in the repo and are not mounted by the router.
    if (file.includes(`${path.sep}legacy-`)) continue;
    const content = readFileSync(file, "utf8");
    const rel = path.relative(root, file).replaceAll("\\", "/");
    // Onboarding, event fields and sorting inherit the enclosing screen's scroller.
    const coveredByParent =
      rel.startsWith("src/components/onboarding/") || rel === "src/components/event-schedule-fields.tsx" || rel === "src/components/guide/sorting.tsx";
    if (/<TextInput\b/.test(content) && !coveredByParent && !/\buseKeyboardCover\b/.test(content)) {
      missingCover.push(rel);
    }
    if (/<KeyboardAvoidingView\b/.test(content)) {
      brokenAvoidingView.push(rel);
    }
  }

  assert.deepEqual(missingCover, []);
  assert.deepEqual(brokenAvoidingView, []);

  const addSpot = readFileSync(path.join(root, "src/app/add-spot.tsx"), "utf8");
  assert.match(addSpot, /useKeyboardCover/);
  assert.match(addSpot, /<EventScheduleFields\b/);
  const guide = readFileSync(path.join(root, "src/app/guide.tsx"), "utf8");
  assert.match(guide, /useKeyboardCover/);
  assert.match(guide, /ref=\{scrollerRef\}/);
  assert.match(guide, /<GuideSorting\b/);
});
