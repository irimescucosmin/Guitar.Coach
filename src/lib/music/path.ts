import type { ChordId } from "./chords";
import { NOTE_DRILL_ID } from "./fretboard";
import { skipsDrillsFor, type Profile } from "./profile";
import { chordsOf, type Song } from "./songs";

/**
 * The learning path. Each lesson adds the chords a set of songs needs, in an
 * order where every new shape shares something with one already learned.
 *
 * A lesson has three core tasks, in this order, because each one prepares the
 * next: learn every new chord, play the drill in step mode, play the drill in
 * time at the target score. Songs are there to enjoy what was learned.
 *
 * Lesson 0 comes before any chord: the names of the notes on the neck, with one
 * task, the "find the note" drill.
 */

export type LessonId = "notes" | "emAm" | "gD" | "c" | "dm" | "eA";

export interface Lesson {
  id: LessonId;
  newChords: readonly ChordId[];
  drill: string;
  songs: readonly string[];
}

export const LESSONS: readonly Lesson[] = [
  { id: "notes", newChords: [], drill: NOTE_DRILL_ID, songs: [] },
  { id: "emAm", newChords: ["Em", "Am"], drill: "drill-em-am", songs: [] },
  { id: "gD", newChords: ["G", "D"], drill: "drill-g-d", songs: ["skip-to-my-lou", "tom-dooley", "down-in-the-valley", "clementine"] },
  { id: "c", newChords: ["C"], drill: "drill-g-c-d",
    songs: ["will-the-circle", "oh-susanna", "camptown-races", "coming-round-the-mountain", "when-the-saints", "swing-low", "michael-row", "auld-lang-syne", "scarborough-fair", "red-river-valley", "home-on-the-range", "amazing-grace", "ring-of-fire", "wagon-wheel", "country-roads", "jolene"] },
  { id: "dm", newChords: ["Dm"], drill: "drill-dm-c", songs: ["drunken-sailor"] },
  { id: "eA", newChords: ["E", "A"], drill: "drill-e-a", songs: ["tom-dooley-in-a"] },
];

/** A run in time passes when at least this share of bars had the right chord. */
export const PASS_SCORE = 0.7;

export type PracticeMode = "listen" | "step" | "timed";

export interface Progress {
  learned: Partial<Record<ChordId, true>>;
  /** Best result per song and mode. Step: average ms per change, lower is better. Timed: share of bars right. */
  best: Partial<Record<string, { step?: number; timed?: number }>>;
  /** Answers to the first-run questionnaire, absent until given. */
  profile?: Profile;
  /** Best clean changes in a minute, per pair of chords (`pairKey`, path order). */
  changes?: Partial<Record<string, number>>;
}

export const EMPTY_PROGRESS: Progress = { learned: {}, best: {} };

export type Task =
  | { kind: "notes"; lesson: LessonId }
  | { kind: "learn"; lesson: LessonId; chord: ChordId }
  | { kind: "step"; lesson: LessonId; song: string }
  | { kind: "timed"; lesson: LessonId; song: string };

export function coreTasks(lesson: Lesson): Task[] {
  if (lesson.id === "notes") return [{ kind: "notes", lesson: lesson.id }];
  return [
    ...lesson.newChords.map((chord): Task => ({ kind: "learn", lesson: lesson.id, chord })),
    { kind: "step", lesson: lesson.id, song: lesson.drill },
    { kind: "timed", lesson: lesson.id, song: lesson.drill },
  ];
}

/**
 * A task is done when the player did it, or when the questionnaire placed them
 * past it: lesson 0 for whoever played the six open strings, a lesson's drills for
 * whoever has played before and already has its chords.
 */
export function isDone(task: Task, progress: Progress): boolean {
  const profile = progress.profile;
  switch (task.kind) {
    case "notes":
      return progress.best[NOTE_DRILL_ID]?.step !== undefined || profile?.openStringsHeard === true;
    case "learn":
      return progress.learned[task.chord] === true;
    case "step":
      return progress.best[task.song]?.step !== undefined || placedPast(task.lesson, profile);
    case "timed":
      return (progress.best[task.song]?.timed ?? 0) >= PASS_SCORE || placedPast(task.lesson, profile);
  }
}

function placedPast(lesson: LessonId, profile: Profile | undefined): boolean {
  if (!profile) return false;
  const chords = LESSONS.find((l) => l.id === lesson)?.newChords ?? [];
  return skipsDrillsFor(profile, chords);
}

/** Index of the lesson the next task belongs to; the length of LESSONS once everything is done. */
export function currentLessonIndex(progress: Progress): number {
  const task = nextTask(progress);
  return task ? LESSONS.findIndex((l) => l.id === task.lesson) : LESSONS.length;
}

export interface LessonState {
  lesson: Lesson;
  tasks: { task: Task; done: boolean }[];
  done: number;
  total: number;
  complete: boolean;
}

export function lessonStates(progress: Progress): LessonState[] {
  return LESSONS.map((lesson) => {
    const tasks = coreTasks(lesson).map((task) => ({ task, done: isDone(task, progress) }));
    const done = tasks.filter((t) => t.done).length;
    return { lesson, tasks, done, total: tasks.length, complete: done === tasks.length };
  });
}

/** The single thing to do now: the first undone core task along the path. */
export function nextTask(progress: Progress): Task | null {
  for (const lesson of LESSONS) {
    const task = coreTasks(lesson).find((t) => !isDone(t, progress));
    if (task) return task;
  }
  return null;
}

/** Chords learned so far, in path order. */
export function learnedChords(progress: Progress): ChordId[] {
  return LESSONS.flatMap((l) => l.newChords).filter((c) => progress.learned[c]);
}

/**
 * Folds one practice result into the best results. Returns a new object and
 * reports whether the result was a record.
 */
export function recordResult(
  progress: Progress,
  song: string,
  mode: "step" | "timed",
  value: number,
): { progress: Progress; isRecord: boolean } {
  const previous = progress.best[song]?.[mode];
  const isRecord = previous === undefined || (mode === "step" ? value < previous : value > previous);
  if (!isRecord) return { progress, isRecord };
  return {
    progress: { ...progress, best: { ...progress.best, [song]: { ...progress.best[song], [mode]: value } } },
    isRecord,
  };
}

/**
 * Seconds a change may take in step mode before timed mode at `bpm` makes
 * sense: one bar, the time the song gives you to switch.
 */
export function readyForTimed(averageChangeMs: number, bpm: number, beatsPerBar: number): boolean {
  return averageChangeMs <= (beatsPerBar * 60_000) / bpm;
}

/** Chords in path order, so "learn this first" names the one the path teaches next. */
const PATH_CHORDS = LESSONS.flatMap((l) => l.newChords);

export type NextMode =
  | { kind: "learnFirst"; chord: ChordId }
  | { kind: "step" }
  | { kind: "timed" }
  /** Passed in time: the next thing is the same song a little faster. */
  | { kind: "faster" };

/** What a song asks for next, given what this player has done. */
export function nextModeFor(song: Song, progress: Progress): NextMode {
  const missing = chordsOf(song)
    .filter((c) => !progress.learned[c])
    .sort((a, b) => PATH_CHORDS.indexOf(a) - PATH_CHORDS.indexOf(b));
  if (missing[0]) return { kind: "learnFirst", chord: missing[0] };
  const best = progress.best[song.id];
  if (best?.step === undefined) return { kind: "step" };
  if ((best.timed ?? 0) < PASS_SCORE) return { kind: "timed" };
  return { kind: "faster" };
}
