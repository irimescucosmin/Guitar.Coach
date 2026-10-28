import { getTranslations } from "next-intl/server";
import { ChordGrid } from "@/components/chords/chord-grid";

export async function generateMetadata() {
  const t = await getTranslations("chords");
  return { title: t("title") };
}

export default async function ChordsPage() {
  const t = await getTranslations("chords");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-prose text-muted">{t("intro")}</p>
      <ChordGrid />
    </div>
  );
}
