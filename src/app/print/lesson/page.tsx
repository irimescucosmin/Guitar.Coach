import { getLocale, getTranslations } from "next-intl/server";
import { LessonSheet } from "@/components/print/lesson-sheet";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { loadProgress } from "@/lib/progress/repository";

export async function generateMetadata() {
  const t = await getTranslations("print");
  return { title: t("lesson.title") };
}

export default async function PrintLessonPage() {
  const me = await requireUser();
  const [progress, locale] = await Promise.all([loadProgress(db, me.id), getLocale()]);
  return <LessonSheet progress={progress} locale={locale} name={me.name} />;
}
