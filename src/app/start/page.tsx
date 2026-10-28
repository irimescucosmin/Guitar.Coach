import { getTranslations } from "next-intl/server";
import { Questionnaire } from "@/components/start/questionnaire";
import { requireUser } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("start");
  return { title: t("title") };
}

/** The first-run questions, full screen like playing: nothing else to look at. */
export default async function StartPage() {
  await requireUser();
  return <Questionnaire />;
}
