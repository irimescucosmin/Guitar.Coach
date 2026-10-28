import { z } from "zod";
import { CHORD_IDS } from "@/lib/music/chords";
import { SONGS } from "@/lib/music/songs";

/**
 * What arrives from a browser is checked against the catalogue, never trusted:
 * a song id the app does not know would become a row nobody can read.
 */

const songId = z.enum(SONGS.map((s) => s.id) as [string, ...string[]]);
const chordId = z.enum(CHORD_IDS as [string, ...string[]]);

/** One hour per change is already absurd; it only stops garbage. */
const stepMs = z.number().positive().max(3_600_000);
const share = z.number().min(0).max(1);

export const runInput = z.discriminatedUnion("mode", [
  z.object({ songId, mode: z.literal("step"), value: stepMs, bpm: z.number().int().min(40).max(200).optional() }),
  z.object({ songId, mode: z.literal("timed"), value: share, bpm: z.number().int().min(40).max(200).optional() }),
]);
export type RunInput = z.infer<typeof runInput>;

export const chordInput = chordId;

export const guestProgress = z.object({
  learned: z.record(chordId, z.literal(true)),
  best: z.record(songId, z.object({ step: stepMs.optional(), timed: share.optional() })),
});
export type GuestProgress = z.infer<typeof guestProgress>;
