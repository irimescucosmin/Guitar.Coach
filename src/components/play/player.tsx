"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useProgress, useSettings } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { learnHref, playHref } from "@/components/ui/links";
import { PASS_SCORE, type PracticeMode } from "@/lib/music/path";
import { patternSymbols } from "@/lib/music/patterns";
import { chordsOf, findSong } from "@/lib/music/songs";
import { engine } from "@/lib/audio/engine";
import { drawHighway } from "./highway";
import { PracticeSession, type Feedback, type View } from "./session";

const MODES: PracticeMode[] = ["listen", "step", "timed"];

export function Player({ songId, initialMode }: { songId: string; initialMode: PracticeMode }) {
  const song = findSong(songId)!;
  const t = useTranslations("play");
  const tc = useTranslations("common");
  const router = useRouter();
  const { progress, record } = useProgress();
  const { settings, update } = useSettings();
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  const [guide, setGuide] = useState(false);
  const [band, setBand] = useState(true);
  const [click, setClick] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);

  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const session = useMemo(
    () => new PracticeSession(song, mode, { bpm: 100, guide: false, band: true, click: true, volume: 0.8 }, (run) => recordRef.current(run)),
    [song, mode],
  );
  useEffect(() => () => session.dispose(), [session]);
  useEffect(() => {
    session.options = { bpm: settings.bpm, guide, band, click, volume: settings.volume };
    engine.synth?.setVolume(settings.volume);
  }, [session, settings.bpm, settings.volume, guide, band, click]);

  const view = useSyncExternalStore(
    (cb) => session.subscribe(cb),
    session.getView,
    session.getView,
  );
  const playing = view.phase === "playing";

  // The lane redraws every frame; React is not involved.
  useEffect(() => {
    let id = 0;
    const draw = () => {
      if (canvas.current) drawHighway(canvas.current, session.layout());
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [session]);

  // Space bar moves on in step mode, for hands that are busy with a guitar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || mode !== "step" || !playing) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      session.skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, playing, session]);

  const chooseMode = (next: PracticeMode) => {
    setMode(next);
    router.replace(playHref(song.id, next), { scroll: false });
  };

  const chordLabel = (c: string) => tc("diagram", { chord: c, name: tc(`chord.${c as "Em"}`) });
  const symbols = patternSymbols(song.pattern, song.beatsPerBar);
  const best = progress.best[song.id];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Link href="/play" className="text-sm text-muted hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{song.title}</h1>
            <p className="text-sm text-muted">{t(`origin.${song.origin}`)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t("chords")}>
            {chordsOf(song).map((c) =>
              progress.learned[c] ? (
                <ChordChip key={c} chord={c} />
              ) : (
                <Link key={c} href={learnHref(c)} title={t("notLearned")} className="flex items-center gap-1">
                  <ChordChip chord={c} dim />
                  <span className="text-xs text-muted underline">{t("notLearned")}</span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex gap-1 rounded-[var(--radius-field)] bg-sunken p-1" role="tablist">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={playing}
              onClick={() => chooseMode(m)}
              className={`flex-1 rounded-[calc(var(--radius-field)-2px)] px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed ${
                mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{t(`modeHelp.${mode}`)}</p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? session.stop() : void session.start())}
          className={`rounded-[var(--radius-field)] px-5 py-2.5 font-semibold ${
            playing ? "border border-line bg-surface" : "bg-accent text-on-accent"
          }`}
        >
          {playing ? t("stop") : view.phase === "done" ? t("result.again") : t("start")}
        </button>
        {mode === "step" && playing && (
          <button type="button" onClick={() => session.skip()} className="rounded-[var(--radius-field)] border border-line bg-surface px-4 py-2.5">
            {t("skip")} <span className="text-xs text-muted">{t("skipKey")}</span>
          </button>
        )}
      </section>
      <section className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 sm:flex-row sm:items-center sm:gap-5 sm:p-4">
          <ChordDiagram chord={view.current} className="h-auto w-[120px] sm:w-[170px]" leftHanded={settings.leftHanded} flagged={view.flagged} title={chordLabel(view.current)} />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              {view.countIn !== null ? t("getReady") : t("now")}
            </span>
            <span className="font-mono text-5xl font-bold leading-none sm:text-6xl" style={{ color: `var(--color-chord-${view.current})` }}>
              {view.current}
            </span>
            <span className="text-sm text-muted">{tc(`chord.${view.current}`)}</span>
            {view.section && (
              <span className="text-xs text-muted">
                {view.section.pass ? t("pass", { name: t(`section.${view.section.name}`), pass: view.section.pass }) : t(`section.${view.section.name}`)}
              </span>
            )}
            {song.beatsPerBar && mode !== "step" && (
              <div className="mt-1 flex gap-1.5" aria-hidden>
                {symbols.map((s, i) => (
                  <span key={i} className={`flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-field)] border font-mono text-sm ${
                    view.beat === i ? "border-accent bg-accent text-on-accent" : "border-line text-muted"
                  }`}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <NextCard view={view} mode={mode} leftHanded={settings.leftHanded} chordLabel={chordLabel} />
      </section>

      <FeedbackLine feedback={view.feedback} countIn={view.countIn} />

      <canvas ref={canvas} className="h-24 w-full rounded-[var(--radius-card)] border border-line bg-sunken sm:h-28" aria-hidden />

      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
        {mode !== "step" && (
          <div className="flex items-center gap-2">
            <label htmlFor="bpm" className="text-sm text-muted">
              {t("bpm")}
            </label>
            <button type="button" disabled={playing} aria-label={t("slower")} onClick={() => update({ bpm: Math.max(60, settings.bpm - 5) })}
              className="size-8 rounded-[var(--radius-field)] border border-line bg-surface disabled:opacity-40">−</button>
            <input id="bpm" type="range" min={60} max={140} step={5} value={settings.bpm} disabled={playing}
              onChange={(e) => update({ bpm: Number(e.target.value) })} className="w-28 accent-[var(--color-accent)]" />
            <button type="button" disabled={playing} aria-label={t("faster")} onClick={() => update({ bpm: Math.min(140, settings.bpm + 5) })}
              className="size-8 rounded-[var(--radius-field)] border border-line bg-surface disabled:opacity-40">+</button>
            <span className="w-8 font-mono font-bold tabular-nums">{settings.bpm}</span>
          </div>
        )}
        {mode === "timed" && (
          <>
            <Toggle id="guide" label={t("guide")} checked={guide} onChange={setGuide} />
            <Toggle id="band" label={t("band")} checked={band} onChange={setBand} />
          </>
        )}
        {mode !== "step" && <Toggle id="click" label={t("click")} checked={click} onChange={setClick} />}
        <label className="flex items-center gap-2 text-sm text-muted">
          {t("volume")}
          <input id="volume" type="range" min={0} max={1} step={0.05} value={settings.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })} className="w-24 accent-[var(--color-accent)]" />
        </label>
      </section>
      {mode === "timed" && guide && <p className="text-sm font-medium text-warn">{t("headphones")}</p>}


      <section className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Stat label={t("statRight")} value={`${view.right}/${view.total}`} />
        {best?.timed !== undefined && <Stat label={`${t("statBest")} · ${t("mode.timed")}`} value={`${Math.round(best.timed * 100)}%`} />}
        {best?.step !== undefined && <Stat label={`${t("statBest")} · ${t("mode.step")}`} value={`${(best.step / 1000).toFixed(1)} s`} />}
        <span className="text-muted">
          {t("pattern")}: <span className="font-mono">{symbols.join("  ")}</span> · {t(`patternHelp.${song.pattern}`)}
        </span>
      </section>

      {view.phase === "done" && view.result && (
        <ResultPanel session={session} view={view} bpm={settings.bpm} onMode={chooseMode} />
      )}
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="font-mono text-xl font-bold tabular-nums">{value}</span>
    </span>
  );
}

function NextCard({ view, mode, leftHanded, chordLabel }: {
  view: View; mode: PracticeMode; leftHanded: boolean; chordLabel: (c: string) => string;
}) {
  const t = useTranslations("play");
  const soon = view.phase === "playing" && view.beatsToNext !== null && view.beatsToNext <= 1;
  let when = "";
  if (view.phase === "playing") {
    if (view.countIn !== null) when = t("startsIn", { beats: view.countIn });
    else if (mode !== "step" && view.beatsToNext !== null) when = view.beatsToNext <= 1 ? t("changeNow") : t("changeIn", { beats: view.beatsToNext });
    else if (mode !== "step" && view.next) when = t("later");
  }
  return (
    <div className={`flex w-[118px] flex-col items-start gap-2 rounded-[var(--radius-card)] border bg-surface p-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${soon ? "soon border-accent" : "border-line"}`}>
      {view.next ? (
        <>
          <ChordDiagram chord={view.next} className="h-auto w-[90px] sm:w-[100px]" leftHanded={leftHanded} title={chordLabel(view.next)} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("upNext")}</span>
            <span className="font-mono text-3xl font-bold" style={{ color: `var(--color-chord-${view.next})` }}>{view.next}</span>
            <span className={`text-sm font-semibold ${soon ? "text-accent" : "text-muted"}`}>{when}</span>
          </div>
        </>
      ) : (
        <span className="self-center px-2 py-6 font-semibold text-muted sm:px-6">{t("end")}</span>
      )}
    </div>
  );
}

export function FeedbackLine({ feedback, countIn }: { feedback: Feedback | null; countIn: number | null }) {
  const t = useTranslations("play");
  const tc = useTranslations("common");
  if (countIn !== null) return <p className="min-h-7 text-lg font-semibold">{t("startsIn", { beats: countIn })}</p>;
  if (!feedback) return <p className="min-h-7" />;
  const string = (n: number) => tc(`string.s${n as 0}`);
  let text = "";
  let tone = "text-ink";
  switch (feedback.kind) {
    case "play": text = t("feedback.play", { chord: feedback.chord }); break;
    case "right": text = `✓ ${t("feedback.right", { chord: feedback.chord })}`; tone = "text-good"; break;
    case "heard": text = t("feedback.heard", { chord: feedback.chord, heard: feedback.heard }); tone = "text-bad"; break;
    case "pressFinger":
      text = t("feedback.pressFinger", {
        note: tc(`pitch.p${feedback.note as 0}`), finger: feedback.finger, fingerName: tc(`finger.f${feedback.finger as 1}`),
        string: string(feedback.string), fret: feedback.fret,
      });
      tone = "text-warn";
      break;
    case "freeOpenString": text = t("feedback.freeOpenString", { string: string(feedback.string) }); tone = "text-warn"; break;
    case "micOff": text = t("feedback.micOff"); tone = "text-muted"; break;
    case "slowDown": text = t("feedback.slowDown"); tone = "text-muted"; break;
  }
  return <p className={`min-h-7 max-w-prose text-lg font-semibold ${tone}`} aria-live="polite">{text}</p>;
}

function ResultPanel({ session, view, bpm, onMode }: { session: PracticeSession; view: View; bpm: number; onMode: (m: PracticeMode) => void }) {
  const t = useTranslations("play");
  const result = view.result!;
  const report = session.report();
  const lines: string[] = [];
  let next: PracticeMode | null = null;

  if (result.mode === "listen") {
    lines.push(t("result.listen"));
    next = "step";
  } else if (result.mode === "step") {
    if (result.averageMs === null) lines.push(t("feedback.micOff"));
    else {
      const bar = ((session.song.beatsPerBar * 60) / bpm).toFixed(1);
      lines.push(t("result.step", { seconds: (result.averageMs / 1000).toFixed(1) }));
      lines.push(result.ready ? t("result.stepReady", { bpm, bar }) : t("result.stepNotReady", { bpm, bar }));
      if (result.ready) next = "timed";
    }
  } else if (result.share === null) {
    lines.push(t("result.timedNoMic"));
  } else {
    lines.push(t("result.timed", { percent: Math.round(result.share * 100) }));
    lines.push(
      result.passed
        ? t("result.timedPass")
        : t("result.timedRetry", {
            score: Math.round(PASS_SCORE * 100),
            list: result.missedChords.map((m) => `${m.chord} (${m.bars})`).join(", "),
          }),
    );
    if (!result.passed) next = "step";
  }
  const isRecord = result.mode !== "listen" && result.isRecord;

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-accent bg-surface p-5" aria-live="polite">
      {isRecord && <span className="self-start rounded-[var(--radius-field)] bg-good px-2 py-0.5 text-sm font-bold text-on-accent">{t("result.record")}</span>}
      {lines.map((l) => (
        <p key={l} className="max-w-prose text-lg">{l}</p>
      ))}
      {report.length > 0 && result.mode !== "listen" && (
        <div className="flex flex-wrap gap-1" aria-hidden>
          {report.map((r, i) => (
            <span key={i} className={`flex h-7 min-w-9 items-center justify-center rounded-[var(--radius-field)] border-2 px-1 font-mono text-xs font-bold ${
              r.status === "ok" ? "border-good" : r.status === "miss" ? "border-bad" : "border-line"
            }`} style={{ color: `var(--color-chord-${r.chord})` }}>
              {r.chord}
            </span>
          ))}
        </div>
      )}
      {next && (
        <button type="button" onClick={() => onMode(next)} className="self-start rounded-[var(--radius-field)] bg-accent px-4 py-2 font-semibold text-on-accent">
          {next === "timed" ? t("result.tryTimed") : t("result.tryStep")}
        </button>
      )}
    </section>
  );
}
