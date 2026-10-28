"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

export function AccountForm({ userName, locale }: { userName: string | null; locale: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const setLocale = (next: string) => {
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const languagePicker = (
    <label className="flex items-center gap-2 text-sm">
      {t("language")}
      <select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)}
        className="rounded-[var(--radius-field)] border border-line bg-surface px-2 py-1">
        <option value="it">Italiano</option>
        <option value="en">English</option>
      </select>
    </label>
  );

  if (userName) {
    return (
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p>{t("signedInAs", { name: userName })}</p>
        <button type="button" disabled={pending} className="self-start rounded-[var(--radius-field)] border border-line px-4 py-2"
          onClick={() => startTransition(async () => { await authClient.signOut(); router.refresh(); })}>
          {t("signOut")}
        </button>
        {languagePicker}
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
      // The layout reloads with the account; guest progress joins it there.
      router.push("/");
      router.refresh();
    });

  const field = "rounded-[var(--radius-field)] border border-line bg-page px-3 py-2";
  return (
    <div className="flex flex-col gap-4">
      <form action={submit} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="text-lg font-bold">{mode === "signIn" ? t("signIn") : t("signUp")}</h2>
        {mode === "signUp" && (
          <label className="flex flex-col gap-1 text-sm">
            {t("name")}
            <input id="name" name="name" required autoComplete="name" className={field} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          {t("email")}
          <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("password")}
          <input id="password" name="password" type="password" required minLength={10}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"} className={field} />
          {mode === "signUp" && <span className="text-xs text-muted">{t("passwordHelp")}</span>}
        </label>
        {error && <p className="text-sm font-semibold text-bad" role="alert">{error}</p>}
        <button type="submit" disabled={pending} className="rounded-[var(--radius-field)] bg-accent px-4 py-2 font-semibold text-on-accent disabled:opacity-60">
          {pending ? t("working") : mode === "signIn" ? t("signIn") : t("signUp")}
        </button>
        <button type="button" className="text-sm text-accent hover:underline" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(""); }}>
          {mode === "signIn" ? t("toSignUp") : t("toSignIn")}
        </button>
        <p className="text-xs text-muted">{t("guestNote")}</p>
      </form>
      {languagePicker}
    </div>
  );
}
