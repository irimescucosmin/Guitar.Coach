"use client";

import Link from "next/link";
import { button } from "@/components/ui/links";

/** The one control a print page needs. Hidden on paper. */
export function PrintBar({ label, back, hint }: { label: string; back: string; hint: string }) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-line bg-surface px-6 py-3 print:hidden">
      <Link href="/today" className="text-sm font-semibold text-muted hover:text-ink">{back}</Link>
      <span className="text-sm text-muted">{hint}</span>
      <button type="button" onClick={() => window.print()} className={`${button.brass} ml-auto h-11`}>
        {label}
      </button>
    </div>
  );
}
