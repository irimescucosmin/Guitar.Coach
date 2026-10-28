import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LearnChord } from "@/components/chords/learn-chord";
import { isChordId } from "@/lib/music/chords";

export async function generateMetadata({ params }: { params: Promise<{ chord: string }> }) {
  const { chord } = await params;
  const t = await getTranslations("chords");
  return { title: isChordId(chord) ? t("learnTitle", { chord }) : undefined };
}

export default async function LearnChordPage({ params }: { params: Promise<{ chord: string }> }) {
  const { chord } = await params;
  if (!isChordId(chord)) notFound();
  return <LearnChord key={chord} chord={chord} />;
}
