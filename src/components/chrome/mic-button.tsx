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

/** The microphone's state for the navy sidebar: a dot when on, a button when off, the reason when blocked. */
export function MicStatus() {
  const t = useTranslations("common");
  const state = useMicState();
  if (state === "on") {
    return (
      <p className="flex items-center gap-2.5 text-sm text-[#8ee0b4]">
        <span aria-hidden className="size-2.5 rounded-full bg-[#4cc97f]" />
        {t("mic.on")}
      </p>
    );
  }
  const broken = state === "denied" || state === "unsupported" || state === "insecure";
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void engine.startMic()}
        disabled={state === "starting"}
        className={`flex h-11 items-center justify-center gap-2 rounded-[var(--radius-field)] px-3 text-sm font-bold ${
          broken ? "border border-[#ef6b63] text-[#f6a39c]" : "bg-brass text-on-brass"
        }`}
      >
        {t(`mic.${state}`)}
      </button>
      {broken && (
        <p role="alert" className="text-xs leading-relaxed text-on-navy-muted">
          {state === "insecure" ? t("micInsecure") : t("micDenied")}
        </p>
      )}
    </div>
  );
}
