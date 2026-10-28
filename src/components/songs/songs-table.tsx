"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useProgress } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { IconSearch } from "@/components/ui/icons";
import { learnHref, playHref } from "@/components/ui/links";
import { nextModeFor } from "@/lib/music/path";
import { patternSymbols } from "@/lib/music/patterns";
import { SONGS, chordsOf, type Song } from "@/lib/music/songs";

type Filter = "ready" | "all" | "exercise" | "traditional" | "progression" | "waltz";
const FILTERS: Filter[] = ["ready", "all", "exercise", "traditional", "progression", "waltz"];

export function SongsTable() {
  const t = useTranslations("songs");
  const tp = useTranslations("play");
  const { progress } = useProgress();
  const [filter, setFilter] = useState<Filter>("ready");
  const [query, setQuery] = useState("");

  const ready = (s: Song) => chordsOf(s).every((c) => progress.learned[c]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFilter = (s: Song) =>
      filter === "all" ? true
        : filter === "ready" ? ready(s)
        : filter === "waltz" ? s.beatsPerBar === 3
        : s.group === filter;
    const byQuery = (s: Song) => !q || s.title.toLowerCase().includes(q) || chordsOf(s).some((c) => c.toLowerCase() === q);
    return SONGS.filter((s) => byFilter(s) && byQuery(s));
    // `ready` reads progress, which is the dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, progress]);
  const count = (f: Filter) => (f === "ready" ? SONGS.filter(ready).length : f === "all" ? SONGS.length : null);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
          <p className="m-0 text-base text-ink-2">{t("intro")}</p>
        </div>
        <label htmlFor="search" className="flex h-12 w-80 max-w-full items-center gap-2.5 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-muted">
          <IconSearch />
          <span className="sr-only">{t("search")}</span>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
          />
        </label>
      </header>

      <div role="group" aria-label={t("filter")} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`h-10 rounded-full border px-4 text-sm ${
              filter === f ? "border-primary bg-primary font-bold text-on-primary" : "border-line-strong bg-surface font-semibold text-ink"
            }`}
          >
            {t(`filters.${f}`)}
            {count(f) !== null && ` · ${count(f)}`}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-5 py-3.5 font-bold">{t("cols.song")}</th>
                <th scope="col" className="px-3 py-3.5 font-bold">{t("cols.chords")}</th>
                <th scope="col" className="px-3 py-3.5 font-bold">{t("cols.rhythm")}</th>
                <th scope="col" className="px-3 py-3.5 font-bold">{t("cols.best")}</th>
                <th scope="col" className="px-5 py-3.5 text-right font-bold">{t("cols.next")}</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((song) => {
                const next = nextModeFor(song, progress);
                const best = progress.best[song.id];
                const locked = next.kind === "learnFirst";
                return (
                  <tr key={song.id} className={`border-t border-line ${locked ? "bg-subtle/60" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className={`block font-extrabold ${locked ? "text-muted" : ""}`}>{song.title}</span>
                      <span className="text-[13px] text-muted">{tp(`origin.${song.origin}`)}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex flex-wrap gap-1">
                        {chordsOf(song).map((c) => <ChordChip key={c} chord={c} pending={!progress.learned[c]} />)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-ink-2">{patternSymbols(song.pattern, song.beatsPerBar).join(" ")}</td>
                    <td className="px-3 py-3.5">
                      {best?.timed !== undefined
                        ? <span className="font-mono font-semibold text-good">{Math.round(best.timed * 100)}%</span>
                        : <span className="text-muted">–</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {next.kind === "learnFirst" ? (
                        <Link href={learnHref(next.chord)} className="font-bold text-brass-ink underline underline-offset-2">
                          {t("learnFirst", { chord: next.chord })}
                        </Link>
                      ) : (
                        <Link
                          href={playHref(song.id, next.kind === "step" ? "step" : "timed")}
                          className={`inline-flex h-10 items-center rounded-[var(--radius-field)] px-4 text-sm ${
                            next.kind === "step" ? "bg-brass font-extrabold text-on-brass" : "border border-line-strong font-bold"
                          }`}
                        >
                          {t(`next.${next.kind}`)}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">{filter === "ready" ? t("emptyReady") : t("empty")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="m-0 text-[13px] text-muted">{t("note")}</p>
    </>
  );
}
