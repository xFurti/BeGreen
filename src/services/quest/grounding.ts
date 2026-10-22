import type { Sentence } from "../../data/quest/types";

// Guardrails for anything a model writes about a place:
// 1. structured output, validated; 2. every cited fact exists and belongs to this place;
// 3. uncited sentences are allowed only if declared flavour, and flavour has no dates, numbers or names.

/** Validates raw model output: { sentences: [{ text, factIds?, flavor? }] }, 1–5 sentences */
export function parseNarration(raw: unknown): Sentence[] | null {
  const list = (raw as { sentences?: unknown } | null)?.sentences;
  if (!Array.isArray(list) || list.length < 1 || list.length > 5) return null;
  const out: Sentence[] = [];
  for (const s of list) {
    if (!s || typeof s !== "object") return null;
    const { text, factIds, flavor } = s as Record<string, unknown>;
    if (typeof text !== "string" || !text.trim() || text.length > 400) return null;
    if (factIds !== undefined && !(Array.isArray(factIds) && factIds.every((f) => typeof f === "string"))) return null;
    if (flavor !== undefined && typeof flavor !== "boolean") return null;
    out.push({ text, ...(factIds ? { factIds: factIds as string[] } : {}), ...(flavor !== undefined ? { flavor } : {}) });
  }
  return out;
}

const DIGITS = /\d/;
// A capitalised word that doesn't open a sentence: probably a proper name.
const PROPER_NAME = /(?:[^.!?:«"\s]\s+|[,;]\s*)([A-ZÀ-Ý][a-zà-ÿ'’]+)/;

/** Flavour sentences can't carry dates, numbers or proper names */
export function flavorViolation(text: string): string | null {
  if (DIGITS.test(text)) return "contiene un numero o una data";
  const m = text.match(PROPER_NAME);
  return m ? `contiene un probabile nome proprio («${m[1]}»)` : null;
}

export function checkGrounding(sentences: Sentence[], allowed: Set<string>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  sentences.forEach((s, i) => {
    const n = `frase ${i + 1}`;
    const ids = s.factIds ?? [];
    if (s.flavor && ids.length) errors.push(`${n}: è marcata racconto ma cita delle fonti`);
    if (!s.flavor && !ids.length) errors.push(`${n}: nessuna fonte e non marcata come racconto`);
    for (const id of ids) if (!allowed.has(id)) errors.push(`${n}: cita «${id}», che non esiste o non è di questo luogo`);
    if (s.flavor) {
      const v = flavorViolation(s.text);
      if (v) errors.push(`${n}: frase di racconto che ${v}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout dopo ${ms} ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}
