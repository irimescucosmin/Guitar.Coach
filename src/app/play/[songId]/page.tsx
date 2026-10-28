import { notFound } from "next/navigation";
import { Player } from "@/components/play/player";
import type { PracticeMode } from "@/lib/music/path";
import { requireUser } from "@/lib/auth";
import { findSong } from "@/lib/music/songs";

const MODES: PracticeMode[] = ["listen", "step", "timed"];

export async function generateMetadata({ params }: { params: Promise<{ songId: string }> }) {
  const song = findSong((await params).songId);
  return { title: song?.title };
}

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ songId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireUser();
  const [{ songId }, { mode }] = await Promise.all([params, searchParams]);
  if (!findSong(songId)) notFound();
  const initialMode = MODES.includes(mode as PracticeMode) ? (mode as PracticeMode) : "listen";
  // key: a different song or mode starts a fresh player, never one with the old state.
  return <Player key={songId} songId={songId} initialMode={initialMode} />;
}
