import type { Narration, QuestFact, QuestPlace, Sentence, Thread } from "../../data/quest/types";
import { checkGrounding, parseNarration, withTimeout } from "./grounding.ts";

// "Il luogo parla": the curated facts are chosen by data, the model only tells them.
// The default provider is a deterministic fixture that composes sentences written and
// checked by hand (facts.json → voice). To plug a real LLM, implement NarrationProvider:
// same input, same JSON output, the same guardrails run downstream.

export type NarrationRequest = { place: QuestPlace; facts: QuestFact[]; thread: Thread };

export interface NarrationProvider {
  name: string;
  narrate(r: NarrationRequest): Promise<unknown>;
}

const TIMEOUT_MS = 10_000;
const ATTEMPTS = 2; // 1 generation + 1 regeneration

const byThread = (facts: QuestFact[], thread: Thread) =>
  [...facts].sort((a, b) => Number(b.threads.includes(thread)) - Number(a.threads.includes(thread)));

/** Fixture narrator: one flavour line for the thread + the 2 facts closest to it */
export const fixtureProvider: NarrationProvider = {
  name: "fixture (demo, nessun LLM)",
  async narrate({ place, facts, thread }) {
    return {
      sentences: [
        { text: place.flavor[thread], flavor: true },
        ...byThread(facts, thread)
          .slice(0, 2)
          .map((f) => ({ text: f.voice, factIds: [f.id] })),
      ],
    };
  },
};

/** A provider that makes things up: invents a fact id and writes flavour with a date. Used by tests. */
export const hallucinatingProvider: NarrationProvider = {
  name: "simulazione di allucinazione",
  async narrate(r) {
    const out = (await fixtureProvider.narrate(r)) as { sentences: Sentence[] };
    return {
      sentences: [
        ...out.sentences.slice(0, 2),
        { text: "Nel 1797 qui dentro ha dormito perfino Napoleone.", flavor: true },
        { text: "Sono stata la prima fabbrica d'Europa con i pannelli solari.", factIds: ["fact-inventato-99"] },
      ],
    };
  },
};

/** Hand-written fallback: the first facts, verbatim, each with its source */
export const fallbackNarration = (facts: QuestFact[], thread: Thread): Sentence[] =>
  byThread(facts, thread)
    .slice(0, 2)
    .map((f) => ({ text: f.text, factIds: [f.id] }));

/** provider → validation → grounding check → (1 retry) → fallback. The log explains every step. */
export async function narrate(req: NarrationRequest, provider: NarrationProvider = fixtureProvider): Promise<Narration> {
  const allowed = new Set(req.facts.map((f) => f.id));
  const log = [`Provider: ${provider.name}`, `Fatti di questo luogo: ${req.facts.length}`];
  for (let t = 1; t <= ATTEMPTS; t++) {
    let raw: unknown;
    try {
      raw = await withTimeout(provider.narrate(req), TIMEOUT_MS);
    } catch (e) {
      log.push(`Tentativo ${t}: ${(e as Error).message}`);
      continue;
    }
    const sentences = parseNarration(raw);
    if (!sentences) {
      log.push(`Tentativo ${t}: output non conforme allo schema`);
      continue;
    }
    const g = checkGrounding(sentences, allowed);
    if (g.ok) {
      log.push("Grounding superato: ogni frase cita un fatto di questo luogo o è racconto dichiarato");
      return { sentences, fallback: false, log };
    }
    log.push(...g.errors.map((e) => `Tentativo ${t}: RIFIUTATO — ${e}`));
  }
  log.push("Uso il testo di riserva scritto a mano");
  return { sentences: fallbackNarration(req.facts, req.thread), fallback: true, log };
}
