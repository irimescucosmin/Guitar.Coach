import type { CommunitySong } from "./song";

/**
 * Points for what helps the others, never for volume. Nothing is stored: the
 * score is read off the songs each time, so a song hidden after reports loses
 * its points on its own and nothing can be awarded by hand.
 *
 * - a song published (that is, passed in time by its author): POINTS_PUBLISHED
 * - every other player who passes it in time: POINTS_PASS, once per player per song
 */
export const POINTS_PUBLISHED = 10;
export const POINTS_PASS = 5;

export const BADGES = ["firstSong", "fiveSongs", "firstHelp", "tenHelps", "fiftyHelps"] as const;
export type Badge = (typeof BADGES)[number];

export interface AuthorScore {
  /** Songs published and still visible. */
  published: number;
  /** Passes in time by other players, summed over those songs. */
  helped: number;
  points: number;
  badges: Badge[];
}

/** The score of one author from the songs on screen. Drafts and hidden songs count for nothing. */
export function authorScore(songs: readonly CommunitySong[], authorId: string): AuthorScore {
  const own = songs.filter((s) => s.authorId === authorId && s.status === "published");
  const published = own.length;
  const helped = own.reduce((sum, s) => sum + s.plays, 0);
  const badges: Badge[] = [];
  if (published >= 1) badges.push("firstSong");
  if (published >= 5) badges.push("fiveSongs");
  if (helped >= 1) badges.push("firstHelp");
  if (helped >= 10) badges.push("tenHelps");
  if (helped >= 50) badges.push("fiftyHelps");
  return { published, helped, points: published * POINTS_PUBLISHED + helped * POINTS_PASS, badges };
}
