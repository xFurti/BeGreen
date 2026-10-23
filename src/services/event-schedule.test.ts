import assert from "node:assert/strict";
import { test } from "node:test";

import { CATEGORY_LIST, eventPhase } from "@/data/community";
import { eventWhenText, isAllDayEvent, parseEventSchedule, type EventScheduleInput } from "@/services/event-schedule";
import { categoryChipColors } from "@/theme/community";
import { dark, light } from "@/theme/tokens";

process.env.TZ = "Europe/Rome";
const input: EventScheduleInput = { date: "24/10/2026", time: "10:15", duration: "120", allDay: false };

test("event fields reject missing and impossible dates, times and durations", () => {
  for (const date of ["", "2026-10-24", "31/02/2026", "29/02/2026", "00/10/2026", "24/13/2026"]) {
    assert.equal(parseEventSchedule({ ...input, date }).error, "date", date);
  }
  for (const time of ["", "24:00", "10:60", "10", "09:5"]) assert.equal(parseEventSchedule({ ...input, time }).error, "time", time);
  for (const duration of ["0", "-1", "2.5", "abc", "1441", "1e2"]) assert.equal(parseEventSchedule({ ...input, duration }).error, "duration", duration);
  assert.equal(parseEventSchedule({ ...input, date: "29/02/2028" }).error, undefined);
});

test("timed events accept arbitrary dates/minutes, optional duration, and cross midnight", () => {
  const { schedule } = parseEventSchedule(input);
  assert.equal(schedule?.startsAt, new Date(2026, 9, 24, 10, 15).getTime());
  assert.equal(schedule!.endsAt! - schedule!.startsAt, 120 * 60e3);
  assert.equal(parseEventSchedule({ ...input, duration: "" }).schedule?.endsAt, undefined);
  const late = parseEventSchedule({ ...input, time: "23:45", duration: "60" }).schedule!;
  assert.equal(new Date(late.endsAt!).getDate(), 25);
  assert.equal(new Date(late.endsAt!).getMinutes(), 45);
  assert.equal(isAllDayEvent(late.startsAt, late.endsAt), false);
});

test("all-day ignores hidden time/duration and survives the database ISO round trip", () => {
  const { schedule } = parseEventSchedule({ ...input, time: "invalid", duration: "invalid", allDay: true });
  assert.ok(schedule);
  const start = Date.parse(new Date(schedule.startsAt).toISOString());
  const end = Date.parse(new Date(schedule.endsAt!).toISOString());
  assert.equal(isAllDayEvent(start, end), true);
  assert.equal(eventPhase({ startsAt: start, endsAt: end }, new Date(2026, 9, 24, 23, 59).getTime()), "ongoing");
  assert.equal(eventPhase({ startsAt: start, endsAt: end }, new Date(2026, 9, 25).getTime()), "ended");
  assert.match(eventWhenText("it", start, end), /Tutto il giorno/);
  assert.match(eventWhenText("en", start, end), /All day/);
  assert.doesNotMatch(eventWhenText("en", start, end), /\d:\d/);
  assert.equal(isAllDayEvent(start), false); // Don't reinterpret old midnight events with no end.
});

test("daylight-saving days span the calendar day; nonexistent times are rejected", () => {
  for (const [date, hours] of [["29/03/2026", 23], ["25/10/2026", 25]] as const) {
    const { schedule } = parseEventSchedule({ ...input, date, allDay: true });
    assert.ok(schedule);
    assert.equal(schedule.endsAt! - schedule.startsAt + 1, hours * 3600e3);
    assert.equal(isAllDayEvent(schedule.startsAt, schedule.endsAt), true);
  }
  assert.equal(parseEventSchedule({ ...input, date: "29/03/2026", time: "02:30" }).error, "time");
});

test("cleared fields stay empty and turning all-day off validates the time again", () => {
  const empty = { date: "", time: "", duration: "", allDay: false };
  assert.equal(parseEventSchedule(empty).error, "date");
  assert.equal(parseEventSchedule({ ...empty, date: input.date, allDay: true }).error, undefined);
  assert.equal(parseEventSchedule({ ...empty, date: input.date }).error, "time");
});

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

test("all seven category chips meet text/icon contrast in both states and themes", () => {
  for (const C of [light, dark]) {
    for (const category of CATEGORY_LIST) {
      for (const active of [false, true]) {
        const colors = categoryChipColors(C, category, active);
        assert.ok(contrast(colors.text, colors.background) >= 4.5, `${category}, active=${active}, text`);
        assert.ok(contrast(colors.icon, colors.background) >= 3, `${category}, active=${active}, icon`);
      }
    }
    assert.ok(contrast(C.ink, C.card) >= 3, "filter icon without filters");
    assert.ok(contrast(C.lime, C.forest) >= 3, "filter icon with active filters");
  }
});
