import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { en } from "@/messages/en";
import { it } from "@/messages/it";

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Italian first; English when the visitor chose it. No locale in the URL. */
export default getRequestConfig(async () => {
  const chosen = (await cookies()).get("locale")?.value;
  const locale: Locale = chosen === "en" ? "en" : "it";
  return { locale, messages: locale === "en" ? en : it, timeZone: "Europe/Rome" };
});
