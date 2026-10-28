import { CHORDS, stringsForPitchClasses, type ChordId, type Finger } from "./chords";

/**
 * Turns "this pitch class is missing" into the one thing to fix on the neck.
 * A fretted string is checked first: a finger lying flat both mutes its own
 * string and the open one next to it, and fixing the finger fixes both.
 */
export type Fix =
  | { kind: "pressFinger"; string: number; finger: Finger; fret: number }
  | { kind: "freeOpenString"; string: number };

export function fixFor(chordId: ChordId, missing: readonly number[]): Fix | null {
  if (missing.length === 0) return null;
  const chord = CHORDS[chordId];
  const strings = stringsForPitchClasses(chord, missing);
  const fretted = strings.find((s) => chord.frets[s]! > 0);
  if (fretted !== undefined) {
    return { kind: "pressFinger", string: fretted, finger: chord.fingers[fretted]!, fret: chord.frets[fretted]! };
  }
  const open = strings[0];
  return open === undefined ? null : { kind: "freeOpenString", string: open };
}

/** The placing order shown when learning a chord: by finger, index first. */
export function placementSteps(chordId: ChordId): { finger: Finger; string: number; fret: number }[] {
  const chord = CHORDS[chordId];
  return chord.frets
    .flatMap((fret, string) => (fret > 0 ? [{ finger: chord.fingers[string]!, string, fret }] : []))
    .sort((a, b) => a.finger - b.finger);
}

export function openStrings(chordId: ChordId): number[] {
  return CHORDS[chordId].frets.flatMap((f, i) => (f === 0 ? [i] : []));
}

export function mutedStrings(chordId: ChordId): number[] {
  return CHORDS[chordId].frets.flatMap((f, i) => (f < 0 ? [i] : []));
}
