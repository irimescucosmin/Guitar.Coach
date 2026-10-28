import { CHORDS, type ChordId } from "@/lib/music/chords";

/**
 * A chord box: strings vertical, low E on the left, nut on top, fingers as
 * numbered dots. `leftHanded` mirrors it, the way a left-handed player sees the
 * neck. `flagged` marks strings in red: where the microphone heard a problem.
 */

const STRING_LABELS = ["Mi", "La", "Re", "Sol", "Si", "Mi"];
const X0 = 21;
const DX = 18;
const Y0 = 30;
const DY = 26;
const FRETS = 4;

export function ChordDiagram({
  chord,
  width = 132,
  leftHanded = false,
  flagged = [],
  title,
  className,
}: {
  chord: ChordId;
  width?: number;
  leftHanded?: boolean;
  flagged?: readonly number[];
  title: string;
  /** Size it with CSS instead of `width`, for layouts that change with the screen. */
  className?: string;
}) {
  const shape = CHORDS[chord];
  const x = (string: number) => X0 + (leftHanded ? 5 - string : string) * DX;
  const isFlagged = (s: number) => flagged.includes(s);

  return (
    <svg
      viewBox="0 0 132 168"
      {...(className ? { className } : { width, height: (width * 168) / 132 })}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect x={X0 - 1} y={Y0 - 4} width={5 * DX + 2} height={4} className="dg-nut" />
      {Array.from({ length: FRETS }, (_, f) => (
        <line key={`f${f}`} x1={X0} x2={X0 + 5 * DX} y1={Y0 + (f + 1) * DY} y2={Y0 + (f + 1) * DY} className="dg-line" strokeWidth={1} />
      ))}
      {Array.from({ length: 6 }, (_, s) => (
        <line key={`s${s}`} x1={x(s)} x2={x(s)} y1={Y0} y2={Y0 + FRETS * DY} className="dg-line" strokeWidth={1 + (5 - s) * 0.18} />
      ))}
      {Array.from({ length: FRETS }, (_, f) => (
        <text key={`n${f}`} x={leftHanded ? X0 + 5 * DX + 8 : X0 - 13} y={Y0 + (f + 0.5) * DY + 3} className="dg-fretno">
          {f + 1}
        </text>
      ))}
      {shape.frets.map((fret, s) => {
        if (fret < 0) {
          return (
            <text key={`m${s}`} x={x(s)} y={Y0 - 10} textAnchor="middle" className="dg-x">
              ×
            </text>
          );
        }
        if (fret === 0) {
          return <circle key={`o${s}`} cx={x(s)} cy={Y0 - 14} r={4.5} className={`dg-open${isFlagged(s) ? " miss" : ""}`} />;
        }
        const cy = Y0 + (fret - 0.5) * DY;
        return (
          <g key={`d${s}`}>
            <circle cx={x(s)} cy={cy} r={8.5} className={`dg-dot${isFlagged(s) ? " miss" : ""}`} />
            <text x={x(s)} y={cy + 3.5} textAnchor="middle" className="dg-num">
              {shape.fingers[s]}
            </text>
          </g>
        );
      })}
      {STRING_LABELS.map((label, s) => (
        <text key={`l${s}`} x={x(s)} y={Y0 + FRETS * DY + 16} textAnchor="middle" className="dg-label">
          {label}
        </text>
      ))}
    </svg>
  );
}
