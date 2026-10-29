"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { TODAY_HREF, button } from "@/components/ui/links";
import { authClient } from "@/lib/auth-client";

const field = "h-12 rounded-[var(--radius-field)] border border-line-strong bg-surface px-3.5 text-base text-ink";
const labelClass = "flex flex-col gap-1.5 text-sm font-bold";

export function AccountForm({ userName, locale, providers, initialMode = "signIn" }: {
  userName: string | null;
  locale: string;
  providers: ("google" | "apple")[];
  initialMode?: "signIn" | "signUp";
}) {
  const t = useTranslations("account");
  const router = useRouter();
  const [mode, setMode] = useState<"signIn" | "signUp">(initialMode);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const setLocale = (next: string) => {
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const languagePicker = (
    <label htmlFor="locale" className={labelClass}>
      {t("language")}
      <select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)} className={field}>
        <option value="it">Italiano</option>
        <option value="en">English</option>
      </select>
    </label>
  );

  if (userName) {
    return (
      <div className="flex w-full max-w-[400px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="display m-0 text-[32px] font-extrabold">{t("title")}</h2>
          <p className="m-0 text-base text-ink-2">{t("signedInAs", { name: userName })}</p>
        </div>
        {languagePicker}
        <Link href={TODAY_HREF} className={`${button.brass} h-[52px] text-[17px]`}>{t("toPath")}</Link>
        <Link href="/start" className={`${button.outline} h-12`}>{t("retake")}</Link>
        <button type="button" disabled={pending} className={`${button.outline} h-12`}
          onClick={() => startTransition(async () => { await authClient.signOut(); router.refresh(); })}>
          {t("signOut")}
        </button>
      </div>
    );
  }

  const submit = (form: FormData) =>
    startTransition(async () => {
      setError("");
      const email = String(form.get("email") ?? "");
      const password = String(form.get("password") ?? "");
      const result =
        mode === "signIn"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "") });
      if (result.error) {
        setError(mode === "signIn" ? t("errorSignIn") : t("errorSignUp"));
        return;
      }
      // A new player starts from the questions; a returning one from the path.
      router.push(mode === "signUp" ? "/start" : TODAY_HREF);
      router.refresh();
    });

  const social = (provider: "google" | "apple") =>
    startTransition(async () => {
      setError("");
      // New accounts land on today too: the path offers the questions when there are no answers yet.
      const result = await authClient.signIn.social({ provider, callbackURL: TODAY_HREF });
      if (result?.error) setError(t("errorSocial"));
    });

  return (
    <form action={submit} className="flex w-full max-w-[400px] flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="display m-0 text-[32px] font-extrabold">{mode === "signIn" ? t("signIn") : t("signUp")}</h2>
        <p className="m-0 text-base text-ink-2">{t("why")}</p>
      </div>
      {providers.length > 0 && (
        <>
          {providers.map((p) => (
            <button key={p} type="button" disabled={pending} onClick={() => social(p)} className={`${button.outline} h-12`}>
              {t(`with.${p}`)}
            </button>
          ))}
          <div aria-hidden className="flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-line" />{t("orEmail")}<span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      {mode === "signUp" && (
        <label htmlFor="name" className={labelClass}>
          {t("name")}
          <input id="name" name="name" required autoComplete="name" className={field} />
        </label>
      )}
      <label htmlFor="email" className={labelClass}>
        {t("email")}
        <input id="email" name="email" type="email" required autoComplete="email" placeholder={t("emailPlaceholder")} className={field} />
      </label>
      <label htmlFor="password" className={labelClass}>
        {t("password")}
        <input id="password" name="password" type="password" required minLength={10}
          autoComplete={mode === "signIn" ? "current-password" : "new-password"} className={field} />
        {mode === "signUp" && <span className="text-xs font-normal text-muted">{t("passwordHelp")}</span>}
      </label>
      {error && <p className="m-0 text-sm font-semibold text-bad" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className={`${button.primary} h-[52px] text-[17px] disabled:opacity-60`}>
        {pending ? t("working") : mode === "signIn" ? t("signIn") : t("signUp")}
      </button>
      <p className="m-0 text-center text-[15px] text-ink-2">
        {mode === "signIn" ? t("noAccount") : t("haveAccount")}{" "}
        <button type="button" className="font-bold text-ink underline underline-offset-2" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(""); }}>
          {mode === "signIn" ? t("toSignUp") : t("toSignIn")}
        </button>
      </p>
      <p className="m-0 text-[13px] leading-relaxed text-muted">{t("free")}</p>
      <Link href="/" className="text-center text-sm font-semibold text-muted hover:text-ink">{t("toLanding")}</Link>
      {languagePicker}
    </form>
  );
}
