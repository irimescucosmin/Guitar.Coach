import { z } from "zod";
import { CHORD_IDS, type ChordId } from "@/lib/music/chords";
import type { Section, Song, StrumPattern } from "@/lib/music/songs";

/**
 * Songs published by players. Same shape as the catalogue's, with the same
 * rule: chords and structure only. A protected song is a chord progression,
 * never words or a melody, and the form says so before anything is typed.
 *
 * Ids start with "c-" so results, routines and links can tell them apart from
 * the catalogue without a lookup.
 */

export const COMMUNITY_PREFIX = "c-";
export const isCommunityId = (id: string) => id.startsWith(COMMUNITY_PREFIX);

export const PATTERNS: readonly StrumPattern[] = ["down", "boomChick", "waltz", "folk"];
export const SECTION_NAMES: readonly Section["name"][] = ["loop", "verse", "chorus"];
/** Enough for a verse and a chorus with repeats, not for a whole album. */
export const MAX_SECTIONS = 4;
export const MAX_BARS = 32;
export const MAX_REPEAT = 4;

/** What the form collects: the song as the catalogue would hold it, plus where it comes from. */
export const communitySongInput = z.object({
  title: z.string().trim().min(2).max(60),
  /** "traditional": public domain, the whole song. "chordsOnly": a protected song, the progression only. */
  kind: z.enum(["traditional", "chordsOnly"]),
  /** Who wrote it or where it comes from, in a few words. Required for a protected song: the author. */
  origin: z.string().trim().max(80),
  beatsPerBar: z.union([z.literal(3), z.literal(4)]),
  pattern: z.enum(PATTERNS as [StrumPattern, ...StrumPattern[]]),
  sections: z
    .array(
      z.object({
        name: z.enum(SECTION_NAMES as [Section["name"], ...Section["name"][]]),
        bars: z.array(z.enum(CHORD_IDS as [ChordId, ...ChordId[]])).min(2).max(MAX_BARS),
        repeat: z.number().int().min(1).max(MAX_REPEAT),
      }),
    )
    .min(1)
    .max(MAX_SECTIONS),
});
export type CommunitySongInput = z.infer<typeof communitySongInput>;

/** Words that have no place in a chord sheet: a lyric line gives itself away by its length and spaces. */
export function looksLikeLyrics(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > 12;
}

/** A pattern in three cannot be strummed over four beats, nor the other way round. */
export function patternFits(pattern: StrumPattern, beatsPerBar: 3 | 4): boolean {
  return pattern === "waltz" ? beatsPerBar === 3 : beatsPerBar === 4;
}

/** Problems the form shows before publishing; an empty list means it can go. */
export function songProblems(input: CommunitySongInput): ("lyrics" | "pattern" | "origin" | "oneChord")[] {
  const problems: ("lyrics" | "pattern" | "origin" | "oneChord")[] = [];
  if (looksLikeLyrics(input.title) || looksLikeLyrics(input.origin)) problems.push("lyrics");
  if (!patternFits(input.pattern, input.beatsPerBar)) problems.push("pattern");
  if (input.kind === "chordsOnly" && input.origin.length < 2) problems.push("origin");
  if (new Set(input.sections.flatMap((s) => s.bars)).size < 2) problems.push("oneChord");
  return problems;
}

export interface CommunitySong extends Song {
  kind: "traditional" | "chordsOnly";
  /** The author's own words on where it comes from. */
  source: string;
  authorId: string;
  authorName: string;
  status: "draft" | "published" | "hidden";
  /** Players who passed it in time, the author excluded. */
  plays: number;
}

/** A stored row as the player and the catalogue code see it. */
export function toSong(row: {
  id: string;
  title: string;
  kind: "traditional" | "chordsOnly";
  origin: string;
  beatsPerBar: number;
  pattern: string;
  sections: unknown;
  authorId: string;
  authorName: string;
  status: "draft" | "published" | "hidden";
  plays: number;
}): CommunitySong | null {
  const parsed = communitySongInput.safeParse({ ...row, beatsPerBar: row.beatsPerBar, pattern: row.pattern });
  if (!parsed.success) return null;
  return {
    id: row.id,
    title: parsed.data.title,
    kind: parsed.data.kind,
    source: parsed.data.origin,
    origin: parsed.data.kind === "traditional" ? "traditional" : "chordsOnly",
    group: parsed.data.kind === "traditional" ? "traditional" : "progression",
    beatsPerBar: parsed.data.beatsPerBar,
    pattern: parsed.data.pattern,
    sections: parsed.data.sections,
    authorId: row.authorId,
    authorName: row.authorName,
    status: row.status,
    plays: row.plays,
  };
}
