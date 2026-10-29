import { CHORD_IDS } from "@/lib/music/chords";
import { EAR_LEVELS, earId } from "@/lib/music/ear";
import { reviewList, weekSummary, type History } from "@/lib/music/history";
import { LESSONS, PASS_SCORE, currentLessonIndex, nextTask, type Progress, type Task } from "@/lib/music/path";
import { findSong } from "@/lib/music/songs";

/**
 * What the assistant is told about the player, built from stored results,
 * never from the player's words: it answers about *this* person, and it
 * cannot be told things that did not happen.
 *
 * Pure, and plain text on purpose: the model reads it, a test can read it too.
 */

export const QUESTION_MAX_CHARS = 500;
/** Questions a day per account: enough for a lesson, not for a chat bot. */
export const QUESTIONS_PER_DAY = 20;

const taskLine = (task: Task | null): string => {
  if (!task) return "the whole path is complete";
  switch (task.kind) {
    case "notes": return "lesson 0, the notes on the fretboard (find-the-note drill)";
    case "learn": return `learn the ${task.chord} chord`;
    case "step": return `${findSong(task.song)?.title ?? task.song}, step by step`;
    case "timed": return `${findSong(task.song)?.title ?? task.song}, in time (needs ${Math.round(PASS_SCORE * 100)}% of bars right)`;
  }
};

export function playerContext(progress: Progress, history: History, today: string): string {
  const p = progress.profile;
  const learned = CHORD_IDS.filter((c) => progress.learned[c]);
  const lesson = currentLessonIndex(progress);
  const week = weekSummary(history, today);
  const review = reviewList(progress);
  const lines: string[] = [];
  if (p) {
    lines.push(
      `Experience: ${p.experience}. Guitar: ${p.guitar}. Plays ${p.minutes} minutes a day. Wants: ${p.style}. Goal: ${p.goal}. Reads tab: ${p.readsTab}.`,
    );
  } else lines.push("Has not answered the questionnaire yet.");
  lines.push(`Chords learned (heard clean by the microphone): ${learned.length ? learned.join(", ") : "none yet"}.`);
  lines.push(`Lesson ${lesson} of ${LESSONS.length - 1} (${LESSONS[lesson]?.id ?? "done"}). Next step on the path: ${taskLine(nextTask(progress))}.`);
  lines.push(`Practice days this week: ${week.days} of 7 (previous week ${week.previousDays}). Runs and tests this week: ${week.runs}.`);
  for (const c of week.changes) lines.push(`One-minute changes ${c.pair}: best this week ${c.best}${c.previous !== null ? `, previous week ${c.previous}` : ""}.`);
  for (const s of week.timed) lines.push(`In time, ${findSong(s.song)?.title ?? s.song}: best ${Math.round(s.best * 100)}%${s.previous !== null ? `, previous week ${Math.round(s.previous * 100)}%` : ""}.`);
  const ears = EAR_LEVELS.map((l) => progress.best[earId(l)]?.timed).map((v, i) => (v === undefined ? null : `level ${i + 1}: ${Math.round(v * 100)}%`)).filter(Boolean);
  if (ears.length) lines.push(`Ear training best rounds: ${ears.join(", ")}.`);
  if (review.length) {
    lines.push(
      "To review: " +
        review
          .map((r) =>
            r.kind === "pair"
              ? `change ${r.pair.join("-")}${r.best === null ? " (never measured)" : ` (${r.best}/min)`}`
              : r.kind === "song"
                ? `${findSong(r.song)?.title ?? r.song} in time (${Math.round(r.best * 100)}%)`
                : `ear level ${r.level} (${Math.round(r.best * 100)}%)`,
          )
          .join("; ") +
        ".",
    );
  }
  return lines.join("\n");
}

/** The teacher's brief: who it is, what it may say, and in which language. */
export function teacherSystem(locale: string, context: string): string {
  const language = locale === "en" ? "English" : "Italian";
  return [
    "You are the teacher inside Guitar.Coach, an app that helps beginners learn acoustic guitar by ear, with the microphone checking what they play.",
    `Answer in ${language}, in plain words, as a patient teacher would to someone who has never studied music: short sentences, concrete steps, one thing at a time. No bullet lists longer than four items. No em dashes.`,
    "Stay on guitar, practice, the player's hands and posture, the app's path and exercises. For anything else, say in one sentence that you only help with the guitar.",
    "Never tell the player they are doing well, better or worse than you can see in the facts below: when the facts say nothing, say you cannot tell yet and suggest what to measure (the change test, a run in time).",
    "Pain: sore fingertips are normal in the first weeks; tingling, numbness or pain that stays after playing are not. For those, say to stop and see a doctor, and do not give medical advice beyond that.",
    "Never invent features the app does not have. The app has: a path of lessons with the chords Em, Am, G, D, C, Dm, E, A; learning a chord with the microphone; songs played listening, step by step or in time; a tuner; a one-minute change test; ear training in five levels; a daily routine; a help page with common problems; a progress page.",
    "Facts about this player, from the app's own records (not from them):",
    context,
  ].join("\n\n");
}

/** The week in two or three sentences, from the numbers only. */
export function summarySystem(locale: string, context: string): string {
  const language = locale === "en" ? "English" : "Italian";
  return [
    "You write the weekly summary inside Guitar.Coach, a beginner guitar app.",
    `Write in ${language}, two or three short sentences, addressed to the player as 'tu' (Italian) or 'you'. No lists, no headings, no em dashes, no exclamation marks.`,
    "First sentence: what the numbers show changed this week against last week, with the numbers. Second: the one thing to do next week, taken from 'To review' when present, otherwise the next step on the path. Third, only if the player practised fewer than three days: a plain reminder that a little every day matters more than a long session.",
    "Say nothing the facts do not say. If there are no results this week, say so plainly and name the next step.",
    "Facts:",
    context,
  ].join("\n\n");
}
