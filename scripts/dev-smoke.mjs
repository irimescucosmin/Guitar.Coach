// Starts the dev server (Turbopack) and asks it for one page: a module error
// that only Turbopack produces (an `export type` from a "use server" file) is
// invisible to tsc and to `next build`, and this is how it gets caught.
import { spawn } from "node:child_process";

const port = 3101;
const server = spawn("pnpm", ["exec", "next", "dev", "--turbopack", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, AUTH_RATE_LIMIT: "off" } });
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
const stop = () => server.kill("SIGTERM");

const deadline = Date.now() + 90_000;
let status = 0;
while (Date.now() < deadline) {
  try {
    status = (await fetch(`http://localhost:${port}/account`)).status;
    if (status === 200) break;
    if (status >= 500) break;
  } catch {
    // not up yet
  }
  await new Promise((r) => setTimeout(r, 1000));
}
stop();
if (status !== 200) {
  console.error(`dev smoke: /account answered ${status || "nothing"}\n${log.slice(-3000)}`);
  process.exit(1);
}
console.log("dev smoke: ok");
