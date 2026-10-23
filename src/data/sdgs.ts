// UN Agenda 2030 — the 17 Sustainable Development Goals.
// Titles live in the language catalog. BeGreen tags every act with the goals it moves.

export const SDG_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

// The Agenda ends at the close of 31 December 2030: the first instant of 2031.
const END = new Date(2031, 0, 1);

// Days between two civil dates, independent of time zones and DST.
function civilDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = (y >= 0 ? y : y - 399) / 400 | 0;
  const yearOfEra = y - era * 400;
  const monthPrime = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

export function daysTo2030(now = Date.now()) {
  const date = new Date(now);
  const remaining = civilDayNumber(END.getFullYear(), END.getMonth() + 1, END.getDate())
    - civilDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return Math.max(0, remaining);
}
