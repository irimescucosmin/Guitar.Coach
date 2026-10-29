import { CHORD_IDS, type ChordId } from "./chords";

/**
 * Who is playing, from the first-run questionnaire. It decides where the path
 * starts and, later, how long the daily routine is and which songs come first.
 *
 * Nothing here is taken on faith: chords the player says they know count only
 * once the microphone heard them, and lesson 0 is skipped only if it heard the
 * six open strings. Skipping the check places nothing.
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
  /** Says they can name the six open strings. */
  knowsOpenStrings: boolean;
  /** The microphone heard the six open strings, one by one: lesson 0 is not needed. */
  openStringsHeard: boolean;
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

/** Chords the path treats as already learned: declared and then heard clean. Nothing without the check. */
export function placedChords(profile: Profile): ChordId[] {
  if (!profile.checked) return [];
  return CHORD_IDS.filter((c) => profile.verifiedChords.includes(c) && profile.knownChords.includes(c));
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
    verifiedChords: union(next.verifiedChords, kept),
    // Once proven, kept: a skipped check later does not undo it.
    checked: next.checked || kept.length > 0,
    openStringsHeard: next.openStringsHeard || previous.openStringsHeard,
  };
}
