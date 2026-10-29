"use client";

import { useState } from "react";
import type { Point } from "@/lib/music/history";

const W = 560;
const H = 240;
const PAD = { top: 20, right: 16, bottom: 34, left: 58 };
/** Axis text, in viewBox units: about 13px at the usual card width. */
const FONT = 14;

/**
 * One series over time: a thin line, dots on the days with a result, a dashed
 * reference line when there is a target, and a tooltip on hover or focus.
 * Colours come from the ink tokens, so both themes read it the same way.
 */
export function LineChart({
  points,
  format,
  label,
  reference,
  formatDay,
  empty,
  min,
  max,
}: {
  points: Point[];
  format: (v: number) => string;
  /** What the chart shows, for screen readers and the table. */
  label: string;
  reference?: { value: number; label: string };
  formatDay: (day: string) => string;
  empty: string;
  min?: number;
  max?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return <p className="m-0 py-10 text-center text-sm text-muted">{empty}</p>;

  const values = points.map((p) => p.value).concat(reference ? [reference.value] : []);
  let lo = min ?? Math.min(...values);
  let hi = max ?? Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo = min ?? lo - span * 0.1;
  hi = max ?? hi + span * 0.1;
  const x = (i: number) => (points.length === 1 ? (PAD.left + W - PAD.right) / 2 : PAD.left + (i * (W - PAD.left - PAD.right)) / (points.length - 1));
  const y = (v: number) => PAD.top + ((hi - v) * (H - PAD.top - PAD.bottom)) / (hi - lo);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const active = hover === null ? null : points[hover]!;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={FONT} fill="var(--color-muted)">{format(t)}</text>
            </g>
          ))}
          {reference && (
            <g>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--color-brass)" strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={W - PAD.right} y={y(reference.value) - 6} textAnchor="end" fontSize={FONT} fill="var(--color-brass-ink)">{reference.label}</text>
            </g>
          )}
          <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={p.day} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} fill="var(--color-ink)" stroke="var(--color-surface)" strokeWidth={2} />
          ))}
          <text x={PAD.left} y={H - 10} fontSize={FONT} fill="var(--color-muted)">{formatDay(points[0]!.day)}</text>
          {points.length > 1 && <text x={W - PAD.right} y={H - 10} textAnchor="end" fontSize={FONT} fill="var(--color-muted)">{formatDay(points.at(-1)!.day)}</text>}
          {/* Hit areas wider than the dots, one per day. */}
          {points.map((p, i) => {
            const half = points.length === 1 ? (W - PAD.left - PAD.right) / 2 : (W - PAD.left - PAD.right) / (points.length - 1) / 2;
            return (
              <rect key={`hit-${p.day}`} x={x(i) - half} y={0} width={half * 2} height={H} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            );
          })}
        </svg>
        {active && (
          <div
            role="tooltip"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[var(--radius-field)] border border-line bg-surface px-3 py-1.5 text-sm shadow-sm"
            style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(active.value) / H) * 100}%` }}
          >
            <span className="block text-xs text-muted">{formatDay(active.day)}</span>
            <span className="font-mono font-semibold">{format(active.value)}</span>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">{label}</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <tbody>
            {points.map((p) => (
              <tr key={p.day} className="border-t border-line">
                <td className="py-1 pr-4">{formatDay(p.day)}</td>
                <td className="py-1 font-mono">{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
