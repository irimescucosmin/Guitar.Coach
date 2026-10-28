"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { importGuestProgress, loadProgress, markLearned, saveProfile, saveRun } from "@/lib/progress/repository";
import { chordInput, guestProgress, profileInput, runInput } from "@/lib/progress/validation";
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
  revalidatePath("/");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function savePracticeRun(run: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = runInput.safeParse(run);
  if (!me || !parsed.success) return { saved: false };
  await saveRun(db, me.id, parsed.data);
  revalidatePath("/");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function importGuest(progress: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = guestProgress.safeParse(progress);
  if (!me || !parsed.success) return { saved: false };
  await importGuestProgress(db, me.id, parsed.data);
  revalidatePath("/");
  return { saved: true, progress: await loadProgress(db, me.id) };
}

export async function saveAnswers(profile: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = profileInput.safeParse(profile);
  if (!me || !parsed.success) return { saved: false };
  await saveProfile(db, me.id, parsed.data);
  revalidatePath("/");
  return { saved: true, progress: await loadProgress(db, me.id) };
}
