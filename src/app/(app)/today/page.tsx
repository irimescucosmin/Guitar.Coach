import { getTranslations } from "next-intl/server";
import { TodayView } from "@/components/today/today-view";

export async function generateMetadata() {
  const t = await getTranslations("today");
  return { title: t("title") };
}

export default function TodayPage() {
  return <TodayView />;
}
