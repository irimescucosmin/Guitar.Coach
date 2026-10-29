"use client";

import { engine, SILENCE, type Frame } from "@/lib/audio/engine";
import type { ChordMatch } from "@/lib/audio/detect";
import { StrumJudge } from "@/lib/audio/judge";
import { stringsForPitchClasses, CHORDS, type ChordId } from "@/lib/music/chords";
import { fixFor } from "@/lib/music/feedback";
import { PASS_SCORE, readyForTimed, type PracticeMode } from "@/lib/music/path";
import { bandEvents, guitarEvents } from "@/lib/music/patterns";
import { barsOf, nextChangeAfter, stepsOf, type Bar, type Song, type Step } from "@/lib/music/songs";

/**
 * One practice run of one song in one mode. A plain class rather than React
 * state: it ticks sixty times a second and only tells React when something a
 * person can see has changed.
 */

export type Status = "" | "ok" | "miss" | "skip";

export type Feedback =
  | { kind: "play"; chord: ChordId }
  | { kind: "right"; chord: ChordId }
  | { kind: "heard"; chord: ChordId; heard: ChordId }
  | { kind: "pressFinger"; chord: ChordId; note: number; finger: number; string: number; fret: number }
  | { kind: "freeOpenString"; chord: ChordId; string: number }
  | { kind: "strumStrings"; chord: ChordId; strings: number[] }
  | { kind: "micOff" }
  | { kind: "slowDown" };

export type Result =
  | { mode: "listen" }
  | { mode: "step"; averageMs: number | null; complete: boolean; ready: boolean; isRecord: boolean; partial?: boolean }
  | { mode: "timed"; share: number | null; passed: boolean; missedChords: { chord: ChordId; bars: number }[]; isRecord: boolean; guided?: boolean; partial?: boolean };

export interface View {
  phase: "idle" | "playing" | "done";
  current: ChordId;
  next: ChordId | null;
  /** Beats until the chord changes, timed modes only. */
  beatsToNext: number | null;
  /** Beats left in the count-in, null once the song runs. */
  countIn: number | null;
  /** 0-based beat in the bar, -1 when not counting. */
  beat: number;
  section: { name: Bar["section"]; pass: number; position: number; length: number } | null;
  /** The bar (timed modes) or step (step mode) being played, -1 before the start. */
  position: number;
  /** Verdict per bar or step, for the structure panel. */
  statuses: Status[];
  feedback: Feedback | null;
  /** Strings to mark red on the current diagram. */
  flagged: number[];
  right: number;
  total: number;
  result: Result | null;
  paused: boolean;
  /** Bars chosen to practise on their own, inclusive; null is the whole song. */
  range: { from: number; to: number } | null;
  loop: boolean;
}

/** A part of the song, as bar indexes, inclusive. */
export type Range = { from: number; to: number };

export interface Options {
  bpm: number;
  guide: boolean;
  band: boolean;
  click: boolean;
  volume: number;
}

export interface Layout {
  items: { chord: ChordId; start: number; length: number; status: Status }[];
  position: number;
  unit: number;
  beatsPerBar: number | null;
}

interface StepRun {
  kind: "step";
  index: number;
  stepStartedAt: number;
  durations: number[];
  statuses: Status[];
  ignoreUntil: number;
  slowHinted: boolean;
  lastFeedbackAt: number;
  viewPosition: number;
  /** The steps of this run: a part of the song, or all of it, possibly repeated. */
  seq: number[];
  /** Where in `seq` the run is. */
  at: number;
  pausedAt: number | null;
}

interface BeatRun {
  kind: "listen" | "timed";
  startAt: number;
  beatSeconds: number;
  nextBeat: number;
  totalBeats: number;
  statuses: Status[];
  judged: number;
  judgeStart: number;
  shownBeat: number;
  lastFeedbackAt: number;
  heardAnything: boolean;
  bpm: number;
  /** The bars of this run in playing order (one pass of the part, or the whole song). */
  seq: number[];
  pausedAt: number | null;
}

type Run = StepRun | BeatRun;

/** A strum a moment before the bar line belongs to the new bar. */
const EARLY_BEATS = 0.3;
const SLOW_HINT_MS = 9000;

export interface Recorder {
  (run: { songId: string; mode: "step" | "timed"; value: number; bpm?: number }): boolean;
}

export class PracticeSession {
  readonly bars: Bar[];
  readonly steps: Step[];
  view: View;
  options: Options;
  private run: Run | null = null;
  private raf = 0;
  private timer = 0;
  private listeners = new Set<() => void>();
  private starting = false;
  private disposed = false;

  constructor(
    readonly song: Song,
    readonly mode: PracticeMode,
    options: Options,
    private readonly recordRun: Recorder,
  ) {
    this.options = options;
    this.bars = barsOf(song);
    this.steps = stepsOf(this.bars);
    this.view = this.idleView();
  }

  private idleView(): View {
    const first = this.bars[0]!.chord;
    const change = nextChangeAfter(this.bars, 0);
    return {
      phase: "idle",
      current: first,
      next: change < 0 ? null : this.bars[change]!.chord,
      beatsToNext: null,
      countIn: null,
      beat: -1,
      section: null,
      position: -1,
      statuses: (this.mode === "step" ? this.steps : this.bars).map(() => ""),
      feedback: null,
      flagged: [],
      right: 0,
      total: this.mode === "step" ? this.steps.length : this.bars.length,
      result: null,
      paused: false,
      range: this.range,
      loop: this.loop,
    };
  }

  /* ---------- a part of the song, on repeat ---------- */

  private range: Range | null = null;
  private loop = false;

  /** Bars to practise on their own; a run in progress is stopped. Null is the whole song. */
  setRange(range: Range | null): void {
    const clean = range && range.from <= range.to ? { from: Math.max(0, range.from), to: Math.min(this.bars.length - 1, range.to) } : null;
    const whole = clean && clean.from === 0 && clean.to === this.bars.length - 1;
    this.range = whole ? null : clean;
    this.stop();
    this.emit({ range: this.range });
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
    this.stop();
    this.emit({ loop });
  }

  /** Whether the run is a part of the song or a repeat: practice, never a record. */
  private get partial(): boolean {
    return this.range !== null || this.loop;
  }

  /** The bar sequence of one pass. */
  private barSeq(): number[] {
    const from = this.range?.from ?? 0;
    const to = this.range?.to ?? this.bars.length - 1;
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }

  /** The steps of one pass: those that start inside the range. */
  private stepSeq(): number[] {
    const from = this.range?.from ?? 0;
    const to = this.range?.to ?? this.bars.length - 1;
    return this.steps.flatMap((step, i) => (step.firstBar >= from && step.firstBar <= to ? [i] : []));
  }

  /** The real bar played at pass position `k`, or -1 past the end of a run that does not loop. */
  private barAt(run: BeatRun, k: number): number {
    if (k < 0) return -1;
    if (this.loop) return run.seq[k % run.seq.length]!;
    return run.seq[k] ?? -1;
  }

  pause(): void {
    const run = this.run;
    if (!run || run.pausedAt !== null) return;
    if (run.kind === "step") run.pausedAt = performance.now();
    else {
      run.pausedAt = engine.ctx!.currentTime;
      window.clearInterval(this.timer);
      engine.synth?.silence();
    }
    this.emit({ paused: true });
  }

  resume(): void {
    const run = this.run;
    if (!run || run.pausedAt === null) return;
    if (run.kind === "step") {
      const now = performance.now();
      run.stepStartedAt += now - run.pausedAt;
      run.ignoreUntil = now + 300;
    } else {
      const ctx = engine.ctx!;
      // The clock stood still: the song picks up where it stopped.
      run.startAt += ctx.currentTime - run.pausedAt;
      this.timer = window.setInterval(() => this.schedule(), 25);
    }
    run.pausedAt = null;
    this.judge.reset();
    this.emit({ paused: false });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getView = (): View => this.view;

  private emit(patch: Partial<View>): void {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((l) => l());
  }

  /* ---------- lifecycle ---------- */

  async start(): Promise<void> {
    if (this.starting || this.disposed) return;
    this.stop();
    this.starting = true;
    const { ctx, synth } = engine.audio();
    synth.setVolume(this.options.volume);
    if (this.mode !== "listen") await engine.startMic();
    // Stop or a page change may have happened while the browser asked for the microphone.
    if (!this.starting || this.disposed) return;
    this.starting = false;
    engine.resetChroma();

    if (this.mode === "step") {
      const now = performance.now();
      const seq = this.stepSeq();
      this.run = {
        kind: "step", index: seq[0]!, stepStartedAt: now, durations: [], statuses: this.steps.map(() => ""),
        ignoreUntil: now + 300, slowHinted: false, lastFeedbackAt: 0, viewPosition: seq[0]!, seq, at: 0, pausedAt: null,
      };
      const first = this.steps[seq[0]!]!.chord;
      this.emit({
        ...this.idleView(),
        phase: "playing",
        current: first,
        next: this.steps[seq[1] ?? -1]?.chord ?? null,
        position: seq[0]!,
        total: seq.length,
        feedback: engine.micState === "on" ? { kind: "play", chord: first } : { kind: "micOff" },
      });
    } else {
      const beatsPerBar = this.song.beatsPerBar;
      const seq = this.barSeq();
      this.run = {
        kind: this.mode, startAt: ctx.currentTime + 0.3, beatSeconds: 60 / this.options.bpm, nextBeat: 0,
        totalBeats: this.loop ? Infinity : beatsPerBar * (seq.length + 1), statuses: this.bars.map(() => ""), judged: -1, judgeStart: 0,
        shownBeat: -2, lastFeedbackAt: 0, heardAnything: false, bpm: this.options.bpm, seq, pausedAt: null,
      };
      this.emit({ ...this.idleView(), phase: "playing", countIn: beatsPerBar, total: seq.length });
      this.timer = window.setInterval(() => this.schedule(), 25);
      this.schedule();
    }
    const tick = (now: number) => {
      this.frame(now);
      if (this.run) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.starting = false;
    const run = this.run;
    if (run && engine.synth) engine.synth.silence();
    // A loop never ends on its own: Stop is its end, with what was heard so far.
    if (run && this.loop && run.kind === "timed") {
      this.finishBeats(run);
      return;
    }
    if (run && this.loop && run.kind === "step") {
      this.finishStep(run, run.statuses.filter((s) => s === "ok").length);
      return;
    }
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.timer);
    this.run = null;
    if (this.view.phase === "playing") this.emit(this.idleView());
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.listeners.clear();
  }

  /** Step mode: move on without the microphone's approval. */
  skip(): void {
    const run = this.run;
    if (run?.kind === "step") this.advance(run, false, performance.now());
  }

  /* ---------- the accompaniment ---------- */

  private schedule(): void {
    const run = this.run;
    const ctx = engine.ctx;
    if (!run || run.kind === "step" || !ctx) return;
    while (run.nextBeat < run.totalBeats && run.startAt + run.nextBeat * run.beatSeconds < ctx.currentTime + 0.15) {
      this.playBeat(run, run.nextBeat, run.startAt + run.nextBeat * run.beatSeconds);
      run.nextBeat++;
    }
  }

  private playBeat(run: BeatRun, beatIndex: number, at: number): void {
    const synth = engine.synth!;
    const perBar = this.song.beatsPerBar;
    if (beatIndex < perBar) {
      synth.click(at, beatIndex === 0);
      return;
    }
    const barIndex = this.barAt(run, Math.floor((beatIndex - perBar) / perBar));
    if (barIndex < 0) return;
    const beat = (beatIndex - perBar) % perBar;
    const chord = this.bars[barIndex]!.chord;
    const listen = run.kind === "listen";
    const { click, band, guide } = this.options;
    const seconds = run.beatSeconds;

    if (click) synth.click(at, beat === 0);
    if (listen || band) {
      const b = bandEvents(beat, perBar, this.song.pattern);
      if (b.kick) synth.kick(at);
      b.hats.forEach((offset) => synth.hat(at + offset * seconds, offset === 0 ? 1 : 0.6));
      if (b.bass) synth.bass(chord, at, seconds * (perBar === 4 ? 1.9 : 2.8));
    }
    if (listen || guide) {
      for (const e of guitarEvents(this.song.pattern, beat, perBar)) {
        const when = at + e.at * seconds;
        if (e.kind === "strum") synth.strum(chord, when, e.direction, e.strings);
        else synth.bassString(chord, when, e.alternate);
      }
    }
  }

  /* ---------- listening ---------- */

  private frame(now: number): void {
    const run = this.run;
    if (!run || run.pausedAt !== null) return;
    const frame = engine.micState === "on" ? engine.read() : null;
    if (run.kind === "step") this.stepFrame(run, frame, now);
    else this.beatFrame(run, frame, now);
  }

  private feedbackFor(match: ChordMatch, chord: ChordId): { feedback: Feedback; flagged: number[] } | null {
    if (match.best !== chord && match.bestScore > 0.75) {
      return { feedback: { kind: "heard", chord, heard: match.best }, flagged: [] };
    }
    const fix = fixFor(chord, match.missing, match.silent);
    if (!fix) return null;
    const flagged = [...new Set([...stringsForPitchClasses(CHORDS[chord], match.missing), ...match.silent])];
    if (fix.kind === "strumStrings") return { feedback: { kind: "strumStrings", chord, strings: fix.strings }, flagged };
    if (fix.kind === "pressFinger") {
      const note = CHORDS[chord].notes[fix.string]! % 12;
      return { feedback: { kind: "pressFinger", chord, note, finger: fix.finger, string: fix.string, fret: fix.fret }, flagged };
    }
    return { feedback: { kind: "freeOpenString", chord, string: fix.string }, flagged };
  }

  private stepFrame(run: StepRun, frame: Frame | null, now: number): void {
    run.viewPosition += (run.index - run.viewPosition) * 0.15;
    const step = this.steps[run.index];
    if (!step) return;
    if (!run.slowHinted && now - run.stepStartedAt > SLOW_HINT_MS && frame) {
      run.slowHinted = true;
      this.emit({ feedback: { kind: "slowDown" } });
    }
    if (!frame || now < run.ignoreUntil) return;
    const verdict = this.judge.feed(frame, step.chord, SILENCE);
    if (!verdict || verdict.kind === "noise") return;
    const match = verdict.match;
    if (match.clean) {
      this.advance(run, true, now);
      return;
    }
    if (now - run.stepStartedAt > 1200 && now - run.lastFeedbackAt > 350) {
      const said = this.feedbackFor(match, step.chord);
      if (said) {
        run.lastFeedbackAt = now;
        this.emit(said);
      }
    }
  }

  private advance(run: StepRun, heard: boolean, now: number): void {
    const done = this.steps[run.index]!;
    run.statuses[run.index] = heard ? "ok" : "skip";
    if (heard) {
      run.durations.push(now - run.stepStartedAt);
      engine.synth?.chime();
    }
    run.at++;
    if (run.at >= run.seq.length && this.loop) {
      // Another pass of the part: the verdicts of the last one go, the times stay.
      run.at = 0;
      for (const i of run.seq) run.statuses[i] = "";
    }
    run.index = run.seq[run.at] ?? this.steps.length;
    run.stepStartedAt = now;
    run.slowHinted = false;
    run.ignoreUntil = now + 250;
    engine.resetChroma();
    this.judge.reset();
    const right = run.statuses.filter((s) => s === "ok").length;
    const step = this.steps[run.index];
    if (!step) {
      this.emit({ statuses: [...run.statuses] });
      this.finishStep(run, right);
      return;
    }
    this.emit({
      current: step.chord,
      next: this.steps[run.seq[run.at + 1] ?? (this.loop ? run.seq[0]! : -1)]?.chord ?? null,
      position: run.index,
      statuses: [...run.statuses],
      right,
      flagged: [],
      feedback: heard ? { kind: "right", chord: done.chord } : engine.micState === "on" ? { kind: "play", chord: step.chord } : { kind: "micOff" },
    });
  }

  private finishStep(run: StepRun, right: number): void {
    const complete = run.durations.length === this.steps.length && !this.partial;
    const averageMs = run.durations.length > 0 ? run.durations.reduce((a, b) => a + b, 0) / run.durations.length : null;
    // A part of the song, or a repeat, is practice: a record is the whole song once.
    const isRecord = complete && averageMs !== null
      ? this.recordRun({ songId: this.song.id, mode: "step", value: Math.round(averageMs) })
      : false;
    const ready = averageMs !== null && readyForTimed(averageMs, this.options.bpm, this.song.beatsPerBar);
    this.finish({ right, feedback: null, flagged: [], result: { mode: "step", averageMs, complete, ready, isRecord, partial: this.partial } });
  }

  private beatFrame(run: BeatRun, frame: Frame | null, now: number): void {
    const ctx = engine.ctx!;
    const perBar = this.song.beatsPerBar;
    const position = (ctx.currentTime - run.startAt) / run.beatSeconds;
    if (position >= run.totalBeats) {
      this.finishBeats(run);
      return;
    }

    const whole = Math.floor(position);
    if (whole !== run.shownBeat) {
      run.shownBeat = whole;
      // k counts bars of the run; bar is the real bar of the song it plays.
      const k = position < perBar ? -1 : Math.floor((position - perBar) / perBar);
      const bar = this.barAt(run, k);
      const current = this.bars[Math.max(bar, 0)]!;
      const nextK = this.nextChangeInRun(run, Math.max(k, 0));
      const changeBar = nextK < 0 ? -1 : this.barAt(run, nextK);
      if (this.loop && k >= 0 && k % run.seq.length === 0 && k > 0 && position - perBar - k * perBar < 1) {
        // A new pass of the part: the verdicts of the last one go.
        for (const i of run.seq) run.statuses[i] = "";
      }
      this.emit({
        current: current.chord,
        next: changeBar < 0 ? null : this.bars[changeBar]!.chord,
        beatsToNext: k < 0 || nextK < 0 ? null : perBar + nextK * perBar - whole,
        countIn: k < 0 ? perBar - Math.max(whole, 0) : null,
        beat: whole < 0 ? -1 : ((whole % perBar) + perBar) % perBar,
        section: bar < 0 ? null : { name: current.section, pass: current.pass, position: current.position, length: current.passLength },
        position: bar,
        statuses: [...run.statuses],
      });
    }

    if (run.kind !== "timed" || !frame) return;
    // With the guide guitar on, the room holds our chord on every bar: nothing can be judged, the run is practice.
    if (this.options.guide) return;
    const judgedK = Math.floor((position - perBar + EARLY_BEATS) / perBar);
    if (judgedK !== run.judged) {
      this.closeBar(run, this.barAt(run, run.judged));
      run.judged = judgedK;
      run.judgeStart = position;
      engine.resetChroma();
      this.judge.reset();
    }
    const judged = this.barAt(run, judgedK);
    const bar = this.bars[judged];
    if (!bar) return;
    const verdict = this.judge.feed(frame, bar.chord, SILENCE);
    if (!verdict || verdict.kind === "noise" || run.statuses[judged] === "ok") return;
    run.heardAnything = true;
    const match = verdict.match;
    if (match.clean) {
      run.statuses[judged] = "ok";
      this.emit({
        right: run.statuses.filter((s) => s === "ok").length,
        statuses: [...run.statuses],
        feedback: { kind: "right", chord: bar.chord },
        flagged: [],
      });
      return;
    }
    if (position - run.judgeStart > 1 && now - run.lastFeedbackAt > 350) {
      const said = this.feedbackFor(match, bar.chord);
      if (said) {
        run.lastFeedbackAt = now;
        this.emit(said);
      }
    }
  }

  /** The run position of the next bar whose chord differs from the one at `k`, or -1. */
  private nextChangeInRun(run: BeatRun, k: number): number {
    const chord = this.bars[this.barAt(run, k)]?.chord;
    const limit = this.loop ? k + run.seq.length : run.seq.length - 1;
    for (let j = k + 1; j <= limit; j++) {
      const bar = this.barAt(run, j);
      if (bar < 0) return -1;
      if (this.bars[bar]!.chord !== chord) return j;
    }
    return -1;
  }

  private closeBar(run: BeatRun, index: number): void {
    if (index >= 0 && index < this.bars.length && run.statuses[index] !== "ok") {
      run.statuses[index] = "miss";
      this.emit({ statuses: [...run.statuses] });
    }
  }

  private finishBeats(run: BeatRun): void {
    if (run.kind === "listen") {
      this.finish({ result: { mode: "listen" } });
      return;
    }
    this.closeBar(run, this.barAt(run, run.judged));
    const right = run.statuses.filter((s) => s === "ok").length;
    if (this.options.guide) {
      // Our guitar was in the room: practice, nothing to score or save.
      this.finish({ right, result: { mode: "timed", share: null, passed: false, missedChords: [], isRecord: false, guided: true } });
      return;
    }
    if (!run.heardAnything) {
      this.finish({ right, result: { mode: "timed", share: null, passed: false, missedChords: [], isRecord: false } });
      return;
    }
    const share = right / run.seq.length;
    const misses = new Map<ChordId, number>();
    run.statuses.forEach((s, i) => {
      if (s === "miss") misses.set(this.bars[i]!.chord, (misses.get(this.bars[i]!.chord) ?? 0) + 1);
    });
    const missedChords = [...misses.entries()].map(([chord, bars]) => ({ chord, bars })).sort((a, b) => b.bars - a.bars).slice(0, 3);
    // A part of the song, or a repeat, is practice: a record is the whole song once.
    const isRecord = this.partial ? false : this.recordRun({ songId: this.song.id, mode: "timed", value: Number(share.toFixed(4)), bpm: run.bpm });
    this.finish({ right, result: { mode: "timed", share, passed: !this.partial && share >= PASS_SCORE, missedChords, isRecord, partial: this.partial } });
  }

  private finish(patch: Partial<View>): void {
    const run = this.run;
    // Keep the statuses: the coloured blocks are the report.
    if (run) this.lastReport = this.layoutOf(run).items.map(({ chord, status }) => ({ chord, status }));
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.timer);
    this.run = null;
    this.emit({ phase: "done", countIn: null, beat: -1, beatsToNext: null, ...patch });
  }

  /* ---------- what the lane draws ---------- */

  private lastReport: { chord: ChordId; status: Status }[] = [];
  /** One verdict per strum: the tail of a chord and the fingers moving between two are not judged. */
  private readonly judge = new StrumJudge();

  /** Every bar or step of the last finished run with its verdict. */
  report(): { chord: ChordId; status: Status }[] {
    return this.lastReport;
  }

  private layoutOf(run: Run | null): Layout {
    if (this.mode === "step") {
      const statuses = run?.kind === "step" ? run.statuses : [];
      return {
        items: this.steps.map((s, i) => ({ chord: s.chord, start: i, length: 1, status: statuses[i] ?? "" })),
        position: run?.kind === "step" ? run.viewPosition : 0,
        unit: 120,
        beatsPerBar: null,
      };
    }
    const perBar = this.song.beatsPerBar;
    const statuses = run && run.kind !== "step" ? run.statuses : [];
    let position = run && run.kind !== "step" && engine.ctx ? (engine.ctx.currentTime - run.startAt) / run.beatSeconds : 0;
    if (run && run.kind !== "step" && position >= perBar) {
      // The lane is drawn in song bars: put the run's bar where it sits in the song.
      const k = Math.floor((position - perBar) / perBar);
      const bar = this.barAt(run, k);
      if (bar >= 0) position = perBar + bar * perBar + (position - perBar - k * perBar);
    }
    return {
      items: this.bars.map((b, i) => ({ chord: b.chord, start: perBar + i * perBar, length: perBar, status: statuses[i] ?? "" })),
      position,
      unit: 30,
      beatsPerBar: perBar,
    };
  }

  layout(): Layout {
    return this.layoutOf(this.run);
  }
}
