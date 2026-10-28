import { getTranslations } from "next-intl/server";
import { PathView } from "@/components/path/path-view";

export async function generateMetadata() {
  const t = await getTranslations("path");
  return { title: t("title") };
}

export default function HomePage() {
  return <PathView />;
}
