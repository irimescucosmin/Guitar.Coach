"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useMicState } from "@/components/chrome/mic-button";
import { FeedbackLine } from "@/components/play/player";
import type { Feedback } from "@/components/play/session";
import { useProgress, useSettings } from "@/components/providers";
import { taskHref } from "@/components/ui/links";
import { matchChord } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { CHORDS, stringsForPitchClasses, type ChordId } from "@/lib/music/chords";
import { fixFor, mutedStrings, openStrings, placementSteps } from "@/lib/music/feedback";
import { nextTask } from "@/lib/music/path";

const GOAL = 3;
const CLEAN_FRAMES = 3;

export function LearnChord({ chord }: { chord: ChordId }) {
  const t = useTranslations("chords");
  const tc = useTranslations("common");
  const { progress, learn } = useProgress();
  const { settings } = useSettings();
  const mic = useMicState();
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [flagged, setFlagged] = useState<number[]>([]);
  const state = useRef({ armed: true, streak: 0, ignoreUntil: 0, lastFeedbackAt: 0, count: 0 });
  const learnRef = useRef(learn);
  useEffect(() => {
    learnRef.current = learn;
  }, [learn]);

  useEffect(() => {
    if (mic !== "on") return;
    let id = 0;
    const s = state.current;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame || s.count >= GOAL) return;
      if (frame.attack) s.armed = true;
      if (now < s.ignoreUntil || frame.level < SILENCE) {
        s.streak = 0;
        return;
      }
      const match = matchChord(frame.chroma, chord);
      if (match.clean) {
        if (s.armed && ++s.streak >= CLEAN_FRAMES) {
          s.armed = false;
          s.streak = 0;
          s.count += 1;
          setCount(s.count);
          setFlagged([]);
          setFeedback({ kind: "right", chord });
          engine.synth?.chime();
          if (s.count >= GOAL) learnRef.current(chord);
        }
        return;
      }
      s.streak = 0;
      if (now - s.lastFeedbackAt < 350) return;
      s.lastFeedbackAt = now;
      if (match.best !== chord && match.bestScore > 0.75) {
        setFeedback({ kind: "heard", chord, heard: match.best });
        setFlagged([]);
        return;
      }
      const fix = fixFor(chord, match.missing);
      if (!fix) return;
      setFlagged(stringsForPitchClasses(CHORDS[chord], match.missing));
      setFeedback(
        fix.kind === "pressFinger"
          ? { kind: "pressFinger", chord, note: CHORDS[chord].notes[fix.string]! % 12, finger: fix.finger, string: fix.string, fret: fix.fret }
          : { kind: "freeOpenString", chord, string: fix.string },
      );
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mic, chord]);

  const listen = () => {
    const { ctx, synth } = engine.audio();
    synth.setVolume(settings.volume);
    synth.strum(chord, ctx.currentTime + 0.05, "down", "all");
    // Our own strum must not count as the player's.
    state.current.ignoreUntil = performance.now() + 2200;
  };

  const string = (n: number) => tc(`string.s${n as 0}`);
  const done = count >= GOAL || progress.learned[chord] === true;
  const next = nextTask(progress);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/chords" className="text-sm text-muted hover:text-ink">← {t("all")}</Link>
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <ChordDiagram chord={chord} width={200} leftHanded={settings.leftHanded} flagged={flagged}
            title={tc("diagram", { chord, name: tc(`chord.${chord}`) })} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("learnTitle", { chord })} <span className="text-lg font-normal text-muted">{tc(`chord.${chord}`)}</span>
          </h1>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("place")}</h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {placementSteps(chord).map((p) => (
              <li key={p.string}>
                {t("placeStep", { finger: p.finger, fingerName: tc(`finger.f${p.finger as 1}`), string: string(p.string), fret: p.fret })}
              </li>
            ))}
          </ol>
          {openStrings(chord).length > 0 && <p className="text-sm">{t("open", { strings: openStrings(chord).map(string).join(", ") })}</p>}
          {mutedStrings(chord).length > 0 && <p className="text-sm">{t("muted", { strings: mutedStrings(chord).map(string).join(", ") })}</p>}
          <button type="button" onClick={listen} className="self-start rounded-[var(--radius-field)] border border-line bg-surface px-4 py-2 font-semibold">
            ▶ {t("listen")}
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-accent bg-surface p-5">
        <p className="font-semibold">{t("goal")}</p>
        <div className="flex items-center gap-3">
          {Array.from({ length: GOAL }, (_, i) => (
            <span key={i} className={`flex size-10 items-center justify-center rounded-full border-2 text-lg font-bold ${
              i < count || (done && count === 0) ? "border-good bg-good text-on-accent" : "border-line text-muted"
            }`}>
              {i < count || (done && count === 0) ? "✓" : i + 1}
            </span>
          ))}
          <span className="font-mono text-sm text-muted">{t("count", { count: done && count === 0 ? GOAL : count })}</span>
        </div>
        {mic !== "on" && !done && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void engine.startMic()} className="rounded-[var(--radius-field)] bg-accent px-4 py-2 font-semibold text-on-accent">
              {tc("mic.off")}
            </button>
            <button type="button" onClick={() => learn(chord)} className="rounded-[var(--radius-field)] border border-line px-4 py-2">
              {t("markLearned")}
            </button>
            <span className="text-sm text-muted">{t("markLearnedHelp")}</span>
          </div>
        )}
        <FeedbackLine feedback={feedback} countIn={null} />
        {done && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-good">✓ {t("done")}</p>
            {next && (
              <Link href={taskHref(next)} className="rounded-[var(--radius-field)] bg-accent px-4 py-2 font-semibold text-on-accent">
                {t("nextStep")}
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("tipsTitle")}</h2>
        <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 text-sm">
          <li>{t("tips.pressure")}</li>
          <li>{t("tips.fingertips")}</li>
          <li>{t("tips.wrist")}</li>
        </ul>
      </section>
    </div>
  );
}
