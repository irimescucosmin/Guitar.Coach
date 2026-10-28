// Writes a WAV of strummed chords (Karplus-Strong) to feed Chromium's fake microphone.
// Usage: SECONDS_PER=2.4 node make-wav.mjs out.wav Em Em Am Am
import { writeFileSync } from "node:fs";
const rate = 48000;
const OPEN = [40, 45, 50, 55, 59, 64];
const SHAPES = { Em: [0,2,2,0,0,0], Am: [-1,0,2,2,1,0], G: [3,2,0,0,0,3], C: [-1,3,2,0,1,0] };
const [,, out, ...seq] = process.argv; // e.g. out.wav Em Am
const secondsPer = Number(process.env.SECONDS_PER ?? 2.5);
const total = Math.floor(rate * secondsPer * seq.length);
const buf = new Float32Array(total);
function pluck(midi, start, gain) {
  const f = 440 * 2 ** ((midi - 69) / 12), N = Math.round(rate / f);
  const ring = new Float32Array(N); let p = 0;
  for (let i = 0; i < N; i++) { p = 0.5 * p + 0.5 * (Math.random() * 2 - 1); ring[i] = p; }
  let idx = 0;
  for (let i = 0; start + i < total && i < rate * secondsPer; i++) {
    const a = ring[idx], b = ring[(idx + 1) % N];
    buf[start + i] += a * gain; ring[idx] = 0.996 * 0.5 * (a + b); idx = (idx + 1) % N;
  }
}
seq.forEach((name, k) => {
  const start = Math.floor(k * secondsPer * rate);
  SHAPES[name].forEach((fret, s) => { if (fret >= 0) pluck(OPEN[s] + fret, start + s * 500, 0.25); });
});
const pcm = Buffer.alloc(44 + total * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + total * 2, 4); pcm.write("WAVE", 8); pcm.write("fmt ", 12);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(rate, 24);
pcm.writeUInt32LE(rate * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(total * 2, 40);
for (let i = 0; i < total; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 20000))), 44 + i * 2);
writeFileSync(out, pcm);
console.log(out, (total / rate).toFixed(1), "s");
