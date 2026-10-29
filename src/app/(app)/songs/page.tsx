import { getTranslations } from "next-intl/server";
import { SongsTable } from "@/components/songs/songs-table";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { listCommunitySongs } from "@/lib/community/repository";

export async function generateMetadata() {
  const t = await getTranslations("songs");
  return { title: t("title") };
}

/** The catalogue and the songs players published, one table. */
export default async function SongsPage() {
  const me = await requireUser();
  return <SongsTable community={await listCommunitySongs(db, me.id)} viewerId={me.id} />;
}
