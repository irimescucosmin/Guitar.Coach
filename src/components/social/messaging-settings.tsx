"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { setMessaging } from "@/app/actions";

/** One switch: whether other players may write. Off, nobody can, and that is the end of it. */
export function MessagingSettings({ accepts }: { accepts: boolean }) {
  const t = useTranslations("social.messages");
  const [on, setOn] = useState(accepts);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-control)] border border-line bg-surface px-5 py-3.5 text-[15px]">
      <span className="flex flex-col">
        <span className="font-bold">{t("accept")}</span>
        <span className="text-[13px] text-muted">{t("acceptHelp")}</span>
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          void setMessaging({ accepts: e.target.checked });
        }}
        className="size-5 accent-[var(--color-brass)]"
      />
    </label>
  );
}
