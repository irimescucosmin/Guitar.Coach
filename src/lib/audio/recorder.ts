import { MAX_SECONDS, MIME_TYPES } from "@/lib/music/recordings";

/**
 * Records the microphone while a run plays. Thin on purpose: start, stop,
 * get the file. What is recorded is what the microphone hears, the band from
 * the speakers included, which is also what the player heard.
 */
export class Recorder {
  private recorder: MediaRecorder | null = null;
  private file: Promise<{ blob: Blob; durationMs: number } | null> | null = null;
  private limit = 0;

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

  /**
   * Starts, and stops by itself at MAX_SECONDS: a step-mode run has no end of
   * its own, and a longer file would only be refused. The chunks belong to
   * this start: a run started before the previous file is assembled cannot
   * mix with it.
   */
  start(stream: MediaStream): boolean {
    const mime = Recorder.mimeType();
    if (!mime) return false;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64_000 });
    const startedAt = performance.now();
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    this.file = new Promise((resolve) => {
      recorder.onstop = () => {
        this.ended(recorder);
        resolve({ blob: new Blob(chunks, { type: recorder.mimeType }), durationMs: Math.round(performance.now() - startedAt) });
      };
      recorder.onerror = () => {
        this.ended(recorder);
        resolve(null);
      };
    });
    this.recorder = recorder;
    this.limit = window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, MAX_SECONDS * 1000);
    recorder.start(1000);
    return true;
  }

  private ended(recorder: MediaRecorder): void {
    if (this.recorder !== recorder) return;
    this.recorder = null;
    window.clearTimeout(this.limit);
  }

  /**
   * Stops if still recording, and hands back the last file: also one the
   * recorder ended on its own (the limit, the microphone gone), which is
   * what there is. Null if nothing was started since the last stop.
   */
  stop(): Promise<{ blob: Blob; durationMs: number } | null> {
    const recorder = this.recorder;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    const file = this.file;
    this.file = null;
    return file ?? Promise.resolve(null);
  }

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }
}
