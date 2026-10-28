import { getTranslations } from "next-intl/server";
import { ChangeTest } from "@/components/tools/change-test";
import { Tuner } from "@/components/tools/tuner";

export async function generateMetadata() {
  const t = await getTranslations("tools");
  return { title: t("title") };
}

export default async function ToolsPage() {
  const t = await getTranslations("tools");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Tuner />
        <ChangeTest />
      </div>
    </div>
  );
}
