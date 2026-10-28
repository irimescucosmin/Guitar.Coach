// Screenshots of every screen, for comparing with the design.
// Usage: pnpm shots [base-url]   (default http://localhost:3000, server already running)
// Output: screenshots/*.png at 1440x960, with some guest progress so no screen is empty.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:3000";
const out = fileURLToPath(new URL("../screenshots/", import.meta.url));
const wav = fileURLToPath(new URL("../tests/e2e/fixtures/em-am.wav", import.meta.url));
mkdirSync(out, { recursive: true });

// The fake microphone plays the e2e strums, so the play screen shows real verdicts.
const args = existsSync(wav)
  ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`]
  : [];
const browser = await chromium.launch({ args });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, permissions: ["microphone"] });
const page = await context.newPage();

await page.goto(base);
await page.evaluate(() =>
  localStorage.setItem(
    "guitar-coach:progress",
    JSON.stringify({ learned: { Em: true, Am: true, G: true }, best: { notes: { step: 3400 }, "drill-em-am": { step: 1800, timed: 0.88 } } }),
  ),
);

const screens = [
  ["path", "/"],
  ["fretboard", "/fretboard"],
  ["songs", "/songs"],
  ["chords", "/chords"],
  ["learn", "/chords/G"],
  ["tools", "/tools"],
  ["account", "/account"],
];
for (const [name, path] of screens) {
  await page.goto(base + path);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}${name}.png`, fullPage: true });
}

// The play screen is worth seeing mid-run: start it and wait a few bars.
await page.goto(`${base}/play/drill-em-am?mode=timed`);
await page.getByRole("button", { name: /Avvia|Start/ }).click();
await page.waitForTimeout(9000);
await page.screenshot({ path: `${out}play.png`, fullPage: true });

await browser.close();
console.log(`Screenshots in ${out}`);
