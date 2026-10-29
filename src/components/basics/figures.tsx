/**
 * Line drawings for the basics page and the printed guide: simple enough to
 * read at a glance and to print in black. Ink tokens, so they follow the theme
 * on screen; the print stylesheet forces dark ink.
 */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** The guitar, named parts with leader lines. Labels come from the caller. */
export function GuitarParts({ labels }: { labels: { body: string; neck: string; headstock: string; tuners: string; nut: string; frets: string; soundhole: string; bridge: string; strings: string } }) {
  return (
    <svg viewBox="0 0 560 300" className="h-auto w-full" role="img" aria-label={Object.values(labels).join(", ")}>
      <g {...stroke}>
        {/* body: two lobes */}
        <path d="M340 110c20-40 70-50 110-35 45 17 60 60 50 95-8 30-30 55-70 60-30 20-70 12-90-10-30-30-30-80 0-110z" />
        <circle cx="430" cy="150" r="26" />
        <rect x="470" y="135" width="46" height="30" rx="4" />
        {/* neck */}
        <path d="M120 133h220M120 167h220" />
        {[150, 180, 210, 240, 270, 300, 330].map((x) => <path key={x} d={`M${x} 133v34`} />)}
        <path d="M120 128v44" strokeWidth={5} />
        {/* headstock */}
        <path d="M120 133c-25-6-50-6-75 0v34c25 6 50 6 75 0" />
        {[60, 78, 96].map((x) => <circle key={x} cx={x} cy={118} r={5} />)}
        {[60, 78, 96].map((x) => <circle key={`b${x}`} cx={x} cy={182} r={5} />)}
        {/* strings */}
        {[139, 144.5, 150, 155.5, 161, 166].map((y) => <path key={y} d={`M122 ${y}H478`} strokeWidth={1} />)}
        {/* leader lines */}
        <path d="M450 70v30M225 110v20M225 190v-20M80 95v18M70 205l6-18M130 205l-8-30M405 215v-45M493 215v-45M300 110v24" strokeWidth={1} strokeDasharray="3 3" />
      </g>
      <g fontSize="14" fill="currentColor" fontFamily="inherit" textAnchor="middle" fontWeight="600">
        <text x="450" y="62">{labels.body}</text>
        <text x="225" y="104">{labels.neck}</text>
        <text x="80" y="88">{labels.headstock}</text>
        <text x="60" y="222">{labels.tuners}</text>
        <text x="140" y="222">{labels.nut}</text>
        <text x="225" y="208">{labels.frets}</text>
        <text x="405" y="232">{labels.soundhole}</text>
        <text x="493" y="232">{labels.bridge}</text>
        <text x="300" y="104">{labels.strings}</text>
      </g>
    </svg>
  );
}

/** Seated posture: guitar on the right leg, neck slightly up, back straight. */
export function Posture() {
  return (
    <svg viewBox="0 0 240 240" className="h-auto w-full max-w-[260px]" {...stroke} role="img" aria-hidden>
      <circle cx="120" cy="40" r="18" />
      <path d="M120 58v70" />
      <path d="M120 128l-40 60M120 128l40 60" />
      <path d="M80 188h25M160 188h25" />
      <path d="M120 70l45 40M120 70l-30 45" />
      <ellipse cx="150" cy="120" rx="34" ry="24" />
      <path d="M118 108L60 80" strokeWidth={4} />
      <path d="M150 96v48" strokeWidth={1} />
    </svg>
  );
}

/** The fretting hand from the player's side: thumb behind the neck, fingers arched. */
export function LeftHand() {
  return (
    <svg viewBox="0 0 240 200" className="h-auto w-full max-w-[260px]" {...stroke} role="img" aria-hidden>
      <rect x="20" y="70" width="200" height="60" rx="4" />
      {[70, 85, 100, 115, 130].map((y) => <path key={y} d={`M20 ${y}H220`} strokeWidth={1} />)}
      <path d="M90 170c0-30 10-50 30-60 15-7 30-7 45 0 20 10 30 30 30 60" />
      {[110, 130, 150].map((x, i) => <path key={x} d={`M${x} 110c0-15 5-25 10-25s10 10 10 25`} strokeDasharray={i === 1 ? "0" : "0"} />)}
      <path d="M90 150c-20-10-30-30-25-50" />
      <text x="95" y="188" fontSize="12" fill="currentColor" stroke="none" fontFamily="inherit">✓</text>
    </svg>
  );
}

/** Pick grip, seen from above: the pick flat under the thumb, on the side of the bent index, tip past both. */
export function PickGrip({ labels }: { labels: { thumb: string; index: string; tip: string } }) {
  return (
    <svg viewBox="0 0 260 200" className="h-auto w-full max-w-[280px]" role="img" aria-label={`${labels.thumb}, ${labels.index}, ${labels.tip}`}>
      <g {...stroke}>
        {/* bent index finger, coming from the right, knuckle to the left */}
        <path d="M250 155H140c-30 0-50-18-50-40 0-16 12-28 30-28h40" />
        <path d="M160 87c-12 0-20 8-20 18" strokeWidth={1} />
        {/* thumb lying across, from the top right */}
        <path d="M250 55H130c-28 0-48 18-48 42 0 14 10 24 24 24h34" />
        {/* the pick: flat, held between them, tip out to the left */}
        <path d="M100 100l-48 8 32 34z" fill="currentColor" stroke="none" />
        {/* a string under the tip */}
        <path d="M20 150h100" strokeWidth={1} />
        <path d="M60 60v18M60 145v-12" strokeWidth={1} strokeDasharray="3 3" />
      </g>
      <g fontSize="13" fill="currentColor" fontFamily="inherit" fontWeight="600">
        <text x="200" y="45" textAnchor="middle">{labels.thumb}</text>
        <text x="200" y="180" textAnchor="middle">{labels.index}</text>
        <text x="60" y="54" textAnchor="middle">{labels.tip}</text>
      </g>
    </svg>
  );
}

/** How to read a chord box, with callouts. */
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
