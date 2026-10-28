import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/landing";
import { PATH_HREF } from "@/components/ui/links";
import { currentUser, socialProviders } from "@/lib/auth";

/** "/" presents the app; a signed-in player goes straight to the path. */
export default async function HomePage() {
  if (await currentUser()) redirect(PATH_HREF);
  return <Landing providers={socialProviders()} />;
}
