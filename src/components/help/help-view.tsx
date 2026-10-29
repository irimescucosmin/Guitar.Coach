"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { IconAlert, IconSearch } from "@/components/ui/icons";
import { HELP_GROUPS, PROBLEMS, type Problem } from "@/lib/help/problems";

/** Lower case, no accents: "perché" finds "perche". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Common problems, grouped by what the player hears or feels, each with why and what to do. */
export function HelpView({ coach = false }: { coach?: boolean }) {
  const t = useTranslations("help");
  const [query, setQuery] = useState("");
  // A link like /help#p-buzz opens that problem.
  const [opened, setOpened] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setOpened(window.location.hash.replace(/^#p-/, "") || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (opened) document.getElementById(`p-${opened}`)?.scrollIntoView({ block: "start" });
  }, [opened]);

  const text = (p: Problem) =>
    fold([t(`p.${p.id}.title` as "p.buzz.title"), t(`p.${p.id}.why` as "p.buzz.why"), ...steps(p).map((k) => t(k))].join(" "));
  const steps = (p: Problem) => Array.from({ length: p.fixes }, (_, i) => `p.${p.id}.fix${i + 1}` as "p.buzz.fix1");
  const words = fold(query).split(/\s+/).filter(Boolean);
  const visible = useMemo(
    () => PROBLEMS.filter((p) => words.every((w) => text(p).includes(w))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query],
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[64ch] flex-col gap-1.5">
          <span className="eyebrow text-muted">{t("eyebrow")}</span>
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
          <p className="m-0 text-base leading-relaxed text-ink-2">{t("intro")}</p>
        </div>
        <label htmlFor="help-search" className="flex h-12 w-80 max-w-full items-center gap-2.5 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-muted">
          <IconSearch />
          <span className="sr-only">{t("search")}</span>
          <input id="help-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none" />
        </label>
      </header>

      {coach && (
        <Link href="/coach" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 hover:border-ink">
          <span className="font-extrabold">{t("coach.title")}</span>
          <span className="text-[15px] text-ink-2">{t("coach.body")}</span>
        </Link>
      )}

      {!query && (
        <nav aria-label={t("eyebrow")} className="flex flex-wrap gap-2">
          {HELP_GROUPS.map((g) => (
            <a key={g} href={`#g-${g}`} className="flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold hover:border-ink">
              {t(`groups.${g}`)}
            </a>
          ))}
        </nav>
      )}

      {visible.length === 0 && <p className="m-0 text-muted">{t("empty")}</p>}

      {HELP_GROUPS.map((g) => {
        const list = visible.filter((p) => p.group === g);
        if (list.length === 0) return null;
        return (
          <section key={g} id={`g-${g}`} aria-labelledby={`h-${g}`} className="flex scroll-mt-6 flex-col gap-3">
            <h2 id={`h-${g}`} className="m-0 text-2xl font-extrabold">{t(`groups.${g}`)}</h2>
            {list.map((p) => (
              <details key={p.id} id={`p-${p.id}`} open={opened === p.id || words.length > 0}
                className="group scroll-mt-6 rounded-[var(--radius-card)] border border-line bg-surface open:border-line-strong">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-lg font-extrabold">
                  {t(`p.${p.id}.title` as "p.buzz.title")}
                  <span aria-hidden className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="flex flex-col gap-4 px-6 pb-6">
                  <p className="m-0 text-[15px] leading-relaxed text-ink-2">
                    <strong className="text-ink">{t("why")}.</strong> {t(`p.${p.id}.why` as "p.buzz.why")}
                  </p>
                  <div className="flex flex-col gap-2">
                    <strong className="text-[15px]">{t("fix")}</strong>
                    <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
                      {steps(p).map((k) => <li key={k}>{t(k)}</li>)}
                    </ol>
                  </div>
                  {p.warn && (
                    <p role="note" className="m-0 flex items-start gap-2 rounded-[var(--radius-control)] bg-bad-soft px-4 py-3 text-[15px] font-semibold text-bad-ink">
                      <IconAlert size={20} />
                      {t("warn")}
                    </p>
                  )}
                  {p.app && (
                    <Link href={p.app.href} className="self-start text-sm font-bold text-brass-ink underline underline-offset-2">
                      {t("goTo")}: {t(`app.${p.app.label}`)}
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </section>
        );
      })}
      <p className="m-0 text-sm text-muted">{t("sources")}</p>
    </>
  );
}
