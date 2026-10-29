import { getTranslations } from "next-intl/server";
import { CoachView } from "@/components/coach/coach-view";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { coachEnabled } from "@/lib/coach/model";
import { countQuestions, recentQuestions } from "@/lib/progress/repository";

export async function generateMetadata() {
  const t = await getTranslations("coach");
  return { title: t("title") };
}

export default async function CoachPage() {
  const me = await requireUser();
  // The day for the limit is read again in the browser; here only for a first count.
  const today = new Date().toISOString().slice(0, 10);
  const [recent, asked] = await Promise.all([recentQuestions(db, me.id), countQuestions(db, me.id, today)]);
  return <CoachView enabled={coachEnabled()} recent={recent} asked={asked} />;
}
