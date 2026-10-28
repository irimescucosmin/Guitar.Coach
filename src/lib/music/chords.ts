/**
 * Chord shapes in open position, the only ones the app teaches today.
 *
 * Every array runs from the 6th string (low E) to the 1st (high E), the way a
 * guitarist counts and the way a chord box is read left to right.
 */

export const OPEN_STRINGS_MIDI = [40, 45, 50, 55, 59, 64] as const;

/** 0 = open, -1 = not played. */
export type Fret = number;
/** 0 = no finger, 1 index, 2 middle, 3 ring, 4 little. */
export type Finger = 0 | 1 | 2 | 3 | 4;

export type ChordId = "Em" | "Am" | "C" | "G" | "D" | "Dm" | "E" | "A";

export interface ChordShape {
  id: ChordId;
  frets: readonly [Fret, Fret, Fret, Fret, Fret, Fret];
  fingers: readonly [Finger, Finger, Finger, Finger, Finger, Finger];
}

export interface Chord extends ChordShape {
  /** MIDI note per string, null where the string is not played. */
  notes: readonly (number | null)[];
  /** Pitch classes (0 = C) the chord is made of, root first. */
  pitchClasses: readonly number[];
  /** Index of the lowest played string: the bass note. */
  bassString: number;
}

const SHAPES: readonly ChordShape[] = [
  { id: "Em", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  { id: "Am", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  { id: "C", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  { id: "G", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  { id: "D", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  { id: "Dm", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  { id: "E", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  { id: "A", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
];

function build(shape: ChordShape): Chord {
  const notes = shape.frets.map((fret, i) => (fret < 0 ? null : OPEN_STRINGS_MIDI[i]! + fret));
  const played = notes.filter((n): n is number => n !== null);
  const pitchClasses = [...new Set(played.map((n) => n % 12))];
  const bassString = notes.findIndex((n) => n !== null);
  return { ...shape, notes, pitchClasses, bassString };
}

export const CHORDS: Readonly<Record<ChordId, Chord>> = Object.fromEntries(
  SHAPES.map((s) => [s.id, build(s)]),
) as Record<ChordId, Chord>;

export const CHORD_IDS = SHAPES.map((s) => s.id);

export function isChordId(value: string): value is ChordId {
  return (CHORD_IDS as string[]).includes(value);
}

/** Strings whose sounding note belongs to one of the given pitch classes. */
export function stringsForPitchClasses(chord: Chord, pitchClasses: readonly number[]): number[] {
  return chord.notes.flatMap((n, i) => (n !== null && pitchClasses.includes(n % 12) ? [i] : []));
}

/** MIDI note of the second-lowest played string, used for the alternating bass. */
export function alternateBassString(chord: Chord): number {
  const played = chord.notes.flatMap((n, i) => (n === null ? [] : [i]));
  return played[1] ?? chord.bassString;
}
