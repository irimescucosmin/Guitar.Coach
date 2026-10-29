import { getTranslations } from "next-intl/server";
import { ProgressView } from "@/components/progress/progress-view";
import { pageHistory } from "@/lib/progress/server";

export async function generateMetadata() {
  const t = await getTranslations("stats");
  return { title: t("title") };
}

export default async function ProgressPage() {
  return <ProgressView history={await pageHistory()} />;
}
