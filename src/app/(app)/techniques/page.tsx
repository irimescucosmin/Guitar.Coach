import { getTranslations } from "next-intl/server";
import { TechniquesView } from "@/components/techniques/techniques-view";

export async function generateMetadata() {
  const t = await getTranslations("techniques");
  return { title: t("title") };
}

export default function TechniquesPage() {
  return <TechniquesView />;
}
