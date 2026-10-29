import { getTranslations } from "next-intl/server";
import { HelpView } from "@/components/help/help-view";
import { coachEnabled } from "@/lib/coach/model";

export async function generateMetadata() {
  const t = await getTranslations("help");
  return { title: t("title") };
}

export default function HelpPage() {
  return <HelpView coach={coachEnabled()} />;
}
