"use client";

import { CHORDS, alternateBassString, type ChordId } from "@/lib/music/chords";
import { frequencyFromMidi } from "./detect";

/**
 * The accompaniment: a plucked guitar (Karplus-Strong), a bass, a small kit and
 * a click. Every sound the microphone could confuse with the player is kept
 * out of the band the chord detector listens to (75 Hz to 1.1 kHz) except the
 * guide guitar, which the screen tells you to hear through headphones.
 */

const PLUCK_SECONDS = 2.2;
const STRUM_SPREAD = 0.011;

export class Synth {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly guitarBus: GainNode;
  private readonly bandBus: GainNode;
  private readonly clickBus: GainNode;
  private readonly buffers = new Map<number, AudioBuffer>();
  private readonly ringing: ({ gain: GainNode; at: number } | null)[] = [null, null, null, null, null, null];
  private noise: AudioBuffer | null = null;
  /** Every source still scheduled or sounding, so Stop can cut them all. */
  private readonly live = new Set<AudioScheduledSourceNode>();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.guitarBus = this.bus(0.9);
    this.bandBus = this.bus(0.8);
    this.clickBus = this.bus(0.7);
  }

  private bus(gain: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.master);
    return g;
  }

  private track<T extends AudioScheduledSourceNode>(node: T): T {
    this.live.add(node);
    node.addEventListener("ended", () => this.live.delete(node));
    return node;
  }

  setVolume(volume: number): void {
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  /** Builds every buffer the chords need, so the first strum does not stutter. */
  warmUp(): void {
    for (const chord of Object.values(CHORDS)) for (const n of chord.notes) if (n !== null) this.pluck(n);
  }

  private pluck(midi: number): AudioBuffer {
    const cached = this.buffers.get(midi);
    if (cached) return cached;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * PLUCK_SECONDS);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const out = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / frequencyFromMidi(midi)));
    const ring = new Float32Array(period);
    // Softened noise sounds like a pick on a steel string rather than a harpsichord.
    let previous = 0;
    for (let i = 0; i < period; i++) {
      previous = 0.5 * previous + 0.5 * (Math.random() * 2 - 1);
      ring[i] = previous;
    }
    const decay = 0.996;
    let index = 0;
    for (let i = 0; i < length; i++) {
      const a = ring[index]!;
      const b = ring[(index + 1) % period]!;
      out[i] = a;
      ring[index] = decay * 0.5 * (a + b);
      index = (index + 1) % period;
    }
    this.buffers.set(midi, buffer);
    return buffer;
  }

  private note(midi: number, at: number, gain: number, string: number): void {
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.pluck(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    src.connect(g);
    g.connect(this.guitarBus);
    // A string sounds one note at a time: the new pluck stops the old one.
    const previous = this.ringing[string];
    if (previous && previous.at < at) previous.gain.gain.setTargetAtTime(0.0001, at, 0.012);
    this.ringing[string] = { gain: g, at };
    src.start(at);
    src.stop(at + PLUCK_SECONDS);
  }

  strum(chordId: ChordId, at: number, direction: "down" | "up" = "down", strings: "all" | "treble" = "all"): void {
    const chord = CHORDS[chordId];
    let order = chord.notes.flatMap((n, i) => (n === null ? [] : [i]));
    if (strings === "treble") order = order.slice(-4);
    if (direction === "up") order = order.reverse();
    const gain = direction === "up" ? 0.15 : 0.22;
    order.forEach((string, k) => this.note(chord.notes[string]!, at + k * STRUM_SPREAD, gain, string));
  }

  bassString(chordId: ChordId, at: number, alternate: boolean): void {
    const chord = CHORDS[chordId];
    const string = alternate ? alternateBassString(chord) : chord.bassString;
    this.note(chord.notes[string]!, at, 0.32, string);
  }

  /** An octave under the guitar's bass note: below what the detector hears. */
  bass(chordId: ChordId, at: number, seconds: number): void {
    const chord = CHORDS[chordId];
    const midi = chord.notes[chord.bassString]! - 12;
    const osc = this.track(this.ctx.createOscillator());
    osc.type = "triangle";
    osc.frequency.value = frequencyFromMidi(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(g);
    g.connect(this.bandBus);
    osc.start(at);
    osc.stop(at + seconds + 0.05);
  }

  kick(at: number): void {
    const osc = this.track(this.ctx.createOscillator());
    osc.frequency.setValueAtTime(110, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    osc.connect(g);
    g.connect(this.bandBus);
    osc.start(at);
    osc.stop(at + 0.3);
  }

  hat(at: number, accent = 1): void {
    if (!this.noise) {
      const length = Math.floor(this.ctx.sampleRate * 0.1);
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12 * accent, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bandBus);
    src.start(at);
    src.stop(at + 0.06);
  }

  /** Above 1.1 kHz, so the detector never mistakes it for a note. */
  click(at: number, accent: boolean): void {
    const osc = this.track(this.ctx.createOscillator());
    osc.frequency.value = accent ? 2600 : 1900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.28, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    osc.connect(g);
    g.connect(this.clickBus);
    osc.start(at);
    osc.stop(at + 0.06);
  }

  /** The "well done" sound, also above the detector's band. */
  chime(): void {
    const at = this.ctx.currentTime + 0.01;
    [1760, 2637].forEach((hz, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz;
      const g = this.ctx.createGain();
      const start = at + i * 0.07;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(g);
      g.connect(this.clickBus);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  /** Cuts everything still ringing or already scheduled, for Stop. */
  silence(): void {
    const now = this.ctx.currentTime;
    for (const node of this.live) {
      try {
        node.stop(now);
      } catch {
        /* already stopped */
      }
    }
    this.live.clear();
    this.ringing.fill(null);
  }
}
