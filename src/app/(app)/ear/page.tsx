import { getTranslations } from "next-intl/server";
import { EarView } from "@/components/ear/ear-view";
import { EAR_LEVELS, type EarLevel } from "@/lib/music/ear";

export async function generateMetadata() {
  const t = await getTranslations("ear");
  return { title: t("title") };
}

export default async function EarPage({ searchParams }: { searchParams: Promise<{ level?: string; seed?: string }> }) {
  const params = await searchParams;
  const level = Number(params.level);
  const startLevel = EAR_LEVELS.includes(level as EarLevel) ? (level as EarLevel) : undefined;
  // A fixed round, for the end-to-end tests: they cannot hear, so they compute the answers.
  const seed = Number.isInteger(Number(params.seed)) && params.seed ? Number(params.seed) : undefined;
  return <EarView startLevel={startLevel} seed={seed} />;
}
