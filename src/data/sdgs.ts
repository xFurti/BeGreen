// UN Agenda 2030 — the 17 Sustainable Development Goals.
// Titles live in the language catalog. BeGreen tags every act with the goals it moves.

export const SDG_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const END = new Date(2030, 11, 31).getTime();

export function daysTo2030(now = Date.now()) {
  return Math.max(0, Math.ceil((END - now) / 864e5));
}
