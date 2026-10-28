import { OPEN_STRINGS_MIDI } from "./chords";

/**
 * Notes on the neck, for lesson 0. Strings are indexed like everywhere else in
 * the app: 0 = low E (6th), 5 = high E (1st).
 */

export const FRETS_SHOWN = 12;
/** Do Re Mi Fa Sol La Si: the notes without a sharp. */
export const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11] as const;
/** The order a tab is read in: thinnest string on top. */
export const STRINGS_TOP_DOWN = [5, 4, 3, 2, 1, 0] as const;

export function midiAt(string: number, fret: number): number {
  return OPEN_STRINGS_MIDI[string]! + fret;
}

export function pitchClassAt(string: number, fret: number): number {
  return midiAt(string, fret) % 12;
}

export function isNatural(pitchClass: number): boolean {
  return (NATURAL_PITCH_CLASSES as readonly number[]).includes(pitchClass);
}

/** Every place a pitch class sits between the open string and `maxFret`. */
export function positionsOf(pitchClass: number, maxFret = FRETS_SHOWN): { string: number; fret: number }[] {
  const out: { string: number; fret: number }[] = [];
  for (let string = 0; string < 6; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      if (pitchClassAt(string, fret) === pitchClass) out.push({ string, fret });
    }
  }
  return out;
}

export interface NoteTarget {
  string: number;
  fret: number;
}

/**
 * The lesson 0 drill, in the order a beginner meets the neck: the open strings
 * from the thickest, then the first natural notes on the three thin strings.
 */
export const NOTE_DRILL: readonly NoteTarget[] = [
  ...[0, 1, 2, 3, 4, 5].map((string) => ({ string, fret: 0 })),
  { string: 5, fret: 0 }, { string: 5, fret: 1 }, { string: 5, fret: 3 },
  { string: 4, fret: 0 }, { string: 4, fret: 1 }, { string: 4, fret: 3 },
  { string: 3, fret: 0 }, { string: 3, fret: 2 },
];

export const NOTE_DRILL_ID = "notes";

export type NoteVerdict =
  | { kind: "right" }
  /** The right note name, an octave away: right idea, wrong place. */
  | { kind: "octave"; direction: "up" | "down" }
  /** Another note: go `direction` by `frets`. */
  | { kind: "off"; direction: "up" | "down"; frets: number };

/**
 * Compares the note heard with the target. The microphone cannot tell strings
 * apart, only pitches: the same pitch on another string counts as right.
 */
export function judgeNote(heardMidi: number, target: NoteTarget): NoteVerdict {
  const wanted = midiAt(target.string, target.fret);
  const heard = Math.round(heardMidi);
  if (heard === wanted) return { kind: "right" };
  const direction = heard < wanted ? "up" : "down";
  if ((heard - wanted) % 12 === 0) return { kind: "octave", direction };
  return { kind: "off", direction, frets: Math.abs(heard - wanted) };
}
