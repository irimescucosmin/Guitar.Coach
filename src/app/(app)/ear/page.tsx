import { getTranslations } from "next-intl/server";
import { EarView } from "@/components/ear/ear-view";
import { EAR_LEVELS, type EarLevel } from "@/lib/music/ear";

export async function generateMetadata() {
  const t = await getTranslations("ear");
  return { title: t("title") };
}

export default async function EarPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const level = Number((await searchParams).level);
  const startLevel = EAR_LEVELS.includes(level as EarLevel) ? (level as EarLevel) : undefined;
  return <EarView startLevel={startLevel} />;
}
