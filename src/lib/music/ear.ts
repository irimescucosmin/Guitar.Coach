import { CHORDS, type ChordId } from "./chords";
import { LESSONS, type Progress } from "./path";

/**
 * Ear training in five levels, each unlocked by the one before. Rounds of ten
 * questions, built from a seed so a round can be replayed and tested.
 *
 * Nothing here asks for perfect pitch: when a note has to be named, a known
 * note is played first as reference, the way a guitarist tunes by ear.
 */

export const EAR_LEVELS = [1, 2, 3, 4, 5] as const;
export type EarLevel = (typeof EAR_LEVELS)[number];

/** Results are stored like any other practice: the share of right answers, best per level. */
export const earId = (level: EarLevel) => `ear-${level}`;
export const EAR_IDS = EAR_LEVELS.map(earId);

/** Eight right out of ten unlock the next level. */
export const UNLOCK_SCORE = 0.8;

export const ROUND_LENGTH = 10;

export type Sound = { note: number } | { chord: ChordId };

export interface EarQuestion {
  level: EarLevel;
  /** Played in order, one after the other. */
  sounds: Sound[];
  /** What the player can answer; the screen gives each a name. */
  options: string[];
  answer: string;
}

/** Small, fast and good enough: the same seed always gives the same round. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPEN = [40, 45, 50, 55, 59, 64];
/** Major chords the app knows, and the minor a semitone away in the third. */
const TWINS: [ChordId, ChordId][] = [
  ["E", "Em"],
  ["A", "Am"],
  ["D", "Dm"],
];

/** Chords for "which one is it": the learned ones, or the first lesson's if fewer than two. */
export function earChords(progress: Progress): ChordId[] {
  const learned = LESSONS.flatMap((l) => l.newChords).filter((c) => progress.learned[c]);
  return learned.length >= 2 ? learned : (LESSONS.find((l) => l.newChords.length > 0)?.newChords.slice() ?? ["Em", "Am"]);
}

export function earRound(level: EarLevel, chords: readonly ChordId[], seed: number): EarQuestion[] {
  const rnd = random(seed);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)]!;
  return Array.from({ length: ROUND_LENGTH }, (_, i): EarQuestion => {
    switch (level) {
      case 1: {
        // From an octave apart down to a semitone: it gets harder within the round.
        const interval = Math.max(1, 12 - Math.round((i * 11) / (ROUND_LENGTH - 1)));
        const low = 45 + Math.floor(rnd() * 12);
        const up = rnd() < 0.5;
        return {
          level,
          sounds: up ? [{ note: low }, { note: low + interval }] : [{ note: low + interval }, { note: low }],
          options: ["first", "second"],
          answer: up ? "second" : "first",
        };
      }
      case 2: {
        // Low E first, as reference, then the string to name.
        const string = 1 + Math.floor(rnd() * 5);
        return { level, sounds: [{ note: OPEN[0]! }, { note: OPEN[string]! }], options: OPEN.map((_, s) => `s${s}`), answer: `s${string}` };
      }
      case 3: {
        const same = rnd() < 0.5;
        if (i < ROUND_LENGTH / 2) {
          const note = 48 + Math.floor(rnd() * 12);
          const other = note + (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2));
          return { level, sounds: [{ note }, { note: same ? note : other }], options: ["same", "different"], answer: same ? "same" : "different" };
        }
        // Then chords, where "different" is the near twin: one note apart.
        const [major, minor] = pick(TWINS);
        const first = rnd() < 0.5 ? major : minor;
        const second = same ? first : first === major ? minor : major;
        return { level, sounds: [{ chord: first }, { chord: second }], options: ["same", "different"], answer: same ? "same" : "different" };
      }
      case 4: {
        const [major, minor] = pick(TWINS);
        const chord = rnd() < 0.5 ? major : minor;
        return { level, sounds: [{ chord }], options: ["major", "minor"], answer: chord === major ? "major" : "minor" };
      }
      case 5: {
        // Up to four choices, the right one among them, in path order.
        const answer = pick(chords);
        const others = chords.filter((c) => c !== answer).sort(() => rnd() - 0.5).slice(0, 3);
        const options = chords.filter((c) => c === answer || others.includes(c));
        return { level, sounds: [{ chord: answer }], options, answer };
      }
    }
  });
}

/** The highest level open to the player: level 1, and each one after a passed round. */
export function unlockedLevel(progress: Progress): EarLevel {
  let level: EarLevel = 1;
  for (const l of EAR_LEVELS.slice(0, -1)) {
    if ((progress.best[earId(l)]?.timed ?? 0) >= UNLOCK_SCORE) level = (l + 1) as EarLevel;
    else break;
  }
  return level;
}

/** The level to practise today: the first one not passed yet, or the last one. */
export function earLevelToPractise(progress: Progress): EarLevel {
  const open = unlockedLevel(progress);
  const notPassed = EAR_LEVELS.find((l) => l <= open && (progress.best[earId(l)]?.timed ?? 0) < UNLOCK_SCORE);
  return notPassed ?? open;
}

/** Is a chord minor? From its notes: a minor third above the root. */
export function isMinor(chord: ChordId): boolean {
  const [root, ...rest] = CHORDS[chord].pitchClasses;
  return rest.some((pc) => (pc - root! + 12) % 12 === 3);
}

/** The level an ear result is for, or null when the id is not an ear level. */
export function earLevelOf(id: string): EarLevel | null {
  const level = Number(/^ear-([1-5])$/.exec(id)?.[1]);
  return EAR_LEVELS.includes(level as EarLevel) ? (level as EarLevel) : null;
}

/** A result for a level not yet open is refused: levels open by passing, not by calling. */
export function earRunAllowed(progress: Progress, id: string): boolean {
  const level = earLevelOf(id);
  return level === null || level <= unlockedLevel(progress);
}

/** A round counts for today's routine when it beats guessing: six right out of ten. */
export const EAR_ROUTINE_SCORE = 0.6;
