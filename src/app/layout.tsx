import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Header } from "@/components/chrome/header";
import { Providers } from "@/components/providers";
import { pageProgress } from "@/lib/progress/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
    applicationName: t("appName"),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages, { userName, progress }] = await Promise.all([getLocale(), getMessages(), pageProgress()]);
  return (
    <html lang={locale}>
      <body className="pb-[max(24px,env(safe-area-inset-bottom))]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers initialProgress={progress}>
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              <Header userName={userName} />
              <main className="flex flex-col gap-6">{children}</main>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
