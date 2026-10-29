import { CHORDS, type ChordId } from "./chords";
import type { Progress } from "./path";
import { PASS_SCORE } from "./path";
import { SONGS, type Song, type StrumPattern } from "./songs";

/**
 * What comes after the first chords. Like everything else, a technique is
 * done when a saved result shows it: a strum when a song with that strum
 * was passed in time, the arpeggio when the microphone heard the chord's
 * strings one at a time in order. The rest is reading, and stays unticked:
 * there is nothing to prove.
 */

export type TechniqueId = "downstrokes" | "boomChick" | "folk" | "waltz" | "arpeggio" | "palmMute" | "capo" | "keys" | "later";

export type ReadingId = "palmMute" | "capo" | "keys" | "later";
export type Technique =
  | { id: Exclude<TechniqueId, ReadingId | "arpeggio">; kind: "strum"; pattern: StrumPattern }
  | { id: "arpeggio"; kind: "arpeggio" }
  | { id: ReadingId; kind: "reading" };

export const TECHNIQUES: readonly Technique[] = [
  { id: "downstrokes", kind: "strum", pattern: "down" },
  { id: "boomChick", kind: "strum", pattern: "boomChick" },
  { id: "folk", kind: "strum", pattern: "folk" },
  { id: "waltz", kind: "strum", pattern: "waltz" },
  { id: "arpeggio", kind: "arpeggio" },
  { id: "palmMute", kind: "reading" },
  { id: "capo", kind: "reading" },
  { id: "keys", kind: "reading" },
  { id: "later", kind: "reading" },
];

/** The id a saved arpeggio run carries, one per chord: "arp-Em". */
export const arpeggioId = (chord: ChordId) => `arp-${chord}`;
export const ARPEGGIO_IDS: readonly string[] = (Object.keys(CHORDS) as ChordId[]).map(arpeggioId);

/** The chord's played strings, bass first, as MIDI notes: what an arpeggio sounds, in order. */
export function arpeggioNotes(chord: ChordId): number[] {
  return CHORDS[chord].notes.filter((n): n is number => n !== null);
}

/**
 * One note heard: the next expected one moves on, a wrong one is ignored
 * (a player feeling for the string must not start over), the open-string
 * check is exact to the octave as in the tuner. Returns the new position.
 */
export function arpeggioStep(chord: ChordId, position: number, heardMidi: number): number {
  const notes = arpeggioNotes(chord);
  if (position >= notes.length) return position;
  return heardMidi === notes[position] ? position + 1 : position;
}

export const arpeggioDone = (chord: ChordId, position: number) => position >= arpeggioNotes(chord).length;

/** Songs the catalogue plays with this strum, the ones with every chord learned first. */
export function songsWithPattern(pattern: StrumPattern, progress: Progress): Song[] {
  const learned = (s: Song) => s.sections.every((sec) => sec.bars.every((b) => progress.learned[b]));
  return SONGS.filter((s) => s.pattern === pattern && s.group !== "exercise").sort((a, b) => Number(learned(b)) - Number(learned(a)));
}

/** The song that proves the strum: passed in time, this pattern. */
export function strumProvedBy(pattern: StrumPattern, progress: Progress): Song | null {
  return SONGS.find((s) => s.pattern === pattern && (progress.best[s.id]?.timed ?? 0) >= PASS_SCORE) ?? null;
}

/** The chords whose arpeggio was heard, with the best time in milliseconds. */
export function arpeggiosHeard(progress: Progress): { chord: ChordId; ms: number }[] {
  return (Object.keys(CHORDS) as ChordId[]).flatMap((chord) => {
    const ms = progress.best[arpeggioId(chord)]?.step;
    return ms === undefined ? [] : [{ chord, ms }];
  });
}
