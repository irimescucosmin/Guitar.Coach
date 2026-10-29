import { getTranslations } from "next-intl/server";
import { ProgressView } from "@/components/progress/progress-view";
import type { RecordingItem } from "@/components/progress/recordings";
import { db } from "@/db/client";
import { coachEnabled } from "@/lib/coach/model";
import { findCommunitySong, listCommunitySongs } from "@/lib/community/repository";
import { authorScore } from "@/lib/community/points";
import { isCommunityId } from "@/lib/community/song";
import { requireUser } from "@/lib/auth";
import { findSong } from "@/lib/music/songs";
import { pageHistory } from "@/lib/progress/server";
import { listRecordings } from "@/lib/recordings/repository";

export async function generateMetadata() {
  const t = await getTranslations("stats");
  return { title: t("title") };
}

/** Recordings with the song's title: from the catalogue, or from the community for a "c-" id. */
async function recordingsWithTitles(userId: string): Promise<RecordingItem[]> {
  const list = await listRecordings(db, userId);
  return Promise.all(
    list.map(async (r) => ({
      ...r,
      title: findSong(r.song)?.title ?? (isCommunityId(r.song) ? (await findCommunitySong(db, r.song))?.title : undefined) ?? r.song,
    })),
  );
}

export default async function ProgressPage() {
  const me = await requireUser();
  const [history, recordings, community] = await Promise.all([pageHistory(), recordingsWithTitles(me.id), listCommunitySongs(db, me.id)]);
  return <ProgressView history={history} coach={coachEnabled()} recordings={recordings} score={authorScore(community, me.id)} />;
}
