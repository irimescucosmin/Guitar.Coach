"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useMicState } from "@/components/chrome/mic-button";
import { useProgress, useSettings } from "@/components/providers";
import { IconAlert, IconBack, IconCheck, IconPlay, IconStop } from "@/components/ui/icons";
import { button, learnHref, playHref } from "@/components/ui/links";
import { engine } from "@/lib/audio/engine";
import { Recorder } from "@/lib/audio/recorder";
import { localDate } from "@/lib/music/routine";
import type { ChordId } from "@/lib/music/chords";
import { PASS_SCORE, type PracticeMode } from "@/lib/music/path";
import { patternSymbols } from "@/lib/music/patterns";
import { chordsOf, type Song } from "@/lib/music/songs";
import { drawHighway } from "./highway";
import { PracticeSession, type Feedback, type Status, type View } from "./session";
import { TransitionHint } from "./transition-hint";

const MODES: PracticeMode[] = ["listen", "step", "timed"];

/** Playing a song: no sidebar, the chords as big as the screen allows. */
export function Player({ song, initialMode, origin }: { song: Song; initialMode: PracticeMode; origin?: string }) {
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

  // The server sends a fresh song object with every re-render, a save included:
  // the session must survive that, so it is keyed on the id, not the object.
  const songRef = useRef(song);
  songRef.current = song;
  const session = useMemo(
    () => new PracticeSession(songRef.current, mode, { bpm: 100, guide: false, band: true, click: true, volume: 0.8 }, (run) => recordRef.current(run)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the id stands for the song
    [song.id, mode],
  );
  useEffect(() => () => session.dispose(), [session]);
  useEffect(() => {
    session.options = { bpm: settings.bpm, guide, band, click, volume: settings.volume };
    engine.synth?.setVolume(settings.volume);
  }, [session, settings.bpm, settings.volume, guide, band, click]);

  const view = useSyncExternalStore((cb) => session.subscribe(cb), session.getView, session.getView);
  const playing = view.phase === "playing";

  // The week's recording: the microphone while the run plays, sent with the
  // run's facts when it ends. Off by default, nothing to do with the score.
  const [recordAudio, setRecordAudio] = useState(false);
  const [recording, setRecording] = useState<"idle" | "recording" | "saving" | "saved" | "failed">("idle");
  const recorder = useRef(new Recorder());
  const [canRecord, setCanRecord] = useState(false);
  useEffect(() => setCanRecord(Recorder.supported()), []);
  useEffect(() => {
    const r = recorder.current;
    if (view.phase === "playing" && recordAudio && mode !== "listen" && recording !== "recording") {
      setRecording(engine.stream && r.start(engine.stream) ? "recording" : "failed");
    }
    // The run over: whatever was recorded goes up, also a file the recorder
    // ended on its own at the limit or when the microphone went away.
    if (view.phase !== "playing" && recording === "recording") {
      const result = view.result;
      setRecording("saving");
      void r.stop().then(async (file) => {
        if (!file) return setRecording("failed");
        const form = new FormData();
        form.set("audio", new File([file.blob], "run", { type: file.blob.type }));
        form.set("meta", JSON.stringify({
          songId: song.id,
          mode: mode === "step" ? "step" : "timed",
          share: result?.mode === "timed" ? result.share : null,
          day: localDate(new Date()),
          durationMs: file.durationMs,
        }));
        const ok = await fetch("/api/recordings", { method: "POST", body: form }).then((res) => res.ok).catch(() => false);
        setRecording(ok ? "saved" : "failed");
      });
    }
  }, [view.phase, view.result, recordAudio, recording, mode, song.id]);
  useEffect(() => () => void recorder.current.stop(), []);

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
  // Both key events are taken: a focused button would otherwise turn the same
  // press into a click on Stop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || mode !== "step" || !playing) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      if (e.type === "keydown" && !e.repeat) session.skip();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, [mode, playing, session]);

  const chooseMode = (next: PracticeMode) => {
    setMode(next);
    router.replace(playHref(song.id, next), { scroll: false });
  };

  const diagramTitle = (c: ChordId) => tc("diagram", { chord: c, name: tc(`chord.${c}`) });
  const symbols = patternSymbols(song.pattern, song.beatsPerBar);
  const best = progress.best[song.id];
  const unlearned = chordsOf(song).filter((c) => !progress.learned[c]);

  let where = "";
  if (view.section) {
    const name = t(`section.${view.section.name}`);
    where = t("where", {
      section: view.section.pass ? t("pass", { name, pass: view.section.pass }) : name,
      bar: view.section.position,
      bars: view.section.length,
    });
  } else if (mode === "step" && view.position >= 0) {
    where = t("stepOf", { n: view.position + 1, total: view.total });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-surface px-5 py-4 md:px-8">
        <Link href="/songs" className="flex h-11 items-center gap-2 pr-2 font-semibold text-muted hover:text-ink">
          <IconBack />
          {t("back")}
        </Link>
        <div className="mr-auto flex min-w-0 flex-col">
          <h1 className="display m-0 text-[22px] font-extrabold">{song.title}</h1>
          <span className="text-[13px] text-muted">
            {origin ?? t(`origin.${song.origin}`)} · {t("pattern")} <span className="font-mono">{symbols.join(" ")}</span>
          </span>
        </div>
        <div role="tablist" aria-label={t("modeLabel")} className="flex gap-1 rounded-[12px] bg-sunken p-1">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={playing}
              onClick={() => chooseMode(m)}
              className={`h-10 rounded-[9px] px-4 text-sm disabled:cursor-not-allowed ${
                mode === m ? "bg-surface font-extrabold text-ink shadow-sm" : "font-semibold text-muted hover:text-ink"
              }`}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
        {mode !== "step" && (
          <div className="flex items-center gap-1.5" role="group" aria-label={t("bpm")}>
            <button type="button" disabled={playing} aria-label={t("slower")} onClick={() => update({ bpm: Math.max(60, settings.bpm - 5) })}
              className="size-10 rounded-[var(--radius-field)] border border-line bg-surface text-lg font-bold disabled:text-line-strong">−</button>
            <span className="flex min-w-14 flex-col items-center">
              <span className="font-mono text-xl font-semibold tabular-nums">{settings.bpm}</span>
              <span className="text-[11px] text-muted">bpm</span>
            </span>
            <button type="button" disabled={playing} aria-label={t("faster")} onClick={() => update({ bpm: Math.min(140, settings.bpm + 5) })}
              className="size-10 rounded-[var(--radius-field)] border border-line bg-surface text-lg font-bold disabled:text-line-strong">+</button>
          </div>
        )}
        {mode === "step" && playing && (
          <button type="button" onClick={() => session.skip()} className={`${button.outline} h-12`}>
            {t("skip")} <span className="text-xs font-normal text-muted">{t("skipKey")}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => (playing ? session.stop() : void session.start())}
          className={`${playing ? button.primary : button.brass} h-12 text-base`}
        >
          {playing ? <IconStop /> : <IconPlay />}
          {playing ? t("stop") : view.phase === "done" ? t("result.again") : t("start")}
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-5 pb-8 pt-6 md:px-8">
        {unlearned.length > 0 && mode !== "listen" && (
          <p className="m-0 flex flex-wrap items-center gap-2 rounded-[14px] bg-warn-soft px-4 py-3 text-[15px]">
            {t("notLearnedYet")}
            {unlearned.map((c) => (
              <Link key={c} href={learnHref(c)} className="font-extrabold underline underline-offset-2" style={{ color: `var(--color-chord-${c}-ink)` }}>
                {c}
              </Link>
            ))}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section aria-label={t("now")} className="flex flex-wrap items-center gap-9 rounded-[var(--radius-hero)] border border-line bg-surface px-9 py-7 lg:col-span-2">
            <ChordDiagram chord={view.current} className="h-auto w-[200px] xl:w-[260px]" leftHanded={settings.leftHanded} flagged={view.flagged} title={diagramTitle(view.current)} />
            <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5">
              <span className="eyebrow text-muted">{view.countIn !== null ? t("getReady") : t("now")}</span>
              <span className="text-[120px] font-black leading-[0.85] tracking-[-0.03em] [font-stretch:85%] xl:text-[168px]" style={{ color: `var(--color-chord-${view.current}-ink)` }}>
                {view.current}
              </span>
              <span className="text-xl font-semibold text-ink-2">{tc(`chord.${view.current}`)}</span>
              {mode !== "step" && (
                <div className="mt-3 flex gap-2.5" aria-hidden>
                  {symbols.map((s, i) => (
                    <span
                      key={i}
                      className={`flex size-[60px] flex-col items-center justify-center gap-0.5 rounded-[14px] font-mono text-lg ${
                        view.beat === i ? "bg-brass text-on-brass" : "border border-line text-muted"
                      }`}
                    >
                      {s}
                      <span className="text-[11px]">{i + 1}</span>
                    </span>
                  ))}
                </div>
              )}
              <span className="min-h-5 text-sm text-muted">{where}</span>
            </div>
          </section>
          <NextCard view={view} mode={mode} leftHanded={settings.leftHanded} diagramTitle={diagramTitle} />
        </div>

        <FeedbackBanner feedback={view.feedback} countIn={view.countIn} />

        <canvas ref={canvas} className="h-32 w-full rounded-[var(--radius-card)] bg-sunken" aria-hidden />

        {view.phase === "done" && view.result && <ResultPanel session={session} view={view} bpm={settings.bpm} onMode={chooseMode} />}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Structure session={session} view={view} mode={mode} best={best} />
          <section aria-labelledby="backing" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5">
            <h2 id="backing" className="m-0 text-base font-extrabold">{t("backing")}</h2>
            {mode === "timed" && (
              <>
                <Toggle id="guide" label={t("guide")} checked={guide} onChange={setGuide} />
                <Toggle id="band" label={t("band")} checked={band} onChange={setBand} />
              </>
            )}
            {mode !== "step" && <Toggle id="click" label={t("click")} checked={click} onChange={setClick} />}
            {mode !== "listen" && canRecord && (
              <>
                <Toggle id="record" label={t("record.toggle")} checked={recordAudio} onChange={(v) => { setRecordAudio(v); setRecording("idle"); }} />
                {recordAudio && recording === "idle" && <p className="m-0 text-sm text-muted">{t("record.hint")}</p>}
                {recording !== "idle" && (
                  <p role="status" className={`m-0 text-sm font-medium ${recording === "failed" ? "text-bad-ink" : "text-ink-2"}`}>
                    {t(`record.${recording}`)}
                    {recording === "saved" && <> <Link href="/progress#recordings" className="font-bold underline underline-offset-2">{t("record.listen")}</Link></>}
                  </p>
                )}
              </>
            )}
            <label htmlFor="volume" className="flex min-h-9 items-center gap-3 text-[15px]">
              {t("volume")}
              <input id="volume" type="range" min={0} max={1} step={0.05} value={settings.volume}
                onChange={(e) => update({ volume: Number(e.target.value) })} className="flex-1 accent-[var(--color-primary)]" />
            </label>
            {mode === "timed" && guide && <p className="m-0 text-sm font-medium text-warn">{t("headphones")}</p>}
            <p className="m-0 text-sm text-muted">{t(`modeHelp.${mode}`)}</p>
            {mode !== "listen" && <p className="m-0 text-sm text-muted">{t(`patternHelp.${song.pattern}`)}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-9 cursor-pointer items-center justify-between text-[15px]">
      {label}
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
    </label>
  );
}

function NextCard({ view, mode, leftHanded, diagramTitle }: {
  view: View; mode: PracticeMode; leftHanded: boolean; diagramTitle: (c: ChordId) => string;
}) {
  const t = useTranslations("play");
  const tc = useTranslations("common");
  const counting = view.phase === "playing" && view.countIn === null && mode !== "step" && view.beatsToNext !== null;
  const soon = counting && view.beatsToNext! <= 1;
  let when = t("whenReady");
  if (view.countIn !== null) when = t("startsIn", { beats: view.countIn });
  else if (counting) when = soon ? t("changeNow") : t("changeIn", { beats: view.beatsToNext! });
  else if (mode !== "step" && view.phase === "playing") when = t("later");
  return (
    <section aria-label={t("upNext")} className={`flex flex-col items-center justify-center gap-3.5 rounded-[var(--radius-hero)] border-[3px] border-brass bg-surface p-6 ${soon ? "soon" : ""}`}>
      {view.next ? (
        <>
          <div className="flex items-center gap-3">
            {counting && (
              <span className="flex size-[52px] items-center justify-center rounded-full bg-primary font-mono text-2xl font-semibold text-on-primary">
                {view.beatsToNext}
              </span>
            )}
            <span className="flex flex-col">
              <span className="eyebrow text-brass-ink">{t("upNext")}</span>
              <span className="text-[15px] font-semibold">{when}</span>
            </span>
          </div>
          <ChordDiagram chord={view.next} className="h-auto w-[150px] xl:w-[170px]" leftHanded={leftHanded} title={diagramTitle(view.next)} />
          <span className="flex items-baseline gap-2.5">
            <span className="text-[56px] font-black leading-none [font-stretch:85%]" style={{ color: `var(--color-chord-${view.next}-ink)` }}>{view.next}</span>
            <span className="text-base text-ink-2">{tc(`chord.${view.next}`)}</span>
          </span>
          <TransitionHint from={view.current} to={view.next} className="text-center text-[13px] leading-snug text-muted" />
        </>
      ) : (
        <span className="py-10 text-lg font-bold text-muted">{t("end")}</span>
      )}
    </section>
  );
}

const TONES = {
  good: "bg-good-soft text-good-ink",
  warn: "bg-warn-soft text-ink",
  bad: "bg-bad-soft text-bad-ink",
  info: "border border-line bg-surface text-ink",
};

export function FeedbackBanner({ feedback, countIn }: { feedback: Feedback | null; countIn: number | null }) {
  const t = useTranslations("play");
  const tc = useTranslations("common");
  const mic = useMicState();
  const string = (n: number) => tc(`string.s${n as 0}`);
  let text = "";
  let detail = "";
  let tone: keyof typeof TONES = "info";
  // The help page explains the problems the microphone points at.
  let help: string | null = null;
  if (countIn !== null) text = t("startsIn", { beats: countIn });
  else if (feedback) {
    switch (feedback.kind) {
      case "play": text = t("feedback.play", { chord: feedback.chord }); break;
      case "right": text = t("feedback.right", { chord: feedback.chord }); detail = t("feedback.rightDetail"); tone = "good"; break;
      case "heard": text = t("feedback.heard", { chord: feedback.chord, heard: feedback.heard }); tone = "bad"; help = "soundsWrong"; break;
      case "pressFinger":
        text = t("feedback.missing", { note: tc(`pitch.p${feedback.note as 0}`) });
        detail = t("feedback.pressFinger", {
          finger: feedback.finger, fingerName: tc(`finger.f${feedback.finger as 1}`), string: string(feedback.string), fret: feedback.fret,
        });
        tone = "warn";
        help = "buzz";
        break;
      case "freeOpenString": text = t("feedback.openSilent", { string: string(feedback.string) }); detail = t("feedback.freeOpenString"); tone = "warn"; help = "muted"; break;
      case "strumStrings":
        text = t("feedback.silent", { count: feedback.strings.length, string: string(feedback.strings[0]!) });
        detail = t("feedback.strumStrings", { chord: feedback.chord });
        tone = "warn";
        help = "wrongStrings";
        break;
      case "micOff": text = t("feedback.micOff"); break;
      case "slowDown": text = t("feedback.slowDown"); break;
    }
  }
  return (
    <div role="status" aria-live="polite" className={`flex min-h-14 flex-wrap items-center gap-x-3.5 gap-y-1 rounded-[16px] px-5 py-2 ${TONES[tone]}`}>
      {tone === "good" ? <IconCheck size={22} /> : tone === "info" ? null : <IconAlert />}
      <span className="text-[19px] font-extrabold">{text}</span>
      {detail && <span className="text-[15px]">{detail}</span>}
      {help && (
        <Link href={`/help#p-${help}`} target="_blank" className="text-sm font-bold underline underline-offset-2">
          {t("feedback.why")}
        </Link>
      )}
      <span className="ml-auto flex items-center gap-2 text-[13px] opacity-80">
        <span aria-hidden className={`size-2 rounded-full ${mic === "on" ? "bg-good" : "bg-line-strong"}`} />
        {tc(`mic.${mic === "on" ? "on" : "off"}`)}
      </span>
    </div>
  );
}

const CELL: Record<Status | "current", string> = {
  ok: "border-2 border-good",
  miss: "border-2 border-bad",
  skip: "border border-dashed border-line-strong",
  "": "border border-line",
  current: "border-2 border-brass bg-subtle",
};

function Structure({ session, view, mode, best }: {
  session: PracticeSession; view: View; mode: PracticeMode; best?: { step?: number; timed?: number };
}) {
  const t = useTranslations("play");
  // Steps in step mode, otherwise bars grouped by section pass.
  const rows = useMemo(() => {
    if (mode === "step") return [{ label: t("changes"), cells: session.steps.map((s, i) => ({ chord: s.chord, index: i })) }];
    const out: { label: string; cells: { chord: ChordId; index: number }[] }[] = [];
    session.bars.forEach((b, i) => {
      if (b.opensSection || !out.length) {
        const name = t(`section.${b.section}`);
        out.push({ label: b.pass ? t("pass", { name, pass: b.pass }) : name, cells: [] });
      }
      out.at(-1)!.cells.push({ chord: b.chord, index: i });
    });
    return out;
  }, [session, mode, t]);

  return (
    <section aria-labelledby="structure" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5 lg:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="structure" className="m-0 text-base font-extrabold">{t("structure")}</h2>
        <span className="font-mono text-sm text-muted">
          {t(mode === "step" ? "changesRight" : "barsRight", { right: view.right, total: view.total })}
          {best?.timed !== undefined && mode === "timed" && <> · {t("statBest")} {Math.round(best.timed * 100)}%</>}
          {best?.step !== undefined && mode === "step" && <> · {t("statBest")} {(best.step / 1000).toFixed(1)} s</>}
        </span>
      </div>
      <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {rows.map((row, r) => (
          <div key={r} className="grid grid-cols-[110px_1fr] items-start gap-1.5 text-[13px]">
            <span className="pt-1.5 font-bold">{row.label}</span>
            <div className="grid grid-cols-8 gap-1.5">
              {row.cells.map((c) => {
                const state = c.index === view.position && view.phase === "playing" ? "current" : (view.statuses[c.index] ?? "");
                return (
                  <span key={c.index} className={`flex h-[30px] items-center justify-center rounded-[7px] font-extrabold ${CELL[state]}`} style={{ color: `var(--color-chord-${c.chord}-ink)` }}>
                    {c.chord}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultPanel({ session, view, bpm, onMode }: { session: PracticeSession; view: View; bpm: number; onMode: (m: PracticeMode) => void }) {
  const t = useTranslations("play");
  const result = view.result!;
  let headline = "";
  let line = "";
  let next: PracticeMode | null = null;

  if (result.mode === "listen") {
    headline = t("result.listenTitle");
    line = t("result.listen");
    next = "step";
  } else if (result.mode === "step") {
    if (result.averageMs === null) headline = t("feedback.micOff");
    else {
      const bar = ((session.song.beatsPerBar * 60) / bpm).toFixed(1);
      headline = t("result.step", { seconds: (result.averageMs / 1000).toFixed(1) });
      line = result.ready ? t("result.stepReady", { bpm, bar }) : t("result.stepNotReady", { bpm, bar });
      if (result.ready) next = "timed";
    }
  } else if (result.share === null) {
    headline = t("result.timedNoMic");
  } else {
    headline = t("result.timed", { percent: Math.round(result.share * 100) });
    line = result.passed
      ? t("result.timedPass")
      : t("result.timedRetry", { score: Math.round(PASS_SCORE * 100), list: result.missedChords.map((m) => `${m.chord} (${m.bars})`).join(", ") });
    if (!result.passed) next = "step";
  }
  // A first run is always a "record"; a 0% one is not worth a badge.
  const isRecord = result.mode === "step" ? result.isRecord : result.mode === "timed" ? result.isRecord && (result.share ?? 0) > 0 : false;

  return (
    <section aria-live="polite" className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[var(--radius-card)] bg-navy px-7 py-6 text-on-navy">
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="eyebrow text-brass">{t("result.title")}</span>
          {isRecord && <span className="rounded-[6px] bg-good px-2 py-0.5 text-sm font-bold text-on-primary">{t("result.record")}</span>}
        </div>
        <p className="display m-0 text-[26px] font-extrabold">{headline}</p>
        {line && <p className="m-0 text-base text-on-navy-muted">{line}</p>}
      </div>
      {next && (
        <button type="button" onClick={() => onMode(next)} className={`${button.brass} h-[52px] text-[17px]`}>
          {next === "timed" ? t("result.tryTimed") : t("result.tryStep")}
        </button>
      )}
    </section>
  );
}
