/**
 * Assert-based self-check for the timestamp formatters. No test framework.
 *
 * Run with:  npx tsx src/lib/utils/format-timestamp.test-manual.ts
 *
 * Relative-time assertions compare against Intl directly instead of hardcoding
 * English, so the check passes under any system locale.
 */
import assert from "node:assert/strict";
import {
  dayKey,
  formatAbsoluteTimestamp,
  formatDayGroup,
  formatRelativeTimestamp,
  parseTimestamp,
} from "./format-timestamp";

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const now = Date.parse("2026-09-17T12:00:00.000Z");
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

// 1. Invalid / missing input never leaks "Invalid Date" or NaN.
{
  for (const bad of [null, undefined, "", "not-a-date"]) {
    assert.equal(parseTimestamp(bad), null, `parseTimestamp(${String(bad)}) should be null`);
    assert.equal(formatRelativeTimestamp(bad, now), "Unknown date");
    assert.equal(formatAbsoluteTimestamp(bad), "Unknown date");
    assert.equal(formatDayGroup(bad, now), "Unknown date");
    for (const output of [formatAbsoluteTimestamp(bad), formatRelativeTimestamp(bad, now)]) {
      assert.ok(!output.includes("Invalid"), "must not surface Invalid Date");
      assert.ok(!output.includes("NaN"), "must not surface NaN");
    }
  }
}

// 2. Sub-minute differences read as "just now" rather than "0 minutes ago".
{
  assert.equal(formatRelativeTimestamp(at(0), now), "just now");
  assert.equal(formatRelativeTimestamp(at(-30 * 1000), now), "just now");
}

// 3. Each bucket picks the right unit - including the year bucket the legacy
//    implementation lacked (it rendered two years as "24mo ago").
{
  assert.equal(formatRelativeTimestamp(at(-5 * MINUTE), now), relative.format(-5, "minute"));
  assert.equal(formatRelativeTimestamp(at(-3 * HOUR), now), relative.format(-3, "hour"));
  assert.equal(formatRelativeTimestamp(at(-4 * DAY), now), relative.format(-4, "day"));
  assert.equal(formatRelativeTimestamp(at(-90 * DAY), now), relative.format(-3, "month"));
  assert.equal(formatRelativeTimestamp(at(-730 * DAY), now), relative.format(-2, "year"));
}

// 4. A future timestamp (clock skew) formats forwards, never as a negative age.
{
  const future = formatRelativeTimestamp(at(10 * MINUTE), now);
  assert.equal(future, relative.format(10, "minute"));
  assert.ok(!future.includes("-"), "future timestamps must not render a minus sign");
}

// 5. Day grouping is local-timezone, and consecutive days never share a key.
{
  const today = dayKey(at(0));
  const yesterday = dayKey(at(-DAY));
  assert.notEqual(today, yesterday, "different local days need different keys");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/, "day key should be YYYY-MM-DD");

  assert.equal(formatDayGroup(at(0), now), "Today");
  assert.equal(formatDayGroup(at(-DAY), now), "Yesterday");

  const older = formatDayGroup(at(-10 * DAY), now);
  assert.notEqual(older, "Today");
  assert.notEqual(older, "Yesterday");
  assert.ok(older.length > 0, "older days should still get a heading");
}

// 6. Two instants in the same local day share a bucket even across a UTC noon.
{
  const morning = new Date(now);
  morning.setHours(1, 0, 0, 0);
  const evening = new Date(now);
  evening.setHours(23, 0, 0, 0);
  assert.equal(
    dayKey(morning.toISOString()),
    dayKey(evening.toISOString()),
    "same local day should bucket together regardless of UTC offset",
  );
}

console.log("format-timestamp self-check passed");
