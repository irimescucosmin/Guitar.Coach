import { getLocale, getTranslations } from "next-intl/server";
import { WeekSheet } from "@/components/print/week-sheet";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { loadProgress } from "@/lib/progress/repository";

export async function generateMetadata() {
  const t = await getTranslations("print");
  return { title: t("week.title") };
}

export default async function PrintWeekPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const me = await requireUser();
  const [progress, locale, { from }] = await Promise.all([loadProgress(db, me.id), getLocale(), searchParams]);
  // The first day comes from the browser (the player's calendar); the server's today otherwise.
  const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : new Date().toISOString().slice(0, 10);
  return <WeekSheet progress={progress} locale={locale} start={start} name={me.name} />;
}
