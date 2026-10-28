import { getTranslations } from "next-intl/server";
import { SongList } from "@/components/play/song-list";

export async function generateMetadata() {
  const t = await getTranslations("play");
  return { title: t("title") };
}

export default async function PlayPage() {
  const t = await getTranslations("play");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-prose text-muted">{t("intro")}</p>
      <SongList />
    </div>
  );
}
