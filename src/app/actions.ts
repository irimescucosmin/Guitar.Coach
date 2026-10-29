"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { importGuestProgress, loadProgress, markLearned, markRoutine, saveChangeTest, saveProfile, saveRun } from "@/lib/progress/repository";
import { loadToday as todayOf, recordPractice, type Today } from "@/lib/progress/practice";
import { answersInput, changeTestInput, chordInput, dayInput, guestProgress, optionalDay, proofInput, runInput } from "@/lib/progress/validation";
import { blocksDoneBy, dailyRoutine } from "@/lib/music/routine";
import { NOTE_DRILL_ID } from "@/lib/music/fretboard";
import { earRunAllowed } from "@/lib/music/ear";
import { isChordId } from "@/lib/music/chords";
import type { Progress } from "@/lib/music/path";

/**
 * Thin on purpose: check who is calling, validate, delegate to src/lib.
 * Results carry the player's date: the server ticks today's routine from them.
 */

type Saved = { saved: true; progress: Progress; today: Today | null } | { saved: false };
export type { Today };

export async function saveLearnedChord(input: unknown, day: unknown = null): Promise<Saved> {
  const me = await currentUser();
  const parsed = chordInput.safeParse(input);
  if (!me || !parsed.success || !isChordId(parsed.data)) return { saved: false };
  const chord = parsed.data;
  const result = await recordPractice(db, me.id, optionalDay.parse(day), { kind: "learn", chord }, () => markLearned(db, me.id, chord));
  revalidatePath("/", "layout");
  return result ? { saved: true, ...result } : { saved: false };
}

export async function savePracticeRun(run: unknown, day: unknown = null): Promise<Saved> {
  const me = await currentUser();
  const parsed = runInput.safeParse(run);
  if (!me || !parsed.success) return { saved: false };
  const r = parsed.data;
  const event = { kind: "run" as const, song: r.songId, mode: r.songId === NOTE_DRILL_ID ? ("notes" as const) : r.mode, value: r.value };
  const result = await recordPractice(db, me.id, optionalDay.parse(day), event, () => saveRun(db, me.id, r), (before) =>
    earRunAllowed(before, r.songId),
  );
  revalidatePath("/", "layout");
  return result ? { saved: true, ...result } : { saved: false };
}

export async function importGuest(progress: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = guestProgress.safeParse(progress);
  if (!me || !parsed.success) return { saved: false };
  await importGuestProgress(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id), today: null };
}

export async function saveAnswers(profile: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = answersInput.safeParse(profile);
  if (!me || !parsed.success) return { saved: false };
  await saveProfile(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id), today: null };
}

export async function saveChanges(input: unknown, day: unknown = null): Promise<Saved> {
  const me = await currentUser();
  const parsed = changeTestInput.safeParse(input);
  if (!me || !parsed.success) return { saved: false };
  const { pair, count } = parsed.data;
  const result = await recordPractice(db, me.id, optionalDay.parse(day), { kind: "changes", pair }, () => saveChangeTest(db, me.id, pair, count));
  return result ? { saved: true, ...result } : { saved: false };
}

export async function loadToday(day: unknown): Promise<Today | null> {
  const me = await currentUser();
  const parsed = dayInput.safeParse(day);
  if (!me || !parsed.success) return null;
  return todayOf(db, me.id, parsed.data);
}

/** The microphone in the browser proved tuning or the warm-up: tick the block it belongs to, if today has it. */
export async function reportProof(input: unknown): Promise<Today | null> {
  const me = await currentUser();
  const parsed = proofInput.safeParse(input);
  if (!me || !parsed.success) return null;
  const { day, proof } = parsed.data;
  const blocks = blocksDoneBy(dailyRoutine(await loadProgress(db, me.id), day), { kind: proof });
  if (blocks.length > 0) await markRoutine(db, me.id, day, blocks);
  return todayOf(db, me.id, day);
}
