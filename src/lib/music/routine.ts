import type { ChordId } from "./chords";
import { earId, earLevelToPractise, type EarLevel } from "./ear";
import { LESSONS, nextModeFor, nextTask, type PracticeMode, type Progress, type Task } from "./path";
import type { DailyMinutes, Style } from "./profile";
import { SONGS, chordsOf, type Song } from "./songs";

/**
 * The daily routine: what to do today, in what order, for how long. Built from
 * the time the player said they have, the path, and their results, the way a
 * teacher plans a lesson: tune, warm up, the new thing, the weak change, a song.
 *
 * Pure: the day comes in as a date string, so the same day gives the same plan.
 */

export const BLOCK_IDS = ["tune", "warmup", "ear", "new", "changes", "song"] as const;
export type BlockId = (typeof BLOCK_IDS)[number];

export type Block =
  | { id: "tune"; minutes: number }
  | { id: "warmup"; minutes: number }
  | { id: "ear"; minutes: number; level: EarLevel }
  | { id: "new"; minutes: number; task: Task }
  | { id: "changes"; minutes: number; pair: [ChordId, ChordId]; best: number | null }
  | { id: "song"; minutes: number; song: string; mode: PracticeMode };

/** Minutes per block for each daily length. Ten minutes keeps only the essentials. */
export const SPLITS: Record<DailyMinutes, Record<BlockId, number>> = {
  10: { tune: 1, warmup: 0, ear: 0, new: 5, changes: 4, song: 0 },
  20: { tune: 1, warmup: 2, ear: 3, new: 5, changes: 4, song: 5 },
  30: { tune: 1, warmup: 4, ear: 3, new: 9, changes: 5, song: 8 },
};

const PATH_CHORDS = LESSONS.flatMap((l) => l.newChords);

/** A pair of chords in path order, as a key: the same pair either way round. */
export function pairKey(a: ChordId, b: ChordId): string {
  return PATH_CHORDS.indexOf(a) <= PATH_CHORDS.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Changes between learned chords that the catalogue's songs actually ask for:
 * older chords first, and within the same newest chord the rarer change first,
 * so the last one is the newest and most common.
 */
export function practisedPairs(progress: Progress): [ChordId, ChordId][] {
  const seen = new Map<string, [ChordId, ChordId]>();
  const count = new Map<string, number>();
  for (const song of SONGS) {
    const bars = song.sections.flatMap((s) => s.bars);
    for (let i = 1; i < bars.length; i++) {
      const a = bars[i - 1]!;
      const b = bars[i]!;
      if (a === b || !progress.learned[a] || !progress.learned[b]) continue;
      const key = pairKey(a, b);
      if (!seen.has(key)) seen.set(key, key.split("-") as [ChordId, ChordId]);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  }
  const rank = ([a, b]: [ChordId, ChordId]) => Math.max(PATH_CHORDS.indexOf(a), PATH_CHORDS.indexOf(b));
  const often = (p: [ChordId, ChordId]) => count.get(pairKey(...p)) ?? 0;
  return [...seen.values()].sort((x, y) => rank(x) - rank(y) || often(x) - often(y));
}

/**
 * The change to drill today: one never tested first (the most recent chord
 * first, it is the least settled; the change songs use most), otherwise the one with the fewest clean
 * changes in a minute.
 */
export function weakPair(progress: Progress): { pair: [ChordId, ChordId]; best: number | null } | null {
  const pairs = practisedPairs(progress);
  if (pairs.length === 0) return null;
  const best = (p: [ChordId, ChordId]) => progress.changes?.[pairKey(...p)];
  const untested = pairs.filter((p) => best(p) === undefined);
  if (untested.length > 0) return { pair: untested.at(-1)!, best: null };
  const weakest = [...pairs].sort((x, y) => best(x)! - best(y)!)[0]!;
  return { pair: weakest, best: best(weakest)! };
}

/** Rhythms each style plays most, so its songs come first. */
const STYLE_PATTERNS: Record<Style, Song["pattern"][]> = {
  folkCountry: ["boomChick", "waltz"],
  strum: ["folk", "down"],
  fingerstyle: ["waltz"],
};

/** Songs whose chords are all learned, the player's style first. Drills are not songs. */
export function playableSongs(progress: Progress): Song[] {
  const style = progress.profile?.style ?? "folkCountry";
  const preferred = (s: Song) => (STYLE_PATTERNS[style].includes(s.pattern) ? 0 : 1);
  return SONGS.filter((s) => s.group !== "exercise" && chordsOf(s).every((c) => progress.learned[c])).sort(
    (a, b) => preferred(a) - preferred(b),
  );
}

/** Days since 1970-01-01 for a YYYY-MM-DD date: it turns the song of the day. */
export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

/** One song a day, turning through the preferred ones, in the mode it needs next. */
export function songOfTheDay(progress: Progress, date: string): { song: string; mode: PracticeMode } | null {
  const songs = playableSongs(progress);
  const style = progress.profile?.style ?? "folkCountry";
  const pool = songs.filter((s) => STYLE_PATTERNS[style].includes(s.pattern));
  const list = pool.length > 0 ? pool : songs;
  if (list.length === 0) return null;
  const song = list[((dayNumber(date) % list.length) + list.length) % list.length]!;
  const next = nextModeFor(song, progress);
  return { song: song.id, mode: next.kind === "step" ? "step" : "timed" };
}

/** Today's plan. Blocks with nothing to do give their minutes to the new thing, or to the song. */
export function dailyRoutine(progress: Progress, date: string): Block[] {
  const split = { ...SPLITS[progress.profile?.minutes ?? 20] };
  const task = nextTask(progress);
  const weak = weakPair(progress);
  const song = split.song > 0 || !task ? songOfTheDay(progress, date) : null;

  if (!weak) {
    split.new += split.changes;
    split.changes = 0;
  }
  if (!song) {
    split.new += split.song;
    split.song = 0;
  }
  if (!task) {
    const to = song ? "song" : "changes";
    split[to] += split.new;
    split.new = 0;
  }

  const blocks: Block[] = [{ id: "tune", minutes: split.tune }];
  if (split.warmup > 0) blocks.push({ id: "warmup", minutes: split.warmup });
  if (split.ear > 0) blocks.push({ id: "ear", minutes: split.ear, level: earLevelToPractise(progress) });
  if (task && split.new > 0) blocks.push({ id: "new", minutes: split.new, task });
  if (weak && split.changes > 0) blocks.push({ id: "changes", minutes: split.changes, ...weak });
  if (song && split.song > 0) blocks.push({ id: "song", minutes: split.song, ...song });
  return blocks;
}

/**
 * Days in a row with some practice, ending today or yesterday: a day not yet
 * played does not break the series until it is over.
 */
export function streak(days: readonly string[], today: string): number {
  const set = new Set(days.map(dayNumber));
  let day = dayNumber(today);
  if (!set.has(day)) day -= 1;
  let count = 0;
  while (set.has(day)) {
    count += 1;
    day -= 1;
  }
  return count;
}

/** A local date as YYYY-MM-DD, the key every routine record uses. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** All the pairs a change test can be about: two different chords, in path order. */
export const PAIR_KEYS: readonly string[] = PATH_CHORDS.flatMap((a, i) => PATH_CHORDS.slice(i + 1).map((b) => `${a}-${b}`));

/**
 * A day from the browser is believed only near the server's: time zones span
 * about a day either way, anything further is a wrong clock or a forged call.
 */
export function isNearToday(date: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = dayNumber(date);
  const today = Math.floor(now.getTime() / 86_400_000);
  return Number.isFinite(day) && Math.abs(day - today) <= 1;
}

/**
 * Something the player just did, as the routine sees it. "tuned" and "warmup"
 * come from the microphone in the browser: all six strings held in tune, most
 * of the spider's notes heard. The others come with a saved result.
 */
export type PracticeEvent =
  | { kind: "run"; song: string; mode: PracticeMode | "notes" }
  | { kind: "learn"; chord: ChordId }
  | { kind: "changes"; pair: string }
  | { kind: "tuned" }
  | { kind: "warmup" };

/** Which of today's blocks an event completes: doing the thing marks it, there is no button. */
export function blocksDoneBy(routine: readonly Block[], event: PracticeEvent): BlockId[] {
  return routine.flatMap((block): BlockId[] => {
    switch (block.id) {
      case "tune":
        return event.kind === "tuned" ? ["tune"] : [];
      case "warmup":
        return event.kind === "warmup" ? ["warmup"] : [];
      case "new": {
        const t = block.task;
        if (t.kind === "learn") return event.kind === "learn" && event.chord === t.chord ? ["new"] : [];
        if (t.kind === "notes") return event.kind === "run" && event.mode === "notes" ? ["new"] : [];
        return event.kind === "run" && event.song === t.song && event.mode === t.kind ? ["new"] : [];
      }
      case "ear":
        return event.kind === "run" && event.song === earId(block.level) ? ["ear"] : [];
      case "changes":
        return event.kind === "changes" && event.pair === pairKey(...block.pair) ? ["changes"] : [];
      case "song":
        return event.kind === "run" && event.song === block.song && event.mode !== "listen" ? ["song"] : [];
    }
  });
}
