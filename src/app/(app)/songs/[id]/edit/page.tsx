import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SongEditor } from "@/components/community/song-editor";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { findCommunitySong } from "@/lib/community/repository";

export async function generateMetadata() {
  const t = await getTranslations("community");
  return { title: t("edit") };
}

/** Only the author, only a draft: a published song is what others practised. */
export default async function EditCommunitySongPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const song = await findCommunitySong(db, (await params).id);
  if (!song || song.authorId !== me.id || song.status !== "draft") notFound();
  return (
    <SongEditor
      id={song.id}
      initial={{
        title: song.title,
        kind: song.kind,
        origin: song.source,
        beatsPerBar: song.beatsPerBar,
        pattern: song.pattern,
        sections: song.sections.map((s) => ({ name: s.name, bars: [...s.bars], repeat: s.repeat })),
      }}
    />
  );
}
