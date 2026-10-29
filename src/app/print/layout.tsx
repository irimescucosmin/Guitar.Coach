import { getTranslations } from "next-intl/server";
import { PrintBar } from "@/components/print/print-bar";
import { requireUser } from "@/lib/auth";

/**
 * Guides to print or save as PDF: one column, no sidebar, the browser's own
 * print dialog does the rest. Signed-in only, because the lesson sheet and
 * the week are the player's own.
 */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const t = await getTranslations("print");
  return (
    <div className="min-h-dvh bg-page print:bg-white">
      <PrintBar label={t("print")} back={t("back")} hint={t("hint")} />
      <main className="mx-auto flex max-w-[800px] flex-col gap-6 px-6 py-8 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
