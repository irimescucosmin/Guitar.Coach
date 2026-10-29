/**
 * Sung versions of the traditional songs, made with ElevenLabs' music API.
 *
 *   pnpm sung tom-dooley clementine   # these songs
 *   pnpm sung --all                   # every traditional song without a file yet
 *   pnpm sung --check tom-dooley      # only the chord check on a file already made
 *   pnpm sung --plan tom-dooley       # print the plan, call nothing
 *
 * Needs ELEVENLABS_API_KEY (in .env.local, never committed) and a paid plan:
 * the music API is not on the free one. Each song costs credits: generate the
 * ones you want, not all of them every time.
 *
 * Every file goes through a chord check before it is kept: ffmpeg decodes it,
 * every bar is read with the app's own detector (`detect.ts`), and the share
 * of bars whose strongest chord is the one written is printed. Below
 * KEEP_FROM the file goes to `.sung-rejected/` instead of `public/sung/`:
 * the model takes chords as style words, not as orders, and sometimes wanders.
 * The check reads a guitar under a voice, so it is a filter, not a proof:
 * listen to what it keeps.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromaFromSpectrum, matchChord } from "../src/lib/audio/detect";
import { SONGS, barsOf, findSong, type Song } from "../src/lib/music/songs";
import { SUNG_BPM, compositionPlan } from "../src/lib/music/sung-plan";

const OUT = join(process.cwd(), "public", "sung");
const REJECTED = join(process.cwd(), ".sung-rejected");
const KEEP_FROM = 0.6;
const SAMPLE_RATE = 44_100;
const FFT = 16_384;

function apiKey(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const env = join(process.cwd(), ".env.local");
  if (existsSync(env)) {
    const line = readFileSync(env, "utf8").split("\n").find((l) => l.startsWith("ELEVENLABS_API_KEY="));
    const value = line?.slice("ELEVENLABS_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
    if (value) return value;
  }
  throw new Error("ELEVENLABS_API_KEY is missing: put it in .env.local (never in git).");
}

async function generate(song: Song): Promise<Buffer> {
  const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify({ model_id: "music_v1", composition_plan: compositionPlan(song), respect_sections_durations: true }),
  });
  if (!response.ok) throw new Error(`${song.id}: ElevenLabs answered ${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Mono samples at SAMPLE_RATE, through ffmpeg. */
function decode(file: string): Float32Array {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(angle * k);
        const wi = Math.sin(angle * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b]! * wr - im[b]! * wi;
        const ti = re[b]! * wi + im[b]! * wr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
      }
    }
  }
}

/** A Hann-windowed spectrum in dB, the shape an AnalyserNode gives the app. */
function spectrumDb(samples: Float32Array, from: number): Float32Array {
  const re = new Float64Array(FFT);
  const im = new Float64Array(FFT);
  for (let i = 0; i < FFT; i++) re[i] = (samples[from + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1)));
  fft(re, im);
  const db = new Float32Array(FFT / 2);
  for (let i = 0; i < FFT / 2; i++) db[i] = 20 * Math.log10(Math.hypot(re[i]!, im[i]!) / (FFT / 4) + 1e-12);
  return db;
}

/** The share of bars whose strongest chord is the written one, and the bars that are not. */
function checkChords(song: Song, file: string): { share: number; wrong: string[] } {
  const samples = decode(file);
  const bars = barsOf(song);
  const barSamples = Math.round(((song.beatsPerBar * 60) / SUNG_BPM) * SAMPLE_RATE);
  const wrong: string[] = [];
  let right = 0;
  bars.forEach((bar, i) => {
    const start = i * barSamples;
    const sum = new Float32Array(12);
    for (let at = start; at + FFT <= start + barSamples + FFT / 2; at += FFT / 2) {
      const chroma = chromaFromSpectrum(spectrumDb(samples, at), SAMPLE_RATE, FFT);
      for (let k = 0; k < 12; k++) sum[k]! += chroma[k]!;
    }
    const max = Math.max(...sum);
    if (max > 0) for (let k = 0; k < 12; k++) sum[k]! /= max;
    const match = matchChord(sum, bar.chord);
    if (match.best === bar.chord) right += 1;
    else wrong.push(`${i + 1}:${bar.chord}→${match.best}`);
  });
  return { share: right / bars.length, wrong };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (f: string) => args.includes(f);
  const ids = args.filter((a) => !a.startsWith("--"));
  const traditional = SONGS.filter((s) => s.group === "traditional");
  const songs = flag("--all") ? traditional.filter((s) => !existsSync(join(OUT, `${s.id}.mp3`))) : ids.map((id) => findSong(id));
  if (songs.length === 0) throw new Error("Name the songs (pnpm sung tom-dooley) or pass --all.");
  for (const song of songs) {
    if (!song || song.group !== "traditional") throw new Error("Only traditional songs have a sung version: the others are protected.");
  }
  mkdirSync(OUT, { recursive: true });
  for (const song of songs as Song[]) {
    if (flag("--plan")) {
      console.log(JSON.stringify(compositionPlan(song), null, 2));
      continue;
    }
    const kept = join(OUT, `${song.id}.mp3`);
    let file = kept;
    if (!flag("--check")) {
      console.log(`${song.id}: generating…`);
      mkdirSync(REJECTED, { recursive: true });
      file = join(REJECTED, `${song.id}.mp3`);
      writeFileSync(file, await generate(song));
    }
    const { share, wrong } = checkChords(song, file);
    console.log(`${song.id}: ${Math.round(share * 100)}% of bars on the written chord${wrong.length ? ` (off: ${wrong.slice(0, 12).join(" ")}${wrong.length > 12 ? " …" : ""})` : ""}`);
    if (flag("--check")) continue;
    if (share >= KEEP_FROM) {
      writeFileSync(kept, readFileSync(file));
      console.log(`  kept: public/sung/${song.id}.mp3`);
    } else console.log(`  below ${KEEP_FROM * 100}%: left in .sung-rejected/ to listen to, not published`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
