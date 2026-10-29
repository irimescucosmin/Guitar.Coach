import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MessagingSettings } from "@/components/social/messaging-settings";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { acceptsMessages, listConversations } from "@/lib/social/repository";

export async function generateMetadata() {
  const t = await getTranslations("social.messages");
  return { title: t("title") };
}

/** Who the player is talking to, newest first, and the one choice about it: whether anyone may write. */
export default async function MessagesPage() {
  const me = await requireUser();
  const [t, locale, list, accepts] = await Promise.all([getTranslations("social.messages"), getLocale(), listConversations(db, me.id), acceptsMessages(db, me.id)]);
  const when = (d: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>
      <MessagingSettings accepts={accepts} />
      {list.length === 0 ? (
        <p className="m-0 rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-[15px] text-ink-2">{t("empty")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className={`flex items-center gap-4 rounded-[var(--radius-control)] border px-5 py-3.5 ${c.unread > 0 ? "border-brass bg-warn-soft" : "border-line bg-surface"}`}>
                <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-navy font-bold text-on-navy">{c.other.name.slice(0, 1).toUpperCase()}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-extrabold">{c.other.name}</span>
                  <span className="text-[13px] text-muted">{c.blocked ? t("blocked") : c.unread > 0 ? t("unread", { count: c.unread }) : when(c.lastAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-sm text-muted">
        {t("rulesLead")} <Link href="/terms#messages" className="font-bold underline underline-offset-2">{t("rules")}</Link>
      </p>
    </>
  );
}
