import { CHORDS, stringsForPitchClasses, type ChordId, type Finger } from "./chords";

/**
 * Turns "this pitch class is missing" into the one thing to fix on the neck.
 * A fretted string is checked first: a finger lying flat both mutes its own
 * string and the open one next to it, and fixing the finger fixes both.
 */
export type Fix =
  | { kind: "pressFinger"; string: number; finger: Finger; fret: number }
  | { kind: "freeOpenString"; string: number }
  /** The strings did not sound at all: the strum skipped them. The lowest one is named. */
  | { kind: "strumStrings"; strings: number[] };

/**
 * @param missing pitch classes the chroma did not hear
 * @param silent strings with no peak of their own; with nothing missing in the chroma, the strum skipped them
 */
export function fixFor(chordId: ChordId, missing: readonly number[], silent: readonly number[] = []): Fix | null {
  const chord = CHORDS[chordId];
  // Two or more strings with no sound of their own: the strum stopped short, whatever notes are left.
  if (silent.length >= 2) return { kind: "strumStrings", strings: [...silent] };
  if (missing.length === 0) {
    const [string] = silent;
    if (string === undefined) return null;
    // One fretted string alone is a finger lying flat; an open one was skipped or touched.
    if (chord.frets[string]! > 0) return { kind: "pressFinger", string, finger: chord.fingers[string]!, fret: chord.frets[string]! };
    return { kind: "strumStrings", strings: [string] };
  }
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
