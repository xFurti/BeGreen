import type { Language } from "@/i18n/schema";
import { translate } from "@/i18n/catalog";
import { intlLocale } from "@/i18n/format";

export type EventScheduleInput = { date: string; time: string; duration: string; allDay: boolean };
export type ScheduleError = "date" | "time" | "duration";
export type EventSchedule = { startsAt: number; endsAt?: number };

// Explicit day/month/year in both languages: never rely on Date.parse's locale-dependent guesses.
export function parseEventSchedule(input: EventScheduleInput): { schedule: EventSchedule; error?: never } | { error: ScheduleError; schedule?: never } {
  const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.date.trim());
  if (!date) return { error: "date" };
  const [, day, month, year] = date.map(Number);
  const start = new Date(year, month - 1, day);
  if (year < 1000 || start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return { error: "date" };

  if (input.allDay) {
    // A complete local calendar day survives the existing starts_at/ends_at round trip.
    // Calendar arithmetic also handles the 23/25-hour days at daylight-saving changes.
    const end = new Date(year, month - 1, day + 1).getTime() - 1;
    return { schedule: { startsAt: start.getTime(), endsAt: end } };
  }

  const time = /^(\d{2}):(\d{2})$/.exec(input.time.trim());
  if (!time) return { error: "time" };
  const [, hours, minutes] = time.map(Number);
  if (hours > 23 || minutes > 59) return { error: "time" };
  start.setHours(hours, minutes, 0, 0);
  // Don't silently move a nonexistent local time forward during a DST transition.
  if (start.getHours() !== hours || start.getMinutes() !== minutes) return { error: "time" };

  const rawDuration = input.duration.trim();
  const duration = Number(rawDuration);
  if (rawDuration && (!/^\d+$/.test(rawDuration) || !Number.isSafeInteger(duration) || duration <= 0 || duration > 1440)) return { error: "duration" };
  return { schedule: { startsAt: start.getTime(), endsAt: rawDuration ? start.getTime() + duration * 60e3 : undefined } };
}

export function isAllDayEvent(start: number, end?: number): boolean {
  const d = new Date(start);
  if (d.getHours() || d.getMinutes() || d.getSeconds() || d.getMilliseconds()) return false;
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return end === next - 1;
}

export function eventWhenText(lang: Language, start: number, end?: number): string {
  const loc = intlLocale(lang);
  const day = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short" }).format(start);
  if (isAllDayEvent(start, end)) return `${day} · ${translate(lang, "community.add.allDay")}`;
  const time = (t: number) => new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(t);
  if (end === undefined) return `${day} · ${time(start)}`;
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  return sameDay ? `${day} · ${time(start)}–${time(end)}` : `${day} ${time(start)} → ${new Intl.DateTimeFormat(loc, { day: "numeric", month: "short" }).format(end)} ${time(end)}`;
}
