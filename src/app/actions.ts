"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { importGuestProgress, loadProgress, loadRoutine, markLearned, markRoutine, saveChangeTest, saveProfile, saveRun } from "@/lib/progress/repository";
import { changeTestInput, chordInput, dayInput, guestProgress, profileInput, routineInput, runInput } from "@/lib/progress/validation";
import { streak, type BlockId } from "@/lib/music/routine";
import type { Progress } from "@/lib/music/path";

/**
 * Thin on purpose: check who is calling, validate, delegate to src/lib.
 * A guest gets `{ saved: false }` and the client keeps the result locally.
 */

type Saved = { saved: true; progress: Progress } | { saved: false };

export async function saveLearnedChord(chord: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = chordInput.safeParse(chord);
  if (!me || !parsed.success) return { saved: false };
  await markLearned(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function savePracticeRun(run: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = runInput.safeParse(run);
  if (!me || !parsed.success) return { saved: false };
  await saveRun(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function importGuest(progress: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = guestProgress.safeParse(progress);
  if (!me || !parsed.success) return { saved: false };
  await importGuestProgress(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function saveAnswers(profile: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = profileInput.safeParse(profile);
  if (!me || !parsed.success) return { saved: false };
  await saveProfile(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function saveChanges(input: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = changeTestInput.safeParse(input);
  if (!me || !parsed.success) return { saved: false };
  await saveChangeTest(db, me.id, parsed.data.pair, parsed.data.count);
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export type Today = { done: BlockId[]; streak: number };

export async function loadToday(day: unknown): Promise<Today | null> {
  const me = await currentUser();
  const parsed = dayInput.safeParse(day);
  if (!me || !parsed.success) return null;
  const { done, days } = await loadRoutine(db, me.id, parsed.data);
  return { done, streak: streak(days, parsed.data) };
}

export async function markToday(input: unknown): Promise<Today | null> {
  const me = await currentUser();
  const parsed = routineInput.safeParse(input);
  if (!me || !parsed.success) return null;
  await markRoutine(db, me.id, parsed.data.day, parsed.data.blocks);
  const { done, days } = await loadRoutine(db, me.id, parsed.data.day);
  return { done, streak: streak(days, parsed.data.day) };
}
