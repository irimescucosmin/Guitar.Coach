import { CHORDS, type ChordId, type Finger } from "./chords";
import { SONGS } from "./songs";

/**
 * What a chord change asks of the hand, worked out from the two shapes: the
 * fingers that stay, the ones that slide one string at the same fret, the ones
 * that arrive. The screen turns this into one sentence.
 */

interface Placement {
  finger: Finger;
  string: number;
  fret: number;
}

function placements(chord: ChordId): Placement[] {
  const c = CHORDS[chord];
  return c.frets.flatMap((fret, string) => (fret > 0 ? [{ finger: c.fingers[string]!, string, fret }] : []));
}

export interface Transition {
  /** Fingers on the same string and fret in both chords. */
  stay: Finger[];
  /** Fingers that keep their fret and move to the next string. */
  slide: { finger: Finger; from: number; to: number }[];
  /** Fingers the second chord uses and the first does not. */
  arrive: Finger[];
  /** Fingers used by both chords that go somewhere else. */
  move: Finger[];
  /** The finger to move first: a sliding one if any, else the mover on the lowest string. */
  lead: Finger | null;
}

export function transition(from: ChordId, to: ChordId): Transition {
  const a = placements(from);
  const b = placements(to);
  const stay: Finger[] = [];
  const slide: Transition["slide"] = [];
  const arrive: Finger[] = [];
  const move: Finger[] = [];
  for (const p of b) {
    const before = a.find((q) => q.finger === p.finger);
    if (!before) arrive.push(p.finger);
    else if (before.string === p.string && before.fret === p.fret) stay.push(p.finger);
    else if (before.fret === p.fret && Math.abs(before.string - p.string) === 1) slide.push({ finger: p.finger, from: before.string, to: p.string });
    else move.push(p.finger);
  }
  const movers = b.filter((p) => !stay.includes(p.finger)).sort((x, y) => x.string - y.string);
  const lead = movers.find((p) => slide.some((s) => s.finger === p.finger))?.finger ?? movers[0]?.finger ?? null;
  return { stay, slide, arrive, move, lead };
}

/** The chords that most often follow `chord` in the catalogue, most frequent first. */
export function frequentNext(chord: ChordId, limit = 2): ChordId[] {
  const counts = new Map<ChordId, number>();
  for (const song of SONGS) {
    const bars = song.sections.flatMap((s) => Array.from({ length: s.repeat }, () => s.bars).flat());
    for (let i = 1; i < bars.length; i++) {
      if (bars[i - 1] === chord && bars[i] !== chord) counts.set(bars[i]!, (counts.get(bars[i]!) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, limit).map(([c]) => c);
}
