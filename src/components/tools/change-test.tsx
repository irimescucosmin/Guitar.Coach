"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { matchChord } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { CHORD_IDS, type ChordId } from "@/lib/music/chords";

const SECONDS = 60;
const STABLE_FRAMES = 4;

function readBest(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function ChangeTest() {
  const t = useTranslations("tools.test");
  const [a, setA] = useState<ChordId>("Em");
  const [b, setB] = useState<ChordId>("Am");
  const [running, setRunning] = useState(false);
  const [expect, setExpect] = useState<ChordId>("Em");
  const [left, setLeft] = useState(SECONDS);
  const [count, setCount] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const run = useRef({ expect: "Em" as ChordId, hits: 0, stable: 0, end: 0 });
  const key = `guitar-coach:change-test:${a}-${b}`;

  useEffect(() => setBest(readBest(key)), [key]);

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
        const previous = readBest(key) ?? 0;
        if (changes > previous) {
          try { localStorage.setItem(key, String(changes)); } catch { /* best effort */ }
          setBest(changes);
        }
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
  }, [running, a, b, key, t]);

  const start = async () => {
    if (a === b) { setMessage(t("sameChord")); return; }
    if (!(await engine.startMic())) return;
    run.current = { expect: a, hits: 0, stable: 0, end: performance.now() + SECONDS * 1000 };
    setExpect(a); setCount(0); setLeft(SECONDS); setMessage(""); setRunning(true);
  };

  const select = (value: ChordId, set: (c: ChordId) => void, id: string) => (
    <select id={id} value={value} disabled={running} onChange={(e) => set(e.target.value as ChordId)}
      className="rounded-[var(--radius-field)] border border-line bg-surface px-2 py-1.5 font-mono">
      {CHORD_IDS.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p className="text-sm text-muted">{t("help")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {select(a, setA, "test-a")}<span aria-hidden>↔</span>{select(b, setB, "test-b")}
        <button type="button" disabled={running} onClick={() => void start()}
          className="rounded-[var(--radius-field)] bg-accent px-4 py-2 font-semibold text-on-accent disabled:opacity-60">
          {running ? t("running") : t("start")}
        </button>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{t("play")}</p>
          <p className="font-mono text-5xl font-bold" style={{ color: `var(--color-chord-${expect})` }}>{expect}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted">{t("time")}</p>
          <p className="font-mono text-5xl font-bold tabular-nums">{left}</p>
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
