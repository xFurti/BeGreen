import type { Box } from "../../data/quest/types";

// Deterministic checks: no model ever decides whether you found the detail.

/** lowercase, no accents, punctuation or leading articles, collapsed spaces */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(il|lo|la|l|i|gli|le|un|uno|una|the|a|an) /, "");
}

export function isRightAnswer(input: string, answers: string[]): boolean {
  const n = normalize(input);
  return !!n && answers.some((a) => normalize(a) === n);
}

/** x, y relative (0–1) on the full photo */
export function insideBoxes(x: number, y: number, boxes: Box[]): boolean {
  return boxes.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
}
