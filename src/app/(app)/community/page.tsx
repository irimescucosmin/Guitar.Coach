import { getTranslations } from "next-intl/server";
import { CommunityList } from "@/components/community/community-list";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { listCommunitySongs } from "@/lib/community/repository";

export async function generateMetadata() {
  const t = await getTranslations("community");
  return { title: t("title") };
}

export default async function CommunityPage() {
  const me = await requireUser();
  const songs = await listCommunitySongs(db, me.id);
  return <CommunityList songs={songs} viewerId={me.id} />;
}
