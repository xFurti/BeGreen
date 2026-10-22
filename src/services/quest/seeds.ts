// Seeds for the Caccia verde. Each stop and each thread pays out only the first time,
// so the quest adds points without becoming a farm.

export const STOP_SEEDS = 15;
export const HINT_COST = 5;
export const MIN_STOP_SEEDS = 5;
export const THREAD_BONUS = 25;

export type QuestSeed = { at: number; seeds: number; key: string };

export const stopKey = (placeId: string) => `stop:${placeId}`;
export const threadKey = (thread: string) => `thread:${thread}`;

export const stopSeeds = (hints: number) => Math.max(MIN_STOP_SEEDS, STOP_SEEDS - HINT_COST * hints);

/** Best case for a fresh quest of n stops */
export const maxQuestSeeds = (n: number) => n * STOP_SEEDS + THREAD_BONUS;

export const isPaid = (log: QuestSeed[], key: string) => log.some((e) => e.key === key);

export const questSeedsSince = (log: QuestSeed[], since = 0) => log.reduce((a, e) => (e.at > since ? a + e.seeds : a), 0);
