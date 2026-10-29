"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { blockPlayer, reportDirectMessage, sendDirectMessage } from "@/app/actions";
import { IconAlert, IconBack } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { MESSAGE_MAX_CHARS } from "@/lib/social/rules";

export interface ThreadMessage {
  id: string;
  senderId: string;
  body: string;
  hidden: boolean;
  at: string;
}

/**
 * A thread between two players. Every refusal the server gives has its line
 * here, in the player's words; reporting and blocking are one click away,
 * because a conversation that goes wrong must be easy to end.
 */
export function Thread({ me, other, messages, blockedByMe, blocked }: { me: string; other: { id: string; name: string }; messages: ThreadMessage[]; blockedByMe: boolean; blocked: boolean }) {
  const t = useTranslations("social.messages");
  const locale = useLocale();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  // What was just sent shows at once; the refresh brings the same message back from the server.
  const [sent, setSent] = useState<ThreadMessage[]>([]);
  const shown = [...messages, ...sent.filter((s) => !messages.some((m) => m.id === s.id))];
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const send = async () => {
    setSending(true);
    setRefused(null);
    const r = await sendDirectMessage({ to: other.id, body });
    setSending(false);
    if (!r.ok) return setRefused(t(`refused.${r.reason}`));
    setSent((list) => [...list, { id: r.id, senderId: me, body, hidden: false, at: new Date().toISOString() }]);
    setBody("");
    router.refresh();
  };
  const report = async (id: string) => {
    const r = await reportDirectMessage({ messageId: id, reason: "offensive" });
    if (r) {
      setReported((s) => new Set(s).add(id));
      router.refresh();
    }
  };
  const block = async () => {
    if (await blockPlayer({ userId: other.id, blocked: !blockedByMe })) router.refresh();
  };

  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <Link href="/messages" className={`${button.outline} h-10`}><IconBack />{t("back")}</Link>
        <h1 className="display m-0 text-[28px] font-extrabold">{other.name}</h1>
        <button type="button" onClick={() => void block()} className="ml-auto text-sm font-semibold text-muted underline underline-offset-2 hover:text-ink">
          {blockedByMe ? t("unblock") : t("block")}
        </button>
      </header>

      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t("thread")}>
        {shown.length === 0 && <li className="text-sm text-muted">{t("start", { name: other.name })}</li>}
        {shown.map((m) => {
          const mine = m.senderId === me;
          return (
            <li key={m.id} className={`flex max-w-[75%] flex-col gap-1 rounded-[var(--radius-control)] px-4 py-3 ${mine ? "self-end bg-navy text-on-navy" : "self-start border border-line bg-surface"}`}>
              <span className={`text-[15px] ${m.hidden ? "italic opacity-70" : ""}`}>{m.hidden ? t("hidden") : m.body}</span>
              <span className={`flex items-center gap-3 text-[11px] ${mine ? "text-on-navy-muted" : "text-muted"}`}>
                {when(m.at)}
                {!mine && !m.hidden && !reported.has(m.id) && (
                  <button type="button" onClick={() => void report(m.id)} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"><IconAlert size={12} />{t("report")}</button>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {blocked ? (
        <p className="m-0 rounded-[var(--radius-control)] bg-subtle px-4 py-3 text-sm">{blockedByMe ? t("youBlocked") : t("refused.blocked")}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="body" className="sr-only">{t("write")}</label>
          <textarea
            id="body"
            value={body}
            maxLength={MESSAGE_MAX_CHARS}
            rows={3}
            placeholder={t("write")}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-4 py-3 text-[15px]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={sending || body.trim().length === 0} className={`${button.brass} h-11 disabled:opacity-50`}>{t("send")}</button>
            <span className="text-[13px] text-muted">{t("noContacts")}</span>
            {refused && <span role="alert" className="text-sm font-semibold text-bad-ink">{refused}</span>}
          </div>
        </form>
      )}
    </>
  );
}
