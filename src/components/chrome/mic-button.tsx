"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { engine, type MicState } from "@/lib/audio/engine";

export function useMicState(): MicState {
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.micState,
    () => "off",
  );
}

export function MicButton() {
  const t = useTranslations("common");
  const state = useMicState();
  const on = state === "on";
  const broken = state === "denied" || state === "unsupported";
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void engine.startMic()}
        disabled={on || state === "starting"}
        title={broken ? t("micDenied") : undefined}
        className={`flex items-center gap-2 rounded-[var(--radius-field)] border px-3 py-1.5 text-sm font-semibold ${
          on
            ? "border-good text-good"
            : broken
              ? "border-bad text-bad"
              : "border-accent bg-accent text-on-accent"
        }`}
      >
        <span aria-hidden className={`size-2 rounded-full ${on ? "bg-good" : broken ? "bg-bad" : "bg-on-accent"}`} />
        {t(`mic.${state}`)}
      </button>
    </div>
  );
}
