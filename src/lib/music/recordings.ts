import { dayNumber } from "./routine";

/**
 * One recording a week of a song, to listen back to and compare with the
 * weeks before. A recording proves nothing and ticks nothing: it is there
 * to hear, by the player, what the numbers cannot say.
 */

/** Enough for a whole song at a slow tempo. */
export const MAX_SECONDS = 180;
/** Opus at the browser's default bitrate stays well under this for MAX_SECONDS. */
export const MAX_BYTES = 3_000_000;
/** Half a year of weeks, then the oldest goes. */
export const KEEP_WEEKS = 26;
/** What browsers record: Opus in WebM (Chromium, Firefox) or AAC in MP4 (Safari). */
export const MIME_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"] as const;

/** The Monday of the week a day falls in, as yyyy-mm-dd. */
export function mondayOf(day: string): string {
  const n = dayNumber(day);
  // 1970-01-01 was a Thursday: day 0 is weekday 3 counting from Monday.
  const monday = n - ((n + 3) % 7);
  return new Date(monday * 86_400_000).toISOString().slice(0, 10);
}

/** The container type without codec parameters: "audio/webm;codecs=opus" is a WebM. */
export function baseMime(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

export type RecordingProblem = "tooLong" | "tooBig" | "format";

/** Why a recording cannot be kept, or null if it can. */
export function recordingProblem(input: { bytes: number; mime: string; durationMs: number }): RecordingProblem | null {
  if (!(MIME_TYPES as readonly string[]).includes(baseMime(input.mime))) return "format";
  if (input.durationMs > MAX_SECONDS * 1000) return "tooLong";
  if (input.bytes > MAX_BYTES || input.bytes === 0) return "tooBig";
  return null;
}

export interface RecordingInfo {
  id: string;
  song: string;
  mode: "step" | "timed";
  /** Share of bars right for a timed run, if the run was scored. */
  share: number | null;
  week: string;
  day: string;
  durationMs: number;
}

/** Recordings by week, newest week first, so the same song can be heard week against week. */
export function byWeek<R extends RecordingInfo>(recordings: readonly R[]): { week: string; recordings: R[] }[] {
  const weeks = new Map<string, R[]>();
  for (const r of recordings) weeks.set(r.week, [...(weeks.get(r.week) ?? []), r]);
  return [...weeks.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).map(([week, list]) => ({ week, recordings: list.sort((a, b) => (a.day < b.day ? 1 : -1)) }));
}

/** The song recorded most: the one to keep recording, so the weeks compare. */
export function songToKeepRecording(recordings: readonly RecordingInfo[]): string | null {
  const counts = new Map<string, number>();
  for (const r of recordings) counts.set(r.song, (counts.get(r.song) ?? 0) + 1);
  let best: string | null = null;
  for (const [song, n] of counts) if (best === null || n > counts.get(best)!) best = song;
  return best;
}
