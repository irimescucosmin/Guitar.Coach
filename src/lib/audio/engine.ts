"use client";

import { OnsetDetector, chromaFromSpectrum, rms, smoothChroma } from "./detect";
import { Synth } from "./synth";

/**
 * One AudioContext for the whole app, created on the first tap (browsers
 * refuse sound and microphone before a gesture), shared by the synth and the
 * microphone so their clocks agree.
 */

/** "insecure": the page is on plain http away from localhost, where browsers hide the microphone. */
export type MicState = "off" | "starting" | "on" | "denied" | "unsupported" | "insecure";

export interface Frame {
  level: number;
  chroma: Float32Array;
  /** A new strum: the level jumped well above its recent average. */
  attack: boolean;
  /** Raw samples, for the tuner. */
  samples: Float32Array;
  /** Magnitude per bin in dB, for the per-string check. */
  spectrum: Float32Array;
  sampleRate: number;
  fftSize: number;
  /** performance.now() of the frame. */
  now: number;
  /** A guitar note of ours is in the room (a listen, the guide): the frame proves nothing. */
  ownSound: boolean;
}

const FFT_SIZE = 16_384;

class Engine {
  ctx: AudioContext | null = null;
  synth: Synth | null = null;
  micState: MicState = "off";
  /** The microphone's stream while it is on, for recording. */
  stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private spectrum: Float32Array<ArrayBuffer> | null = null;
  private samples: Float32Array<ArrayBuffer> | null = null;
  private chroma: Float32Array = new Float32Array(12);
  private readonly onsets = new OnsetDetector();
  private listeners = new Set<() => void>();

  audio(): { ctx: AudioContext; synth: Synth } {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.synth = new Synth(this.ctx);
      this.synth.warmUp();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return { ctx: this.ctx, synth: this.synth! };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setMic(state: MicState): void {
    this.micState = state;
    this.listeners.forEach((l) => l());
  }

  private pending: Promise<boolean> | null = null;

  /** Safe to call twice: a second call waits for the first prompt instead of opening another. */
  startMic(): Promise<boolean> {
    if (this.micState === "on") return Promise.resolve(true);
    this.pending ??= this.openMic().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async openMic(): Promise<boolean> {
    if (!window.isSecureContext) {
      this.setMic("insecure");
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setMic("unsupported");
      return false;
    }
    // Before the await: Safari only lets an AudioContext run if it is made inside the tap.
    const { ctx } = this.audio();
    this.setMic("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // The browser's voice processing would erase the very notes we listen for.
        // Echo cancellation was tried to take our own playback out of the microphone:
        // Chromium's AEC silenced the whole capture (the e2e microphone heard nothing),
        // so our own sound is handled by marking the frames instead (ownSound).
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      // A microphone unplugged or revoked must not look "on" while hearing silence.
      stream.getAudioTracks().forEach((track) =>
        track.addEventListener("ended", () => {
          this.analyser = null;
          this.stream = null;
          this.setMic("off");
        }),
      );
      this.stream = stream;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.5;
      ctx.createMediaStreamSource(stream).connect(analyser);
      this.analyser = analyser;
      this.spectrum = new Float32Array(analyser.frequencyBinCount);
      this.samples = new Float32Array(analyser.fftSize);
      this.setMic("on");
      return true;
    } catch {
      this.setMic("denied");
      return false;
    }
  }

  /** Call once per animation frame while listening. */
  read(): Frame | null {
    if (!this.analyser || !this.spectrum || !this.samples || !this.ctx) return null;
    this.analyser.getFloatTimeDomainData(this.samples);
    this.analyser.getFloatFrequencyData(this.spectrum);
    const level = rms(this.samples);
    const now = performance.now();
    // A strum is a jump of energy across the bins, which a ringing chord does not hide.
    const attack = this.onsets.feed(this.spectrum, this.ctx.sampleRate, FFT_SIZE, now) && level > SILENCE;
    if (attack) this.chroma = new Float32Array(12);
    this.chroma = smoothChroma(this.chroma, chromaFromSpectrum(this.spectrum, this.ctx.sampleRate, FFT_SIZE));
    const ownSound = this.synth !== null && this.ctx.currentTime < this.synth.guitarUntil;
    return { level, chroma: this.chroma, attack, samples: this.samples, spectrum: this.spectrum, sampleRate: this.ctx.sampleRate, fftSize: FFT_SIZE, now, ownSound };
  }

  /** Forget the last chord, when the expected chord changes. */
  resetChroma(): void {
    this.chroma = new Float32Array(12);
  }
}

export const engine = new Engine();

/** Below this level nothing is being played. */
export const SILENCE = 0.008;
