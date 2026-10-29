import { existsSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { Player } from "@/components/play/player";
import type { PracticeMode } from "@/lib/music/path";
import { requireUser } from "@/lib/auth";
import { findSong, type Song } from "@/lib/music/songs";
import { db } from "@/db/client";
import { findCommunitySong } from "@/lib/community/repository";
import { isCommunityId } from "@/lib/community/song";
import { getTranslations } from "next-intl/server";

const MODES: PracticeMode[] = ["listen", "step", "timed"];

/** The catalogue first, then the community: a song anyone can open, as long as it is not hidden. */
async function songFor(id: string, viewerId: string): Promise<{ song: Song; origin?: string } | null> {
  const catalogue = findSong(id);
  if (catalogue) return { song: catalogue };
  if (!isCommunityId(id)) return null;
  const song = await findCommunitySong(db, id);
  if (!song || (song.status !== "published" && song.authorId !== viewerId)) return null;
  const t = await getTranslations("community");
  return { song, origin: t("byLine", { origin: song.source, author: song.authorName }) };
}

export async function generateMetadata({ params }: { params: Promise<{ songId: string }> }) {
  const id = (await params).songId;
  return { title: findSong(id)?.title ?? (isCommunityId(id) ? (await findCommunitySong(db, id))?.title : undefined) };
}

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ songId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const me = await requireUser();
  const [{ songId }, { mode }] = await Promise.all([params, searchParams]);
  const found = await songFor(songId, me.id);
  if (!found) notFound();
  const initialMode = MODES.includes(mode as PracticeMode) ? (mode as PracticeMode) : "listen";
  // A sung version exists only for a traditional song someone generated (`pnpm sung`).
  const sung = found.song.group === "traditional" && existsSync(join(process.cwd(), "public", "sung", `${songId}.mp3`)) ? `/sung/${songId}.mp3` : undefined;
  // key: a different song or mode starts a fresh player, never one with the old state.
  return <Player key={songId} song={found.song} origin={found.origin} initialMode={initialMode} sung={sung} />;
}
