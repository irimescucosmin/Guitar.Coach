import { CHORD_IDS, type ChordId } from "./chords";

/**
 * The little theory a beginner needs: why some chords go together (a key),
 * and what a capo does (the same shapes, a few semitones higher). Chord
 * names here are symbols ("F#m"), not only the ids the app can hear: a
 * transposed chord may well be one the app does not teach yet.
 */

export const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export interface ChordName {
  /** Pitch class of the root, 0 = C. */
  root: number;
  minor: boolean;
}

/** "F#m" -> root 6, minor. Only major and minor triads: all the app knows. */
export function parseChordName(name: string): ChordName | null {
  const m = /^([A-G])(#|b)?(m)?$/.exec(name);
  if (!m) return null;
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]!]!;
  const root = (natural + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
  return { root, minor: m[3] === "m" };
}

export function chordName({ root, minor }: ChordName): string {
  return `${PITCH_NAMES[((root % 12) + 12) % 12]}${minor ? "m" : ""}`;
}

/** The same chord `semitones` higher: what a shape sounds like with a capo. */
export function transposeName(name: string, semitones: number): string | null {
  const parsed = parseChordName(name);
  return parsed ? chordName({ root: parsed.root + semitones, minor: parsed.minor }) : null;
}

/** The six chords of a major key, I ii iii IV V vi: the ones songs in that key use most. */
export function chordsOfKey(root: number): string[] {
  const steps: [number, boolean][] = [
    [0, false],
    [2, true],
    [4, true],
    [5, false],
    [7, false],
    [9, true],
  ];
  return steps.map(([s, minor]) => chordName({ root: root + s, minor }));
}

/** The keys a beginner plays with open chords, in the order the path meets them. */
export const OPEN_KEYS: readonly number[] = [7, 0, 2, 9, 4]; // G C D A E

/** Which of a key's chords the app teaches (the rest come later, or with a capo). */
export function taughtChords(root: number): { name: string; taught: ChordId | null }[] {
  return chordsOfKey(root).map((name) => ({ name, taught: (CHORD_IDS as string[]).includes(name) ? (name as ChordId) : null }));
}

/** The keys whose chords include all of these; empty for chords that belong to no single key. */
export function keysWith(chords: readonly string[]): number[] {
  return Array.from({ length: 12 }, (_, root) => root).filter((root) => {
    const inKey = chordsOfKey(root);
    return chords.every((c) => inKey.includes(c));
  });
}

/**
 * Where to put the capo to play shapes in `shapesKey` and sound in
 * `soundKey`: the distance up, 0 to 11. Beyond 7 or so the guitar sounds
 * like a mandolin, but that is the player's call.
 */
export function capoFor(shapesKey: number, soundKey: number): number {
  return (((soundKey - shapesKey) % 12) + 12) % 12;
}
