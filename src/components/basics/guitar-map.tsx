"use client";

import type { ReactNode } from "react";
import { useState } from "react";

/**
 * The parts of the guitar, named by touching them.
 *
 * The drawing is the generated one, so the picture stays the model's. What it
 * cannot give is which shape is the nut: its paths carry no names. So the
 * parts live in a transparent layer laid over it, and picking one lights it
 * up. The page teaches the words instead of listing them under a drawing that
 * points at nothing.
 */

export type PartId = "headstock" | "tuners" | "nut" | "neck" | "frets" | "body" | "soundhole" | "bridge" | "strings";

/** Reading order for the names: from the head down to the body. */
const NAMED: readonly PartId[] = ["headstock", "tuners", "nut", "neck", "frets", "strings", "body", "soundhole", "bridge"];

/**
 * One shape per part, in the drawing's own 2048 coordinates. Invisible until
 * picked, so the illustration is all you see until you ask something of it.
 */
const FRET_Y = [520, 590, 655, 715, 772, 825, 875, 922, 966];
const STRING_X = [947, 972, 997, 1021, 1046, 1071];

/** Painted only when picked; `pointerEvents` keeps the shape clickable while invisible. */
const area = (lit: boolean) => ({
  fill: lit ? "var(--color-brass)" : "transparent",
  fillOpacity: lit ? 0.45 : 0,
  stroke: lit ? "var(--color-brass)" : "none",
  strokeWidth: 8,
  pointerEvents: "all" as const,
});
const line = (lit: boolean) => ({
  stroke: lit ? "var(--color-brass)" : "transparent",
  strokeWidth: lit ? 20 : 16,
  pointerEvents: "all" as const,
});

const HOTSPOTS: ReadonlyArray<readonly [PartId, (lit: boolean) => ReactNode]> = [
  ["body", (l) => <rect x="667" y="1024" width="715" height="960" rx="240" {...area(l)} />],
  ["soundhole", (l) => <circle cx="1024" cy="1334" r="150" {...area(l)} />],
  ["bridge", (l) => <rect x="920" y="1648" width="205" height="60" rx="14" {...area(l)} />],
  ["neck", (l) => <rect x="972" y="465" width="105" height="550" {...area(l)} />],
  ["frets", (l) => <>{FRET_Y.map((y) => <line key={y} x1="968" y1={y} x2="1081" y2={y} {...line(l)} />)}</>],
  ["nut", (l) => <rect x="950" y="420" width="150" height="46" rx="8" {...area(l)} />],
  ["headstock", (l) => <rect x="958" y="50" width="184" height="372" rx="24" {...area(l)} />],
  ["tuners", (l) => (
    <>
      <rect x="872" y="100" width="92" height="240" rx="18" {...area(l)} />
      <rect x="1086" y="100" width="92" height="240" rx="18" {...area(l)} />
    </>
  )],
  ["strings", (l) => <>{STRING_X.map((x) => <line key={x} x1={x} y1="450" x2={x} y2="1670" {...line(l)} />)}</>],
];

export function GuitarMap({
  names,
  hint,
  drawing,
  print = false,
}: {
  names: Record<PartId, string>;
  hint: string;
  drawing: string;
  print?: boolean;
}) {
  const [picked, setPicked] = useState<PartId | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto w-full">
        {/* Generated and committed, never anything a visitor sends. */}
        <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: drawing }} />
        {!print && (
          <svg viewBox="0 0 2048 2048" aria-hidden="true" className="absolute inset-0 h-full w-full">
            {HOTSPOTS.map(([p, shape]) => (
              <g key={p} onClick={() => setPicked(picked === p ? null : p)} className="cursor-pointer">
                {shape(picked === p)}
              </g>
            ))}
          </svg>
        )}
      </div>

      {print ? (
        <p className="m-0 text-center text-[13px] text-muted">{NAMED.map((p) => names[p]).join(" · ")}</p>
      ) : (
        <>
          <p aria-live="polite" className="m-0 min-h-6 text-center text-[15px] font-semibold text-ink">
            {picked ? names[picked] : <span className="font-normal text-muted">{hint}</span>}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {NAMED.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={picked === p}
                onClick={() => setPicked(picked === p ? null : p)}
                className={`rounded-[var(--radius-field)] border px-2.5 py-1 text-[13px] transition-colors ${
                  picked === p
                    ? "border-brass bg-brass text-on-brass"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong"
                }`}
              >
                {names[p]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
