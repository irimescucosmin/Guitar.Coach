import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { readRecording } from "@/lib/recordings/repository";

/** The audio of one of the player's own recordings, for the audio element. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const found = await readRecording(db, me.id, id);
  if (!found) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(found.audio), {
    headers: { "content-type": found.mime, "content-length": String(found.audio.byteLength), "cache-control": "private, max-age=3600" },
  });
}

export const dynamic = "force-dynamic";
