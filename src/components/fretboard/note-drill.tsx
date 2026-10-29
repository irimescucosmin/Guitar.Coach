"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMicState } from "@/components/chrome/mic-button";
import { useProgress } from "@/components/providers";
import { IconCheck } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { midiFromFrequency, pitchFromSamples } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { NOTE_DRILL, NOTE_DRILL_ID, judgeNote, pitchClassAt, type NoteVerdict } from "@/lib/music/fretboard";

/** Same note for this many frames before it counts: a pluck settles quickly, noise does not. */
const STABLE_FRAMES = 6;
/** Up to the 5th fret of the high E string, with room. */
const MAX_HZ = 1000;

const STAGES = [
  { key: "stageOpen", from: 0, to: 6 },
  { key: "stageHighE", from: 6, to: 9 },
  { key: "stageB", from: 9, to: 12 },
  { key: "stageG", from: 12, to: 14 },
] as const;

/** Lesson 0's exercise: find each note, the microphone says right, higher or lower. */
export function NoteDrill() {
  const t = useTranslations("fretboard");
  const tc = useTranslations("common");
  const mic = useMicState();
  const { record } = useProgress();
  const [index, setIndex] = useState(-1);
  const [verdict, setVerdict] = useState<{ v: NoteVerdict; heard: number } | null>(null);
  const [result, setResult] = useState<{ averageMs: number; isRecord: boolean; skipped: number } | null>(null);
  const run = useRef({ index: -1, startedAt: 0, durations: [] as number[], skipped: 0, last: -1, stable: 0, ignoreUntil: 0 });
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  useEffect(() => {
    if (index < 0 || mic !== "on") return;
    let id = 0;
    const r = run.current;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      const target = NOTE_DRILL[r.index];
      const frame = engine.read();
      if (!target || !frame || !engine.ctx || now < r.ignoreUntil || frame.level < SILENCE) {
        r.stable = 0;
        return;
      }
      const hz = pitchFromSamples(frame.samples, engine.ctx.sampleRate, MAX_HZ);
      if (hz === null) return;
      const midi = Math.round(midiFromFrequency(hz));
      r.stable = midi === r.last ? r.stable + 1 : 1;
      r.last = midi;
      if (r.stable < STABLE_FRAMES) return;
      const v = judgeNote(midi, target);
      setVerdict({ v, heard: midi });
      if (v.kind !== "right") return;
      engine.synth?.chime();
      r.durations.push(now - r.startedAt);
      r.startedAt = now;
      r.stable = 0;
      r.ignoreUntil = now + 500;
      r.index += 1;
      setIndex(r.index);
      if (r.index >= NOTE_DRILL.length) finishRef.current(r);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [index, mic]);

  // Only a run with every note heard counts: a skipped note was not found.
  const finishRun = (r: typeof run.current) => {
    const averageMs = r.durations.length > 0 ? r.durations.reduce((a, b) => a + b, 0) / r.durations.length : 0;
    const isRecord = r.skipped === 0 ? recordRef.current({ songId: NOTE_DRILL_ID, mode: "step", value: Math.round(averageMs) }) : false;
    setResult({ averageMs, isRecord, skipped: r.skipped });
  };
  const finishRef = useRef(finishRun);
  useEffect(() => {
    finishRef.current = finishRun;
  });

  const start = async () => {
    engine.audio();
    await engine.startMic();
    run.current = { index: 0, startedAt: performance.now(), durations: [], skipped: 0, last: -1, stable: 0, ignoreUntil: performance.now() + 300 };
    setResult(null);
    setVerdict(null);
    setIndex(0);
  };

  const skip = () => {
    const r = run.current;
    r.index += 1;
    r.skipped += 1;
    r.startedAt = performance.now();
    setVerdict(null);
    setIndex(r.index);
    if (r.index >= NOTE_DRILL.length) finishRef.current(r);
  };

  const target = index >= 0 ? NOTE_DRILL[index] : undefined;
  const note = (pc: number) => tc(`pitch.p${pc as 0}`);
  const string = (s: number) => tc(`string.s${s as 0}`);
  const stageOf = (i: number) => STAGES.findIndex((s) => i >= s.from && i < s.to);
  const currentStage = index < 0 ? -1 : index >= NOTE_DRILL.length ? STAGES.length : stageOf(index);

  let message = "";
  if (verdict && target) {
    const heardName = note(verdict.heard % 12);
    if (verdict.v.kind === "octave") message = t(verdict.v.direction === "up" ? "octaveUp" : "octaveDown", { note: heardName });
    else if (verdict.v.kind === "off") message = t(verdict.v.direction === "up" ? "goUp" : "goDown", { note: heardName, frets: verdict.v.frets });
  }

  return (
    <section id="drill" aria-labelledby="drill-title" className="flex flex-col gap-3.5 rounded-[var(--radius-card)] bg-navy p-6 text-on-navy">
      <span className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-brass">{t("drillEyebrow")}</span>
      <h2 id="drill-title" className="display m-0 text-[26px] font-extrabold">
        {target ? t("find", { note: note(pitchClassAt(target.string, target.fret)), string: string(target.string) }) : t("drillTitle")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-on-navy-muted">{t("drillBody")}</p>

      <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
        {STAGES.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-3 ${i < currentStage ? "text-[#8ee0b4]" : i === currentStage ? "font-bold" : "text-on-navy-muted"}`}>
            {i < currentStage ? (
              <span className="flex size-[22px] items-center justify-center rounded-full bg-good text-white"><IconCheck size={12} /></span>
            ) : (
              <span className={`size-[22px] rounded-full border-2 ${i === currentStage ? "border-brass" : "border-navy-line"}`} />
            )}
            {t(s.key)}
          </li>
        ))}
      </ol>

      {target && message && (
        <div role="status" className="flex items-center gap-3.5 rounded-[14px] bg-navy-2 px-4 py-3.5">
          <span className="text-[40px] font-black leading-none">{verdict ? note(verdict.heard % 12) : ""}</span>
          <span className="text-[15px] leading-snug">{message}</span>
        </div>
      )}
      {result && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-navy-2 px-4 py-3.5 text-[15px]">
          <IconCheck />
          {result.skipped > 0 ? t("skippedSome", { count: result.skipped }) : t("done", { seconds: (result.averageMs / 1000).toFixed(1) })}
          {result.isRecord && <span className="ml-auto rounded-[6px] bg-good px-2 py-0.5 text-sm font-bold">{t("record")}</span>}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {target ? (
          <button type="button" onClick={skip} className="inline-flex h-[52px] items-center rounded-[var(--radius-control)] border border-navy-line px-5 font-bold text-on-navy">
            {t("skip")}
          </button>
        ) : (
          <button type="button" onClick={() => void start()} className={`${button.brass} h-[52px] flex-1 text-[17px]`}>
            {result ? t("again") : t("start")}
          </button>
        )}
      </div>
      {target && mic !== "on" && <p className="m-0 text-sm text-on-navy-muted">{t("micNeeded")}</p>}
    </section>
  );
}
