import { getTranslations } from "next-intl/server";
import { ChordGrid } from "@/components/chords/chord-grid";

export async function generateMetadata() {
  const t = await getTranslations("chords");
  return { title: t("title") };
}

export default async function ChordsPage() {
  const t = await getTranslations("chords");
  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>
      <ChordGrid />
    </>
  );
}
