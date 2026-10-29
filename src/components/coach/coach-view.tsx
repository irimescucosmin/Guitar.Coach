"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { askTeacher } from "@/app/actions";
import { button } from "@/components/ui/links";
import { QUESTIONS_PER_DAY, QUESTION_MAX_CHARS } from "@/lib/coach/context";
import { localDate } from "@/lib/music/routine";

type Exchange = { question: string; answer: string; day: string };

/** Ask the teacher: one question, one answer, with the player's own results behind it. */
export function CoachView({ enabled, recent, asked }: { enabled: boolean; recent: Exchange[]; asked: number }) {
  const t = useTranslations("coach");
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>(recent);
  const [left, setLeft] = useState(Math.max(0, QUESTIONS_PER_DAY - asked));
  const [state, setState] = useState<"idle" | "busy" | "limit" | "failed">("idle");
  const latest = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (exchanges.length > recent.length) latest.current?.scrollIntoView({ block: "nearest" });
  }, [exchanges.length, recent.length]);

  const submit = async () => {
    const q = question.trim();
    if (q.length < 2 || state === "busy") return;
    setState("busy");
    const day = localDate(new Date());
    const result = await askTeacher({ day, question: q });
    if (result.ok) {
      setExchanges((xs) => [{ question: q, answer: result.text, day }, ...xs]);
      setLeft(result.left);
      setQuestion("");
      setState("idle");
    } else setState(result.reason === "limit" ? "limit" : "failed");
  };

  const examples = ["buzz", "change", "pain", "next"] as const;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">{t("eyebrow")}</span>
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>

      {!enabled ? (
        <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t("off")}</p>
          <Link href="/help" className={`${button.outline} h-11 self-start`}>{t("toHelp")}</Link>
        </section>
      ) : (
        <section aria-labelledby="ask" className="flex flex-col gap-4 rounded-[var(--radius-card)] border-[3px] border-brass bg-surface p-6">
          <label htmlFor="question" className="flex flex-col gap-2">
            <span id="ask" className="text-lg font-extrabold">{t("ask")}</span>
            <textarea
              id="question"
              value={question}
              maxLength={QUESTION_MAX_CHARS}
              rows={3}
              disabled={state === "busy" || state === "limit"}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
              }}
              placeholder={t("placeholder")}
              className="resize-y rounded-[var(--radius-control)] border border-line-strong bg-page px-4 py-3 text-base text-ink outline-none focus:border-ink"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void submit()} disabled={state === "busy" || state === "limit" || question.trim().length < 2} className={`${button.brass} h-12 disabled:opacity-50`}>
              {state === "busy" ? t("asking") : t("send")}
            </button>
            <span className="text-sm text-muted">{t("left", { count: left })}</span>
            {state === "failed" && <span role="alert" className="text-sm font-semibold text-bad-ink">{t("failed")}</span>}
            {state === "limit" && <span role="alert" className="text-sm font-semibold text-bad-ink">{t("limit")}</span>}
          </div>
          {exchanges.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {examples.map((k) => (
                <button key={k} type="button" onClick={() => setQuestion(t(`examples.${k}`))} className="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold hover:border-ink">
                  {t(`examples.${k}`)}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {exchanges.length > 0 && (
        <section aria-label={t("history")} className="flex flex-col gap-4">
          {exchanges.map((x, i) => (
            <article key={`${x.day}-${i}`} ref={i === 0 ? latest : undefined} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <p className="m-0 text-base font-extrabold">{x.question}</p>
              <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-ink-2">
                {x.answer.split(/\n{2,}/).map((para, j) => <p key={j} className="m-0 whitespace-pre-line">{para}</p>)}
              </div>
            </article>
          ))}
        </section>
      )}
      <p className="m-0 text-sm text-muted">{t("note")}</p>
    </>
  );
}
