import "server-only";
import { QUESTIONS_PER_DAY, playerContext, summarySystem, teacherSystem } from "./context";
import { ask, coachEnabled } from "./model";
import { mondayOf } from "@/lib/music/recordings";
import { countQuestions, latestSummary, loadHistory, loadProgress, saveCoachMessage, type Database } from "@/lib/progress/repository";

/**
 * The assistant, as the server runs it: facts from the database, a short
 * answer from the model, both saved. The daily limit is counted here.
 */

export type Answer = { ok: true; text: string; left: number } | { ok: false; reason: "off" | "limit" | "failed" };

export async function answerQuestion(db: Database, userId: string, locale: string, day: string, question: string): Promise<Answer> {
  if (!coachEnabled()) return { ok: false, reason: "off" };
  const used = await countQuestions(db, userId, day);
  if (used >= QUESTIONS_PER_DAY) return { ok: false, reason: "limit" };
  const [progress, history] = await Promise.all([loadProgress(db, userId), loadHistory(db, userId)]);
  const system = teacherSystem(locale, playerContext(progress, history, day));
  try {
    const reply = await ask(system, question);
    await saveCoachMessage(db, userId, { kind: "question", day, question, answer: reply.text });
    return { ok: true, text: reply.text, left: QUESTIONS_PER_DAY - used - 1 };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** This week's summary: written once per week, on the first visit, from the numbers. */
export async function weeklySummary(db: Database, userId: string, locale: string, day: string): Promise<string | null> {
  if (!coachEnabled()) return null;
  const cached = await latestSummary(db, userId, mondayOf(day));
  if (cached) return cached;
  const [progress, history] = await Promise.all([loadProgress(db, userId), loadHistory(db, userId)]);
  try {
    const reply = await ask(summarySystem(locale, playerContext(progress, history, day)), "Write this week's summary.", 250);
    await saveCoachMessage(db, userId, { kind: "summary", day, question: null, answer: reply.text });
    return reply.text;
  } catch {
    return null;
  }
}
