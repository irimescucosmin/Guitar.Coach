"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useProgress } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { IconAlert, IconSearch } from "@/components/ui/icons";
import { button, learnHref, playHref } from "@/components/ui/links";
import { reportCommunitySong } from "@/app/actions";
import { authorScore } from "@/lib/community/points";
import { type CommunitySong } from "@/lib/community/song";
import { nextModeFor } from "@/lib/music/path";
import { patternSymbols } from "@/lib/music/patterns";
import { SONGS, chordsOf, type Song } from "@/lib/music/songs";

type Filter = "ready" | "all" | "exercise" | "traditional" | "progression" | "waltz" | "players";
const FILTERS: Filter[] = ["ready", "all", "exercise", "traditional", "progression", "waltz", "players"];

/** A row of the table: the catalogue's, or one a player published, with who. */
type Row = Song & { by?: { author: string; points: number; plays: number; id: string } };

/**
 * Every song there is to play: the catalogue and what players published,
 * in one table, because the whole app is the community. The viewer's own
 * drafts sit above, until they pass them in time.
 */
export function SongsTable({ community, viewerId }: { community: CommunitySong[]; viewerId: string }) {
  const t = useTranslations("songs");
  const tp = useTranslations("play");
  const tc = useTranslations("community");
  const ts = useTranslations("social");
  const { progress } = useProgress();
  // A beginner with no chords yet has nothing "ready": start from everything, so there is something to listen to.
  const [filter, setFilter] = useState<Filter>(() => (SONGS.some((s) => chordsOf(s).every((c) => progress.learned[c])) ? "ready" : "all"));
  const [query, setQuery] = useState("");
  const mine = community.filter((s) => s.authorId === viewerId && s.status !== "published");
  const rows: Row[] = useMemo(
    () => [
      ...SONGS,
      ...community
        .filter((s) => s.status === "published")
        .map((s) => ({ ...s, by: { author: s.authorName, points: authorScore(community, s.authorId).points, plays: s.plays, id: s.authorId } })),
    ],
    [community],
  );

  const ready = (s: Song) => chordsOf(s).every((c) => progress.learned[c]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFilter = (s: Row) =>
      filter === "all" ? true
        : filter === "ready" ? ready(s)
        : filter === "waltz" ? s.beatsPerBar === 3
        : filter === "players" ? s.by !== undefined
        : s.group === filter;
    const byQuery = (s: Row) => !q || s.title.toLowerCase().includes(q) || chordsOf(s).some((c) => c.toLowerCase() === q) || (s.by?.author.toLowerCase().includes(q) ?? false);
    return rows.filter((s) => byFilter(s) && byQuery(s));
    // `ready` reads progress, which is the dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, progress, rows]);
  const count = (f: Filter) => (f === "ready" ? rows.filter(ready).length : f === "all" ? rows.length : f === "players" ? rows.filter((r) => r.by).length : null);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[64ch] flex-col gap-1.5">
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
          <p className="m-0 text-base text-ink-2">{t("intro")}</p>
        </div>
        <Link href="/songs/new" className={`${button.brass} h-12`}>{tc("new")}</Link>
      </header>

      {mine.length > 0 && (
        <section aria-labelledby="mine" className="flex flex-col gap-3">
          <h2 id="mine" className="m-0 text-xl font-extrabold">{tc("mine")}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {mine.map((song) => (
              <li key={song.id} className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[var(--radius-card)] border bg-surface px-5 py-4 ${song.status === "draft" ? "border-dashed border-line-strong" : "border-line"}`}>
                <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-extrabold">{song.title}</span>
                    {song.status === "draft" && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">{tc("status.draft")}</span>}
                    {song.status === "hidden" && <span className="rounded-full bg-bad-soft px-2.5 py-0.5 text-xs font-bold text-bad-ink">{tc("status.hidden")}</span>}
                  </span>
                  <span className="text-[13px] text-muted">{song.source} · {song.kind === "chordsOnly" ? tp("origin.chordsOnly") : tp("origin.traditional")}</span>
                </div>
                <span className="inline-flex flex-wrap gap-1">{chordsOf(song).map((c) => <ChordChip key={c} chord={c} pending={!progress.learned[c]} />)}</span>
                {song.status === "draft" && (
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Link href={`/songs/${song.id}/edit`} className={`${button.outline} h-10 text-sm`}>{tc("edit")}</Link>
                    <Link href={playHref(song.id, "timed")} className={`${button.brass} h-10 text-sm`}>{tc("passToPublish")}</Link>
                  </div>
                )}
                {song.status === "hidden" && <span className="ml-auto text-sm text-muted">{tc("hiddenNote")}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

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
                return (
                  <tr key={song.id} className="border-t border-line">
                    <td className="px-5 py-3.5">
                      <Link href={playHref(song.id, "listen")} className="block font-extrabold underline-offset-2 hover:underline">{song.title}</Link>
                      <span className="text-[13px] text-muted">
                        {song.by ? `${tc("byLine", { origin: (song as CommunitySong).source, author: song.by.author })} (${tc("points.of", { count: song.by.points })})` : tp(`origin.${song.origin}`)}
                      </span>
                      {song.by && <span className="block text-[13px] text-muted">{tc("plays", { count: song.by.plays })}</span>}
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
                      {song.by && song.by.id !== viewerId && (
                        <>
                          <Link href={`/messages/with/${song.by.id}`} className="mr-3 text-sm font-semibold text-muted underline underline-offset-2 hover:text-ink">{ts("writeTo", { name: song.by.author })}</Link>
                          <Report songId={song.id} />
                        </>
                      )}
                      {next.kind === "learnFirst" ? (
                        <span className="inline-flex flex-wrap items-center justify-end gap-3">
                          <Link href={playHref(song.id, "listen")} className="inline-flex h-10 items-center rounded-[var(--radius-field)] border border-line-strong px-4 text-sm font-bold">{tp("mode.listen")}</Link>
                          <Link href={learnHref(next.chord)} className="font-bold text-brass-ink underline underline-offset-2">
                            {t("learnFirst", { chord: next.chord })}
                          </Link>
                        </span>
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
      <p className="m-0 text-[13px] text-muted">
        {t("note")} {tc("rules")} <Link href="/terms" className="font-bold underline underline-offset-2">{tc("terms")}</Link>
      </p>
    </>
  );
}

/** Reporting a published song, in the row: a reason, one click, a word back. */
function Report({ songId }: { songId: string }) {
  const t = useTranslations("community.report");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const send = async (reason: "lyrics" | "wrong" | "offensive" | "other") => {
    const r = await reportCommunitySong({ songId, reason });
    setDone(r ? (r.hidden ? t("hidden") : t("thanks")) : t("failed"));
    setOpen(false);
  };
  if (done) return <span className="mr-3 text-[13px] text-muted">{done}</span>;
  return (
    <span className="relative mr-3 inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex h-10 items-center gap-1 px-2 text-sm font-semibold text-muted hover:text-ink">
        <IconAlert size={16} />{t("button")}
      </button>
      {open && (
        <span role="group" aria-label={t("button")} className="absolute right-0 top-full z-10 flex w-64 flex-col gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-2 text-left shadow-lg">
          <span className="px-2 py-1 text-xs text-ink-2">{t("why")}</span>
          {(["lyrics", "wrong", "offensive", "other"] as const).map((r) => (
            <button key={r} type="button" onClick={() => void send(r)} className="rounded-[var(--radius-field)] px-2 py-1.5 text-left text-sm font-semibold hover:bg-subtle">{t(r)}</button>
          ))}
        </span>
      )}
    </span>
  );
}
