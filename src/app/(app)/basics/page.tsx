import { getTranslations } from "next-intl/server";
import { BasicsView } from "@/components/basics/basics-view";

export async function generateMetadata() {
  const t = await getTranslations("basics");
  return { title: t("title") };
}

export default function BasicsPage() {
  return <BasicsView />;
}
