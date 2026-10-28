import { getLocale, getTranslations } from "next-intl/server";
import { AccountForm } from "@/components/account/account-form";
import { currentUser } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage() {
  const [me, locale, t] = await Promise.all([currentUser(), getLocale(), getTranslations("account")]);
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <AccountForm userName={me?.name ?? null} locale={locale} />
    </div>
  );
}
