// UN Agenda 2030 — the 17 Sustainable Development Goals.
// BeGreen tags every act with the goals it moves, so small daily proofs add up to a bigger map.

export const SDGS: Record<number, string> = {
  1: "No poverty",
  2: "Zero hunger",
  3: "Good health",
  4: "Quality education",
  5: "Gender equality",
  6: "Clean water",
  7: "Clean energy",
  8: "Decent work",
  9: "Industry & innovation",
  10: "Reduced inequalities",
  11: "Sustainable cities",
  12: "Responsible consumption",
  13: "Climate action",
  14: "Life below water",
  15: "Life on land",
  16: "Peace & justice",
  17: "Partnerships",
};

export const SDG_LIST = Object.keys(SDGS).map(Number);

const END = new Date(2030, 11, 31).getTime();

export function daysTo2030(now = Date.now()) {
  return Math.max(0, Math.ceil((END - now) / 864e5));
}
