"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { reportCommunitySong } from "@/app/actions";
import { useProgress } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { IconAlert } from "@/components/ui/icons";
import { button, playHref } from "@/components/ui/links";
import type { CommunitySong } from "@/lib/community/song";
import { nextModeFor, type Progress } from "@/lib/music/path";
import { patternSymbols } from "@/lib/music/patterns";
import { chordsOf } from "@/lib/music/songs";
import { authorScore, POINTS_PASS, POINTS_PUBLISHED } from "@/lib/community/points";

/** Songs players published, each playable like the catalogue's; the viewer's own drafts on top. */
export function CommunityList({ songs, viewerId }: { songs: CommunitySong[]; viewerId: string }) {
  const t = useTranslations("community");
  const { progress } = useProgress();
  const mine = songs.filter((s) => s.authorId === viewerId);
  const others = songs.filter((s) => s.authorId !== viewerId && s.status === "published");
  const score = authorScore(songs, viewerId);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[64ch] flex-col gap-1.5">
          <span className="eyebrow text-muted">{t("eyebrow")}</span>
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
          <p className="m-0 text-base leading-relaxed text-ink-2">{t("intro")}</p>
        </div>
        <Link href="/community/new" className={`${button.brass} h-12`}>{t("new")}</Link>
      </header>

      <section aria-label={t("points.label")} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold">{score.points}</span>
          <span className="text-sm font-bold">{t("points.label")}</span>
        </span>
        <span className="text-sm text-ink-2">{t("points.how", { published: POINTS_PUBLISHED, pass: POINTS_PASS })}</span>
        {score.badges.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t("points.badges")}>
            {score.badges.map((b) => (
              <li key={b} className="rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-brass-ink">{t(`points.badge.${b}`)}</li>
            ))}
          </ul>
        )}
      </section>

      {mine.length > 0 && (
        <section aria-labelledby="mine" className="flex flex-col gap-3">
          <h2 id="mine" className="m-0 text-xl font-extrabold">{t("mine")}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {mine.map((song) => <SongRow key={song.id} song={song} own progress={progress} />)}
          </ul>
        </section>
      )}

      <section aria-labelledby="published" className="flex flex-col gap-3">
        <h2 id="published" className="m-0 text-xl font-extrabold">{t("published", { count: others.length })}</h2>
        {others.length === 0 ? (
          <p className="m-0 rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-[15px] text-ink-2">{t("empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {others.map((song) => <SongRow key={song.id} song={song} progress={progress} authorPoints={authorScore(songs, song.authorId).points} />)}
          </ul>
        )}
      </section>
      <p className="m-0 text-sm text-muted">
        {t("rules")} <Link href="/terms" className="font-bold underline underline-offset-2">{t("terms")}</Link>
      </p>
    </>
  );
}

/** One song: its chords, rhythm, who passed it, and what the viewer can do with it. A component of its own, so its state survives the list re-rendering. */
function SongRow({ song, own = false, progress: p, authorPoints }: { song: CommunitySong; own?: boolean; progress: Progress; authorPoints?: number }) {
  const t = useTranslations("community");
  const tp = useTranslations("play");
  const ts = useTranslations("songs");
  const next = nextModeFor(song, p);
  const [reporting, setReporting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const report = async (reason: "lyrics" | "wrong" | "offensive" | "other") => {
    const r = await reportCommunitySong({ songId: song.id, reason });
    setDone(r ? (r.hidden ? t("report.hidden") : t("report.thanks")) : t("report.failed"));
    setReporting(false);
  };
  return (
    <li className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[var(--radius-card)] border bg-surface px-5 py-4 ${song.status === "draft" ? "border-dashed border-line-strong" : "border-line"}`}>
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-extrabold">{song.title}</span>
          {song.status === "draft" && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">{t("status.draft")}</span>}
          {song.status === "hidden" && <span className="rounded-full bg-bad-soft px-2.5 py-0.5 text-xs font-bold text-bad-ink">{t("status.hidden")}</span>}
        </span>
        <span className="text-[13px] text-muted">
          {t("byLine", { origin: song.source, author: song.authorName })}
          {authorPoints !== undefined && ` (${t("points.of", { count: authorPoints })})`} · {song.kind === "chordsOnly" ? tp("origin.chordsOnly") : tp("origin.traditional")}
        </span>
      </div>
      <span className="inline-flex flex-wrap gap-1">
        {chordsOf(song).map((c) => <ChordChip key={c} chord={c} pending={!p.learned[c]} />)}
      </span>
      <span className="font-mono text-sm text-ink-2">{patternSymbols(song.pattern, song.beatsPerBar).join(" ")}</span>
      <span className="text-sm text-muted">{t("plays", { count: song.plays })}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {own && song.status === "draft" && (
          <>
            <Link href={`/community/${song.id}/edit`} className={`${button.outline} h-10 text-sm`}>{t("edit")}</Link>
            <Link href={playHref(song.id, "timed")} className={`${button.brass} h-10 text-sm`}>{t("passToPublish")}</Link>
          </>
        )}
        {!(own && song.status === "draft") && (
          next.kind === "learnFirst" ? (
            <span className="text-sm font-bold text-brass-ink">{ts("learnFirst", { chord: next.chord })}</span>
          ) : (
            <Link href={playHref(song.id, next.kind === "step" ? "step" : "timed")} className={`${button.outline} h-10 text-sm`}>
              {ts(`next.${next.kind}`)}
            </Link>
          )
        )}
        {!own && !done && (
          <button type="button" onClick={() => setReporting((v) => !v)} aria-expanded={reporting} className="flex h-10 items-center gap-1 px-2 text-sm font-semibold text-muted hover:text-ink">
            <IconAlert size={16} />{t("report.button")}
          </button>
        )}
        {done && <span className="text-sm text-muted">{done}</span>}
      </div>
      {reporting && (
        <div role="group" aria-label={t("report.button")} className="flex w-full flex-wrap gap-2 border-t border-line pt-3">
          <span className="w-full text-sm text-ink-2">{t("report.why")}</span>
          {(["lyrics", "wrong", "offensive", "other"] as const).map((r) => (
            <button key={r} type="button" onClick={() => void report(r)} className={`${button.outline} h-9 text-sm`}>{t(`report.${r}`)}</button>
          ))}
        </div>
      )}
    </li>
  );
}
