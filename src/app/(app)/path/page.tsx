import { getTranslations } from "next-intl/server";
import { PathView } from "@/components/path/path-view";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { listCommunitySongs } from "@/lib/community/repository";

export async function generateMetadata() {
  const t = await getTranslations("path");
  return { title: t("title") };
}

export default async function HomePage() {
  const me = await requireUser();
  return <PathView community={await listCommunitySongs(db, me.id)} />;
}
