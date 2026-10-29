import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * 2.4 s per chord: one bar at 100 beats per minute, the app's default.
 * em-am.wav alternates the two chords, for step mode and learning.
 * em-only.wav strums Em and nothing else, for timed mode: whatever the phase of
 * the recording, the Em bars are right and the Am bars are wrong, so the score
 * is the same every run.
 */
export default function globalSetup() {
  const dir = fileURLToPath(new URL("./fixtures/", import.meta.url));
  const env = { ...process.env, SECONDS_PER: "2.4" };
  execFileSync("node", [`${dir}make-wav.mjs`, `${dir}em-am.wav`, "Em", "Em", "Am", "Am"], { env });
  execFileSync("node", [`${dir}make-wav.mjs`, `${dir}em-only.wav`, "Em", "Em", "Em", "Em"], { env });
}
