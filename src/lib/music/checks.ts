import { OPEN_STRINGS_MIDI } from "./chords";

/**
 * What the microphone must hear before the app believes something was done.
 * Nothing in the app is ticked by hand: tuning, warming up and knowing the open
 * strings are proven by playing, like learning a chord.
 *
 * Pure: the screens feed in what the pitch detector heard.
 */

/** Cents from the right pitch that still count as in tune: a good ear hears about five. */
export const IN_TUNE_CENTS = 5;
/** Readings in a row in tune before a string counts: a passing value is not tuning. */
export const IN_TUNE_READINGS = 5;

export interface TuneState {
  /** Per string, low E first: proven in tune during this session. */
  done: boolean[];
  /** Readings in tune in a row, per string. */
  streak: number[];
}

export const EMPTY_TUNE: TuneState = { done: [false, false, false, false, false, false], streak: [0, 0, 0, 0, 0, 0] };

/** One reading of the tuner folded in. A string out of tune starts its count again. */
export function tuneStep(state: TuneState, reading: { string: number; cents: number }): TuneState {
  const streak = state.streak.slice();
  const done = state.done.slice();
  const inTune = Math.abs(reading.cents) <= IN_TUNE_CENTS;
  streak[reading.string] = inTune ? (streak[reading.string] ?? 0) + 1 : 0;
  if (streak[reading.string]! >= IN_TUNE_READINGS) done[reading.string] = true;
  return { done, streak };
}

export const allInTune = (state: TuneState) => state.done.every(Boolean);

/**
 * The spider warm-up: index to little finger on frets 1 to 4 of every string.
 * Twenty-four notes, none shared between strings.
 */
export const SPIDER_NOTES: readonly number[] = OPEN_STRINGS_MIDI.flatMap((open) => [1, 2, 3, 4].map((f) => open + f));

/** Out of 24: most of the spider, room for a note the microphone missed. */
export const SPIDER_NEEDED = 18;

export function isSpiderNote(midi: number): boolean {
  return SPIDER_NOTES.includes(midi);
}

/** The open string a note is, or -1. Exact: an octave off is another string, or a wrong one. */
export function openStringOf(midi: number): number {
  return OPEN_STRINGS_MIDI.indexOf(midi as (typeof OPEN_STRINGS_MIDI)[number]);
}
