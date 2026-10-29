"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMicState } from "@/components/chrome/mic-button";
import { useProgress, useSettings } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { IconCheck, IconSpeaker } from "@/components/ui/icons";
import { button, learnHref, playHref } from "@/components/ui/links";
import { midiFromFrequency, pitchFromSamples } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { CHORD_IDS, CHORDS, type ChordId } from "@/lib/music/chords";
import { nextModeFor } from "@/lib/music/path";
import { guitarEvents, patternSymbols } from "@/lib/music/patterns";
import type { StrumPattern } from "@/lib/music/songs";
import { TECHNIQUES, arpeggioDone, arpeggioId, arpeggioNotes, arpeggioStep, arpeggiosHeard, songsWithPattern, strumProvedBy } from "@/lib/music/techniques";
import { OPEN_KEYS, PITCH_NAMES, capoFor, taughtChords, transposeName } from "@/lib/music/theory";

const STABLE_FRAMES = 4;
const ARPEGGIO_MAX_HZ = 1000;

/**
 * What comes after the first chords: the strums, the arpeggio, the capo,
 * why chords go together. A strum is done when a song with it was passed
 * in time; the arpeggio when the microphone heard it. The rest is reading.
 */
export function TechniquesView() {
  const t = useTranslations("techniques");
  const { progress } = useProgress();

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">{t("eyebrow")}</span>
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>

      <nav aria-label={t("contents")} className="flex flex-wrap gap-2">
        {TECHNIQUES.map((x) => (
          <a key={x.id} href={`#${x.id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold hover:border-ink">{t(`${x.id}.title`)}</a>
        ))}
      </nav>

      {TECHNIQUES.map((x) => (
        <section key={x.id} id={x.id} aria-labelledby={`${x.id}-title`} className="flex scroll-mt-6 flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex flex-col gap-1.5">
            <h2 id={`${x.id}-title`} className="m-0 text-2xl font-extrabold">{t(`${x.id}.title`)}</h2>
            <p className="m-0 max-w-[70ch] leading-relaxed">{t(`${x.id}.body`)}</p>
          </div>
          {x.kind === "strum" && <Strum pattern={x.pattern} progress={progress} />}
          {x.kind === "arpeggio" && <ArpeggioDrill />}
          {x.id === "capo" && <CapoTool />}
          {x.id === "keys" && <KeysTable />}
          {x.kind === "reading" && <p className="m-0 max-w-[70ch] text-sm leading-relaxed text-ink-2">{t(`${x.id}.more`)}</p>}
        </section>
      ))}
    </>
  );
}

/** The strum written out, heard, and the song that proves it or the one to try it in. */
function Strum({ pattern, progress }: { pattern: StrumPattern; progress: ReturnType<typeof useProgress>["progress"] }) {
  const t = useTranslations("techniques.strum");
  const tp = useTranslations("play");
  const { settings } = useSettings();
  const beats = pattern === "waltz" ? 3 : 4;
  const proved = strumProvedBy(pattern, progress);
  const songs = songsWithPattern(pattern, progress);
  const song = songs[0];
  const next = song ? nextModeFor(song, progress) : null;

  const listen = () => {
    const { ctx, synth } = engine.audio();
    synth.setVolume(settings.volume);
    const beat = 60 / 90;
    let at = ctx.currentTime + 0.1;
    for (const chord of ["G", "D"] as const) {
      for (let b = 0; b < beats; b++) {
        for (const e of guitarEvents(pattern, b, beats)) {
          const when = at + b * beat + e.at * beat;
          if (e.kind === "strum") synth.strum(chord, when, e.direction, e.strings);
          else synth.bassString(chord, when, e.alternate);
        }
      }
      at += beats * beat;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-mono text-2xl tracking-wide">{patternSymbols(pattern, beats).join("  ")}</span>
        <span className="text-sm text-ink-2">{tp(`patternHelp.${pattern}`)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={listen} className={`${button.outline} h-11`}><IconSpeaker />{t("listen")}</button>
        {proved ? (
          <span className="flex items-center gap-1.5 font-bold text-good"><IconCheck size={16} />{t("proved", { song: proved.title })}</span>
        ) : song && next ? (
          next.kind === "learnFirst" ? (
            <span className="text-sm">{t("learnFirst", { song: song.title })} <Link href={learnHref(next.chord)} className="font-bold underline underline-offset-2">{next.chord}</Link></span>
          ) : (
            <Link href={playHref(song.id, next.kind === "step" ? "step" : "timed")} className={`${button.brass} h-11`}>{t("tryIn", { song: song.title })}</Link>
          )
        ) : null}
      </div>
      {!proved && <p className="m-0 text-sm text-muted">{t("rule")}</p>}
    </div>
  );
}

/**
 * The arpeggio, heard: the chord's strings one at a time from the bass, in
 * order; a wrong string does not start it over. Done, the time is saved as a
 * step result on "arp-<chord>", and the fastest stays as the record.
 */
function ArpeggioDrill() {
  const t = useTranslations("techniques.arpeggio");
  const tc = useTranslations("common");
  const { progress, record } = useProgress();
  const mic = useMicState();
  const learned = CHORD_IDS.filter((c) => progress.learned[c]);
  const [chord, setChord] = useState<ChordId | null>(null);
  const picked = chord && progress.learned[chord] ? chord : (learned[0] ?? null);
  const [running, setRunning] = useState(false);
  const [position, setPosition] = useState(0);
  const [done, setDone] = useState<{ ms: number; isRecord: boolean } | null>(null);
  const state = useRef({ position: 0, startedAt: 0, last: -1, stable: 0 });
  const heard = arpeggiosHeard(progress);

  useEffect(() => {
    if (!running || !picked || mic !== "on") return;
    let id = 0;
    const s = state.current;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame || !engine.ctx || frame.level < SILENCE) {
        s.stable = 0;
        return;
      }
      const hz = pitchFromSamples(frame.samples, engine.ctx.sampleRate, ARPEGGIO_MAX_HZ);
      if (hz === null) return;
      const midi = Math.round(midiFromFrequency(hz));
      s.stable = midi === s.last ? s.stable + 1 : 1;
      s.last = midi;
      if (s.stable !== STABLE_FRAMES) return;
      const next = arpeggioStep(picked, s.position, midi);
      if (next === s.position) return;
      if (s.position === 0) s.startedAt = performance.now();
      s.position = next;
      setPosition(next);
      if (arpeggioDone(picked, next)) {
        const ms = Math.max(1, Math.round(performance.now() - s.startedAt));
        cancelAnimationFrame(id);
        setRunning(false);
        engine.synth?.chime();
        setDone({ ms, isRecord: record({ songId: arpeggioId(picked), mode: "step", value: ms }) });
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, picked, mic, record]);

  const start = async () => {
    if (!(await engine.startMic())) return;
    state.current = { position: 0, startedAt: 0, last: -1, stable: 0 };
    setPosition(0);
    setDone(null);
    setRunning(true);
  };

  if (!picked) {
    return (
      <p className="m-0 text-sm">
        {t("learnFirst")} <Link href={learnHref("Em")} className="font-bold underline underline-offset-2">{t("learnEm")}</Link>
      </p>
    );
  }
  const shape = CHORDS[picked];
  const notes = arpeggioNotes(picked);
  // Which strings are played, from the 6th down, with the index among the played ones.
  const strings = shape.notes.map((n, i) => ({ string: i, played: n !== null })).filter((s) => s.played).map((s, k) => ({ ...s, k }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          {t("chord")}
          <select value={picked} disabled={running} onChange={(e) => setChord(e.target.value as ChordId)} className="h-10 rounded-[var(--radius-field)] border border-line-strong bg-surface px-2 font-bold">
            {learned.map((c) => <option key={c} value={c}>{c} ({tc(`chord.${c}`)})</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void start()} disabled={running} className={`${button.brass} h-11 disabled:opacity-50`}>
          {running ? t("listening") : done ? t("again") : t("start")}
        </button>
      </div>
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t("strings")}>
        {strings.map((s) => {
          const state = s.k < position ? "heard" : s.k === position && running ? "next" : "waiting";
          return (
            <li
              key={s.string}
              aria-current={state === "next" ? "step" : undefined}
              className={`flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 px-3 text-sm font-bold ${
                state === "heard" ? "border-good bg-good-soft text-good" : state === "next" ? "border-brass bg-warn-soft" : "border-line bg-surface text-ink-2"
              }`}
            >
              {state === "heard" && <IconCheck size={14} />}
              {tc(`string.s${s.string as 0 | 1 | 2 | 3 | 4 | 5}`)}
            </li>
          );
        })}
      </ol>
      {running && mic !== "on" && <p role="status" className="m-0 text-sm font-medium text-warn">{tc("mic.off")}</p>}
      {done && (
        <p role="status" className="m-0 font-bold text-good">
          {t("done", { chord: picked, seconds: (done.ms / 1000).toFixed(1), count: notes.length })}
          {done.isRecord && ` ${t("record")}`}
        </p>
      )}
      {heard.length > 0 && (
        <p className="m-0 text-sm text-muted">
          {t("heard")} {heard.map((h) => `${h.chord} (${(h.ms / 1000).toFixed(1)} s)`).join(", ")}
        </p>
      )}
      <p className="m-0 text-sm text-muted">{t("rule")}</p>
    </div>
  );
}

/** Shapes in one key, capo on a fret: what each chord sounds like. */
function CapoTool() {
  const t = useTranslations("techniques.capo");
  const [shapes, setShapes] = useState(7); // G
  const [sound, setSound] = useState(9); // A
  const capo = capoFor(shapes, sound);
  const rows = taughtChords(shapes);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t("shapes")}
          <select value={shapes} onChange={(e) => setShapes(Number(e.target.value))} className="h-10 rounded-[var(--radius-field)] border border-line-strong bg-surface px-2 font-bold">
            {OPEN_KEYS.map((k) => <option key={k} value={k}>{PITCH_NAMES[k]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t("sound")}
          <select value={sound} onChange={(e) => setSound(Number(e.target.value))} className="h-10 rounded-[var(--radius-field)] border border-line-strong bg-surface px-2 font-bold">
            {PITCH_NAMES.map((n, k) => <option key={n} value={k}>{n}</option>)}
          </select>
        </label>
        <span className="flex items-baseline gap-2 pb-1">
          <span className="font-mono text-3xl font-semibold" aria-live="polite">{capo}</span>
          <span className="text-sm font-bold">{t("fret", { count: capo })}</span>
        </span>
      </div>
      {capo === 0 ? (
        <p className="m-0 text-sm text-ink-2">{t("none")}</p>
      ) : (
        <table className="w-full max-w-[480px] border-collapse text-[15px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-1 pr-4 font-bold">{t("youPlay")}</th>
              <th className="py-1 font-bold">{t("itSounds")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line">
                <td className="py-1.5 pr-4">{r.taught ? <ChordChip chord={r.taught} /> : <span className="font-bold text-muted">{r.name}</span>}</td>
                <td className="py-1.5 font-mono font-semibold">{transposeName(r.name, capo) ?? r.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {capo > 7 && <p className="m-0 text-sm text-warn">{t("high")}</p>}
    </div>
  );
}

/** The chords of the keys a beginner plays, the taught ones in colour. */
function KeysTable() {
  const t = useTranslations("techniques.keys");
  return (
    <table className="w-full max-w-[640px] border-collapse text-[15px]">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted">
          <th className="py-1 pr-4 font-bold">{t("key")}</th>
          <th className="py-1 font-bold">{t("chords")}</th>
        </tr>
      </thead>
      <tbody>
        {OPEN_KEYS.map((k) => (
          <tr key={k} className="border-t border-line">
            <td className="py-2 pr-4 font-extrabold">{t("major", { name: PITCH_NAMES[k]! })}</td>
            <td className="py-2">
              <span className="flex flex-wrap items-center gap-1.5">
                {taughtChords(k).map((c) => (c.taught ? <ChordChip key={c.name} chord={c.taught} /> : <span key={c.name} className="inline-flex h-6 items-center rounded-[6px] border border-dashed border-line-strong px-2 text-xs font-bold text-muted">{c.name}</span>))}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
