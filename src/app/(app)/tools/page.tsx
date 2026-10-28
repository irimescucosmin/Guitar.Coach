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
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Tuner />
        <ChangeTest />
      </div>
    </>
  );
}
