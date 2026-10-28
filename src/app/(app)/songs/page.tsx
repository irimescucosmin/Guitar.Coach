import { getTranslations } from "next-intl/server";
import { SongsTable } from "@/components/songs/songs-table";

export async function generateMetadata() {
  const t = await getTranslations("songs");
  return { title: t("title") };
}

export default function SongsPage() {
  return <SongsTable />;
}
