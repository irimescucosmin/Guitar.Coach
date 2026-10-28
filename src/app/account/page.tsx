import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AccountForm } from "@/components/account/account-form";
import { AppMark } from "@/components/ui/icons";
import { currentUser, socialProviders } from "@/lib/auth";
import { CHORD_IDS } from "@/lib/music/chords";

export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("title") };
}

const STEPS = ["step1", "step2", "step3"] as const;

/** Signing in stands apart from the app: what it does on the left, the form on the right. */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const [me, locale, t, tc] = await Promise.all([currentUser(), getLocale(), getTranslations("account"), getTranslations("common")]);
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="flex flex-col justify-between gap-10 bg-navy px-8 py-10 text-on-navy md:px-14 md:py-12">
        <Link href="/" className="flex items-center gap-3 text-on-navy">
          <AppMark />
          <span className="text-lg font-extrabold">{tc("appName")}</span>
        </Link>
        <div className="flex flex-col gap-8">
          <h1 className="display m-0 max-w-[16ch] text-[44px] font-extrabold leading-[1.05]">{tc("tagline")}</h1>
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4 text-[17px] leading-relaxed">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass font-mono font-semibold text-on-brass">{i + 1}</span>
                <span className="text-on-navy-muted">
                  <strong className="text-on-navy">{t(`${s}.title`)}</strong> {t(`${s}.body`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div aria-hidden className="flex flex-wrap gap-2">
          {CHORD_IDS.map((c) => (
            <span key={c} className="rounded-[10px] px-3 py-1.5 font-extrabold text-white" style={{ background: `var(--color-chord-${c})` }}>{c}</span>
          ))}
        </div>
      </section>
      <section className="flex items-center justify-center bg-page px-6 py-12">
        <AccountForm userName={me?.name ?? null} locale={locale} providers={socialProviders()} initialMode={mode === "signup" ? "signUp" : "signIn"} />
      </section>
    </div>
  );
}
