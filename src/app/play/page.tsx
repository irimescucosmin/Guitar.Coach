import { redirect } from "next/navigation";

/** The song list moved to /songs; old links still land on it. */
export default function PlayIndex() {
  redirect("/songs");
}
