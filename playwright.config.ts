import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixtures = fileURLToPath(new URL("./tests/e2e/fixtures/", import.meta.url));

const fakeMic = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-audio-capture=${fixtures}em-am.wav`,
  "--autoplay-policy=no-user-gesture-required",
];

/**
 * The microphone is Chromium's fake device playing a generated WAV: the same
 * strum the app's tests synthesise, so recognition is exercised end to end.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
    permissions: ["microphone"],
  },
  // Chromium keeps one fake microphone per browser, still playing from wherever
  // the previous test left it. The timed test scores bars against the clock,
  // so it gets a browser of its own, where the recording starts with the run.
  projects: [
    { name: "em-am", grepInvert: /@own-browser/, use: { launchOptions: { args: fakeMic } } },
    { name: "em-am-timed", grep: /@own-browser/, use: { launchOptions: { args: fakeMic } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm start -p 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 60_000 },
});
