"use client";

import type { Layout } from "./session";

/**
 * The lane: chord blocks slide from right to left into the "now" line, so the
 * next chord is visible before it arrives. Colours come from the theme tokens
 * on every draw, so a theme switch needs no repaint logic.
 */

const NOW_AT = 0.24;

function roundedRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + radius, y);
  g.arcTo(x + w, y, x + w, y + h, radius);
  g.arcTo(x + w, y + h, x, y + h, radius);
  g.arcTo(x, y + h, x, y, radius);
  g.arcTo(x, y, x + w, y, radius);
  g.closePath();
}

export function drawHighway(canvas: HTMLCanvasElement, layout: Layout): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const ink = token("--color-ink");
  const line = token("--color-line");
  const good = token("--color-good");
  const bad = token("--color-bad");
  const mono = token("--font-mono") || "monospace";
  const nowX = Math.round(w * NOW_AT);
  const { position, unit } = layout;
  const top = 12;
  const blockH = h - 34;

  if (layout.beatsPerBar) {
    const first = Math.floor(position - nowX / unit) - 1;
    const last = Math.ceil(position + (w - nowX) / unit) + 1;
    g.fillStyle = line;
    for (let b = Math.max(0, first); b <= last; b++) {
      const x = nowX + (b - position) * unit;
      const strong = b % layout.beatsPerBar === 0;
      g.fillRect(x, h - (strong ? 14 : 8), strong ? 2 : 1, strong ? 14 : 8);
    }
  }

  for (const item of layout.items) {
    const x = nowX + (item.start - position) * unit + 3;
    const bw = item.length * unit - 6;
    if (x + bw < 0 || x > w) continue;
    const active = position >= item.start && position < item.start + item.length;
    const past = position >= item.start + item.length;

    g.globalAlpha = past ? 0.35 : 1;
    g.fillStyle = token(`--color-chord-${item.chord}`) || ink;
    roundedRect(g, x, top, bw, blockH, 10);
    g.fill();
    if (active) {
      g.globalAlpha = 1;
      g.lineWidth = 3;
      g.strokeStyle = ink;
      roundedRect(g, x, top, bw, blockH, 10);
      g.stroke();
    }

    // The name sticks to the now line while its block passes under it.
    g.globalAlpha = past ? 0.6 : 1;
    g.fillStyle = "#ffffff";
    g.font = `700 ${active ? 26 : 22}px ${mono}`;
    g.textBaseline = "middle";
    const textX = active ? Math.min(Math.max(x + 12, nowX + 10), x + bw - 44) : x + 12;
    g.fillText(item.chord, textX, top + blockH / 2);

    if (item.status === "ok" || item.status === "miss") {
      g.globalAlpha = 1;
      g.fillStyle = item.status === "ok" ? good : bad;
      g.beginPath();
      g.arc(x + bw - 12, top + 13, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = `700 12px ${mono}`;
      g.textAlign = "center";
      g.fillText(item.status === "ok" ? "✓" : "✕", x + bw - 12, top + 14);
      g.textAlign = "left";
    }
    g.globalAlpha = 1;
  }

  g.fillStyle = ink;
  g.fillRect(nowX - 1, 2, 3, h - 4);
}
