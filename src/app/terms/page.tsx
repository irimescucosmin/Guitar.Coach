import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppMark } from "@/components/ui/icons";
import { button } from "@/components/ui/links";

export async function generateMetadata() {
  const t = await getTranslations("terms");
  return { title: t("title") };
}

const SECTIONS = ["what", "proof", "reports", "copyright", "conduct", "contact"] as const;

/**
 * The community rules, public: what may be published, what a report does, who
 * to write to. The contact address comes from the environment so a deployment
 * cannot forget to set one without it showing.
 */
export default async function TermsPage() {
  const [t, tc] = await Promise.all([getTranslations("terms"), getTranslations("common")]);
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[72ch] flex-col gap-8 px-6 py-10">
      <Link href="/" className="flex items-center gap-3 text-ink">
        <AppMark />
        <span className="text-lg font-extrabold">{tc("appName")}</span>
      </Link>
      <header className="flex flex-col gap-3">
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s} className="flex flex-col gap-2">
          <h2 className="m-0 text-xl font-extrabold">{t(`sections.${s}.title`)}</h2>
          <p className="m-0 leading-relaxed">{t(`sections.${s}.body`)}</p>
          {s === "contact" && contact && (
            <a href={`mailto:${contact}`} className="font-bold underline underline-offset-2">{contact}</a>
          )}
        </section>
      ))}
      <Link href="/community" className={`${button.outline} h-12 self-start`}>{t("back")}</Link>
    </main>
  );
}
