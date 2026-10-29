// Draws the figures of the Basics page with Recraft and saves them in
// public/figures/<id>.svg. The prompts are in scripts/figures.json; the style
// sentence is prepended to each so the four look like one set, and each
// figure's "mustShow" list is what to check by eye before committing it: a
// generated figure that contradicts the text teaches the wrong thing.
//
// Usage: pnpm figures [id ...], with RECRAFT_API_TOKEN in .env.local.
// Model: FIGURES_MODEL (default recraftv4_1, raster, about $0.035 a figure).
// Image URLs from the API last a day: this script downloads them at once.
import nextEnv from "@next/env";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Plain node reads no .env file: same loader the app uses, same precedence.
nextEnv.loadEnvConfig(process.cwd());

const token = process.env.RECRAFT_API_TOKEN;
if (!token) {
  console.error("RECRAFT_API_TOKEN is not set (keys: https://www.recraft.ai/profile/api)");
  process.exit(1);
}
const root = fileURLToPath(new URL("../", import.meta.url));
const spec = JSON.parse(readFileSync(`${root}scripts/figures.json`, "utf8"));
const wanted = process.argv.slice(2);
const ids = wanted.length > 0 ? wanted : Object.keys(spec.figures);
mkdirSync(`${root}public/figures`, { recursive: true });

// The app's palette, so the drawings sit with the interface: navy, brass, paper.
const colors = [
  { rgb: [15, 28, 43] },
  { rgb: [217, 154, 43] },
  { rgb: [247, 244, 238] },
];

for (const id of ids) {
  const prompt = spec.figures[id]?.prompt;
  if (!prompt) {
    console.error(`unknown figure: ${id}`);
    process.exit(1);
  }
  const response = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      prompt: `${spec.style} ${prompt}`,
      model: process.env.FIGURES_MODEL ?? "recraftv4_1",
      style: "vector_illustration",
      size: "1024x1024",
      random_seed: 7,
      controls: { colors, background_color: { rgb: [255, 255, 255] } },
    }),
  });
  if (!response.ok) {
    console.error(`${id}: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  const { data, credits } = await response.json();
  const url = data?.[0]?.url;
  const image = await fetch(url);
  const bytes = Buffer.from(await image.arrayBuffer());
  // Recraft's URL carries no extension, so read the format off the response and
  // fall back to the bytes. It matters: an SVG saved as .png is served as
  // image/png, and the nosniff header stops the browser rendering it at all.
  const type = image.headers.get("content-type") ?? "";
  const svg = type.includes("svg") || bytes.subarray(0, 64).toString("latin1").trimStart().startsWith("<");
  const ext = svg ? "svg" : "png";
  writeFileSync(`${root}public/figures/${id}.${ext}`, bytes);
  console.log(`${id}: ${bytes.length} bytes, ${credits} credits`);
}
