import "server-only";
import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { loadProgress } from "./repository";
import type { Progress } from "@/lib/music/path";

/** What a page needs to render progress: whose it is and what it says. Null progress means a guest. */
export async function pageProgress(): Promise<{ userName: string | null; progress: Progress | null }> {
  const me = await currentUser();
  if (!me) return { userName: null, progress: null };
  return { userName: me.name, progress: await loadProgress(db, me.id) };
}
