"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { matchChord } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { useProgress } from "@/components/providers";
import { CHORD_IDS, type ChordId } from "@/lib/music/chords";
import { pairKey } from "@/lib/music/routine";

const SECONDS = 60;
const STABLE_FRAMES = 4;

/** Alternating two chords for a minute, counting only clean changes. The best per pair lives in the account. */
export function ChangeTest({ initial }: { initial?: [ChordId, ChordId] }) {
  const t = useTranslations("tools.test");
  const { progress, recordChanges } = useProgress();
  const [a, setA] = useState<ChordId>(initial?.[0] ?? "Em");
  const [b, setB] = useState<ChordId>(initial?.[1] ?? "Am");
  const [running, setRunning] = useState(false);
  const [expect, setExpect] = useState<ChordId>("Em");
  const [left, setLeft] = useState(SECONDS);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");
  const run = useRef({ expect: "Em" as ChordId, hits: 0, stable: 0, end: 0 });
  const best = a === b ? undefined : progress.changes?.[pairKey(a, b)];
  const recordRef = useRef(recordChanges);
  useEffect(() => {
    recordRef.current = recordChanges;
  }, [recordChanges]);

  useEffect(() => {
    if (!running) return;
    let id = 0;
    const r = run.current;
    const tick = (now: number) => {
      const remaining = Math.max(0, Math.ceil((r.end - now) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        const changes = Math.max(0, r.hits - 1);
        setRunning(false);
        setMessage(t("result", { count: changes }));
        recordRef.current(a, b, changes);
        return;
      }
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame || frame.level < SILENCE) { r.stable = 0; return; }
      r.stable = matchChord(frame.chroma, r.expect).clean ? r.stable + 1 : 0;
      if (r.stable >= STABLE_FRAMES) {
        r.hits += 1;
        r.stable = 0;
        r.expect = r.expect === a ? b : a;
        engine.resetChroma();
        setCount(Math.max(0, r.hits - 1));
        setExpect(r.expect);
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, a, b, t]);

  const start = async () => {
    if (a === b) { setMessage(t("sameChord")); return; }
    if (!(await engine.startMic())) return;
    run.current = { expect: a, hits: 0, stable: 0, end: performance.now() + SECONDS * 1000 };
    setExpect(a); setCount(0); setLeft(SECONDS); setMessage(""); setRunning(true);
  };

  const select = (value: ChordId, set: (c: ChordId) => void, id: string) => (
    <select id={id} value={value} disabled={running} onChange={(e) => set(e.target.value as ChordId)}
      className="h-12 rounded-[var(--radius-field)] border border-line-strong bg-surface px-3 font-mono text-lg">
      {CHORD_IDS.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  return (
    <section id="changes" className="flex scroll-mt-6 flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <h2 className="m-0 text-xl font-extrabold">{t("title")}</h2>
      <p className="text-sm text-muted">{t("help")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {select(a, setA, "test-a")}<span aria-hidden>↔</span>{select(b, setB, "test-b")}
        <button type="button" disabled={running} onClick={() => void start()}
          className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-5 font-extrabold text-on-primary disabled:opacity-60">
          {running ? t("running") : t("start")}
        </button>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{t("play")}</p>
          <p className="text-6xl font-black [font-stretch:85%]" style={{ color: `var(--color-chord-${expect})` }}>{expect}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted">{t("time")}</p>
          <p className="text-6xl font-black [font-stretch:85%] tabular-nums">{left}</p>
        </div>
      </div>
      <div className="flex gap-8">
        <span className="flex flex-col"><span className="text-xs uppercase tracking-wider text-muted">{t("count")}</span><span className="font-mono text-2xl font-bold tabular-nums">{count}</span></span>
        <span className="flex flex-col"><span className="text-xs uppercase tracking-wider text-muted">{t("best")}</span><span className="font-mono text-2xl font-bold tabular-nums">{best ?? "–"}</span></span>
      </div>
      {message && <p className="font-semibold" aria-live="polite">{message}</p>}
    </section>
  );
}
