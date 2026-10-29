import { getTranslations } from "next-intl/server";
import { SongEditor } from "@/components/community/song-editor";
import { requireUser } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("community");
  return { title: t("new") };
}

export default async function NewCommunitySongPage() {
  await requireUser();
  return <SongEditor />;
}
