import { CHORD_IDS, type ChordId } from "./chords";

/**
 * Who is playing, from the first-run questionnaire. It decides where the path
 * starts and, later, how long the daily routine is and which songs come first.
 *
 * Nothing here is taken on faith when the microphone can check it: chords the
 * player says they know count only once heard, unless they skipped the check
 * (then they decide, as with "mark as learned").
 */

export const EXPERIENCE = ["never", "months", "years"] as const;
export const TAB_READING = ["no", "some", "yes"] as const;
export const GUITARS = ["acoustic", "classical", "electric"] as const;
export const MINUTES = [10, 20, 30] as const;
export const STYLES = ["strum", "folkCountry", "fingerstyle"] as const;
export const GOALS = ["fun", "withOthers", "oneSong"] as const;

export type Experience = (typeof EXPERIENCE)[number];
export type TabReading = (typeof TAB_READING)[number];
export type Guitar = (typeof GUITARS)[number];
export type DailyMinutes = (typeof MINUTES)[number];
export type Style = (typeof STYLES)[number];
export type Goal = (typeof GOALS)[number];

export interface Profile {
  experience: Experience;
  /** Can name the six open strings: lesson 0 is not needed. */
  knowsOpenStrings: boolean;
  /** What the player says they can play. */
  knownChords: ChordId[];
  /** What the microphone heard clean during the check. */
  verifiedChords: ChordId[];
  /** False when the player skipped the microphone check. */
  checked: boolean;
  readsTab: TabReading;
  guitar: Guitar;
  minutes: DailyMinutes;
  style: Style;
  goal: Goal;
  /** ISO date of the answers, for the periodic check-up. */
  takenAt: string;
}

/** Chords the path treats as already learned: heard ones, or declared ones when the check was skipped. */
export function placedChords(profile: Profile): ChordId[] {
  const known = new Set(profile.checked ? profile.verifiedChords : profile.knownChords);
  // Only what was declared can be placed: the check never adds chords on its own.
  return CHORD_IDS.filter((c) => known.has(c) && profile.knownChords.includes(c));
}

/**
 * Someone who has played before and already has a lesson's chords does not
 * need its drills to move on; a complete beginner does every one of them.
 */
export function skipsDrillsFor(profile: Profile, chords: readonly ChordId[]): boolean {
  if (profile.experience === "never" || chords.length === 0) return false;
  const placed = new Set(placedChords(profile));
  return chords.every((c) => placed.has(c));
}

/** Days after which the path suggests answering again, measured on real results. */
export const RECHECK_DAYS = 14;

export function needsRecheck(profile: Profile, now: Date): boolean {
  const taken = Date.parse(profile.takenAt);
  if (Number.isNaN(taken)) return true;
  return now.getTime() - taken >= RECHECK_DAYS * 24 * 60 * 60 * 1000;
}

/** Notes worth giving for a guitar other than the steel-string acoustic the app is tuned for. */
export function guitarNotes(profile: Profile): ("classical" | "electric")[] {
  return profile.guitar === "acoustic" ? [] : [profile.guitar];
}

/**
 * Answering again never takes away what the previous answers placed: a chord
 * missed at the microphone on a bad day stays where it was. New chords join.
 */
export function retake(previous: Profile | undefined, next: Profile): Profile {
  if (!previous) return next;
  const kept = placedChords(previous);
  const union = (a: ChordId[], b: ChordId[]) => CHORD_IDS.filter((c) => a.includes(c) || b.includes(c));
  return {
    ...next,
    knownChords: union(next.knownChords, kept),
    verifiedChords: next.checked ? union(next.verifiedChords, kept) : next.verifiedChords,
  };
}
