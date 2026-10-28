"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useMicState } from "@/components/chrome/mic-button";
import { useSettings } from "@/components/providers";
import { IconCheck } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { matchChord } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import type { ChordId } from "@/lib/music/chords";

/** Same bar as learning a chord: three clean frames after a fresh strum. */
const CLEAN_FRAMES = 3;
/** A moment to read the next chord before the microphone listens again. */
const PAUSE_MS = 900;

/**
 * The practical part of the questionnaire: each chord the player says they know,
 * played once. Heard clean, it counts; otherwise it goes back on the path.
 */
export function ChordCheck({ chords, onDone }: { chords: ChordId[]; onDone: (verified: ChordId[] | null) => void }) {
  const t = useTranslations("start.check");
  const tc = useTranslations("common");
  const mic = useMicState();
  const { settings } = useSettings();
  const [index, setIndex] = useState(0);
  const [verified, setVerified] = useState<ChordId[]>([]);
  const [heard, setHeard] = useState(false);
  const run = useRef({ armed: false, streak: 0, ignoreUntil: 0 });
  // The pause after a clean chord: cancelled if the player leaves or skips meanwhile.
  const pending = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(pending.current), []);
  const chord = chords[index];

  const advance = (ok: boolean) => {
    const nextVerified = ok && chord ? [...verified, chord] : verified;
    setVerified(nextVerified);
    setHeard(false);
    if (index + 1 >= chords.length) onDone(nextVerified);
    else {
      setIndex(index + 1);
      run.current = { armed: false, streak: 0, ignoreUntil: performance.now() + PAUSE_MS };
    }
  };
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });

  useEffect(() => {
    if (mic !== "on" || !chord || heard) return;
    let id = 0;
    const r = run.current;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame) return;
      if (frame.attack) r.armed = true;
      if (now < r.ignoreUntil || frame.level < SILENCE) {
        r.streak = 0;
        return;
      }
      if (r.armed && matchChord(frame.chroma, chord).clean) {
        if (++r.streak >= CLEAN_FRAMES) {
          r.armed = false;
          r.streak = 0;
          engine.synth?.chime();
          setHeard(true);
          // Long enough to see the tick, short enough to keep the pace.
          pending.current = window.setTimeout(() => advanceRef.current(true), 700);
        }
      } else r.streak = 0;
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mic, chord, heard]);

  if (!chord) return null;
  const broken = mic === "denied" || mic === "unsupported" || mic === "insecure";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-8 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <ChordDiagram chord={chord} className="h-auto w-[170px]" leftHanded={settings.leftHanded}
          title={tc("diagram", { chord, name: tc(`chord.${chord}`) })} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="eyebrow text-muted">{t("progress", { n: index + 1, total: chords.length })}</span>
          <span className="text-[96px] font-black leading-[0.85] [font-stretch:85%]" style={{ color: `var(--color-chord-${chord})` }}>
            {chord}
          </span>
          <span className="text-lg font-semibold text-ink-2">{tc(`chord.${chord}`)}</span>
          <p role="status" className={`m-0 mt-2 flex min-h-7 items-center gap-2 text-base font-bold ${heard ? "text-good" : "text-ink"}`}>
            {heard ? <><IconCheck />{t("heard", { chord })}</> : mic === "on" ? t("play", { chord }) : ""}
          </p>
        </div>
      </div>

      {mic !== "on" && !broken && (
        <button type="button" onClick={() => void engine.startMic()} className={`${button.brass} h-[52px] self-start text-[17px]`}>
          {tc(`mic.${mic}`)}
        </button>
      )}
      {broken && (
        <p role="alert" className="m-0 rounded-[var(--radius-control)] bg-warn-soft px-4 py-3 text-[15px]">
          {mic === "insecure" ? tc("micInsecure") : tc("micDenied")}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!broken && (
          <button type="button" disabled={heard} onClick={() => advance(false)} className={`${button.outline} h-12`}>
            {t("cannot")}
          </button>
        )}
        <button type="button" disabled={heard} onClick={() => { window.clearTimeout(pending.current); onDone(null); }} className={`${button.outline} h-12`}>
          {t("skipAll")}
        </button>
      </div>
      <p className="m-0 text-sm text-muted">{t("help")}</p>
    </div>
  );
}
