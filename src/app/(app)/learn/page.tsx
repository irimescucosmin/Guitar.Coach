import { getTranslations } from "next-intl/server";
import { LearnHub } from "@/components/learn/learn-hub";

export async function generateMetadata() {
  const t = await getTranslations("learn");
  return { title: t("title") };
}

export default function LearnPage() {
  return <LearnHub />;
}
