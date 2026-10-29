import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/landing";
import { TODAY_HREF } from "@/components/ui/links";
import { currentUser, socialProviders } from "@/lib/auth";

/** "/" presents the app; a signed-in player goes straight to today's practice. */
export default async function HomePage() {
  if (await currentUser()) redirect(TODAY_HREF);
  return <Landing providers={socialProviders()} />;
}
