/**
 * Timestamp formatting for the History page.
 *
 * Everything here uses the viewer's own locale and timezone (`undefined` locale
 * lets Intl resolve it) rather than a hardcoded one, so day grouping matches the
 * day the viewer actually experienced. Invalid and missing dates degrade to a
 * readable label instead of "Invalid Date"/"NaN".
 */

const UNKNOWN_LABEL = "Unknown date";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Anything closer than this reads as "just now" instead of "0 minutes ago". */
const JUST_NOW_MS = 45 * SECOND_MS;

const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["year", 365 * DAY_MS],
  ["month", 30 * DAY_MS],
  ["day", DAY_MS],
  ["hour", HOUR_MS],
  ["minute", MINUTE_MS],
];

function createFormatter<T>(factory: () => T): () => T | null {
  let cached: T | null | undefined;
  return () => {
    if (cached !== undefined) return cached;
    try {
      cached = factory();
    } catch {
      cached = null;
    }
    return cached;
  };
}

const getDateTimeFormatter = createFormatter(
  () => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }),
);

const getDayFormatter = createFormatter(
  () =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
);

const getRelativeFormatter = createFormatter(
  () => new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }),
);

/** Milliseconds for a timestamp, or null when it is missing or unparseable. */
export function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Local-day bucket key ("2026-09-17") used to group commits under a heading. */
export function dayKey(value: string | null | undefined): string {
  const ms = parseTimestamp(value);
  if (ms === null) return UNKNOWN_LABEL;
  const date = new Date(ms);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Full date and time, e.g. "17 Sept 2026, 14:32". Used for `title` attributes. */
export function formatAbsoluteTimestamp(value: string | null | undefined): string {
  const ms = parseTimestamp(value);
  if (ms === null) return UNKNOWN_LABEL;
  return getDateTimeFormatter()?.format(ms) ?? new Date(ms).toISOString();
}

/**
 * Heading for a day group: "Today" / "Yesterday" for the two most recent local
 * days, otherwise the full weekday + date.
 */
export function formatDayGroup(
  value: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  const ms = parseTimestamp(value);
  if (ms === null) return UNKNOWN_LABEL;

  const key = dayKey(value);
  if (key === dayKey(new Date(nowMs).toISOString())) return "Today";
  if (key === dayKey(new Date(nowMs - DAY_MS).toISOString())) return "Yesterday";

  return getDayFormatter()?.format(ms) ?? key;
}

/**
 * Relative time, e.g. "just now", "5 minutes ago", "2 years ago". Unlike the
 * legacy implementation this has a year bucket (no more "24mo ago") and handles
 * future timestamps from clock skew instead of rendering a negative duration.
 */
export function formatRelativeTimestamp(
  value: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  const ms = parseTimestamp(value);
  if (ms === null) return UNKNOWN_LABEL;

  const deltaMs = ms - nowMs;
  const absMs = Math.abs(deltaMs);
  if (absMs < JUST_NOW_MS) return "just now";

  const formatter = getRelativeFormatter();
  if (!formatter) return formatAbsoluteTimestamp(value);

  for (const [unit, unitMs] of RELATIVE_UNITS) {
    if (absMs < unitMs) continue;
    const amount = Math.trunc(deltaMs / unitMs) || (deltaMs < 0 ? -1 : 1);
    return formatter.format(amount, unit);
  }

  return "just now";
}
