import type { ChordId } from "@/lib/music/chords";

/** A chord name in its own colour: the same colour it has on the play screen. */
export function ChordChip({ chord, dim = false }: { chord: ChordId; dim?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-9 items-center justify-center rounded-[var(--radius-field)] px-2 py-0.5 font-mono text-sm font-bold text-white ${dim ? "opacity-45" : ""}`}
      style={{ background: `var(--color-chord-${chord})` }}
    >
      {chord}
    </span>
  );
}
