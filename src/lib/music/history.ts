import type { ChordId } from "./chords";
import { EAR_LEVELS, UNLOCK_SCORE, earId, type EarLevel } from "./ear";
import { PASS_SCORE, type Progress } from "./path";
import { dayNumber, pairKey, practisedPairs } from "./routine";

/**
 * What the player did over time, and what it says: the points of the progress
 * charts, what to review, and the week in numbers. Pure: the database rows come
 * in as plain values, dates as "YYYY-MM-DD" in the player's own calendar.
 */

export interface HistoryRun {
  song: string;
  mode: "step" | "timed";
  value: number;
  day: string;
}

export interface HistoryChange {
  pair: string;
  count: number;
  day: string;
}

export interface History {
  runs: HistoryRun[];
  changes: HistoryChange[];
  /** Days with routine blocks done, and how many. */
  days: { day: string; blocks: number }[];
}

export const EMPTY_HISTORY: History = { runs: [], changes: [], days: [] };

export interface Point {
  day: string;
  value: number;
}

/** One point per day, the best of that day: higher for scores and counts, lower for times. */
export function dailyBest(points: readonly Point[], better: "higher" | "lower"): Point[] {
  const byDay = new Map<string, number>();
  for (const p of points) {
    const current = byDay.get(p.day);
    const wins = current === undefined || (better === "higher" ? p.value > current : p.value < current);
    if (wins) byDay.set(p.day, p.value);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
}

export const changeSeries = (h: History, pair: string) =>
  dailyBest(h.changes.filter((c) => c.pair === pair).map((c) => ({ day: c.day, value: c.count })), "higher");

export const stepSeries = (h: History, song: string) =>
  dailyBest(h.runs.filter((r) => r.song === song && r.mode === "step").map((r) => ({ day: r.day, value: r.value })), "lower");

export const timedSeries = (h: History, song: string) =>
  dailyBest(h.runs.filter((r) => r.song === song && r.mode === "timed").map((r) => ({ day: r.day, value: r.value })), "higher");

/** Pairs and songs that have at least one result, for the chart pickers. */
export function practised(h: History): { pairs: string[]; stepSongs: string[]; timedSongs: string[] } {
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    pairs: uniq(h.changes.map((c) => c.pair)),
    stepSongs: uniq(h.runs.filter((r) => r.mode === "step" && !r.song.startsWith("ear-")).map((r) => r.song)),
    timedSongs: uniq(h.runs.filter((r) => r.mode === "timed" && !r.song.startsWith("ear-")).map((r) => r.song)),
  };
}

export type ReviewItem =
  | { kind: "pair"; pair: [ChordId, ChordId]; best: number | null }
  | { kind: "song"; song: string; best: number }
  | { kind: "ear"; level: EarLevel; best: number };

/**
 * What to go back to: a change never measured and the slowest one measured,
 * songs tried in time and not passed yet, an ear level tried and not passed.
 */
export function reviewList(progress: Progress): ReviewItem[] {
  const items: ReviewItem[] = [];
  // One change never measured (the newest, most common: the one the routine picks)
  // and the slowest one measured: both matter, for different reasons.
  const pairs = practisedPairs(progress).map((pair) => ({ pair, best: progress.changes?.[pairKey(...pair)] ?? null }));
  const untested = pairs.filter((p) => p.best === null).at(-1);
  const weakest = pairs.filter((p) => p.best !== null).sort((a, b) => a.best! - b.best!)[0];
  if (untested) items.push({ kind: "pair", ...untested });
  if (weakest) items.push({ kind: "pair", ...weakest });
  for (const [song, best] of Object.entries(progress.best)) {
    if (song.startsWith("ear-") || song === "notes") continue;
    const timed = best?.timed;
    if (timed !== undefined && timed < PASS_SCORE) items.push({ kind: "song", song, best: timed });
  }
  for (const level of EAR_LEVELS) {
    const best = progress.best[earId(level)]?.timed;
    if (best !== undefined && best < UNLOCK_SCORE) {
      items.push({ kind: "ear", level, best });
      break;
    }
  }
  return items;
}

/** The last seven days, today included, against the seven before. */
export interface WeekSummary {
  days: number;
  previousDays: number;
  /** Best one-minute change count this week, per pair, with last week's when there is one. */
  changes: { pair: string; best: number; previous: number | null }[];
  /** Best share in time this week, per song. */
  timed: { song: string; best: number; previous: number | null }[];
  runs: number;
}

export function weekSummary(h: History, today: string): WeekSummary {
  const now = dayNumber(today);
  const week = (day: string) => {
    const age = now - dayNumber(day);
    return age >= 0 && age < 7 ? 0 : age >= 7 && age < 14 ? 1 : -1;
  };
  const bestOf = <T,>(rows: T[], key: (r: T) => string, value: (r: T) => number, which: 0 | 1, day: (r: T) => string) => {
    const out = new Map<string, number>();
    for (const r of rows) if (week(day(r)) === which) out.set(key(r), Math.max(out.get(key(r)) ?? -Infinity, value(r)));
    return out;
  };
  const changesNow = bestOf(h.changes, (c) => c.pair, (c) => c.count, 0, (c) => c.day);
  const changesBefore = bestOf(h.changes, (c) => c.pair, (c) => c.count, 1, (c) => c.day);
  const timedRuns = h.runs.filter((r) => r.mode === "timed" && !r.song.startsWith("ear-"));
  const timedNow = bestOf(timedRuns, (r) => r.song, (r) => r.value, 0, (r) => r.day);
  const timedBefore = bestOf(timedRuns, (r) => r.song, (r) => r.value, 1, (r) => r.day);
  return {
    days: h.days.filter((d) => week(d.day) === 0).length,
    previousDays: h.days.filter((d) => week(d.day) === 1).length,
    changes: [...changesNow].map(([pair, best]) => ({ pair, best, previous: changesBefore.get(pair) ?? null })),
    timed: [...timedNow].map(([song, best]) => ({ song, best, previous: timedBefore.get(song) ?? null })),
    runs: h.runs.filter((r) => week(r.day) === 0).length + h.changes.filter((c) => week(c.day) === 0).length,
  };
}

/** The last `weeks` weeks of days, Monday first, for the practice calendar. */
export function calendar(h: History, today: string, weeks = 12): { day: string; blocks: number }[][] {
  const blocks = new Map(h.days.map((d) => [d.day, d.blocks]));
  const end = dayNumber(today);
  // 1970-01-01 was a Thursday: day 0 -> weekday 3 counting from Monday.
  const weekday = (n: number) => (n + 3) % 7;
  const start = end - weekday(end) - (weeks - 1) * 7;
  const out: { day: string; blocks: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: { day: string; blocks: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const n = start + w * 7 + d;
      if (n > end) break;
      const day = new Date(n * 86_400_000).toISOString().slice(0, 10);
      column.push({ day, blocks: blocks.get(day) ?? 0 });
    }
    out.push(column);
  }
  return out;
}
