import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** 2.4 s per chord: one bar at 100 beats per minute, the app's default. */
export default function globalSetup() {
  const dir = fileURLToPath(new URL("./fixtures/", import.meta.url));
  execFileSync("node", [`${dir}make-wav.mjs`, `${dir}em-am.wav`, "Em", "Em", "Am", "Am"], {
    env: { ...process.env, SECONDS_PER: "2.4" },
  });
}
