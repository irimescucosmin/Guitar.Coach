import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { findCommunitySong } from "@/lib/community/repository";
import { isCommunityId } from "@/lib/community/song";
import { MAX_BYTES, baseMime, recordingProblem } from "@/lib/music/recordings";
import { recordingInput } from "@/lib/progress/validation";
import { saveRecording } from "@/lib/recordings/repository";

/**
 * The week's recording, as multipart: the audio file and the run's facts.
 * A route rather than a server action: a few hundred kilobytes of audio go
 * better as a file than inside an action's body.
 */
export async function POST(request: Request) {
  const me = await currentUser();
  if (!me) return Response.json({ ok: false, reason: "signedOut" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const meta = form?.get("meta");
  if (!form || !(audio instanceof File) || typeof meta !== "string") return Response.json({ ok: false, reason: "format" }, { status: 400 });
  const parsed = recordingInput.safeParse(JSON.parse(meta));
  if (!parsed.success) return Response.json({ ok: false, reason: "format" }, { status: 400 });
  const problem = recordingProblem({ bytes: audio.size, mime: audio.type, durationMs: parsed.data.durationMs });
  if (problem) return Response.json({ ok: false, reason: problem }, { status: 400 });
  if (isCommunityId(parsed.data.songId)) {
    const song = await findCommunitySong(db, parsed.data.songId);
    if (!song || (song.status !== "published" && song.authorId !== me.id)) return Response.json({ ok: false, reason: "format" }, { status: 400 });
  }
  const bytes = Buffer.from(await audio.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return Response.json({ ok: false, reason: "tooBig" }, { status: 400 });
  const id = await saveRecording(db, me.id, { ...parsed.data, mime: baseMime(audio.type), audio: bytes });
  return Response.json({ ok: true, id });
}

export const dynamic = "force-dynamic";
