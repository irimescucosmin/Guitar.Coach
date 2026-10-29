import { MIME_TYPES } from "@/lib/music/recordings";

/**
 * Records the microphone while a run plays. Thin on purpose: start, stop,
 * get the file. What is recorded is what the microphone hears, the band from
 * the speakers included, which is also what the player heard.
 */
export class Recorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  static supported(): boolean {
    return typeof MediaRecorder !== "undefined" && Recorder.mimeType() !== null;
  }

  /** The first container this browser can write, in the order the server accepts. */
  static mimeType(): string | null {
    if (typeof MediaRecorder === "undefined") return null;
    for (const base of MIME_TYPES) {
      for (const mime of [`${base};codecs=opus`, base]) if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return null;
  }

  start(stream: MediaStream): boolean {
    const mime = Recorder.mimeType();
    if (!mime) return false;
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64_000 });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
    this.startedAt = performance.now();
    return true;
  }

  /** Stops and hands back the file, or null if nothing was recording. */
  stop(): Promise<{ blob: Blob; durationMs: number } | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    this.recorder = null;
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType });
        this.chunks = [];
        resolve({ blob, durationMs: Math.round(performance.now() - this.startedAt) });
      };
      recorder.stop();
    });
  }

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }
}
