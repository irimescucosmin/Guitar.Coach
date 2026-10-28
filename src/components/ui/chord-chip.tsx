import type { ChordId } from "@/lib/music/chords";

/**
 * A chord name in its own colour: the same colour it has on the play screen.
 * `pending` draws it dashed, for a chord not learned yet.
 */
export function ChordChip({ chord, pending = false, size = "sm" }: { chord: ChordId; pending?: boolean; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-[52px] min-w-[52px] rounded-[12px] px-3 text-[22px]" : "h-6 min-w-8 rounded-[6px] px-2 text-xs";
  if (pending) {
    return (
      <span
        className={`inline-flex items-center justify-center border border-dashed font-extrabold ${box}`}
        style={{ borderColor: `var(--color-chord-${chord})`, color: "var(--color-brass-ink)" }}
      >
        {chord}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold text-white ${box}`}
      style={{ background: `var(--color-chord-${chord})` }}
    >
      {chord}
    </span>
  );
}
