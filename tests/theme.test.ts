import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { dark, light } from "../src/theme/tokens.ts";

function lin(channel: number) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function lum(hex: string) {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return walk(file);
    return file.endsWith(".ts") || file.endsWith(".tsx") ? [file] : [];
  });
}

test("le due palette hanno le stesse chiavi", () => {
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort());
});

test("il tema chiaro resta quello di oggi", () => {
  assert.equal(light.bg, "#FFFFFF");
  assert.equal(light.ink, "#0A0A0A");
  assert.equal(light.leaf, "#1B7D44");
  assert.equal(light.mint, "#E6F6EC");
  assert.equal(light.mint2, "#CFE8D8");
  assert.equal(light.forestInk, "#0B3D2A");
  assert.equal(light.band, light.mint2);
  assert.equal(light.forest, dark.forest);
  assert.equal(light.lime, dark.lime);
  assert.equal(light.glass, dark.glass);
});

test("testo e segni in scuro raggiungono il contrasto chiesto", () => {
  // Small text: green, mono mute, Verified pill, SDG chips, source-badge label.
  assert.ok(contrast(dark.leaf, dark.bg) >= 4.5);
  assert.ok(contrast(dark.leaf, dark.mint) >= 4.5);
  assert.ok(contrast(dark.forestInk, dark.bg) >= 4.5);
  assert.ok(contrast(dark.forestInk, dark.card) >= 4.5);
  assert.ok(contrast(dark.forestInk, dark.mint) >= 4.5);
  assert.ok(contrast(dark.mute, dark.bg) >= 4.5);
  assert.ok(contrast(dark.mute, dark.card) >= 4.5);
  assert.ok(contrast(dark.onLeaf, dark.leaf) >= 4.5);
  assert.ok(contrast(light.leaf, "#FFFFFF") >= 4.5);
  assert.ok(contrast(dark.forest, "#FFFFFF") >= 4.5);
  // Icons and AQI / source marks: 3:1 on the page and on cards.
  for (const mark of [dark.band, dark.green, dark.amber, dark.red, dark.blue, dark.violet, dark.grey]) {
    assert.ok(contrast(mark, dark.bg) >= 3, mark);
    assert.ok(contrast(mark, dark.card) >= 3, mark);
  }
  // Quest ring sits on a mint card.
  assert.ok(contrast(dark.band, dark.mint) >= 3);
  assert.ok(contrast(dark.leaf, dark.mint) >= 3);
});

test("nei componenti non restano colori scritti a mano, salvo le ombre", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const skip = new Set([path.join(root, "src/theme/tokens.ts"), path.join(root, "src/data/guide.ts")]);
  const bad: string[] = [];
  for (const file of walk(path.join(root, "src"))) {
    if (skip.has(file)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (!/rgba?\(|#[0-9A-Fa-f]{3,8}\b/.test(line)) return;
        if (/boxShadow|textShadow/.test(line)) return;
        bad.push(`${path.relative(root, file)}:${i + 1}: ${line.trim()}`);
      });
  }
  assert.deepEqual(bad, []);
});
