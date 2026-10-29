"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveCommunitySong } from "@/app/actions";
import { useSettings } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { IconBack, IconCheck, IconSpeaker } from "@/components/ui/icons";
import { button, playHref } from "@/components/ui/links";
import { engine } from "@/lib/audio/engine";
import { MAX_BARS, MAX_REPEAT, MAX_SECTIONS, PATTERNS, SECTION_NAMES, patternFits, songProblems, type CommunitySongInput } from "@/lib/community/song";
import type { ChordId } from "@/lib/music/chords";
import { LESSONS } from "@/lib/music/path";
import { guitarEvents, patternSymbols } from "@/lib/music/patterns";
import type { Section, StrumPattern } from "@/lib/music/songs";

type Step = "kind" | "title" | "rhythm" | "sections" | "review";
const STEPS: Step[] = ["kind", "title", "rhythm", "sections", "review"];
const PATH_CHORDS = LESSONS.flatMap((l) => l.newChords);

const EMPTY: CommunitySongInput = {
  title: "",
  kind: "traditional",
  origin: "",
  beatsPerBar: 4,
  pattern: "down",
  sections: [{ name: "verse", bars: ["G", "G", "D", "D"], repeat: 2 }],
};

/**
 * Publishing a song, one question per screen: what it is (and what may be
 * published), its name and source, the rhythm, the bars, then a review. It is
 * saved as a draft; playing it in time and passing is what publishes it.
 */
export function SongEditor({ id, initial }: { id?: string; initial?: CommunitySongInput }) {
  const t = useTranslations("community.editor");
  const tc = useTranslations("common");
  const tp = useTranslations("play");
  const router = useRouter();
  const { settings } = useSettings();
  const [song, setSong] = useState<CommunitySongInput>(initial ?? EMPTY);
  const [at, setAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const step = STEPS[at]!;
  const set = (patch: Partial<CommunitySongInput>) => setSong((s) => ({ ...s, ...patch }));
  const problems = songProblems(song);

  const canGoOn: Record<Step, boolean> = {
    kind: true,
    title: song.title.trim().length >= 2 && (song.kind === "traditional" || song.origin.trim().length >= 2),
    rhythm: patternFits(song.pattern, song.beatsPerBar),
    sections: song.sections.every((s) => s.bars.length >= 2),
    review: problems.length === 0,
  };

  const listen = () => {
    const { ctx, synth } = engine.audio();
    synth.setVolume(settings.volume);
    const beat = 60 / 100;
    let at = ctx.currentTime + 0.1;
    // The first section once, as the player will hear it in the app.
    for (const chord of song.sections[0]!.bars) {
      for (let b = 0; b < song.beatsPerBar; b++) {
        for (const e of guitarEvents(song.pattern, b, song.beatsPerBar)) {
          const when = at + b * beat + e.at * beat;
          if (e.kind === "strum") synth.strum(chord, when, e.direction, e.strings);
          else synth.bassString(chord, when, e.alternate);
        }
      }
      at += song.beatsPerBar * beat;
    }
  };

  const save = async () => {
    setSaving(true);
    setFailed(false);
    const r = await saveCommunitySong(song, id ?? null);
    if (!r.ok) {
      setFailed(true);
      setSaving(false);
      return;
    }
    router.push(playHref(r.id, "listen"));
  };

  const updateSection = (i: number, patch: Partial<CommunitySongInput["sections"][number]>) => set({ sections: song.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-brass-ink">{t("progress", { n: at + 1, total: STEPS.length })}</span>
        <h1 className="display m-0 text-[34px] font-extrabold leading-tight">{t(`${step}.title`)}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t(`${step}.help`)}</p>
      </header>

      {step === "kind" && (
        <div role="radiogroup" className="flex flex-col gap-3">
          {(["traditional", "chordsOnly"] as const).map((k) => (
            <label key={k} className={`flex cursor-pointer items-start gap-4 rounded-[var(--radius-control)] border-2 bg-surface px-5 py-4 ${song.kind === k ? "border-brass" : "border-line"}`}>
              <input type="radio" name="kind" className="sr-only" checked={song.kind === k} onChange={() => set({ kind: k })} />
              <span aria-hidden className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${song.kind === k ? "bg-brass text-on-brass" : "border-2 border-line-strong"}`}>{song.kind === k && <IconCheck size={14} />}</span>
              <span className="flex flex-col gap-1">
                <span className="text-[17px] font-extrabold">{t(`kind.${k}.title`)}</span>
                <span className="text-sm leading-relaxed text-ink-2">{t(`kind.${k}.body`)}</span>
              </span>
            </label>
          ))}
          <p className="m-0 rounded-[var(--radius-control)] bg-warn-soft px-4 py-3 text-[15px]">{t("kind.never")}</p>
        </div>
      )}

      {step === "title" && (
        <div className="flex max-w-[480px] flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {t("title.name")}
            <input value={song.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} className="h-12 rounded-[var(--radius-field)] border border-line-strong bg-surface px-3.5 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {song.kind === "chordsOnly" ? t("title.author") : t("title.source")}
            <input value={song.origin} maxLength={80} onChange={(e) => set({ origin: e.target.value })} placeholder={song.kind === "chordsOnly" ? t("title.authorHint") : t("title.sourceHint")} className="h-12 rounded-[var(--radius-field)] border border-line-strong bg-surface px-3.5 text-base font-normal" />
          </label>
          {problems.includes("lyrics") && <p role="alert" className="m-0 text-sm font-semibold text-bad-ink">{t("problems.lyrics")}</p>}
        </div>
      )}

      {step === "rhythm" && (
        <div className="flex flex-col gap-5">
          <div role="radiogroup" aria-label={t("rhythm.beats")} className="flex gap-3">
            {([4, 3] as const).map((b) => (
              <label key={b} className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border-2 bg-surface px-5 py-3 ${song.beatsPerBar === b ? "border-brass" : "border-line"}`}>
                <input type="radio" name="beats" className="sr-only" checked={song.beatsPerBar === b} onChange={() => set({ beatsPerBar: b, pattern: b === 3 ? "waltz" : song.pattern === "waltz" ? "down" : song.pattern })} />
                <span className="font-mono text-2xl font-semibold">{b}</span>
                <span className="text-sm">{t(`rhythm.in${b}`)}</span>
              </label>
            ))}
          </div>
          <div role="radiogroup" aria-label={t("rhythm.pattern")} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PATTERNS.filter((p) => patternFits(p, song.beatsPerBar)).map((p: StrumPattern) => (
              <label key={p} className={`flex cursor-pointer flex-col gap-1 rounded-[var(--radius-control)] border-2 bg-surface px-5 py-4 ${song.pattern === p ? "border-brass" : "border-line"}`}>
                <input type="radio" name="pattern" className="sr-only" checked={song.pattern === p} onChange={() => set({ pattern: p })} />
                <span className="font-mono text-lg">{patternSymbols(p, song.beatsPerBar).join(" ")}</span>
                <span className="text-sm text-ink-2">{tp(`patternHelp.${p}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === "sections" && (
        <div className="flex flex-col gap-5">
          {song.sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <select value={section.name} onChange={(e) => updateSection(i, { name: e.target.value as Section["name"] })} className="h-10 rounded-[var(--radius-field)] border border-line-strong bg-surface px-2 font-bold">
                  {SECTION_NAMES.map((n) => <option key={n} value={n}>{tp(`section.${n}`)}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  {t("sections.repeat")}
                  <select value={section.repeat} onChange={(e) => updateSection(i, { repeat: Number(e.target.value) })} className="h-10 rounded-[var(--radius-field)] border border-line-strong bg-surface px-2">
                    {Array.from({ length: MAX_REPEAT }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                  </select>
                </label>
                {song.sections.length > 1 && (
                  <button type="button" onClick={() => set({ sections: song.sections.filter((_, j) => j !== i) })} className="ml-auto text-sm font-semibold text-muted underline underline-offset-2">{t("sections.remove")}</button>
                )}
              </div>
              <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t("sections.bars")}>
                {section.bars.map((chord, b) => (
                  <li key={b} className="flex items-center gap-1">
                    <select
                      value={chord}
                      aria-label={t("sections.bar", { n: b + 1 })}
                      onChange={(e) => updateSection(i, { bars: section.bars.map((c, k) => (k === b ? (e.target.value as ChordId) : c)) })}
                      className="h-11 rounded-[var(--radius-field)] border border-line-strong px-2 text-base font-extrabold text-on-primary"
                      style={{ background: `var(--color-chord-${chord})` }}
                    >
                      {PATH_CHORDS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </li>
                ))}
                {section.bars.length < MAX_BARS && (
                  <li>
                    <button type="button" onClick={() => updateSection(i, { bars: [...section.bars, section.bars.at(-1) ?? "G"] })} className={`${button.outline} h-11 px-3 text-sm`}>+ {t("sections.addBar")}</button>
                  </li>
                )}
                {section.bars.length > 2 && (
                  <li>
                    <button type="button" onClick={() => updateSection(i, { bars: section.bars.slice(0, -1) })} className="h-11 px-2 text-sm font-semibold text-muted underline underline-offset-2">{t("sections.removeBar")}</button>
                  </li>
                )}
              </ol>
            </section>
          ))}
          {song.sections.length < MAX_SECTIONS && (
            <button type="button" onClick={() => set({ sections: [...song.sections, { name: "chorus", bars: ["G", "G", "C", "D"], repeat: 2 }] })} className={`${button.outline} h-11 self-start`}>+ {t("sections.add")}</button>
          )}
          <button type="button" onClick={listen} className={`${button.outline} h-11 self-start`}><IconSpeaker />{t("sections.listen")}</button>
        </div>
      )}

      {step === "review" && (
        <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="m-0 text-2xl font-extrabold">{song.title}</h2>
          <p className="m-0 text-[15px] text-ink-2">{song.origin} · {song.kind === "chordsOnly" ? tp("origin.chordsOnly") : tp("origin.traditional")} · <span className="font-mono">{patternSymbols(song.pattern, song.beatsPerBar).join(" ")}</span></p>
          {song.sections.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-sm font-bold">{tp(`section.${s.name}`)} ×{s.repeat}</span>
              {s.bars.map((c, b) => <ChordChip key={b} chord={c} />)}
            </div>
          ))}
          <p className="m-0 text-sm text-muted">{t("review.chords", { chords: [...new Set(song.sections.flatMap((s) => s.bars))].map((c) => `${c} (${tc(`chord.${c}`)})`).join(", ") })}</p>
          {problems.map((p) => <p key={p} role="alert" className="m-0 text-sm font-semibold text-bad-ink">{t(`problems.${p}`)}</p>)}
          <p className="m-0 rounded-[var(--radius-control)] bg-subtle px-4 py-3 text-[15px]">{t("review.publishRule")}</p>
          <p className="m-0 text-sm text-muted">{t("review.agree")} <Link href="/terms" target="_blank" className="font-bold underline underline-offset-2">{t("review.terms")}</Link></p>
          {failed && <p role="alert" className="m-0 text-sm font-semibold text-bad-ink">{t("review.failed")}</p>}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {at > 0 ? (
          <button type="button" onClick={() => setAt((i) => i - 1)} className={`${button.outline} h-12`}><IconBack />{t("back")}</button>
        ) : (
          <Link href="/songs" className={`${button.outline} h-12`}><IconBack />{t("cancel")}</Link>
        )}
        {step === "review" ? (
          <button type="button" onClick={() => void save()} disabled={!canGoOn.review || saving} className={`${button.brass} ml-auto h-[52px] text-[17px] disabled:opacity-50`}>
            {saving ? t("review.saving") : t("review.save")}
          </button>
        ) : (
          <button type="button" onClick={() => setAt((i) => i + 1)} disabled={!canGoOn[step]} className={`${button.primary} ml-auto h-12 disabled:opacity-40`}>{t("next")}</button>
        )}
      </div>
    </>
  );
}
