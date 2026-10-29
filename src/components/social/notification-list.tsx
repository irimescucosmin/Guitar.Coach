"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { readNotifications } from "@/app/actions";
import { playHref } from "@/components/ui/links";
import type { NotificationData, NotificationKind } from "@/lib/social/rules";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  data: NotificationData;
  read: boolean;
  at: string;
}

/** The bell's lines, newest first. Seeing the list is reading it: the bell goes quiet once the page is open. */
export function NotificationList({ list }: { list: NotificationItem[] }) {
  const t = useTranslations("social.notifications");
  const locale = useLocale();
  useEffect(() => {
    if (list.some((n) => !n.read)) void readNotifications();
  }, [list]);
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const hrefOf = (n: NotificationItem) => (n.kind === "message" && n.data.conversationId ? `/messages/${n.data.conversationId}` : n.data.songId ? playHref(n.data.songId, "listen") : "/songs");
  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>
      {list.length === 0 ? (
        <p className="m-0 rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-[15px] text-ink-2">{t("empty")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((n) => (
            <li key={n.id}>
              <Link href={hrefOf(n)} className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-control)] border px-5 py-3.5 ${n.read ? "border-line bg-surface" : "border-brass bg-warn-soft"}`}>
                <span className="flex-1 text-[15px]">{t(`kind.${n.kind}`, { title: n.data.title ?? "", by: n.data.by ?? "" })}</span>
                <span className="text-[13px] text-muted">{when(n.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
