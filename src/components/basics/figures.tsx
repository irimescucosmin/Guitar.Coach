/**
 * Line drawings for the basics page and the printed guide: simple enough to
 * read at a glance and to print in black. Ink tokens, so they follow the theme
 * on screen; the print stylesheet forces dark ink.
 */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** The guitar, named parts with leader lines. Labels come from the caller. */
export function ReadBox({ labels }: { labels: { nut: string; strings: string; frets: string; dot: string; open: string; muted: string } }) {
  return (
    <svg viewBox="0 0 300 220" className="h-auto w-full max-w-[320px]" role="img" aria-label={Object.values(labels).join(", ")}>
      <g {...stroke}>
        <path d="M100 40h100" strokeWidth={5} />
        {[70, 100, 130, 160].map((y) => <path key={y} d={`M100 ${y}H200`} strokeWidth={1} />)}
        {[100, 120, 140, 160, 180, 200].map((x) => <path key={x} d={`M${x} 40V160`} strokeWidth={1} />)}
        <circle cx="140" cy="85" r="9" fill="currentColor" />
        <circle cx="180" cy="25" r="5" />
        <path d="M96 20l8 10M104 20l-8 10" />
      </g>
      <g fontSize="11" fill="currentColor" fontFamily="inherit">
        <text x="150" y="88" textAnchor="middle" fill="var(--color-surface)" fontWeight="700" fontSize="10">2</text>
        <text x="210" y="44">{labels.nut}</text>
        <text x="210" y="74">{labels.frets}</text>
        <text x="10" y="90">{labels.dot}</text>
        <text x="10" y="200">{labels.strings}</text>
        <text x="190" y="14">{labels.open}</text>
        <text x="50" y="14">{labels.muted}</text>
        <path d="M100 170v10M200 170v10" stroke="currentColor" strokeWidth={1} />
      </g>
    </svg>
  );
}
